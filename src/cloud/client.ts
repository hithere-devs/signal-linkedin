import type { CloudSession, CloudUser, SyncSnapshot } from '../types';
import type { CloudConfig } from './config';

interface AuthPayload {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id?: string; email?: string };
  id?: string;
  email?: string;
}

export interface SignUpResult {
  session: CloudSession | null;
  user: CloudUser | null;
  needsEmailConfirmation: boolean;
}

export interface RemoteState {
  data: SyncSnapshot;
  clientUpdatedAt: number;
  serverUpdatedAt: number;
}

const REQUEST_TIMEOUT_MS = 15_000;

function cleanError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as Record<string, unknown>;
  const message = value.msg ?? value.message ?? value.error_description ?? value.error;
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 240) : fallback;
}

async function request<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(cleanError(payload, `${fallback} (${response.status})`));
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The cloud request timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function publicHeaders(config: CloudConfig): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    'Content-Type': 'application/json'
  };
}

function userHeaders(config: CloudConfig, session: CloudSession): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json'
  };
}

function toUser(payload: AuthPayload): CloudUser | null {
  const id = payload.user?.id ?? payload.id;
  const email = payload.user?.email ?? payload.email;
  return typeof id === 'string' && typeof email === 'string' ? { id, email } : null;
}

function toSession(payload: AuthPayload): CloudSession | null {
  const user = toUser(payload);
  if (!payload.access_token || !payload.refresh_token || !user) return null;
  const expiresAt = typeof payload.expires_at === 'number'
    ? payload.expires_at * 1000
    : Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    user
  };
}

export async function signUp(config: CloudConfig, email: string, password: string): Promise<SignUpResult> {
  const payload = await request<AuthPayload>(
    `${config.url}/auth/v1/signup`,
    {
      method: 'POST',
      headers: publicHeaders(config),
      body: JSON.stringify({ email, password })
    },
    'Could not create the account'
  );
  const user = toUser(payload);
  const session = toSession(payload);
  return { session, user, needsEmailConfirmation: !!user && !session };
}

export async function signIn(config: CloudConfig, email: string, password: string): Promise<CloudSession> {
  const payload = await request<AuthPayload>(
    `${config.url}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: publicHeaders(config),
      body: JSON.stringify({ email, password })
    },
    'Could not sign in'
  );
  const session = toSession(payload);
  if (!session) throw new Error('The sign-in response did not contain a session.');
  return session;
}

export async function refreshSession(config: CloudConfig, refreshToken: string): Promise<CloudSession> {
  const payload = await request<AuthPayload>(
    `${config.url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: publicHeaders(config),
      body: JSON.stringify({ refresh_token: refreshToken })
    },
    'Could not refresh the session'
  );
  const session = toSession(payload);
  if (!session) throw new Error('The refresh response did not contain a session.');
  return session;
}

export async function sendPasswordReset(config: CloudConfig, email: string): Promise<void> {
  await request(
    `${config.url}/auth/v1/recover`,
    {
      method: 'POST',
      headers: publicHeaders(config),
      body: JSON.stringify({ email })
    },
    'Could not send the reset email'
  );
}

export async function signOut(config: CloudConfig, session: CloudSession): Promise<void> {
  await request(
    `${config.url}/auth/v1/logout`,
    { method: 'POST', headers: userHeaders(config, session) },
    'Could not sign out'
  );
}

export async function getRemoteState(config: CloudConfig, session: CloudSession): Promise<RemoteState | null> {
  const rows = await request<Array<{ data?: SyncSnapshot; client_updated_at?: string; updated_at?: string }>>(
    `${config.url}/rest/v1/signal_user_state?select=data,client_updated_at,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
    { method: 'GET', headers: userHeaders(config, session) },
    'Could not load synced settings'
  );
  const row = rows[0];
  if (!row?.data) return null;
  return {
    data: row.data,
    clientUpdatedAt: Date.parse(row.client_updated_at ?? '') || row.data.updatedAt || 0,
    serverUpdatedAt: Date.parse(row.updated_at ?? '') || 0
  };
}

export async function upsertRemoteState(
  config: CloudConfig,
  session: CloudSession,
  snapshot: SyncSnapshot
): Promise<void> {
  await request(
    `${config.url}/rest/v1/signal_user_state?on_conflict=user_id`,
    {
      method: 'POST',
      headers: {
        ...userHeaders(config, session),
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: session.user.id,
        data: snapshot,
        client_updated_at: new Date(snapshot.updatedAt).toISOString()
      })
    },
    'Could not save synced settings'
  );
}

export async function deleteAccount(config: CloudConfig, session: CloudSession): Promise<void> {
  await request(
    `${config.url}/rest/v1/rpc/delete_signal_account`,
    { method: 'POST', headers: userHeaders(config, session), body: '{}' },
    'Could not delete the account'
  );
}
