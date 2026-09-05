import type { AnalyzeResponse, AnalysisResult, ExtensionSettings, Message, PostFeatures } from '../types';
import { getProvider } from '../ai/provider';
import { analyzeLocally, blendResults, hashFeatures, makeResult, needsDeepAnalysis } from '../ai/scoring';
import * as store from '../lib/storage';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../lib/defaults';
import * as cloud from '../cloud/sync';

const CLOUD_SYNC_ALARM = 'signal.cloud.sync';
const CLOUD_PERIODIC_ALARM = 'signal.cloud.periodic';

let llmActive = 0;
const LLM_CONCURRENCY = 2;

const semaphore = {
  canRun(): boolean {
    return llmActive < LLM_CONCURRENCY;
  },
  acquire() {
    llmActive++;
  },
  release() {
    llmActive = Math.max(0, llmActive - 1);
  }
};

async function handleAnalyze(features: PostFeatures): Promise<AnalyzeResponse> {
  const [settings, profile, signals] = await Promise.all([store.getSettings(), store.getProfile(), store.getSignals()]);
  const hash = hashFeatures(features);
  const cached = await store.cacheGet(hash);
  if (cached) return { result: cached, settings };

  const heur = analyzeLocally({ features, profile, weights: settings.weights, signals });
  const result0 = makeResult(features, heur);

  let result: AnalysisResult = result0;

  if (settings.enabled && !features.isAd && needsDeepAnalysis(heur) && settings.ai.enabled && semaphore.canRun()) {
    const provider = getProvider(settings.ai);
    if (provider) {
      semaphore.acquire();
      try {
        const llm = await provider.analyze({ features, profile, config: settings.ai });
        if (llm) result = blendResults(result0, llm);
      } catch {
        // heuristic fallback already in place
      } finally {
        semaphore.release();
      }
    }
  }

  await store.cacheSet(result);
  return { result, settings };
}

function extractFeedbackTags(classification: string[]): string[] {
  return classification.filter((c) => c !== 'general').slice(0, 5);
}

async function markForSync(): Promise<void> {
  await cloud.markCloudDirty();
  await chrome.alarms.create(CLOUD_SYNC_ALARM, { delayInMinutes: 1 });
}

async function mutate<T>(operation: Promise<T>): Promise<T> {
  const result = await operation;
  await markForSync();
  return result;
}

async function route(msg: Message): Promise<unknown> {
  switch (msg.type) {
    case 'bootstrap':
      return store.getBootstrap();
    case 'analyze':
      return handleAnalyze(msg.features);
    case 'setSetting':
      return mutate(store.patchSettings({ [msg.key]: msg.value } as Partial<ExtensionSettings>));
    case 'setAi':
      return mutate(store.patchAi(msg.value));
    case 'setProfile':
      await store.saveProfile(msg.value);
      await markForSync();
      return store.getProfile();
    case 'setWeights':
      return mutate(store.patchSettings({ weights: msg.value }));
    case 'override':
      await store.setOverride(msg.hash, msg.action);
      await markForSync();
      return true;
    case 'feedback':
      if (msg.dir === 'up') await store.bumpSignal('positive', extractFeedbackTags(msg.tags), 1);
      else await store.bumpSignal('negative', extractFeedbackTags(msg.tags), 1);
      await markForSync();
      return true;
    case 'stats:add':
      await store.addStats(msg.payload);
      await markForSync();
      return true;
    case 'stats:getToday':
      return store.getTodayStats();
    case 'stats:getHistory':
      return store.getStatsHistory(msg.days ?? 7);
    case 'stats:reset':
      await store.resetStats();
      await markForSync();
      return true;
    case 'data:export':
      return store.exportData();
    case 'data:clear':
      await store.clearAllData();
      return true;
    case 'ai:test': {
      const ai = await store.getAi();
      const provider = getProvider({ ...ai, enabled: true });
      if (!provider) return { ok: false, error: 'Add a provider URL and model before testing the connection.' };
      return provider.testConnection();
    }
    case 'cloud:status':
      return cloud.getCloudStatus();
    case 'cloud:signup':
      return cloud.signUp(msg.email, msg.password);
    case 'cloud:signin':
      return cloud.signIn(msg.email, msg.password);
    case 'cloud:signout':
      return cloud.signOut();
    case 'cloud:recover':
      return cloud.recover(msg.email);
    case 'cloud:sync':
      return cloud.syncNow(msg.direction ?? 'auto');
    case 'cloud:deleteAccount':
      return cloud.deleteAccount();
    case 'openPage':
      if (msg.page !== 'dashboard' && msg.page !== 'settings' && msg.page !== 'demo') throw new Error('Unsupported page.');
      const sections = ['profile', 'feed', 'ai', 'account', 'privacy'];
      const hash = msg.page === 'settings' && msg.section && sections.includes(msg.section) ? `#${msg.section}` : '';
      await chrome.tabs.create({ url: chrome.runtime.getURL(`${msg.page}.html${hash}`) });
      return true;
    default:
      throw new Error('Unsupported message.');
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get(['signal.settings', 'signal.profile']);
  if (!existing['signal.settings']) await store.saveSettings(DEFAULT_SETTINGS);
  if (!existing['signal.profile']) await store.saveProfile(DEFAULT_PROFILE);
  await chrome.alarms.create(CLOUD_PERIODIC_ALARM, { periodInMinutes: 30 });
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('settings.html?welcome=1') });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(CLOUD_PERIODIC_ALARM, { periodInMinutes: 30 });
  void cloud.syncNow('auto').catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CLOUD_SYNC_ALARM || alarm.name === CLOUD_PERIODIC_ALARM) {
    void cloud.syncNow('auto').catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object' || typeof (msg as { type?: unknown }).type !== 'string') {
    sendResponse({ ok: false, error: 'Invalid message.' });
    return false;
  }
  route(msg)
    .then((res) => sendResponse({ ok: true, data: res }))
    .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  return true;
});
