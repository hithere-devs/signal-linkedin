import { useCallback, useEffect, useState } from 'react';
import type { BootstrapPayload, CloudStatus, DailyStats, ExtensionSettings } from '../types';
import { avgScore, estimateTimeSavedMinutes } from '../lib/stats';
import { sendMessage } from '../lib/runtime';

const PRESETS: Array<[string, number]> = [
  ['Off', 0],
  ['Chill', 30],
  ['Balanced', 55],
  ['Strict', 75],
  ['Only best', 90]
];

const MODES: Array<{ value: ExtensionSettings['mode']; label: string; hint: string }> = [
  { value: 'collapse', label: 'Collapse', hint: 'Replace hidden posts with a small card' },
  { value: 'hide', label: 'Hide', hint: 'Remove hidden posts entirely' },
  { value: 'blur', label: 'Blur', hint: 'Blur until clicked' },
  { value: 'score', label: 'Score only', hint: 'Show everything with a score badge' }
];

function thresholdLabel(v: number): string {
  if (v === 0) return 'Off, show everything';
  if (v < 30) return 'Relaxed';
  if (v < 60) return 'Balanced';
  if (v < 85) return 'Strict';
  return 'Only the best';
}

export default function App() {
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    void Promise.all([
      sendMessage<BootstrapPayload>({ type: 'bootstrap' }),
      sendMessage<DailyStats>({ type: 'stats:getToday' }),
      sendMessage<CloudStatus>({ type: 'cloud:status' })
    ])
      .then(([payload, today, cloudStatus]) => {
        setBoot(payload);
        setStats(today);
        setCloud(cloudStatus);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  useEffect(load, [load]);

  const settings = boot?.settings;
  const profile = boot?.profile;

  const patch = useCallback(
    async (key: keyof ExtensionSettings, value: unknown) => {
      const previous = boot?.settings;
      setBoot((b) => (b ? { ...b, settings: { ...b.settings, [key]: value } } : b));
      setError(null);
      try {
        const saved = await sendMessage<ExtensionSettings>({ type: 'setSetting', key, value });
        setBoot((current) => current ? { ...current, settings: saved } : current);
      } catch (reason) {
        if (previous) setBoot((current) => current ? { ...current, settings: previous } : current);
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    },
    [boot?.settings]
  );

  if (!settings || !profile) {
    return (
      <div className="wrap">
        <div className="loading" role="status">{error ?? 'Loading Signal…'}</div>
        {error && <button className="btn full" onClick={load}>Try again</button>}
      </div>
    );
  }

  const filtered = stats ? stats.hidden : 0;
  const timeSaved = stats ? estimateTimeSavedMinutes(stats) : 0;

  return (
    <div className="wrap">
      <header className="header">
        <div className="logo-row">
          <span className="logo-mark" />
          <div>
            <h1>SIGNAL</h1>
            <p>LinkedIn Feed Intelligence</p>
          </div>
        </div>
        <button
          className="account-link"
          title={cloud?.signedIn ? `Signed in as ${cloud.user?.email}` : 'Open account settings'}
          onClick={() => void sendMessage({ type: 'openPage', page: 'settings' }).catch((reason) => setError(String(reason)))}
        >
          <span className={`sync-dot ${cloud?.signedIn ? 'online' : ''}`} aria-hidden="true" />
          {cloud?.signedIn ? 'Synced' : 'Account'}
        </button>
      </header>

      {error && <div className="popup-error" role="alert">{error}</div>}

      <section className="card slider-card">
        <div className="score-display">
          <span className="big-score">{settings.threshold}</span>
          <span className={`threshold-label ${settings.threshold === 0 ? 'off' : ''}`}>{thresholdLabel(settings.threshold)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={settings.threshold}
          aria-label="Minimum post score"
          onChange={(e) => void patch('threshold', Number(e.target.value))}
        />
        <div className="presets">
          {PRESETS.map(([label, v]) => (
            <button
              key={label}
              className={`preset ${settings.threshold === v ? 'active' : ''}`}
              onClick={() => void patch('threshold', v)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="hint">Posts scoring below this are filtered from your feed.</p>
      </section>

      <section className="card">
        <h2>Filtering mode</h2>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={`mode ${settings.mode === m.value ? 'active' : ''}`}
              title={m.hint}
              onClick={() => void patch('mode', m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Hide sponsored content</div>
            <div className="toggle-sub">Removes LinkedIn ads from your feed</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.hideAds} onChange={(e) => void patch('hideAds', e.target.checked)} />
            <span className="slider-ui" />
          </label>
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">AI deep analysis</div>
            <div className="toggle-sub">
              {settings.ai.enabled ? `On · ${settings.ai.model || 'model not set'}` : 'Off, using local heuristics'}
            </div>
          </div>
          <button className="btn btn-small" onClick={() => void sendMessage({ type: 'openPage', page: 'settings' }).catch((reason) => setError(String(reason)))}>
            Configure
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Your interests</h2>
        <p className="interests">{[...profile.interests.slice(0, 4), ...profile.industries.slice(0, 3)].join(' · ') || 'Not configured'}</p>
        <button className="btn full" onClick={() => void sendMessage({ type: 'openPage', page: 'settings' }).catch((reason) => setError(String(reason)))}>
          Edit profile
        </button>
      </section>

      <section className="card stats-card">
        <h2>Today's feed</h2>
        <div className="stats-grid">
          <div><strong>{stats?.analyzed ?? 0}</strong><span>analyzed</span></div>
          <div><strong>{(stats?.shown ?? 0)}</strong><span>shown</span></div>
          <div className="filtered"><strong>{filtered}</strong><span>filtered</span></div>
        </div>
        {(stats?.shown ?? 0) > 0 && (
          <p className="avg">Avg score shown {avgScore(stats!.scoreShownSum, stats!.shown)} · hidden {avgScore(stats!.scoreHiddenSum, stats!.hidden)}</p>
        )}
        <p className="time-saved">≈{timeSaved < 1 ? '<1' : Math.round(timeSaved)} min of scrolling saved</p>
        <button className="btn full" onClick={() => void sendMessage({ type: 'openPage', page: 'dashboard' }).catch((reason) => setError(String(reason)))}>
          Open dashboard
        </button>
      </section>
    </div>
  );
}
