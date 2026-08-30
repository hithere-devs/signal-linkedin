import type { AnalysisResult, ExtensionSettings } from '../types';
import { attachBadge } from './badge';

const PAGE_CSS = `
[data-signal-post]{position:relative !important}
.sf-blurred > *:not([data-signal-host]){filter:blur(16px) grayscale(35%);pointer-events:none !important;user-select:none;transition:filter .25s ease}
`;

export const BLUR_CLASS = 'sf-blurred';

let stylesInjected = false;

export function ensurePageStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.querySelector<HTMLStyleElement>('#signal-page-css') ?? document.createElement('style');
  style.id = 'signal-page-css';
  style.textContent = PAGE_CSS;
  if (!style.isConnected) document.documentElement.appendChild(style);
}

export interface DecisionCtx {
  settings: ExtensionSettings;
  onOverride(hash: string, action: 'show' | 'hide'): void;
  onFeedback(hash: string, dir: 'up' | 'down', tags: string[]): void;
}

const placeholders = new WeakMap<HTMLElement, HTMLDivElement>();
const loadingHosts = new WeakMap<HTMLElement, HTMLDivElement>();

export function showLoadingIndicator(root: HTMLElement): void {
  if (loadingHosts.get(root)?.isConnected) return;
  ensurePageStyles();
  root.setAttribute('data-signal-post', '');

  const host = document.createElement('div');
  host.dataset.signalLoading = '';
  host.style.cssText = 'position:absolute;top:9px;right:14px;z-index:59;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host{all:initial;display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
      .loader{display:flex;align-items:center;gap:6px;background:rgba(8,12,20,.72);border:1px solid rgba(255,255,255,.1);
        color:#a8b6c8;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:600;backdrop-filter:blur(6px)}
      .spin{width:8px;height:8px;border:1px solid rgba(168,182,200,.35);border-top-color:#5b9dff;border-radius:50%;animation:spin .8s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){.spin{animation:none}}
    </style>
    <div class="loader"><span class="spin"></span><span>Signal · analyzing batch</span></div>`;
  root.appendChild(host);
  loadingHosts.set(root, host);
}

export function hideLoadingIndicator(root: HTMLElement): void {
  const host = loadingHosts.get(root);
  if (host?.isConnected) host.remove();
  loadingHosts.delete(root);
}

function buildPlaceholder(root: HTMLElement, result: AnalysisResult, ctx: DecisionCtx): HTMLDivElement {
  const existing = placeholders.get(root);
  if (existing?.isConnected) return existing;

  const host = document.createElement('div');
  host.dataset.signalHost = '';
  host.dataset.signalPlaceholder = '';
  host.style.margin = '8px 0';
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host{all:initial;display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
      .card{background:#0d1421;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;
        color:#93a1b3;font-size:12.5px;display:flex;align-items:center;gap:12px}
      .score{font-weight:700;color:#f87171;font-size:15px}
      .meta{flex:1;line-height:1.5}
      .title{color:#dbe4ee;font-weight:600;margin-bottom:2px}
      .btn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#dbe4ee;border-radius:8px;
        padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap}
      .btn:hover{background:rgba(255,255,255,.13)}
    </style>
    <div class="card">
      <span class="score">${result.score}<span style="font-size:10px;color:#6b7787">/100</span></span>
      <div class="meta">
        <div class="title">Hidden by Signal${result.isAd ? ' · Sponsored content' : ''}</div>
        <div>${escapeHtml(topReasons(result))}</div>
      </div>
      <button type="button" class="btn" data-show>Show post</button>
    </div>`;

  shadow.querySelector('[data-show]')?.addEventListener('click', () => {
    ctx.onOverride(result.hash, 'show');
    host.remove();
    root.style.display = '';
    root.classList.remove(BLUR_CLASS);
  });

  root.before(host);
  placeholders.set(root, host);
  return host;
}

function topReasons(result: AnalysisResult): string {
  const negs = result.reasons.negative.slice(0, 2);
  if (negs.length) return negs.join(' · ');
  if (result.isAd) return 'Advertisement detected';
  return `Score ${result.score} is below your threshold`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

export function shouldHidePost(result: AnalysisResult, settings: ExtensionSettings): boolean {
  if (result.isAd) return settings.hideAds;
  if (result.forceHide) return true;
  if (result.forceShow) return false;
  if (settings.jobTreatment === 'hide' && result.isJob) return true;
  return result.score < settings.threshold;
}

export function applyResultToDom(root: HTMLElement, result: AnalysisResult, ctx: DecisionCtx, hidden: boolean): void {
  ensurePageStyles();
  root.setAttribute('data-signal-post', '');

  const badge = attachBadge(root, {
    onFeedback: (dir) => ctx.onFeedback(result.hash, dir, result.classification),
    onShowAnyway: () => ctx.onOverride(result.hash, 'show')
  });
  badge.update(result, hidden);

  if (!hidden) {
    restorePost(root, ctx.settings.mode);
    return;
  }

  switch (ctx.settings.mode) {
    case 'hide':
      removePlaceholder(root);
      root.style.display = 'none';
      break;
    case 'collapse':
      root.style.display = 'none';
      buildPlaceholder(root, result, ctx);
      break;
    case 'blur': {
      removePlaceholder(root);
      root.style.display = '';
      root.classList.add(BLUR_CLASS);
      if (!root.dataset.signalBlurWired) {
        root.dataset.signalBlurWired = '1';
        root.addEventListener(
          'click',
          () => {
            root.classList.remove(BLUR_CLASS);
            window.setTimeout(() => {
              if (!revealedRoots.has(root)) root.classList.add(BLUR_CLASS);
            }, 8000);
          },
          true
        );
      }
      break;
    }
    case 'score':
    default:
      root.style.display = '';
      break;
  }
}

export function restorePost(root: HTMLElement, _mode: ExtensionSettings['mode']): void {
  void _mode;
  revealedRoots.add(root);
  root.style.display = '';
  root.classList.remove(BLUR_CLASS);
  removePlaceholder(root);
}

function removePlaceholder(root: HTMLElement): void {
  const placeholder = placeholders.get(root);
  if (placeholder?.isConnected) placeholder.remove();
  placeholders.delete(root);
}

const revealedRoots = new WeakSet<HTMLElement>();

export function markAnalyzed(root: HTMLElement): void {
  root.classList.add('signal-done');
}
