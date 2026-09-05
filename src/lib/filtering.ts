import type { AnalysisResult, ExtensionSettings, FilterMode } from '../types';

export const FILTER_PRESETS = [
  { label: 'Open', threshold: 30, description: 'Keep a wider mix of posts.' },
  { label: 'Balanced', threshold: 55, description: 'Useful posts, with room to explore.' },
  { label: 'Focused', threshold: 75, description: 'Keep only the strongest matches.' },
] as const;

export const FILTER_MODES: Array<{ value: FilterMode; label: string; description: string }> = [
  {
    value: 'collapse',
    label: 'Collapse',
    description: 'Leave a short explanation. Reveal any post.',
  },
  { value: 'hide', label: 'Hide', description: 'Remove filtered posts from view.' },
  { value: 'blur', label: 'Blur', description: 'Keep the space. Reveal when you choose.' },
  {
    value: 'score',
    label: 'Score only',
    description: 'Show every post with a score. No filtering.',
  },
];

export function thresholdName(value: number): string {
  if (value === 0) return 'All scores';
  if (value < 45) return 'Open';
  if (value < 70) return 'Balanced';
  if (value < 90) return 'Focused';
  return 'Very selective';
}

/** One decision policy shared by the live feed, preview, and tests. */
export function shouldHidePost(
  result: AnalysisResult,
  settings: ExtensionSettings,
  override?: 'show' | 'hide'
): boolean {
  if (!settings.enabled || settings.mode === 'score') return false;
  if (override) return override === 'hide';
  if (result.isAd) return settings.hideAds;
  if (result.forceHide) return true;
  if (result.forceShow) return false;
  if (result.isJob) {
    if (settings.jobTreatment === 'hide') return true;
    if (settings.jobTreatment === 'show') return false;
  }
  return result.score < settings.threshold;
}
