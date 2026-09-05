import type { DailyStats } from '../types';
import { emptyStats, todayKey } from '../lib/stats';

/** Fictional data for the explicitly labeled, localhost-only preview. */
export function sampleHistory(days: number, now = new Date()): DailyStats[] {
  const reviewed = [46, 46, 58, 61, 43, 52, 36];
  const kept = [24, 30, 38, 41, 26, 31, 24];
  return Array.from({ length: Math.max(1, Math.min(90, days)) }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - index);
    const factor = Math.max(0.4, 1 - Math.floor(index / 7) * 0.09);
    const analyzed = Math.round(reviewed[index % 7] * factor);
    const shown = Math.round(kept[index % 7] * factor);
    const hidden = analyzed - shown;
    const adsHidden = Math.min(hidden, (index % 3) + 2);
    const technical = Math.round(analyzed * 0.3);
    const ai = Math.round(analyzed * 0.25);
    const startup = Math.round(analyzed * 0.17);
    const job = Math.round(analyzed * 0.1);
    const bait = Math.round((hidden - adsHidden) * 0.55);
    return {
      ...emptyStats(todayKey(date)),
      analyzed,
      shown,
      hidden,
      adsHidden,
      scoreShownSum: shown * (76 + (index % 8)),
      scoreHiddenSum: hidden * (25 + (index % 9)),
      categories: {
        technical,
        ai,
        startup,
        job,
        general: analyzed - technical - ai - startup - job,
      },
      reasonsHidden: {
        'Engagement bait': bait,
        'Low information density': hidden - adsHidden - bait,
        Sponsored: adsHidden,
      },
    };
  });
}
