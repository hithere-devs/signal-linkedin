import { describe, expect, it } from 'vitest';
import { formatMinutes, historyToCsv, summarizeStats } from '../src/lib/insights';
import { emptyStats, todayKey } from '../src/lib/stats';

describe('feed insights', () => {
  it('formats empty, small, and long estimates honestly', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(0.3)).toBe('<1 min');
    expect(formatMinutes(19.2)).toBe('19 min');
    expect(formatMinutes(75)).toBe('1h 15m');
  });
  it('aggregates the selected period and category counts', () => {
    const total = summarizeStats([
      { ...emptyStats(), analyzed: 4, shown: 3, hidden: 1, categories: { ai: 2 } },
      { ...emptyStats(), analyzed: 6, shown: 2, hidden: 4, categories: { ai: 1 } },
    ]);
    expect(total.analyzed).toBe(10);
    expect(total.shown).toBe(5);
    expect(total.categories.ai).toBe(3);
  });
  it('exports daily data chronologically with empty averages for zero activity', () => {
    const csv = historyToCsv([
      emptyStats('2026-09-05'),
      { ...emptyStats('2026-09-04'), shown: 2, scoreShownSum: 150 },
    ]);
    expect(csv.split('\r\n')[1]).toBe('2026-09-04,0,2,0,0,75,');
    expect(csv.split('\r\n')[2]).toBe('2026-09-05,0,0,0,0,,');
    expect(csv).not.toContain('apiKey');
  });
  it('uses calendar dates in the device timezone', () => {
    expect(todayKey(new Date(2026, 8, 5, 0, 1))).toBe('2026-09-05');
  });
});
