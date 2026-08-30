import type { DailyStats, StatsDelta } from '../types';

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyStats(date: string = todayKey()): DailyStats {
  return {
    date,
    analyzed: 0,
    shown: 0,
    hidden: 0,
    adsHidden: 0,
    scoreShownSum: 0,
    scoreHiddenSum: 0,
    categories: {},
    reasonsHidden: {}
  };
}

export function mergeStats(base: DailyStats, delta: StatsDelta): DailyStats {
  const next: DailyStats = {
    ...base,
    analyzed: base.analyzed + (delta.analyzed ?? 0),
    shown: base.shown + (delta.shown ?? 0),
    hidden: base.hidden + (delta.hidden ?? 0),
    adsHidden: base.adsHidden + (delta.adsHidden ?? 0),
    scoreShownSum: base.scoreShownSum + (delta.scoreShownSum ?? 0),
    scoreHiddenSum: base.scoreHiddenSum + (delta.scoreHiddenSum ?? 0),
    categories: { ...base.categories },
    reasonsHidden: { ...base.reasonsHidden }
  };
  for (const [k, v] of Object.entries(delta.categories ?? {})) {
    next.categories[k] = (next.categories[k] ?? 0) + v;
  }
  for (const [k, v] of Object.entries(delta.reasonsHidden ?? {})) {
    next.reasonsHidden[k] = (next.reasonsHidden[k] ?? 0) + v;
  }
  return next;
}

export function estimateTimeSavedMinutes(stats: DailyStats): number {
  const secondsPerFilteredPost = 9;
  return ((stats.hidden + stats.adsHidden) * secondsPerFilteredPost) / 60;
}

export function avgScore(sum: number, count: number): number {
  return count > 0 ? Math.round(sum / count) : 0;
}
