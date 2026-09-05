import type {
  AnalysisResult,
  BootstrapPayload,
  DailyStats,
  ExtensionSettings,
  FeedbackSignals,
  SyncSnapshot,
  UserProfile
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_PROFILE, normalizeProfile, normalizeSettings } from './defaults';
import { emptyStats, mergeStats, todayKey } from './stats';

const K = {
  settings: 'signal.settings',
  profile: 'signal.profile',
  signals: 'signal.signals',
  overrides: 'signal.overrides',
  cache: 'signal.cache',
  statsPrefix: 'signal.stats.'
} as const;

const CACHE_LIMIT = 600;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let settingsWrite: Promise<unknown> = Promise.resolve();
let statsWrite: Promise<unknown> = Promise.resolve();
function serializeSettings<T>(write: () => Promise<T>): Promise<T> {
  const next = settingsWrite.catch(() => {}).then(write);
  settingsWrite = next;
  return next;
}

function serializeStats<T>(write: () => Promise<T>): Promise<T> {
  const next = statsWrite.catch(() => {}).then(write);
  statsWrite = next;
  return next;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const raw = (await chrome.storage.local.get(K.settings))[K.settings];
  return normalizeSettings(raw as Partial<ExtensionSettings>);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [K.settings]: normalizeSettings(settings) });
}

export async function patchSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  return serializeSettings(async () => {
    const current = await getSettings();
    const next = normalizeSettings({ ...current, ...patch });
    await saveSettings(next);
    // Display controls do not change scores and should not discard the cache.
    if (patch.weights || patch.ai) await clearCache();
    return next;
  });
}

export async function getAi(): Promise<ExtensionSettings['ai']> {
  return (await getSettings()).ai;
}

export async function patchAi(patch: Partial<ExtensionSettings['ai']>): Promise<ExtensionSettings> {
  return serializeSettings(async () => {
    const current = await getSettings();
    const next = normalizeSettings({ ...current, ai: { ...current.ai, ...patch } });
    await saveSettings(next);
    await clearCache();
    return next;
  });
}

export async function getProfile(): Promise<UserProfile> {
  const raw = (await chrome.storage.local.get(K.profile))[K.profile];
  return normalizeProfile(raw as Partial<UserProfile>);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await chrome.storage.local.set({ [K.profile]: normalizeProfile(profile) });
  await clearCache();
}

export async function getSignals(): Promise<FeedbackSignals> {
  const raw = (await chrome.storage.local.get(K.signals))[K.signals];
  if (!raw || typeof raw !== 'object') return { positive: {}, negative: {} };
  const value = raw as Partial<FeedbackSignals>;
  return {
    positive: normalizeSignalMap(value.positive),
    negative: normalizeSignalMap(value.negative)
  };
}

function normalizeSignalMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, score]) => key.length > 0 && key.length <= 40 && typeof score === 'number' && Number.isFinite(score))
      .map(([key, score]) => [key, Math.max(-1000, Math.min(1000, score as number))])
      .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
      .slice(0, 120)
  );
}

export async function saveSignals(signals: FeedbackSignals): Promise<void> {
  await chrome.storage.local.set({
    [K.signals]: {
      positive: normalizeSignalMap(signals.positive),
      negative: normalizeSignalMap(signals.negative)
    }
  });
}

export async function bumpSignal(dir: 'positive' | 'negative', tags: string[], weight = 1): Promise<void> {
  const signals = await getSignals();
  for (const t of tags) {
    const key = t.toLowerCase().trim().slice(0, 40);
    if (!key) continue;
    signals[dir][key] = (signals[dir][key] ?? 0) + weight;
  }
  const cap = (obj: Record<string, number>) => {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 120);
    return Object.fromEntries(entries);
  };
  signals.positive = cap(signals.positive);
  signals.negative = cap(signals.negative);
  await chrome.storage.local.set({ [K.signals]: signals });
}

export async function getOverrides(): Promise<Record<string, 'show' | 'hide'>> {
  const raw = (await chrome.storage.local.get(K.overrides))[K.overrides];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([hash, action]) => hash.length > 0 && hash.length <= 128 && (action === 'show' || action === 'hide'))
      .slice(-400)
  ) as Record<string, 'show' | 'hide'>;
}

export async function saveOverrides(overrides: Record<string, 'show' | 'hide'>): Promise<void> {
  const normalized = Object.fromEntries(
    Object.entries(overrides)
      .filter(([hash, action]) => hash.length > 0 && hash.length <= 128 && (action === 'show' || action === 'hide'))
      .slice(-400)
  );
  await chrome.storage.local.set({ [K.overrides]: normalized });
}

export async function setOverride(hash: string, action: 'show' | 'hide'): Promise<void> {
  const overrides = await getOverrides();
  overrides[hash] = action;
  const pruned = Object.fromEntries(Object.entries(overrides).slice(-400));
  await chrome.storage.local.set({ [K.overrides]: pruned });
}

interface CacheShape {
  [hash: string]: AnalysisResult;
}

export async function cacheGet(hash: string): Promise<AnalysisResult | null> {
  const cache = ((await chrome.storage.local.get(K.cache))[K.cache] ?? {}) as CacheShape;
  const hit = cache[hash];
  if (!hit) return null;
  if (Date.now() - hit.analyzedAt > CACHE_TTL_MS) return null;
  return hit;
}

export async function cacheSet(result: AnalysisResult): Promise<void> {
  const cache = (((await chrome.storage.local.get(K.cache))[K.cache] ?? {}) as CacheShape);
  cache[result.hash] = result;
  const entries = Object.entries(cache).sort((a, b) => b[1].analyzedAt - a[1].analyzedAt).slice(0, CACHE_LIMIT);
  await chrome.storage.local.set({ [K.cache]: Object.fromEntries(entries) });
}

export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove(K.cache);
}

export async function getBootstrap(): Promise<BootstrapPayload> {
  const [settings, profile, signals, overrides] = await Promise.all([getSettings(), getProfile(), getSignals(), getOverrides()]);
  return { settings, profile, signals, overrides };
}

export async function addStats(delta: import('../types').StatsDelta): Promise<void> {
  return serializeStats(async () => {
    const key = `${K.statsPrefix}${todayKey()}`;
    const current = ((await chrome.storage.local.get(key))[key] as DailyStats | undefined) ?? emptyStats();
    await chrome.storage.local.set({ [key]: mergeStats(current, delta) });
  });
}

export async function getTodayStats(): Promise<DailyStats> {
  const key = `${K.statsPrefix}${todayKey()}`;
  return ((await chrome.storage.local.get(key))[key] as DailyStats | undefined) ?? emptyStats();
}

export async function getStatsHistory(days: number): Promise<DailyStats[]> {
  const out: DailyStats[] = [];
  const safeDays = Math.max(1, Math.min(90, Math.round(Number.isFinite(days) ? days : 7)));
  for (let i = 0; i < safeDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = todayKey(d);
    const key = `${K.statsPrefix}${date}`;
    const s = ((await chrome.storage.local.get(key))[key] as DailyStats | undefined) ?? emptyStats(date);
    out.push(s);
  }
  return out;
}

export async function resetStats(): Promise<void> {
  return serializeStats(async () => {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith(K.statsPrefix));
    if (keys.length) await chrome.storage.local.remove(keys);
  });
}

export async function exportData(): Promise<Record<string, unknown>> {
  return {
    exportedAt: new Date().toISOString(),
    ...(await createSyncSnapshot(Date.now()))
  };
}

export async function createSyncSnapshot(updatedAt: number): Promise<SyncSnapshot> {
  const [settings, profile, signals, overrides, stats] = await Promise.all([
    getSettings(),
    getProfile(),
    getSignals(),
    getOverrides(),
    getStatsHistory(30)
  ]);
  const { apiKey: _apiKey, ...safeAi } = settings.ai;
  return {
    version: 1,
    updatedAt,
    settings: { ...settings, ai: safeAi },
    profile,
    signals,
    overrides,
    stats: stats.filter((item) => item.analyzed > 0 || item.shown > 0 || item.hidden > 0 || item.adsHidden > 0)
  };
}

function validStats(value: unknown): DailyStats[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is DailyStats => {
      if (!item || typeof item !== 'object') return false;
      const stats = item as Partial<DailyStats>;
      return typeof stats.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stats.date);
    })
    .slice(0, 30);
}

export async function applySyncSnapshot(snapshot: SyncSnapshot): Promise<void> {
  const current = await getSettings();
  const settings = normalizeSettings({
    ...snapshot.settings,
    ai: { ...snapshot.settings.ai, apiKey: current.ai.apiKey }
  });
  const stats = validStats(snapshot.stats);
  const all = await chrome.storage.local.get(null);
  const oldStats = Object.keys(all).filter((key) => key.startsWith(K.statsPrefix));
  const nextStats = Object.fromEntries(stats.map((item) => [`${K.statsPrefix}${item.date}`, item]));

  if (oldStats.length) await chrome.storage.local.remove(oldStats);
  await chrome.storage.local.set({
    [K.settings]: settings,
    [K.profile]: normalizeProfile(snapshot.profile),
    [K.signals]: {
      positive: normalizeSignalMap(snapshot.signals?.positive),
      negative: normalizeSignalMap(snapshot.signals?.negative)
    },
    [K.overrides]: Object.fromEntries(
      Object.entries(snapshot.overrides ?? {})
        .filter(([hash, action]) => hash.length > 0 && hash.length <= 128 && (action === 'show' || action === 'hide'))
        .slice(-400)
    ),
    ...nextStats
  });
  await clearCache();
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
  await chrome.storage.local.set({
    [K.settings]: DEFAULT_SETTINGS,
    [K.profile]: DEFAULT_PROFILE,
    [K.signals]: { positive: {}, negative: {} },
    [K.overrides]: {}
  });
}
