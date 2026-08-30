import type { CloudSession, CloudSyncMeta } from '../types';

const SESSION_KEY = 'signal.cloud.session';
const META_KEY = 'signal.cloud.meta';

export const EMPTY_SYNC_META: CloudSyncMeta = {
  localUpdatedAt: 0,
  lastSyncedAt: null,
  remoteUpdatedAt: null,
  pending: false
};

function isSession(value: unknown): value is CloudSession {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CloudSession>;
  return typeof item.accessToken === 'string'
    && typeof item.refreshToken === 'string'
    && typeof item.expiresAt === 'number'
    && typeof item.user?.id === 'string'
    && typeof item.user.email === 'string';
}

export async function getStoredSession(): Promise<CloudSession | null> {
  const value = (await chrome.storage.local.get(SESSION_KEY))[SESSION_KEY];
  return isSession(value) ? value : null;
}

export async function saveSession(session: CloudSession): Promise<void> {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(SESSION_KEY);
}

export async function getSyncMeta(): Promise<CloudSyncMeta> {
  const value = (await chrome.storage.local.get(META_KEY))[META_KEY];
  if (!value || typeof value !== 'object') return { ...EMPTY_SYNC_META };
  const meta = value as Partial<CloudSyncMeta>;
  return {
    localUpdatedAt: typeof meta.localUpdatedAt === 'number' ? meta.localUpdatedAt : 0,
    lastSyncedAt: typeof meta.lastSyncedAt === 'number' ? meta.lastSyncedAt : null,
    remoteUpdatedAt: typeof meta.remoteUpdatedAt === 'number' ? meta.remoteUpdatedAt : null,
    pending: !!meta.pending,
    ...(typeof meta.lastError === 'string' ? { lastError: meta.lastError.slice(0, 240) } : {})
  };
}

export async function saveSyncMeta(meta: CloudSyncMeta): Promise<void> {
  await chrome.storage.local.set({ [META_KEY]: meta });
}

export async function markCloudDirty(): Promise<void> {
  const meta = await getSyncMeta();
  await saveSyncMeta({ ...meta, localUpdatedAt: Date.now(), pending: true, lastError: undefined });
}
