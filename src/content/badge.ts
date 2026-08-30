import type { AnalysisResult } from '../types';

export const SHADOW_CSS = `
:host{all:initial;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
*,*::before,*::after{box-sizing:border-box}
button{font-family:inherit}
.sf-badge{position:absolute;top:10px;right:14px;z-index:60;display:flex;align-items:center;gap:6px;
  background:rgba(8,12,20,.82);border:1px solid rgba(255,255,255,.12);color:#e6edf3;border-radius:999px;
  padding:4px 10px;font-size:11px;font-weight:600;line-height:1;cursor:pointer;backdrop-filter:blur(6px);
  box-shadow:0 2px 10px rgba(0,0,0,.25);transition:transform .15s ease, box-shadow .15s ease}
.sf-badge:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.35)}
.sf-dot{width:7px;height:7px;border-radius:50%}
.sf-panel{position:absolute;top:34px;right:14px;z-index:70;width:272px;background:#0d1421;color:#dbe4ee;
  border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);
  display:none;font-size:12px}
.sf-open .sf-panel{display:block}
.sf-score-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.sf-big{font-size:22px;font-weight:700}
.sf-sub{color:#8b98a9;font-size:11px}
.sf-dims{display:flex;flex-direction:column;gap:5px;margin:10px 0;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
.sf-dim{display:flex;align-items:center;gap:8px}
.sf-dim span:first-child{width:86px;color:#93a1b3;font-size:10.5px;text-transform:capitalize;white-space:nowrap}
.sf-bar{flex:1;height:4px;background:rgba(255,255,255,.09);border-radius:2px;overflow:hidden}
.sf-fill{height:100%;border-radius:2px;background:#5b9dff}
.sf-why{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}
.sf-why li{line-height:1.45;color:#b7c3d2}
.sf-why li.pos::before{content:"+ ";color:#34d399;font-weight:700}
.sf-why li.neg::before{content:"− ";color:#f87171;font-weight:700}
.sf-actions{display:flex;gap:6px;margin-top:12px}
.sf-btn{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#dbe4ee;
  border-radius:8px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;text-align:center}
.sf-btn:hover{background:rgba(255,255,255,.13)}
.sf-badge:focus-visible,.sf-btn:focus-visible{outline:2px solid #5b9dff;outline-offset:2px}
@media(prefers-reduced-motion:reduce){.sf-badge{transition:none}}
`;

export function scoreColor(score: number): string {
  if (score >= 70) return '#34d399';
  if (score >= 40) return '#fbbf24';
  return '#f87171';
}

const DIM_LABELS: Array<[keyof import('../types').Dimensions, string]> = [
  ['relevance', 'Relevance'],
  ['infoDensity', 'Info density'],
  ['actionability', 'Actionable'],
  ['originality', 'Originality'],
  ['evidence', 'Evidence'],
  ['techDepth', 'Tech depth'],
  ['careerValue', 'Career value']
];

export interface BadgeCallbacks {
  onFeedback(dir: 'up' | 'down'): void;
  onShowAnyway(): void;
}

export function attachBadge(root: HTMLElement, cb: BadgeCallbacks): { update(result: AnalysisResult, hidden: boolean): void; destroy(): void } {
  // The LinkedIn renderer can move extension-owned nodes into an inner
  // wrapper during a rerender. Remove every stale badge descendant, not only
  // direct children. The attribute is a presence marker with an empty value.
  root.querySelectorAll('[data-signal-badge]').forEach((node) => node.remove());
  const host = document.createElement('div');
  host.dataset.signalHost = '';
  // Keep a truthy marker for compatibility with an older unpacked build that
  // used a truthiness check while cleaning up stale hosts.
  host.dataset.signalBadge = '1';
  host.style.cssText = 'position:absolute;top:0;right:0;';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = SHADOW_CSS;
  shadow.appendChild(style);

  let open = false;

  function toggle() {
    open = !open;
    shadow.querySelector('.sf-wrap')?.classList.toggle('sf-open', open);
    shadow.querySelector('.sf-badge')?.setAttribute('aria-expanded', String(open));
  }

  shadow.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.closest('[data-action]')?.getAttribute('data-action');
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    if (action === 'toggle') toggle();
    if (action === 'up') {
      cb.onFeedback('up');
      target.textContent = 'Thanks';
    }
    if (action === 'down') {
      cb.onFeedback('down');
      target.textContent = 'Noted';
    }
    if (action === 'show') {
      cb.onShowAnyway();
      open = false;
      shadow.querySelector('.sf-wrap')?.classList.remove('sf-open');
    }
  });

  shadow.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key !== 'Escape' || !open) return;
    open = false;
    shadow.querySelector('.sf-wrap')?.classList.remove('sf-open');
    const button = shadow.querySelector<HTMLButtonElement>('.sf-badge');
    button?.setAttribute('aria-expanded', 'false');
    button?.focus();
  });

  function update(result: AnalysisResult, hidden: boolean) {
    let wrap = shadow.querySelector('.sf-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'sf-wrap';
      wrap.innerHTML = `
        <button type="button" class="sf-badge" data-action="toggle" aria-label="Open Signal score details" aria-expanded="false" aria-controls="signal-score-panel">
          <span class="sf-dot"></span><span class="sf-score"></span>
        </button>
        <div class="sf-panel" id="signal-score-panel" role="region" aria-label="Signal score details"></div>`;
      shadow.appendChild(wrap);
    }

    const dot = shadow.querySelector<HTMLElement>('.sf-dot')!;
    dot.style.background = scoreColor(result.score);
    shadow.querySelector<HTMLElement>('.sf-score')!.textContent = `${result.score}`;

    const dimsHtml = DIM_LABELS.map(
      ([k, label]) => `<div class="sf-dim"><span>${label}</span><div class="sf-bar"><div class="sf-fill" style="width:${result.dimensions[k]}%;background:${scoreColor(result.dimensions[k])}"></div></div></div>`
    ).join('');

    const pos = result.reasons.positive.slice(0, 4).map((r) => `<li class="pos">${escapeHtml(r)}</li>`).join('');
    const neg = result.reasons.negative.slice(0, 4).map((r) => `<li class="neg">${escapeHtml(r)}</li>`).join('');
    const tags = escapeHtml(result.classification.slice(0, 4).join(' · '));

    shadow.querySelector<HTMLElement>('.sf-panel')!.innerHTML = `
      <div class="sf-score-row"><span class="sf-big" style="color:${scoreColor(result.score)}">${result.score}</span>
      <span class="sf-sub">/100 · ${tags}</span></div>
      ${pos || neg ? `<ul class="sf-why">${pos}${neg}</ul>` : ''}
      <div class="sf-dims">${dimsHtml}</div>
      <div class="sf-actions">
        <button type="button" class="sf-btn" data-action="up">Useful</button>
        <button type="button" class="sf-btn" data-action="down">Not useful</button>
        ${hidden ? '<button type="button" class="sf-btn" data-action="show">Show anyway</button>' : ''}
      </div>`;
  }

  function destroy() {
    host.remove();
  }

  // The host must live inside the post. Without this append, the badge is
  // created in memory but never reaches the page, so only collapse cards show.
  root.appendChild(host);

  return { update, destroy };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
