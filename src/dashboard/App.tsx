import { useCallback, useEffect, useState } from 'react';
import type { BootstrapPayload, DailyStats, FeedbackSignals } from '../types';
import { avgScore, estimateTimeSavedMinutes } from '../lib/stats';
import { sendMessage } from '../lib/runtime';

const CATEGORY_COLORS: Record<string, string> = {
  technical: '#5b9dff',
  ai: '#a78bfa',
  startup: '#34d399',
  'data-insight': '#22d3ee',
  'interview-prep': '#f472b6',
  'career-advice': '#fbbf24',
  'career-milestone': '#94a3b8',
  motivation: '#fb923c',
  personal: '#64748b',
  promotional: '#f87171',
  'engagement-bait': '#ef4444',
  job: '#4ade80',
  repost: '#71717a',
  general: '#94a3b8',
  ad: '#ef4444'
};

export default function App() {
  const [history, setHistory] = useState<DailyStats[] | null>(null);
  const [signals, setSignals] = useState<FeedbackSignals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    void Promise.all([
      sendMessage<DailyStats[]>({ type: 'stats:getHistory', days: 7 }),
      sendMessage<BootstrapPayload>({ type: 'bootstrap' })
    ])
      .then(([stats, payload]) => {
        setHistory(stats);
        setSignals(payload.signals);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  useEffect(load, [load]);

  if (!history) return <div className="page"><div className="loading" role="status">{error ?? 'Loading dashboard…'}</div>{error && <button className="btn" onClick={load}>Try again</button>}</div>;

  const totals = history.reduce(
    (acc, d) => ({
      analyzed: acc.analyzed + d.analyzed,
      shown: acc.shown + d.shown,
      hidden: acc.hidden + d.hidden,
      adsHidden: acc.adsHidden + d.adsHidden,
      scoreShownSum: acc.scoreShownSum + d.scoreShownSum,
      scoreHiddenSum: acc.scoreHiddenSum + d.scoreHiddenSum
    }),
    { analyzed: 0, shown: 0, hidden: 0, adsHidden: 0, scoreShownSum: 0, scoreHiddenSum: 0 }
  );

  const categories: Record<string, number> = {};
  for (const d of history) {
    for (const [k, v] of Object.entries(d.categories)) categories[k] = (categories[k] ?? 0) + v;
  }
  const catTotal = Object.values(categories).reduce((a, b) => a + b, 0);
  const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  const reasons: Record<string, number> = {};
  for (const d of history) {
    for (const [k, v] of Object.entries(d.reasonsHidden)) reasons[k] = (reasons[k] ?? 0) + v;
  }
  const topReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const maxAnalyzed = Math.max(1, ...history.map((d) => d.analyzed));
  const timeSaved = estimateTimeSavedMinutes({ ...totals, date: '', categories: {}, reasonsHidden: {} });

  return (
    <div className="page">
      <header>
        <h1><span className="mark" /> Feed Dashboard</h1>
        <button
          className="btn"
          onClick={async () => {
            if (!confirm('Reset all statistics?')) return;
            try {
              await sendMessage({ type: 'stats:reset' });
              load();
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : String(reason));
            }
          }}
        >
          Reset stats
        </button>
      </header>

      {error && <div className="dashboard-error" role="alert">{error}</div>}

      <section className="stat-row">
        <Stat label="Posts analyzed" value={totals.analyzed} />
        <Stat label="Shown" value={totals.shown} accent />
        <Stat label="Filtered" value={totals.hidden} accent="#34d399" />
        <Stat label="Ads removed" value={totals.adsHidden} accent="#f87171" />
        <Stat label="Time saved" value={`≈${timeSaved < 1 ? '<1' : Math.round(timeSaved)}m`} />
      </section>

      <section className="card">
        <h2>Average scores</h2>
        <div className="avg-row">
          <div className="avg-block">
            <span className="val" style={{ color: '#5b9dff' }}>{avgScore(totals.scoreShownSum, totals.shown)}</span>
            <span className="lbl">shown posts</span>
          </div>
          <div className="avg-block">
            <span className="val" style={{ color: '#f87171' }}>{avgScore(totals.scoreHiddenSum, totals.hidden)}</span>
            <span className="lbl">filtered posts</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Last 7 days</h2>
        <div className="bars">
          {[...history].reverse().map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date}: ${d.analyzed} analyzed · ${d.hidden} filtered`}>
              <div className="bar-stack">
                <div className="bar shown" style={{ height: `${(d.shown / maxAnalyzed) * 90}px` }} />
                <div className="bar hidden" style={{ height: `${(d.hidden / maxAnalyzed) * 90}px` }} />
              </div>
              <span className="bar-label">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i className="dot" style={{ background: '#5b9dff' }} /> shown</span>
          <span><i className="dot" style={{ background: '#34d399' }} /> filtered</span>
        </div>
      </section>

      <section className="card">
        <h2>Your feed composition</h2>
        {catTotal === 0 && <p className="empty">No data yet. Browse LinkedIn with the extension active.</p>}
        <div className="cat-list">
          {sortedCats.map(([cat, count]) => (
            <div key={cat} className="cat-row">
              <span className="cat-name">{cat}</span>
              <div className="cat-bar-track">
                <div
                  className="cat-bar"
                  style={{
                    width: `${(count / catTotal) * 100}%`,
                    background: CATEGORY_COLORS[cat] ?? '#94a3b8'
                  }}
                />
              </div>
              <span className="cat-pct">{Math.round((count / catTotal) * 100)}%</span>
            </div>
          ))}
        </div>
      </section>

      {topReasons.length > 0 && (
        <section className="card">
          <h2>Why content gets hidden</h2>
          <ul className="reason-list">
            {topReasons.map(([r, n]) => (
              <li key={r}>
                <span>{r}</span>
                <strong>{n}×</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {signals && (Object.keys(signals.positive).length > 0 || Object.keys(signals.negative).length > 0) && (
        <section className="card">
          <h2>What you've taught Signal</h2>
          <div className="signal-cols">
            <div>
              <h3 className="pos-h">More of this</h3>
              <SignalList entries={Object.entries(signals.positive).sort((a, b) => b[1] - a[1]).slice(0, 8)} />
            </div>
            <div>
              <h3 className="neg-h">Less of this</h3>
              <SignalList entries={Object.entries(signals.negative).sort((a, b) => b[1] - a[1]).slice(0, 8)} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string | boolean }) {
  const color = typeof accent === 'string' ? accent : accent ? '#5b9dff' : undefined;
  return (
    <div className="stat card">
      <strong style={color ? { color } : undefined}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SignalList({ entries }: { entries: Array<[string, number]> }) {
  if (!entries.length) return <p className="empty">Nothing yet. Use the feedback controls on post badges.</p>;
  return (
    <ul className="signal-list">
      {entries.map(([k, v]) => (
        <li key={k}>
          <span>{k}</span>
          <small>×{v}</small>
        </li>
      ))}
    </ul>
  );
}
