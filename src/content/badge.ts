import type { AnalysisResult } from '../types';

export const SHADOW_CSS = `
:host{all:initial;display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
button{font-family:inherit;cursor:pointer}
.sf-badge{position:absolute;top:12px;right:14px;z-index:60;display:inline-flex;align-items:center;gap:6px;min-height:30px;background:#fff;border:1px solid #dfe5ef;color:#344766;border-radius:7px;padding:0 9px;font-size:11px;font-weight:650;line-height:1;transition:background-color .16s ease,border-color .16s ease}
.sf-badge:hover{border-color:#4764d7;background:#f3f6ff}
.sf-dot{width:6px;height:6px;flex:0 0 auto;border-radius:50%}
.sf-brand{width:11px;height:11px;color:#5b6d86}
.sf-panel{position:fixed;inset:auto;z-index:2147483647;width:304px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;background:#fff;color:#25344c;border:0;border-radius:14px;padding:19px;box-shadow:0 10px 40px rgba(25,40,70,.22);display:none;font-size:12px;margin:0}
.sf-panel:popover-open,.sf-open .sf-panel{display:block}
.sf-panel-head{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#5b6d86;margin-bottom:10px}
.sf-close{display:grid;place-items:center;width:25px;height:25px;background:transparent;border:0;border-radius:5px;color:#5b6d86;padding:0}
.sf-close:hover{background:#f0f3f8}
.sf-score-row{display:flex;align-items:baseline;gap:7px;margin-bottom:4px}
.sf-big{font-size:32px;font-weight:650;letter-spacing:-.025em}
.sf-sub{color:#5b6d86;font-size:10px;line-height:1.6}
.sf-tags{margin:0 0 13px;color:#5b6d86;font-size:10px}
.sf-dims{display:flex;flex-direction:column;gap:10px;margin:16px 0 0;padding-top:14px;border-top:1px solid #dfe5ef}
.sf-dim{display:grid;grid-template-columns:94px 1fr 24px;align-items:center;gap:8px}
.sf-dim-label{color:#5b6d86;font-size:10px;white-space:nowrap}
.sf-dim-value{text-align:right;font-size:10px;color:#43556f;font-variant-numeric:tabular-nums}
.sf-bar{height:4px;background:#eaf0f8;border-radius:4px;overflow:hidden}
.sf-fill{height:100%;border-radius:inherit;background:#4764d7}
.sf-why{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}
.sf-why li{display:flex;align-items:flex-start;gap:7px;line-height:1.6;color:#43556f;font-size:11px}
.sf-why li::before{content:"";width:5px;height:5px;flex:0 0 auto;margin-top:6px;border-radius:50%;background:#217767}
.sf-why li.neg::before{background:#b33f42}
.sf-actions{display:flex;gap:6px;margin-top:18px}
.sf-btn{flex:1;min-height:34px;background:#f7f9fc;border:1px solid #dfe5ef;color:#43556f;border-radius:7px;padding:0 8px;font-size:10px;font-weight:550;text-align:center;transition:background-color .16s ease}
.sf-btn:hover{background:#edf1ff;border-color:#c2ccdb}
.sf-btn:disabled{cursor:default;opacity:.6}
.sf-feedback-status{font-size:9px;color:#5b6d86;margin:10px 0 0;line-height:1.6}
.sf-badge:focus-visible,.sf-btn:focus-visible,.sf-close:focus-visible{outline:2px solid #4764d7;outline-offset:3px}
:host([data-signal-theme="dark"]){color-scheme:dark}:host([data-signal-theme="dark"]) .sf-badge,:host([data-signal-theme="dark"]) .sf-panel{background:#1b2433;color:#e6edf7}:host([data-signal-theme="dark"]) .sf-badge{border-color:#455770}:host([data-signal-theme="dark"]) .sf-badge:hover{background:#253456}:host([data-signal-theme="dark"]) .sf-panel-head,:host([data-signal-theme="dark"]) .sf-sub,:host([data-signal-theme="dark"]) .sf-tags,:host([data-signal-theme="dark"]) .sf-dim-label,:host([data-signal-theme="dark"]) .sf-feedback-status,:host([data-signal-theme="dark"]) .sf-close{color:#a0b0c7}:host([data-signal-theme="dark"]) .sf-why li,:host([data-signal-theme="dark"]) .sf-dim-value{color:#c1cde0}:host([data-signal-theme="dark"]) .sf-dims{border-color:#303d52}:host([data-signal-theme="dark"]) .sf-bar{background:#303d52}:host([data-signal-theme="dark"]) .sf-fill{background:#92a8ff}:host([data-signal-theme="dark"]) .sf-btn{background:#222e40;color:#e6edf7;border-color:#455770}:host([data-signal-theme="dark"]) .sf-btn:hover,:host([data-signal-theme="dark"]) .sf-close:hover{background:#29364b}
@media(prefers-reduced-motion:reduce){.sf-badge,.sf-btn{transition:none}}
`;

/** Match the post's actual surface, rather than assuming the OS theme matches LinkedIn. */
export function postTheme(root: HTMLElement): 'light' | 'dark' {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  let element: HTMLElement | null = root;
  for (let depth = 0; element && depth < 8; depth++, element = element.parentElement) {
    const color = getComputedStyle(element).backgroundColor;
    if (!/^rgba?\(/.test(color)) continue;
    const values = color.match(/[\d.]+/g)?.map(Number);
    if (!values || (values.length > 3 && values[3] < 0.5)) continue;
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722 < 128 ? 'dark' : 'light';
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#268574';
  if (score >= 40) return '#ac7b23';
  return '#c25b5e';
}

const DIM_LABELS: Array<[keyof import('../types').Dimensions, string]> = [
  ['relevance', 'Relevance'],
  ['infoDensity', 'Info density'],
  ['actionability', 'Actionable'],
  ['originality', 'Originality'],
  ['evidence', 'Evidence'],
  ['techDepth', 'Tech depth'],
  ['careerValue', 'Career value'],
];

export interface BadgeCallbacks {
  onFeedback(dir: 'up' | 'down'): void | Promise<void>;
  feedbackAcknowledgement?: string;
  onShowAnyway(): void;
}

export function attachBadge(
  root: HTMLElement,
  cb: BadgeCallbacks
): { update(result: AnalysisResult, hidden: boolean): void; destroy(): void } {
  // The LinkedIn renderer can move extension-owned nodes into an inner
  // wrapper during a rerender. Remove every stale badge descendant, not only
  // direct children. The attribute is a presence marker with an empty value.
  root.querySelectorAll('[data-signal-badge]').forEach((node) => node.remove());
  const host = document.createElement('div');
  host.dataset.signalHost = '';
  // Keep a truthy marker for compatibility with an older unpacked build that
  // used a truthiness check while cleaning up stale hosts.
  host.dataset.signalBadge = '1';
  host.dataset.signalTheme = postTheme(root);
  host.style.cssText = 'position:absolute;top:0;right:0;';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = SHADOW_CSS;
  shadow.appendChild(style);

  let open = false;

  function close() {
    open = false;
    const panel = shadow.querySelector<HTMLElement>('.sf-panel');
    if (panel?.matches(':popover-open')) panel.hidePopover();
    shadow.querySelector('.sf-wrap')?.classList.remove('sf-open');
    shadow.querySelector('.sf-badge')?.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    const panel = shadow.querySelector<HTMLElement>('.sf-panel');
    const button = shadow.querySelector<HTMLButtonElement>('.sf-badge');
    if (!panel || !button) return;
    open = true;
    const rect = button.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(rect.right - 304, window.innerWidth - 316))}px`;
    panel.style.top = `${rect.bottom + 7}px`;
    if (typeof panel.showPopover === 'function') panel.showPopover();
    else shadow.querySelector('.sf-wrap')?.classList.add('sf-open');
    const height = panel.getBoundingClientRect().height;
    if (rect.bottom + height + 19 > window.innerHeight)
      panel.style.top = `${Math.max(12, rect.top - height - 7)}px`;
    button.setAttribute('aria-expanded', 'true');
  }

  shadow.addEventListener('click', async (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    const action = target?.dataset.action;
    if (!action || !target) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === 'toggle') toggle();
    if (action === 'close') {
      close();
      shadow.querySelector<HTMLButtonElement>('.sf-badge')?.focus();
    }
    if (action === 'up' || action === 'down') {
      const buttons = shadow.querySelectorAll<HTMLButtonElement>(
        '[data-action="up"], [data-action="down"]'
      );
      buttons.forEach((button) => {
        button.disabled = true;
      });
      const status = shadow.querySelector<HTMLElement>('.sf-feedback-status');
      try {
        await cb.onFeedback(action);
        target.textContent = 'Saved';
        if (status)
          status.textContent = cb.feedbackAcknowledgement ?? 'Feedback saved for future scores.';
      } catch {
        buttons.forEach((button) => {
          button.disabled = false;
        });
        if (status) status.textContent = "Feedback wasn't saved. Please try again.";
      }
    }
    if (action === 'show') {
      close();
      cb.onShowAnyway();
    }
  });

  shadow.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key !== 'Escape' || !open) return;
    close();
    shadow.querySelector<HTMLButtonElement>('.sf-badge')?.focus();
  });

  function update(result: AnalysisResult, hidden: boolean) {
    let wrap = shadow.querySelector('.sf-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'sf-wrap';
      wrap.innerHTML = `
        <button type="button" class="sf-badge" data-action="toggle" aria-label="Open Signal score details" aria-expanded="false" aria-controls="signal-score-panel">
          <svg class="sf-brand" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10V7m4 3V4m4 6V1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="sf-dot"></span><span class="sf-score"></span>
        </button>
        <div class="sf-panel" id="signal-score-panel" popover="auto" role="region" aria-label="Signal score details"></div>`;
      shadow.appendChild(wrap);
      shadow.querySelector('.sf-panel')?.addEventListener('toggle', (event) => {
        open = (event as ToggleEvent).newState === 'open';
        shadow.querySelector('.sf-badge')?.setAttribute('aria-expanded', String(open));
      });
    }

    const dot = shadow.querySelector<HTMLElement>('.sf-dot')!;
    dot.style.background = scoreColor(result.score);
    shadow.querySelector<HTMLElement>('.sf-score')!.textContent = `${result.score}`;

    shadow
      .querySelector('.sf-badge')!
      .setAttribute('aria-label', `Signal score ${result.score} out of 100. Open score details`);
    const dimsHtml = DIM_LABELS.map(
      ([k, label]) =>
        `<div class="sf-dim"><span class="sf-dim-label">${label}</span><div class="sf-bar" aria-hidden="true"><div class="sf-fill" style="width:${Math.max(0, Math.min(100, result.dimensions[k]))}%"></div></div><span class="sf-dim-value">${Math.round(result.dimensions[k])}</span></div>`
    ).join('');

    const pos = result.reasons.positive
      .slice(0, 4)
      .map((r) => `<li class="pos">${escapeHtml(r)}</li>`)
      .join('');
    const neg = result.reasons.negative
      .slice(0, 4)
      .map((r) => `<li class="neg">${escapeHtml(r)}</li>`)
      .join('');
    const tags = escapeHtml(result.classification.slice(0, 4).join(', ').replace(/-/g, ' '));

    shadow.querySelector<HTMLElement>('.sf-panel')!.innerHTML = `
      <div class="sf-panel-head"><span>Signal score details</span><button class="sf-close" data-action="close" aria-label="Close score details"><svg width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button></div>
      <div class="sf-score-row"><span class="sf-big">${result.score}</span><span class="sf-sub">/100</span></div><p class="sf-tags">${tags}</p>
      <span class="sf-sub">${result.provider === 'heuristic' ? 'Scored on this device' : 'AI-assisted score'}</span>
      ${pos || neg ? `<ul class="sf-why">${pos}${neg}</ul>` : ''}
      <div class="sf-dims">${dimsHtml}</div>
      <div class="sf-actions">
        <button type="button" class="sf-btn" data-action="up">Useful</button>
        <button type="button" class="sf-btn" data-action="down">Not useful</button>
        ${hidden ? '<button type="button" class="sf-btn" data-action="show">Show anyway</button>' : ''}
      </div><p class="sf-feedback-status" role="status">${cb.feedbackAcknowledgement ? 'Feedback controls are safe to try in this demo.' : 'Your feedback helps shape future scores.'}</p>`;
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
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  );
}
