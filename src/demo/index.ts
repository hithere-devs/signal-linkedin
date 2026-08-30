import type { AnalysisResult, Dimensions, ExtensionSettings } from '../types';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import { applyResultToDom } from '../content/filter';

const dimensions = (score: number): Dimensions => ({
  relevance: Math.min(100, score + 3),
  infoDensity: Math.max(8, score - 4),
  actionability: Math.max(10, score - 7),
  originality: Math.max(12, score - 12),
  evidence: Math.max(8, score - 10),
  techDepth: Math.max(10, score - 6),
  careerValue: Math.min(100, score + 1),
  personalStory: Math.max(0, 35 - score / 3),
  promotional: Math.max(0, 42 - score / 2),
  engagementBait: score < 30 ? 88 : 8
});

const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, threshold: 55, mode: 'collapse' };

document.querySelectorAll<HTMLElement>('.feed-post[data-score]').forEach((root, index) => {
  const score = Number(root.dataset.score);
  const result: AnalysisResult = {
    hash: `demo-${index}`,
    score,
    classification: (root.dataset.category ?? 'general').split(','),
    dimensions: dimensions(score),
    reasons: {
      positive: (root.dataset.positive ?? '').split('|').filter(Boolean),
      negative: (root.dataset.negative ?? '').split('|').filter(Boolean)
    },
    isAd: false,
    isJob: false,
    confidence: 0.9,
    provider: 'heuristic',
    analyzedAt: Date.now()
  };
  applyResultToDom(root, result, {
    settings,
    onOverride: () => {
      root.style.display = '';
    },
    onFeedback: () => {}
  }, score < settings.threshold);
});
