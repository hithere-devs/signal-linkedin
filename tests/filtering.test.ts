import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/lib/defaults';
import { shouldHidePost, thresholdName } from '../src/lib/filtering';
import type { AnalysisResult } from '../src/types';

const post = (patch: Partial<AnalysisResult> = {}) =>
  ({
    score: 30,
    isAd: false,
    isJob: false,
    ...patch,
  }) as AnalysisResult;

describe('feed decisions', () => {
  it('keeps older settings enabled during migration', () => {
    expect(normalizeSettings({ threshold: 55 }).enabled).toBe(true);
    expect(normalizeSettings({ enabled: false }).enabled).toBe(false);
  });
  it('pauses all filtering without losing the threshold', () => {
    const paused = { ...DEFAULT_SETTINGS, enabled: false };
    expect(shouldHidePost(post(), paused)).toBe(false);
    expect(shouldHidePost(post({ isAd: true, forceHide: true }), paused, 'hide')).toBe(false);
    expect(paused.threshold).toBe(55);
  });
  it('score-only mode leaves every post visible', () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'score' as const };
    expect(shouldHidePost(post(), settings)).toBe(false);
    expect(shouldHidePost(post({ isAd: true }), settings)).toBe(false);
  });
  it('applies show and hide overrides ahead of automatic decisions', () => {
    expect(shouldHidePost(post(), DEFAULT_SETTINGS, 'show')).toBe(false);
    expect(shouldHidePost(post({ score: 99 }), DEFAULT_SETTINGS, 'hide')).toBe(true);
  });
  it('does not filter ads by score when ad blocking is off', () => {
    expect(
      shouldHidePost(post({ isAd: true, score: 0 }), { ...DEFAULT_SETTINGS, hideAds: false })
    ).toBe(false);
  });
  it('respects all three job treatments', () => {
    expect(shouldHidePost(post({ isJob: true }), DEFAULT_SETTINGS)).toBe(false);
    expect(
      shouldHidePost(post({ isJob: true }), { ...DEFAULT_SETTINGS, jobTreatment: 'relevant' })
    ).toBe(true);
    expect(
      shouldHidePost(post({ isJob: true, score: 95 }), {
        ...DEFAULT_SETTINGS,
        jobTreatment: 'hide',
      })
    ).toBe(true);
  });
  it('respects explicit author preferences before job defaults', () => {
    expect(shouldHidePost(post({ isJob: true, forceHide: true }), DEFAULT_SETTINGS)).toBe(true);
    expect(shouldHidePost(post({ forceShow: true }), DEFAULT_SETTINGS)).toBe(false);
  });
  it('keeps scores at the exact threshold', () => {
    expect(shouldHidePost(post({ score: 55 }), DEFAULT_SETTINGS)).toBe(false);
    expect(shouldHidePost(post({ score: 54 }), DEFAULT_SETTINGS)).toBe(true);
  });
  it('names a custom threshold without calling zero a pause', () => {
    expect(thresholdName(0)).toBe('All scores');
    expect(thresholdName(55)).toBe('Balanced');
    expect(thresholdName(75)).toBe('Focused');
  });
});
