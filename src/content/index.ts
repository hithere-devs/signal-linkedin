import type {
  AnalyzeResponse,
  AnalysisResult,
  BootstrapPayload,
  ExtensionSettings,
  FeedbackSignals,
  Message,
  PostFeatures,
  StatsDelta
} from '../types';
import { createLogger } from '../lib/logger';
import { postHash } from '../lib/hash';
import { extractFeatures, findFeedPosts } from './dom';
import { applyResultToDom, ensurePageStyles, hideLoadingIndicator, markAnalyzed, showLoadingIndicator } from './filter';

const log = createLogger('content', () => state.settings?.debug ?? false);

interface State {
  settings: ExtensionSettings | null;
  profile: BootstrapPayload['profile'];
  signals: FeedbackSignals;
  overrides: Record<string, 'show' | 'hide'>;
}

const state: State = {
  settings: null,
  profile: {} as BootstrapPayload['profile'],
  signals: { positive: {}, negative: {} },
  overrides: {}
};

function send<T>(msg: Message): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res: { ok: boolean; data?: T; error?: string }) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res?.ok) return reject(new Error(res?.error ?? 'background error'));
      resolve(res.data as T);
    });
  });
}

const statsBuffer: StatsDelta = {};
let statsFlushTimer: number | null = null;

function pushStats(delta: StatsDelta): void {
  statsBuffer.analyzed = (statsBuffer.analyzed ?? 0) + (delta.analyzed ?? 0);
  statsBuffer.shown = (statsBuffer.shown ?? 0) + (delta.shown ?? 0);
  statsBuffer.hidden = (statsBuffer.hidden ?? 0) + (delta.hidden ?? 0);
  statsBuffer.adsHidden = (statsBuffer.adsHidden ?? 0) + (delta.adsHidden ?? 0);
  statsBuffer.scoreShownSum = (statsBuffer.scoreShownSum ?? 0) + (delta.scoreShownSum ?? 0);
  statsBuffer.scoreHiddenSum = (statsBuffer.scoreHiddenSum ?? 0) + (delta.scoreHiddenSum ?? 0);
  statsBuffer.categories = statsBuffer.categories ?? {};
  statsBuffer.reasonsHidden = statsBuffer.reasonsHidden ?? {};
  for (const [k, v] of Object.entries(delta.categories ?? {})) statsBuffer.categories[k] = (statsBuffer.categories[k] ?? 0) + v;
  for (const [k, v] of Object.entries(delta.reasonsHidden ?? {})) statsBuffer.reasonsHidden[k] = (statsBuffer.reasonsHidden[k] ?? 0) + v;

  const total =
    (statsBuffer.analyzed ?? 0) + (statsBuffer.shown ?? 0) + (statsBuffer.hidden ?? 0);
  if ((statsFlushTimer === null || total >= 10) && total > 0) scheduleStatsFlush();
}

function scheduleStatsFlush(): void {
  if (statsFlushTimer !== null) return;
  statsFlushTimer = window.setTimeout(async () => {
    statsFlushTimer = null;
    const snapshot = { ...statsBuffer };
    statsBuffer.analyzed = 0;
    statsBuffer.shown = 0;
    statsBuffer.hidden = 0;
    statsBuffer.adsHidden = 0;
    statsBuffer.scoreShownSum = 0;
    statsBuffer.scoreHiddenSum = 0;
    statsBuffer.categories = {};
    statsBuffer.reasonsHidden = {};
    try {
      await send({ type: 'stats:add', payload: snapshot });
    } catch {
      // extension context invalidated; ignore
    }
  }, 4000);
}

const resultsByRoot = new Map<HTMLElement, AnalysisResult>();
const analyzing = new WeakSet<HTMLElement>();
const queued = new WeakSet<HTMLElement>();
const analysisQueue: HTMLElement[] = [];
const BATCH_SIZE = 20;
let batchRunning = false;
let batchDrainTimer: number | null = null;

interface AnalysisOutcome {
  root: HTMLElement;
  result: AnalysisResult;
  settings: ExtensionSettings;
}

async function analyzePost(root: HTMLElement): Promise<AnalysisOutcome | null> {
  const features: PostFeatures | null = extractFeatures(root);
  if (!features) {
    analyzing.delete(root);
    return null;
  }
  features.id ||= `sig-${postHash({ text: `${features.text}${features.repostText ?? ''}`, authorName: features.authorName, mediaCount: features.imageCount })}`;

  try {
    const res = await send<AnalyzeResponse>({ type: 'analyze', features });
    return { root, result: res.result, settings: res.settings };
  } catch (err) {
    log.warn('analyze failed', err);
    return null;
  } finally {
    analyzing.delete(root);
  }
}

async function analyzeBatch(batch: HTMLElement[]): Promise<void> {
  // Requests run concurrently, but decisions are committed together after
  // the whole batch resolves. This prevents posts from jumping around one by
  // one while the user is reading.
  const outcomes = await Promise.all(batch.map((root) => analyzePost(root)));
  for (let i = 0; i < batch.length; i++) {
    const root = batch[i];
    const outcome = outcomes[i];
    hideLoadingIndicator(root);
    if (!root.isConnected) continue;
    if (!outcome) {
      markAnalyzed(root);
      continue;
    }
    state.settings = outcome.settings;
    resultsByRoot.set(root, outcome.result);
    applyDecision(root, outcome.result, true);
    markAnalyzed(root);
  }
}

function scheduleBatchDrain(): void {
  if (batchDrainTimer !== null || batchRunning || analysisQueue.length === 0) return;
  batchDrainTimer = window.setTimeout(() => {
    batchDrainTimer = null;
    void drainBatches();
  }, 0);
}

async function drainBatches(): Promise<void> {
  if (batchRunning || analysisQueue.length === 0) return;
  batchRunning = true;
  const batch = analysisQueue.splice(0, BATCH_SIZE).filter((root) => root.isConnected);
  for (const root of batch) {
    queued.delete(root);
    analyzing.add(root);
  }
  try {
    await analyzeBatch(batch);
  } finally {
    batchRunning = false;
    // Start the next batch immediately in the background. The feed remains
    // stable while this happens because its decisions are committed in groups.
    scheduleBatchDrain();
  }
}

function enqueueRoots(roots: HTMLElement[]): void {
  for (const root of roots) {
    if (!root.isConnected || root.classList.contains('signal-done') || queued.has(root) || analyzing.has(root)) continue;
    queued.add(root);
    analysisQueue.push(root);
    showLoadingIndicator(root);
  }
  scheduleBatchDrain();
}

function applyDecision(root: HTMLElement, result: AnalysisResult, countStats = false): void {
  const settings = state.settings;
  if (!settings) return;

  const override = state.overrides[result.hash];
  const effective: AnalysisResult = override
    ? { ...result, isAd: override === 'show' ? false : result.isAd }
    : result;

  let hidden: boolean;
  if (override === 'show') hidden = false;
  else if (result.isAd && settings.hideAds) hidden = true;
  else if (result.forceHide) hidden = true;
  else if (result.forceShow) hidden = false;
  else if (settings.jobTreatment === 'hide' && result.isJob) hidden = true;
  else hidden = effective.score < settings.threshold;

  applyResultToDom(root, effective, {
    settings,
    onOverride: (hash, action) => {
      state.overrides[hash] = action;
      void send({ type: 'override', hash, action }).catch(() => {});
      const r = resultsByRoot.get(root);
      if (r) applyDecision(root, r, false);
    },
    onFeedback: (_hash, dir, tags) => {
      void send({ type: 'feedback', hash: result.hash, dir, tags }).catch(() => {});
    }
  }, hidden);

  const primaryCat = (result.classification[0] ?? 'general').slice(0, 40);
  if (countStats) {
    pushStats({
      analyzed: 1,
      shown: hidden ? 0 : 1,
      hidden: hidden ? 1 : 0,
      adsHidden: hidden && result.isAd ? 1 : 0,
      scoreShownSum: hidden ? 0 : result.score,
      scoreHiddenSum: hidden ? result.score : 0,
      categories: { [primaryCat]: 1 },
      reasonsHidden: hidden ? { [topReasonKey(result)]: 1 } : {}
    });
  }

  log.debug('decision', result.hash, result.score, hidden, primaryCat);
}

function topReasonKey(result: AnalysisResult): string {
  return result.isAd ? 'Sponsored' : result.reasons.negative[0]?.slice(0, 40) || `Score ${result.score}`;
}

function scan(): void {
  if (!state.settings) return;
  enqueueRoots(findFeedPosts());
  for (const root of [...resultsByRoot.keys()]) {
    if (!root.isConnected) resultsByRoot.delete(root);
  }
}

function reevaluateAll(): void {
  for (const [root, result] of resultsByRoot) {
    if (root.isConnected && root.classList.contains('signal-done')) {
      applyDecision(root, result, false);
    }
  }
}

let moTimer: number | null = null;
function scheduleScan(): void {
  if (moTimer !== null) return;
  moTimer = window.setTimeout(() => {
    moTimer = null;
    scan();
  }, 250);
}

async function init(): Promise<void> {
  try {
    const boot = await send<BootstrapPayload>({ type: 'bootstrap' });
    state.settings = boot.settings;
    state.profile = boot.profile;
    state.signals = boot.signals;
    state.overrides = boot.overrides;
  } catch (err) {
    console.error('[signal] failed to bootstrap', err);
    return;
  }

  if (!location.hostname.includes('linkedin.com')) return;
  document.querySelectorAll('[data-signal-loading], [data-signal-badge], [data-signal-placeholder]').forEach((node) => node.remove());
  document.querySelectorAll<HTMLElement>('[data-signal-post]').forEach((root) => {
    root.style.display = '';
    root.classList.remove('sf-blurred', 'signal-done');
  });
  ensurePageStyles();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes['signal.settings']) state.settings = changes['signal.settings'].newValue as ExtensionSettings;
    if (changes['signal.overrides']) state.overrides = (changes['signal.overrides'].newValue ?? {}) as Record<string, 'show' | 'hide'>;
    if (changes['signal.signals']) state.signals = changes['signal.signals'].newValue as FeedbackSignals;
    if (changes['signal.settings'] || changes['signal.overrides']) reevaluateAll();
  });

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });

  window.setInterval(() => {
    if (document.visibilityState === 'visible') scan();
  }, 4000);

  scan();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init());
} else {
  void init();
}
