import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Blend,
  ChevronRight,
  ChevronsDownUp,
  EyeOff,
  ListFilter,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import type { DailyStats } from '../types';
import { FILTER_MODES } from '../lib/filtering';
import { formatMinutes } from '../lib/insights';
import { estimateTimeSavedMinutes } from '../lib/stats';
import { isPreview } from '../lib/environment';
import { sendMessage } from '../lib/runtime';
import {
  LoadingState,
  Notice,
  SignalMark,
  ThemeButton,
  ThresholdControl,
  Toggle,
} from '../ui/components';
import { errorMessage, useWorkspace } from '../ui/useWorkspace';

const MODE_ICONS = { collapse: ChevronsDownUp, hide: EyeOff, blur: Blend, score: ListFilter };

export default function App() {
  const { boot, error, setError, saving, reload, patchSetting } = useWorkspace();
  const [stats, setStats] = useState<DailyStats | null>(null);
  useEffect(() => {
    void sendMessage<DailyStats>({ type: 'stats:getToday' })
      .then(setStats)
      .catch((reason) => setError(errorMessage(reason)));
  }, [setError]);
  const open = (page: 'settings' | 'dashboard', section?: 'profile' | 'feed' | 'ai') => {
    void sendMessage({ type: 'openPage', page, section }).catch((reason) =>
      setError(errorMessage(reason))
    );
  };
  if (!boot)
    return (
      <main className="popup-page">
        <LoadingState error={error} compact onRetry={() => void reload()} />
      </main>
    );
  const { settings } = boot;
  return (
    <main className="popup-page">
      <header className="popup-header">
        <div className="brand">
          <SignalMark small />
          <span>Signal</span>
        </div>
        <div className="popup-header-actions">
          <ThemeButton />
          <button
            className="icon-button"
            aria-label="Open Signal settings"
            onClick={() => open('settings')}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </header>
      {isPreview() && <div className="popup-preview-note">Preview with fictional activity</div>}
      {error && (
        <Notice error onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      <div className={`popup-status${settings.enabled ? '' : ' paused'}`}>
        <div>
          <span className="status-dot" />
          <strong>
            {settings.enabled
              ? settings.mode === 'score'
                ? 'Scoring your feed'
                : 'Filtering your feed'
              : 'Signal is paused'}
          </strong>
          <span className="popup-save" role="status">
            {saving ? 'Saving...' : settings.ai.enabled ? 'AI assisted' : 'On this device'}
          </span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={settings.enabled ? 'Pause filtering' : 'Resume filtering'}
          title={settings.enabled ? 'Pause filtering' : 'Resume filtering'}
          onClick={() => void patchSetting('enabled', !settings.enabled)}
        >
          {settings.enabled ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
      <section className="popup-threshold" aria-labelledby="popup-threshold-title">
        <div className="popup-section-title">
          <h1 id="popup-threshold-title">Your signal level</h1>
          <span>Minimum score</span>
        </div>
        <ThresholdControl
          value={settings.threshold}
          onChange={(value) => void patchSetting('threshold', value)}
          compact
        />
      </section>
      <section className="popup-modes" aria-labelledby="popup-mode-title">
        <h2 id="popup-mode-title">Handle the noise</h2>
        <div className="popup-mode-grid" role="group" aria-label="Filtering mode">
          {FILTER_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode.value];
            return (
              <button
                type="button"
                key={mode.value}
                className={settings.mode === mode.value ? 'active' : ''}
                aria-pressed={settings.mode === mode.value}
                title={mode.description}
                onClick={() => void patchSetting('mode', mode.value)}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
        <p className="popup-mode-hint">
          {FILTER_MODES.find((mode) => mode.value === settings.mode)?.description}
        </p>
        <Toggle
          label="Hide sponsored posts"
          description={settings.mode === 'score' ? 'Not applied in score-only mode' : undefined}
          checked={settings.hideAds}
          disabled={settings.mode === 'score'}
          onChange={(value) => void patchSetting('hideAds', value)}
        />
      </section>
      <section className="popup-today" aria-labelledby="today-title">
        <div className="popup-today-title">
          <h2 id="today-title">Today</h2>
          <span>
            {stats?.hidden
              ? `${formatMinutes(estimateTimeSavedMinutes(stats))} saved, estimated`
              : 'No posts filtered yet'}
          </span>
        </div>
        <div className="popup-stat-row">
          <div>
            <strong>{stats?.analyzed ?? 0}</strong>
            <span>Reviewed</span>
          </div>
          <div>
            <strong className="positive">{stats?.shown ?? 0}</strong>
            <span>Kept</span>
          </div>
          <div>
            <strong>{stats?.hidden ?? 0}</strong>
            <span>Filtered</span>
          </div>
        </div>
      </section>
      <footer className="popup-footer">
        <button className="btn btn-primary full-width" onClick={() => open('dashboard')}>
          Open your workspace
          <ArrowUpRight size={14} />
        </button>
        <span>
          <ShieldCheck size={12} />
          Open source. Local by default.
        </span>
      </footer>
    </main>
  );
}
