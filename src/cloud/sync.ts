import type { CloudAuthResponse, CloudSession, CloudStatus, SyncSnapshot } from '../types';
import * as store from '../lib/storage';
import {
  deleteAccount as deleteRemoteAccount,
  getRemoteState,
  refreshSession,
  sendPasswordReset,
  signIn as requestSignIn,
  signOut as requestSignOut,
  signUp as requestSignUp,
  upsertRemoteState
} from './client';
import { getCloudConfig } from './config';
import {
  clearSession,
  getStoredSession,
  getSyncMeta,
  markCloudDirty,
  saveSession,
  saveSyncMeta
} from './session-store';

export { markCloudDirty } from './session-store';

let syncInFlight: Promise<CloudStatus> | null = null;

function requireConfig() {
  const config = getCloudConfig();
  if (!config) throw new Error('Cloud sync is not configured in this build.');
  return config;
}

function normalizedEmail(email: string): string {
  const value = email.trim().toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
    throw new Error('Enter a valid email address.');
  }
  return value;
}

function checkedPassword(password: string): string {
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
  if (password.length > 128) throw new Error('Password is too long.');
  return password;
}

function validSnapshot(value: unknown): value is SyncSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<SyncSnapshot>;
  return snapshot.version === 1
    && typeof snapshot.updatedAt === 'number'
    && !!snapshot.settings
    && !!snapshot.profile
    && !!snapshot.signals
    && !!snapshot.overrides
    && Array.isArray(snapshot.stats);
}

async function usableSession(): Promise<CloudSession> {
  const config = requireConfig();
  const stored = await getStoredSession();
  if (!stored) throw new Error('Sign in to sync your settings.');
  if (stored.expiresAt > Date.now() + 90_000) return stored;

  try {
    const refreshed = await refreshSession(config, stored.refreshToken);
    await saveSession(refreshed);
    return refreshed;
  } catch {
    await clearSession();
    throw new Error('Your session expired. Sign in again.');
  }
}

export async function getCloudStatus(): Promise<CloudStatus> {
  const config = getCloudConfig();
  const [session, meta] = await Promise.all([getStoredSession(), getSyncMeta()]);
  return {
    configured: !!config,
    ...(config ? { origin: config.origin } : {}),
    signedIn: !!config && !!session,
    ...(config && session ? { user: session.user } : {}),
    lastSyncedAt: meta.lastSyncedAt,
    pending: meta.pending,
    ...(meta.lastError ? { lastError: meta.lastError } : {})
  };
}

async function performSync(direction: 'auto' | 'push' | 'pull'): Promise<CloudStatus> {
  const config = requireConfig();
  const session = await usableSession();
  const startingMeta = await getSyncMeta();

  try {
    const remote = await getRemoteState(config, session);
    if (remote && !validSnapshot(remote.data)) throw new Error('The synced data has an unsupported format.');

    const meta = await getSyncMeta();
    const remoteTimestamp = remote ? Math.max(remote.clientUpdatedAt, remote.data.updatedAt) : 0;
    const shouldPush = direction === 'push'
      || !remote
      || (direction === 'auto' && meta.pending && meta.localUpdatedAt >= remoteTimestamp);

    if (shouldPush) {
      const updatedAt = direction === 'push' ? Date.now() : (meta.localUpdatedAt || Date.now());
      const snapshot = await store.createSyncSnapshot(updatedAt);
      await upsertRemoteState(config, session, snapshot);
      const latestMeta = await getSyncMeta();
      const changedWhileSyncing = latestMeta.localUpdatedAt > updatedAt;
      await saveSyncMeta({
        localUpdatedAt: changedWhileSyncing ? latestMeta.localUpdatedAt : updatedAt,
        lastSyncedAt: Date.now(),
        remoteUpdatedAt: updatedAt,
        pending: changedWhileSyncing
      });
    } else if (remote && (direction === 'pull' || remoteTimestamp > meta.localUpdatedAt)) {
      await store.applySyncSnapshot(remote.data);
      await saveSyncMeta({
        localUpdatedAt: remote.data.updatedAt,
        lastSyncedAt: Date.now(),
        remoteUpdatedAt: remoteTimestamp,
        pending: false
      });
    } else {
      await saveSyncMeta({
        ...meta,
        lastSyncedAt: Date.now(),
        remoteUpdatedAt: remoteTimestamp || meta.remoteUpdatedAt,
        pending: false,
        lastError: undefined
      });
    }
    return getCloudStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const latestMeta = await getSyncMeta();
    await saveSyncMeta({
      ...startingMeta,
      ...latestMeta,
      pending: true,
      lastError: message.slice(0, 240)
    });
    throw error;
  }
}

export async function syncNow(direction: 'auto' | 'push' | 'pull' = 'auto'): Promise<CloudStatus> {
  if (syncInFlight) {
    if (direction === 'auto') return syncInFlight;
    await syncInFlight.catch(() => undefined);
  }
  syncInFlight = performSync(direction).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

export async function signUp(email: string, password: string): Promise<CloudAuthResponse> {
  const config = requireConfig();
  const result = await requestSignUp(config, normalizedEmail(email), checkedPassword(password));
  if (!result.session) {
    return {
      status: await getCloudStatus(),
      notice: result.needsEmailConfirmation
        ? 'Check your email to confirm the account, then sign in.'
        : 'Account created. Sign in to start syncing.'
    };
  }

  await saveSession(result.session);
  await markCloudDirty();
  try {
    await syncNow('push');
  } catch {
    // The session is still valid; status exposes the retryable sync error.
  }
  return { status: await getCloudStatus(), notice: 'Account created. Your settings are synced.' };
}

export async function signIn(email: string, password: string): Promise<CloudAuthResponse> {
  const config = requireConfig();
  const session = await requestSignIn(config, normalizedEmail(email), checkedPassword(password));
  await saveSession(session);
  try {
    await syncNow('auto');
  } catch {
    // Sign-in succeeded. The user can retry a failed sync from Settings.
  }
  return { status: await getCloudStatus(), notice: 'Signed in.' };
}

export async function recover(email: string): Promise<CloudAuthResponse> {
  const config = requireConfig();
  await sendPasswordReset(config, normalizedEmail(email));
  return { status: await getCloudStatus(), notice: 'Password reset email sent.' };
}

export async function signOut(): Promise<CloudStatus> {
  const config = getCloudConfig();
  const session = await getStoredSession();
  try {
    if (config && session) await requestSignOut(config, session);
  } finally {
    await clearSession();
  }
  return getCloudStatus();
}

export async function deleteAccount(): Promise<CloudStatus> {
  const config = requireConfig();
  const session = await usableSession();
  await deleteRemoteAccount(config, session);
  await store.clearAllData();
  return getCloudStatus();
}
