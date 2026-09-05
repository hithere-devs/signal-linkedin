import { describe, expect, it } from 'vitest';
import { emptyStats, estimateTimeSavedMinutes, mergeStats } from '../src/lib/stats';
import { normalizeProfile, normalizeSettings } from '../src/lib/defaults';

describe('stats', () => {
  it('merges deltas correctly', () => {
    let s = emptyStats('2026-01-01');
    s = mergeStats(s, { analyzed: 5, shown: 3, hidden: 2, categories: { technical: 3 } });
    s = mergeStats(s, { analyzed: 2, hidden: 1, adsHidden: 1, categories: { ai: 1 }, reasonsHidden: { 'Low information density': 2 } });
    expect(s.analyzed).toBe(7);
    expect(s.shown).toBe(3);
    expect(s.hidden).toBe(3);
    expect(s.adsHidden).toBe(1);
    expect(s.categories['technical']).toBe(3);
    expect(s.reasonsHidden['Low information density']).toBe(2);
  });

  it('estimates time saved', () => {
    const s = mergeStats(emptyStats(), { hidden: 20, adsHidden: 10 });
    expect(estimateTimeSavedMinutes(s)).toBeCloseTo(3);
  });

  it('does not claim time saved before posts are filtered', () => {
    expect(estimateTimeSavedMinutes(emptyStats())).toBe(0);
  });
});

describe('normalizers', () => {
  it('fills settings defaults and keeps overrides', () => {
    const s = normalizeSettings({ threshold: 80, mode: 'blur' });
    expect(s.threshold).toBe(80);
    expect(s.mode).toBe('blur');
    expect(s.hideAds).toBe(true);
    expect(s.weights.relevance).toBeGreaterThan(0);
  });

  it('handles corrupt storage gracefully', () => {
    expect(() => normalizeSettings(undefined)).not.toThrow();
    expect(() => normalizeProfile(null)).not.toThrow();
    const p = normalizeProfile({});
    expect(Array.isArray(p.skills)).toBe(true);
  });
});
