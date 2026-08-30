import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../src/lib/defaults';
import { applySyncSnapshot, createSyncSnapshot, getSettings, saveProfile, saveSettings } from '../src/lib/storage';
import type { SyncSnapshot } from '../src/types';

function installChromeStorageMock() {
  const memory: Record<string, unknown> = {};
  const local = {
    get: vi.fn(async (keys: string | string[] | null) => {
      if (keys === null) return { ...memory };
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(requested.filter((key) => key in memory).map((key) => [key, memory[key]]));
    }),
    set: vi.fn(async (values: Record<string, unknown>) => Object.assign(memory, values)),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete memory[key];
    }),
    clear: vi.fn(async () => {
      for (const key of Object.keys(memory)) delete memory[key];
    })
  };
  vi.stubGlobal('chrome', { storage: { local } });
  return memory;
}

beforeEach(() => installChromeStorageMock());
afterEach(() => vi.unstubAllGlobals());

describe('cloud-safe storage snapshots', () => {
  it('never includes the local AI key', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, enabled: true, apiKey: 'private-key', model: 'test-model' }
    });
    await saveProfile(DEFAULT_PROFILE);

    const snapshot = await createSyncSnapshot(1234);
    expect(snapshot.updatedAt).toBe(1234);
    expect(snapshot.settings.ai.model).toBe('test-model');
    expect('apiKey' in snapshot.settings.ai).toBe(false);
  });

  it('preserves the local AI key when restoring cloud settings', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, ai: { ...DEFAULT_SETTINGS.ai, apiKey: 'keep-local' } });
    const snapshot: SyncSnapshot = {
      version: 1,
      updatedAt: 5000,
      settings: {
        ...DEFAULT_SETTINGS,
        threshold: 80,
        ai: { enabled: true, preset: 'custom', baseUrl: 'https://api.example.com/v1', model: 'model-a', vision: false }
      },
      profile: { ...DEFAULT_PROFILE, role: 'Research Engineer' },
      signals: { positive: { technical: 3 }, negative: {} },
      overrides: { hash: 'show' },
      stats: []
    };

    await applySyncSnapshot(snapshot);
    const settings = await getSettings();
    expect(settings.threshold).toBe(80);
    expect(settings.ai.model).toBe('model-a');
    expect(settings.ai.apiKey).toBe('keep-local');
  });
});
