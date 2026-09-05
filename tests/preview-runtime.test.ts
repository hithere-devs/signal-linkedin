import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPreviewMessage } from '../src/preview/runtime';

let memory: Map<string, string>;
beforeEach(() => {
  memory = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('location', { search: '', assign: vi.fn() });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Preview must not make network requests');
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('isolated web preview', () => {
  it('never stores or exports a submitted API key', async () => {
    await sendPreviewMessage({
      type: 'setAi',
      value: { apiKey: 'a-fictional-test-secret', model: 'example-model' },
    });
    expect([...memory.values()].join('')).not.toContain('a-fictional-test-secret');
    const data = await sendPreviewMessage({ type: 'data:export' });
    expect(JSON.stringify(data)).not.toContain('apiKey');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses provider tests instead of simulating a successful connection', async () => {
    await expect(sendPreviewMessage({ type: 'ai:test' })).rejects.toThrow('Install the extension');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not offer a fake cloud account', async () => {
    expect(await sendPreviewMessage({ type: 'cloud:status' })).toMatchObject({
      configured: false,
      signedIn: false,
    });
    await expect(
      sendPreviewMessage({
        type: 'cloud:signin',
        email: 'fictional@example.com',
        password: 'test-only',
      })
    ).rejects.toThrow('installed extension');
  });
  it('keeps changes within its own storage namespace', async () => {
    await sendPreviewMessage({ type: 'setSetting', key: 'threshold', value: 75 });
    expect([...memory.keys()]).toEqual(['signal.preview.workspace.v1']);
    expect(await sendPreviewMessage({ type: 'bootstrap' })).toMatchObject({
      settings: { threshold: 75 },
    });
  });
});
