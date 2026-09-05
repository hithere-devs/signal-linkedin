import type { AnalysisResult, ExtensionSettings } from '../types';
import { attachBadge, postTheme } from './badge';
export { shouldHidePost } from '../lib/filtering';

const PAGE_CSS = `
[data-signal-post]{position:relative !important}
.sf-blurred > *:not([data-signal-host]){filter:blur(16px) grayscale(35%);pointer-events:none !important;user-select:none;transition:filter .25s ease}
`;

export const BLUR_CLASS = 'sf-blurred';

let stylesInjected = false;

export function ensurePageStyles(): void {
  if (stylesInjected && document.getElementById('signal-page-css')) return;
  stylesInjected = true;
  const style =
    document.querySelector<HTMLStyleElement>('#signal-page-css') ?? document.createElement('style');
  style.id = 'signal-page-css';
  style.textContent = PAGE_CSS;
  if (!style.isConnected) document.documentElement.appendChild(style);
}

export interface DecisionCtx {
  settings: ExtensionSettings;
  feedbackAcknowledgement?: string;
  onOverride(hash: string, action: 'show' | 'hide'): void;
  onFeedback(hash: string, dir: 'up' | 'down', tags: string[]): void | Promise<void>;
}

const placeholders = new WeakMap<HTMLElement, HTMLDivElement>();
const loadingHosts = new WeakMap<HTMLElement, HTMLDivElement>();
const originalInert = new WeakMap<HTMLElement, boolean>();

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
      :host{all:initial;display:block;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .loader{display:flex;align-items:center;gap:7px;min-height:28px;background:#fff;border:1px solid #dfe5ef;
        color:#5b6d86;border-radius:7px;padding:0 10px;font-size:10px;font-weight:700}
      .spin{width:9px;height:9px;border:1px solid rgba(71,100,215,.25);border-top-color:#4764d7;border-radius:50%;animation:spin .8s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){.spin{animation:none}}
    </style>
    <div class="loader"><span class="spin"></span><span>Signal is reviewing</span></div>`;
  root.appendChild(host);
  loadingHosts.set(root, host);
}

export function hideLoadingIndicator(root: HTMLElement): void {
  const host = loadingHosts.get(root);
  if (host?.isConnected) host.remove();
  loadingHosts.delete(root);
}

function buildPlaceholder(
  root: HTMLElement,
  result: AnalysisResult,
  ctx: DecisionCtx
): HTMLDivElement {
  const existing = placeholders.get(root);
  if (existing?.isConnected) return existing;

  const host = document.createElement('div');
  host.dataset.signalHost = '';
  host.dataset.signalPlaceholder = '';
  host.dataset.signalTheme = postTheme(root);
  host.style.margin = '8px 0';
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host{all:initial;display:block;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .card{background:#f7f9fc;border:1px solid #dfe5ef;border-radius:12px;padding:13px 15px;
        color:#5b6d86;font-size:12px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px}
      .score{font-weight:650;color:#43556f;font-size:17px;letter-spacing:-.025em}
      .score span{font-size:10px;color:#5b6d86}
      .meta{min-width:0;line-height:1.45}
      .title{overflow:hidden;color:#25344c;font-weight:600;margin-bottom:2px;text-overflow:ellipsis;white-space:nowrap}
      .btn{min-height:32px;background:#fff;border:1px solid #c2ccdb;color:#43556f;border-radius:9px;
        padding:0 11px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn:hover{background:#edf1ff;border-color:#4764d7}
      .btn:focus-visible{outline:2px solid #4764d7;outline-offset:3px}
      :host([data-signal-theme="dark"]) .card{background:#1b2433;border-color:#303d52;color:#a0b0c7}:host([data-signal-theme="dark"]) .score,:host([data-signal-theme="dark"]) .title{color:#e6edf7}:host([data-signal-theme="dark"]) .btn{background:#222e40;border-color:#455770;color:#e6edf7}:host([data-signal-theme="dark"]) .btn:hover{background:#29364b}
      @media(max-width:380px){.card{gap:8px;padding:12px}.score{font-size:15px}.btn{padding:0 8px}.meta{font-size:11px}}
    </style>
    <div class="card">
      <span class="score">${result.score}<span>/100</span></span>
      <div class="meta">
        <div class="title">Filtered by Signal${result.isAd ? ' · Sponsored' : ''}</div>
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
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  );
}

export function applyResultToDom(
  root: HTMLElement,
  result: AnalysisResult,
  ctx: DecisionCtx,
  hidden: boolean
): void {
  ensurePageStyles();
  root.setAttribute('data-signal-post', '');
  restorePost(root, ctx.settings.mode);
  root.querySelectorAll('[data-signal-blur]').forEach((node) => node.remove());

  if (!ctx.settings.enabled) {
    root.querySelectorAll('[data-signal-badge]').forEach((node) => node.remove());
    return;
  }

  const badge = attachBadge(root, {
    feedbackAcknowledgement: ctx.feedbackAcknowledgement,
    onFeedback: (dir) => ctx.onFeedback(result.hash, dir, result.classification),
    onShowAnyway: () => ctx.onOverride(result.hash, 'show'),
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
      for (const child of Array.from(root.children)) {
        if (child instanceof HTMLElement && !child.hasAttribute('data-signal-host')) {
          if (!originalInert.has(child)) originalInert.set(child, child.inert);
          child.inert = true;
        }
      }
      const reveal = document.createElement('div');
      reveal.dataset.signalHost = '';
      reveal.dataset.signalBlur = '';
      reveal.style.cssText =
        'position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:58';
      const shadow = reveal.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>:host{font-family:system-ui,sans-serif}button{pointer-events:auto;font:600 13px system-ui,sans-serif;padding:12px 18px;border:1px solid #dfe5ef;border-radius:9px;background:#fff;color:#25344c;cursor:pointer}button:focus-visible{outline:2px solid #4764d7;outline-offset:3px}</style><button type="button">Show this post</button>`;
      shadow.querySelector('button')!.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        ctx.onOverride(result.hash, 'show');
      });
      root.appendChild(reveal);
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
  root.style.display = '';
  root.classList.remove(BLUR_CLASS);
  for (const child of Array.from(root.children)) {
    if (child instanceof HTMLElement && originalInert.has(child)) {
      child.inert = originalInert.get(child)!;
      originalInert.delete(child);
    }
  }
  root.querySelectorAll('[data-signal-blur]').forEach((node) => node.remove());
  removePlaceholder(root);
}

function removePlaceholder(root: HTMLElement): void {
  const placeholder = placeholders.get(root);
  if (placeholder?.isConnected) placeholder.remove();
  placeholders.delete(root);
}

export function markAnalyzed(root: HTMLElement): void {
  root.classList.add('signal-done');
}
