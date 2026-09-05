import type { BootstrapPayload, Message } from '../types';
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  normalizeProfile,
  normalizeSettings,
} from '../lib/defaults';
import { emptyStats } from '../lib/stats';
import { sampleHistory } from './data';

const KEY = 'signal.preview.workspace.v1';
type PreviewState = BootstrapPayload & { emptyStats: boolean };

function read(): PreviewState {
  let stored: Partial<PreviewState> = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    /* Recover corrupt preview data. */
  }
  return {
    settings: normalizeSettings(stored.settings ?? DEFAULT_SETTINGS),
    profile: normalizeProfile(stored.profile ?? DEFAULT_PROFILE),
    signals: stored.signals ?? {
      positive: { technical: 8, ai: 5, startup: 3 },
      negative: { 'engagement-bait': 6, promotional: 3 },
    },
    overrides: stored.overrides ?? {},
    emptyStats: stored.emptyStats ?? false,
  };
}

function write(state: PreviewState): void {
  // Preview never stores API keys, sessions, or anything from the real extension.
  state.settings.ai.apiKey = '';
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('signal-preview-change'));
}

export async function sendPreviewMessage(message: Message): Promise<unknown> {
  const state = read();
  const history = (days: number) =>
    sampleHistory(days).map((day) =>
      state.emptyStats || new URLSearchParams(location.search).has('empty')
        ? emptyStats(day.date)
        : day
    );
  switch (message.type) {
    case 'bootstrap':
      return state;
    case 'stats:getToday':
      return history(1)[0];
    case 'stats:getHistory':
      return history(message.days);
    case 'setSetting':
      state.settings = normalizeSettings({ ...state.settings, [message.key]: message.value });
      write(state);
      return state.settings;
    case 'setProfile':
      state.profile = normalizeProfile(message.value);
      write(state);
      return state.profile;
    case 'setAi':
      state.settings = normalizeSettings({
        ...state.settings,
        ai: { ...state.settings.ai, ...message.value, apiKey: '' },
      });
      write(state);
      return state.settings;
    case 'setWeights':
      state.settings.weights = message.value;
      write(state);
      return state.settings;
    case 'cloud:status':
      return { configured: false, signedIn: false, lastSyncedAt: null, pending: false };
    case 'stats:reset':
      state.emptyStats = true;
      write(state);
      return true;
    case 'data:export': {
      const { apiKey: _key, ...ai } = state.settings.ai;
      return {
        version: 1,
        preview: true,
        exportedAt: new Date().toISOString(),
        settings: { ...state.settings, ai },
        profile: state.profile,
        signals: state.signals,
        overrides: state.overrides,
        stats: history(30),
      };
    }
    case 'data:clear':
      write({
        settings: structuredClone(DEFAULT_SETTINGS),
        profile: structuredClone(DEFAULT_PROFILE),
        signals: { positive: {}, negative: {} },
        overrides: {},
        emptyStats: true,
      });
      return true;
    case 'openPage':
      location.assign(`${message.page}.html${message.section ? `#${message.section}` : ''}`);
      return true;
    case 'ai:test':
      throw new Error(
        'Install the extension to test an AI connection. This preview makes no provider requests.'
      );
    default:
      throw new Error(
        'This action is available in the installed extension, not the local preview.'
      );
  }
}
