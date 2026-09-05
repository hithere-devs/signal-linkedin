import { describe, expect, it } from 'vitest';
import { sampleHistory } from '../src/preview/data';
import { summarizeStats } from '../src/lib/insights';

describe('fictional preview activity', () => {
  it('matches the advertised example totals', () => {
    const history = sampleHistory(7, new Date(2026, 8, 5));
    expect(summarizeStats(history)).toMatchObject({ analyzed: 342, shown: 214, hidden: 128 });
  });
  it('keeps category and decision counts consistent for each day', () => {
    for (const day of sampleHistory(30)) {
      expect(day.shown + day.hidden).toBe(day.analyzed);
      expect(Object.values(day.categories).reduce((sum, count) => sum + count, 0)).toBe(
        day.analyzed
      );
      expect(Object.values(day.reasonsHidden).reduce((sum, count) => sum + count, 0)).toBe(
        day.hidden
      );
      expect(day.adsHidden).toBeLessThanOrEqual(day.hidden);
    }
  });
});
