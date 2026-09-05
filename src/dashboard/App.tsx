import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Clock3,
  Filter,
  ListFilter,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import type { DailyStats, FeedbackSignals } from '../types';
import { avgScore, estimateTimeSavedMinutes } from '../lib/stats';
import {
  categoryLabel,
  downloadFile,
  formatDay,
  formatMinutes,
  historyToCsv,
  summarizeStats,
} from '../lib/insights';
import { isPreview, LINKEDIN_URL } from '../lib/environment';
import { sendMessage } from '../lib/runtime';
import {
  AppShell,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Notice,
  PageHeading,
  SavedStatus,
  ThresholdControl,
} from '../ui/components';
import { errorMessage, useWorkspace } from '../ui/useWorkspace';

export default function App() {
  const { boot, error, setError, saving, reload, patchSetting } = useWorkspace();
  const [days, setDays] = useState(7);
  const [history, setHistory] = useState<DailyStats[] | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    void sendMessage<DailyStats[]>({ type: 'stats:getHistory', days })
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadCount, setError]);

  const totals = useMemo(() => summarizeStats(history ?? []), [history]);
  const timeSaved = estimateTimeSavedMinutes(totals);
  const retry = useCallback(() => {
    setError(null);
    void reload();
    setReloadCount((n) => n + 1);
  }, [reload, setError]);
  const reset = async () => {
    setResetting(true);
    try {
      await sendMessage({ type: 'stats:reset' });
      setConfirmReset(false);
      setReloadCount((n) => n + 1);
      setNotice('Statistics reset. Your profile and filter settings are unchanged.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppShell active="overview" settings={boot?.settings}>
      <PageHeading
        title="Your feed, with perspective."
        description="See what stays, what gets filtered, and why."
      >
        <label className="date-select">
          <CalendarDays size={15} />
          <span className="sr-only">Activity period</span>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <ChevronDown size={13} />
        </label>
        <button
          className="icon-button export-button"
          type="button"
          title="Export daily statistics as CSV"
          aria-label="Export statistics as CSV"
          disabled={!history || !totals.analyzed}
          onClick={() =>
            history &&
            downloadFile(
              historyToCsv(history),
              `signal-${days}-day-activity.csv`,
              'text/csv;charset=utf-8'
            )
          }
        >
          <ArrowDownToLine size={18} />
        </button>
      </PageHeading>
      {boot && error && (
        <Notice error onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      {notice && <Notice onDismiss={() => setNotice(null)}>{notice}</Notice>}
      {!boot || !history ? (
        <LoadingState error={error} onRetry={retry} />
      ) : (
        <>
          <section className="outcome-strip" aria-label={`${days}-day feed summary`}>
            <Metric
              label="Posts reviewed"
              value={totals.analyzed.toLocaleString()}
              icon={<MessageSquareText size={17} />}
              detail={`${days} days of activity`}
            />
            <Metric
              label="Kept in your feed"
              value={totals.shown.toLocaleString()}
              icon={<CheckCheck size={18} />}
              positive
              detail={
                totals.analyzed
                  ? `${Math.round((totals.shown / totals.analyzed) * 100)}% of reviewed posts`
                  : 'No posts reviewed yet'
              }
            />
            <Metric
              label="Posts filtered"
              value={totals.hidden.toLocaleString()}
              icon={<Filter size={17} />}
              detail={`${totals.adsHidden} sponsored posts included`}
            />
            <Metric
              label="Estimated time saved"
              value={formatMinutes(timeSaved)}
              icon={<Clock3 size={17} />}
              detail="At 9 seconds per filtered post"
            />
          </section>

          {!boot.settings.enabled && (
            <div className="pause-notice">
              <Pause size={17} />
              <div>
                <strong>Filtering is paused</strong>
                <span>Your profile and threshold are saved. Resume when you're ready.</span>
              </div>
              <button className="btn btn-small" onClick={() => void patchSetting('enabled', true)}>
                <Play size={13} />
                Resume
              </button>
            </div>
          )}

          <div className="activity-layout">
            <section className="panel activity-panel" aria-labelledby="activity-title">
              <div className="panel-heading">
                <div>
                  <h2 id="activity-title">Feed activity</h2>
                  <p>Kept and filtered posts, by day.</p>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-kept" />
                    Kept
                  </span>
                  <span>
                    <i className="legend-filtered" />
                    Filtered
                  </span>
                </div>
              </div>
              {totals.analyzed ? (
                <ActivityChart history={history} />
              ) : (
                <EmptyState
                  title="Your feed story starts here"
                  description="Browse LinkedIn with Signal running. Reviewed posts will appear here automatically."
                >
                  <a
                    className="btn btn-primary"
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open LinkedIn
                    <ArrowUpRight size={14} />
                  </a>
                  <a className="btn" href="demo.html">
                    Try the demo
                  </a>
                </EmptyState>
              )}
              <div className="activity-footer">
                <span>
                  {totals.shown ? (
                    <>
                      <strong>{avgScore(totals.scoreShownSum, totals.shown)}</strong> average kept
                      score
                    </>
                  ) : (
                    'No scores to average yet'
                  )}
                </span>
                <span>
                  {totals.hidden ? (
                    <>
                      <strong>{avgScore(totals.scoreHiddenSum, totals.hidden)}</strong> average
                      filtered score
                    </>
                  ) : (
                    'Filtering starts below your threshold'
                  )}
                </span>
              </div>
            </section>

            <aside className="panel level-panel" aria-labelledby="level-title">
              <div className="panel-heading">
                <div>
                  <h2 id="level-title">Your signal level</h2>
                  <p>Your minimum post score.</p>
                </div>
                <SlidersIcon />
              </div>
              <ThresholdControl
                value={boot.settings.threshold}
                onChange={(value) => void patchSetting('threshold', value)}
              />
              <p className="level-explanation">
                {!boot.settings.enabled
                  ? 'Paused. Your score threshold is saved for later.'
                  : boot.settings.mode === 'score'
                    ? 'Score-only mode keeps every post visible.'
                    : `Posts below ${boot.settings.threshold} are filtered. You can always change your mind.`}
              </p>
              <a className="btn full-width" href="settings.html#feed">
                Edit feed controls
                <ArrowRight size={14} />
              </a>
              <div className="level-footer">
                <ShieldCheck size={13} />
                <span>
                  {boot.settings.ai.enabled ? 'AI-assisted scoring' : 'Scored on this device'}
                </span>
                <SavedStatus saving={saving} />
              </div>
            </aside>
          </div>

          <div className="insight-grid">
            <section className="panel" aria-labelledby="composition-title">
              <div className="panel-heading">
                <div>
                  <h2 id="composition-title">Feed composition</h2>
                  <p>The main topic of each reviewed post.</p>
                </div>
                <span className="panel-meta">{totals.analyzed} posts</span>
              </div>
              <CategoryList categories={totals.categories} />
            </section>
            <section className="panel" aria-labelledby="reasons-title">
              <div className="panel-heading">
                <div>
                  <h2 id="reasons-title">What stayed out</h2>
                  <p>The main reasons posts were filtered.</p>
                </div>
                <ListFilter size={17} className="muted" />
              </div>
              <ReasonList reasons={totals.reasonsHidden} />
            </section>
          </div>

          <section className="panel feedback-panel" aria-labelledby="feedback-title">
            <div>
              <h2 id="feedback-title">A feed that learns from you</h2>
              <p>Use Useful or Not useful on a post's Signal badge to shape future scores.</p>
              <a className="text-link" href="settings.html#profile">
                Refine your profile
                <ArrowRight size={13} />
              </a>
            </div>
            <FeedbackList signals={boot.signals} />
          </section>

          <details className="daily-details">
            <summary>
              Daily breakdown
              <ChevronDown size={15} />
            </summary>
            <div className="daily-table-wrap">
              <table className="daily-table">
                <caption>
                  Daily activity in your device's timezone{isPreview() ? ', using sample data' : ''}
                  .
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Reviewed</th>
                    <th scope="col">Kept</th>
                    <th scope="col">Filtered</th>
                    <th scope="col">Ads included</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((day) => (
                    <tr key={day.date}>
                      <th scope="row">{formatDay(day.date)}</th>
                      <td>{day.analyzed}</td>
                      <td>{day.shown}</td>
                      <td>{day.hidden}</td>
                      <td>{day.adsHidden}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="dashboard-bottom">
            <span>Time saved is an estimate, not a timer.</span>
            <button
              className="text-link reset-link"
              type="button"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw size={12} />
              Reset statistics
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmReset}
        title="Reset your statistics?"
        description="This removes all recorded feed activity, not just the selected period. Your profile, filter settings, and feedback stay unchanged."
        actionLabel="Reset statistics"
        busy={resetting}
        onConfirm={() => void reset()}
        onClose={() => setConfirmReset(false)}
      />
    </AppShell>
  );
}

function SlidersIcon() {
  return <ListFilter size={17} className="muted" />;
}

function Metric({
  label,
  value,
  detail,
  icon,
  positive,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="outcome">
      <div className="outcome-label">
        {icon}
        <span>{label}</span>
      </div>
      <strong className={positive ? 'positive' : undefined}>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ActivityChart({ history }: { history: DailyStats[] }) {
  const days = [...history].reverse();
  const peak = Math.max(1, ...days.map((day) => day.shown + day.hidden));
  const ceiling = Math.max(10, Math.ceil(peak / 10) * 10);
  return (
    <div
      className="activity-chart"
      role="img"
      aria-label={`Daily feed activity: ${days.map((day) => `${formatDay(day.date)}: ${day.shown} kept, ${day.hidden} filtered`).join('; ')}`}
    >
      <div className="chart-y-axis" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
          <span key={fraction}>{Math.round(ceiling * fraction)}</span>
        ))}
      </div>
      <div className="chart-plot">
        <div className="chart-grid" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((line) => (
            <i key={line} />
          ))}
        </div>
        <div className={`chart-columns${days.length > 14 ? ' dense' : ''}`}>
          {days.map((day, index) => (
            <div
              key={day.date}
              className="chart-column"
              title={`${formatDay(day.date)}: ${day.shown} kept, ${day.hidden} filtered`}
            >
              <div className="chart-bar-space">
                <div
                  className="chart-bar-stack"
                  style={{ height: `${((day.shown + day.hidden) / ceiling) * 100}%` }}
                >
                  <div className="chart-segment filtered" style={{ flex: day.hidden }} />
                  <div className="chart-segment kept" style={{ flex: day.shown }} />
                </div>
              </div>
              <span className="chart-date">
                {days.length <= 7
                  ? formatDay(day.date, true)
                  : index % Math.ceil(days.length / 7) === 0 || index === days.length - 1
                    ? new Date(`${day.date}T12:00:00`).getDate()
                    : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryList({ categories }: { categories: Record<string, number> }) {
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total)
    return (
      <div className="quiet-empty">
        Your topic mix will appear after Signal reviews a few posts.
      </div>
    );
  return (
    <div className="category-list">
      {entries.slice(0, 6).map(([key, count], index) => (
        <div key={key} className="category-row">
          <span className={`category-dot color-${index}`} />
          <span className="category-name">{categoryLabel(key)}</span>
          <div className="category-track" aria-hidden="true">
            <span style={{ width: `${(count / total) * 100}%` }} />
          </div>
          <strong>
            {Math.round((count / total) * 100)}
            <small>%</small>
          </strong>
        </div>
      ))}
    </div>
  );
}

function ReasonList({ reasons }: { reasons: Record<string, number> }) {
  const entries = Object.entries(reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (!entries.length)
    return (
      <div className="quiet-empty">
        Nothing filtered yet. Reasons will appear here when a post falls below your bar.
      </div>
    );
  return (
    <ul className="reason-list">
      {entries.map(([reason, count]) => (
        <li key={reason}>
          <span className="reason-icon">
            <Filter size={13} />
          </span>
          <span>{reason}</span>
          <strong>
            {count}
            <small> posts</small>
          </strong>
        </li>
      ))}
    </ul>
  );
}

function FeedbackList({ signals }: { signals: FeedbackSignals }) {
  return (
    <div className="feedback-columns">
      {(['positive', 'negative'] as const).map((kind) => (
        <div key={kind}>
          <h3>{kind === 'positive' ? 'More of this' : 'Less of this'}</h3>
          <div className="feedback-tags">
            {Object.entries(signals[kind])
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([topic, count]) => (
                <span className="chip" key={topic}>
                  {categoryLabel(topic)}
                  <small>{count}</small>
                </span>
              ))}
            {!Object.keys(signals[kind]).length && (
              <span className="field-hint">No feedback yet</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
