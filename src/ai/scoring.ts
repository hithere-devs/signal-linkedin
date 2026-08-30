import type { AiConfig, AnalysisResult, Dimensions, FeedbackSignals, PostFeatures, ScoringWeights, UserProfile } from '../types';
import { postHash } from '../lib/hash';
import { buildProfileSets, heuristicAnalyze, type HeuristicOutput } from './heuristic';
import type { LlmOutput } from './llm';

export interface AnalyzeRequest {
  features: PostFeatures;
  profile: UserProfile;
  weights: ScoringWeights;
  signals?: FeedbackSignals;
}

export function analyzeLocally(req: AnalyzeRequest): HeuristicOutput {
  const sets = buildProfileSets(req.profile);
  return heuristicAnalyze(req.features, req.profile, req.weights, req.signals, sets);
}

export function hashFeatures(features: PostFeatures): string {
  return postHash({
    text: `${features.text ?? ''} ${features.repostText ?? ''}`,
    authorName: features.authorName,
    mediaCount: (features.imageCount ?? 0) + (features.hasVideo ? 1 : 0)
  });
}

export function needsDeepAnalysis(heur: HeuristicOutput): boolean {
  if (heur.isAd) return false;
  if (heur.confidence < 0.55) return true;
  return heur.score >= 30 && heur.score <= 80;
}

export function blendResults(base: AnalysisResult, llm: LlmOutput): AnalysisResult {
  const score = Math.round(llm.score * 0.65 + base.score * 0.35);
  const dimensions = { ...base.dimensions };
  for (const [k, v] of Object.entries(llm.dimensions ?? {})) {
    if (typeof v === 'number' && k in dimensions) {
      dimensions[k as keyof Dimensions] = Math.round(v * 0.7 + base.dimensions[k as keyof Dimensions] * 0.3);
    }
  }
  const positive = [...base.reasons.positive, ...(llm.reasons?.positive ?? [])].slice(0, 5);
  const negative = [...base.reasons.negative, ...(llm.reasons?.negative ?? [])].slice(0, 5);
  const classification = [...new Set([...base.classification, ...(llm.classification ?? [])])];
  return {
    ...base,
    score,
    dimensions,
    classification,
    reasons: { positive, negative },
    provider: 'hybrid',
    confidence: Math.max(base.confidence, llm.confidence ?? 0)
  };
}

export function makeResult(features: PostFeatures, heur: HeuristicOutput): AnalysisResult {
  return {
    hash: hashFeatures(features),
    score: heur.score,
    classification: heur.classification,
    dimensions: heur.dimensions,
    reasons: heur.reasons,
    isAd: heur.isAd,
    isJob: heur.isJob,
    confidence: heur.confidence,
    provider: 'heuristic',
    analyzedAt: Date.now(),
    forceShow: heur.forceShow,
    forceHide: heur.forceHide
  };
}
