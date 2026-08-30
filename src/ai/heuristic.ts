import type { Dimensions, FeedbackSignals, PostFeatures, ScoringWeights, UserProfile } from '../types';
import { tokenize } from '../lib/hash';
import { ANY_NUMBER, ARCH_TERMS, CLASSIFICATION_LABELS, CURRENCY, DATA_SOURCES, DATA_WORDS, PATTERNS, TECH_TERMS } from './rubric';

export interface HeuristicOutput {
  score: number;
  dimensions: Dimensions;
  classification: string[];
  reasons: { positive: string[]; negative: string[] };
  confidence: number;
  isAd: boolean;
  isJob: boolean;
  forceShow?: boolean;
  forceHide?: boolean;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const countMatches = (text: string, re: RegExp): number => (text.match(re) ?? []).length;
const has = (text: string, re: RegExp): boolean => re.test(text);

function personKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesPerson(authorName: string, configured: string[]): boolean {
  const author = personKey(authorName);
  if (!author) return false;
  return configured.some((name) => {
    const candidate = personKey(name);
    return candidate.length > 2 && (author === candidate || author.includes(candidate) || candidate.includes(author));
  });
}

const TECH_TERM_SET = new Set(TECH_TERMS.map((t) => t.toLowerCase()));
const MULTI_WORD_TECH = TECH_TERMS.filter((t) => t.includes(' ') || t.includes('.') || t.includes('+') || t.includes('#'));

function findTechTerms(lowerText: string): string[] {
  const tokens = new Set(lowerText.split(/[^+#.a-z0-9]+/).filter(Boolean));
  const found = new Set<string>();
  for (const t of tokens) {
    if (TECH_TERM_SET.has(t)) found.add(t);
  }
  for (const term of MULTI_WORD_TECH) {
    if (lowerText.includes(term)) found.add(term);
  }
  return [...found];
}

export interface ProfileTokenSets {
  skills: Set<string>;
  interests: Set<string>;
  industries: Set<string>;
  companies: Set<string>;
  roles: Set<string>;
  goals: Set<string>;
  avoid: Set<string>;
}

export function buildProfileSets(profile: UserProfile): ProfileTokenSets {
  const toSet = (arr: string[]) => new Set(arr.flatMap((s) => tokenize(s)));
  return {
    skills: toSet(profile.skills),
    interests: toSet(profile.interests),
    industries: toSet(profile.industries),
    companies: new Set(profile.companies.flatMap((c) => [c.toLowerCase(), ...tokenize(c)])),
    roles: toSet(profile.desiredRoles),
    goals: toSet(profile.careerGoals),
    avoid: toSet(profile.topicsToAvoid)
  };
}

export function computeRelevance(
  text: string,
  hashtags: string[],
  authorHeadline: string,
  techHits: string[],
  profileSets: ProfileTokenSets,
  signals?: FeedbackSignals
): { relevance: number; matchedInterests: string[]; avoided: string[] } {
  const tokens = new Set([...tokenize(text), ...hashtags.map((h) => tokenize(h)).flat(), ...tokenize(authorHeadline)]);
  const matchedInterests: string[] = [];
  const avoided: string[] = [];

  let raw = 0;
  const addMatches = (set: Set<string>, weight: number, labelBucket?: string[]) => {
    for (const t of set) {
      if (tokens.has(t)) {
        raw += weight;
        if (labelBucket && labelBucket.length < 6) labelBucket.push(t);
      }
    }
  };

  addMatches(profileSets.companies, 2.2);
  addMatches(profileSets.roles, 1.9);
  addMatches(profileSets.skills, 1.4, matchedInterests);
  addMatches(profileSets.interests, 1.4, matchedInterests);
  addMatches(profileSets.industries, 1.1, matchedInterests);
  addMatches(profileSets.goals, 0.8);

  for (const t of profileSets.avoid) {
    if (tokens.has(t)) {
      avoided.push(t);
      raw -= 3.5;
    }
  }

  let relevance = clamp(22 + raw * 13 + Math.min(12, techHits.length * 2.5));

  if (signals) {
    let sigBoost = 0;
    for (const t of Object.keys(signals.positive ?? {})) {
      const tok = tokenize(t)[0];
      if (tok && tokens.has(tok)) sigBoost += 5;
    }
    let sigPenalty = 0;
    for (const t of Object.keys(signals.negative ?? {})) {
      const tok = tokenize(t)[0];
      if (tok && tokens.has(tok)) sigPenalty += 10;
    }
    relevance = clamp(relevance + Math.min(18, sigBoost) - Math.min(40, sigPenalty));
  }

  return { relevance: clamp(relevance), matchedInterests, avoided };
}

export function computeDimensions(
  features: PostFeatures,
  profile: UserProfile,
  signals: FeedbackSignals | undefined,
  profileSets?: ProfileTokenSets
): {
  dimensions: Dimensions;
  classification: string[];
  reasons: { positive: string[]; negative: string[] };
  matchedInterests: string[];
  avoided: string[];
} {
  const main = features.text ?? '';
  const repost = features.repostText ?? '';
  const text = `${main}\n${repost}`.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;

  const classification: string[] = [];
  const positive: string[] = [];
  const negative: string[] = [];
  const addPos = (r: string) => positive.push(r);
  const addNeg = (r: string) => negative.push(r);

  const pctCount = countMatches(text, /(?:^|\s)[-+]?\d[\d,.]*\s*(?:%|percent)/gi);
  const currencyCount = countMatches(text, CURRENCY);
  const anyNumberCount = Math.max(0, countMatches(text, ANY_NUMBER) - pctCount);
  const emojiCount = countMatches(text, /\p{Extended_Pictographic}/gu);
  const listItems = countMatches(text, /(?:^|\n)\s*(?:\d+[.)]|[-•*])\s+\S/gm);
  const techHits = findTechTerms(lower);

  const sets = profileSets ?? buildProfileSets(profile);
  const rel = computeRelevance(text, features.hashtags ?? [], features.authorHeadline ?? '', techHits, sets, signals);

  let infoDensity =
    16 +
    Math.min(30, pctCount * 9) +
    Math.min(18, anyNumberCount * 3.2) +
    (listItems >= 3 ? 14 : listItems > 0 ? 7 : 0) +
    Math.min(18, techHits.length * 4.5) +
    (has(text, PATTERNS.howTo) ? 6 : 0) +
    (words >= 40 && words <= 500 ? 10 : words > 500 ? 4 : words >= 20 ? 5 : 0) -
    Math.min(14, Math.max(0, emojiCount - 4) * 3);

  infoDensity = clamp(infoDensity);

  let evidence =
    6 +
    Math.min(28, pctCount * 10) +
    Math.min(14, currencyCount * 8) +
    Math.min(12, anyNumberCount * 2) +
    (has(text, DATA_WORDS) ? 15 : 0) +
    (has(text, PATTERNS.originalEvidence) ? 24 : 0) +
    (has(text, DATA_SOURCES) ? 12 : 0) +
    (features.imageAlts && /(chart|graph|diagram|table|dashboard|screenshot)/i.test(features.imageAlts) ? 8 : 0);
  evidence = clamp(evidence);

  const entityMatches = new Set((text.match(/\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g) ?? []).map((m) => m.toLowerCase()));
  let originality =
    28 +
    (has(text, PATTERNS.originalEvidence) ? 30 : 0) +
    (anyNumberCount >= 3 && !has(text, PATTERNS.genericLists) ? 15 : 0) +
    Math.min(12, entityMatches.size * 4) -
    (has(text, PATTERNS.genericLists) ? 18 : 0) -
    Math.min(26, countMatches(text, PATTERNS.motivation) * 11);
  originality = clamp(originality);

  let actionability =
    10 +
    (has(text, PATTERNS.howTo) ? 18 : 0) +
    (listItems >= 3 ? 20 : listItems > 0 ? 8 : 0) +
    (has(text, PATTERNS.resources) ? 14 : 0) +
    (has(text, PATTERNS.interview) ? 16 : 0) +
    (has(text, /\b(results|findings|what worked|what didn'?t work)\b/i) ? 8 : 0) +
    (features.linkCount > 0 ? 6 : 0) -
    (has(text, /\b(dm me for|link in bio)\b/i) ? 8 : 0);
  actionability = clamp(actionability);

  let techDepth = Math.min(
    100,
    techHits.length * 13 +
      ARCH_TERMS.filter((t) => lower.includes(t)).length * 9 +
      (has(text, /\b(architecture|system design|scal(e|ing)|latency|throughput|distributed|inference|embedding|fine-tun|rag\b|transformer)/i)
        ? 15
        : 0)
  );
  techDepth = clamp(techDepth);

  const firstPerson = words > 0 ? countMatches(text, /\b(i|i'm|i've|my|me)\b/gi) / words : 0;
  let personalStory =
    Math.min(100, 0 + countMatches(text, PATTERNS.sob) * 19 + countMatches(text, PATTERNS.selfieContext) * 21 + countMatches(text, PATTERNS.emotionWords) * 8 + (firstPerson > 0.06 ? 16 : firstPerson > 0.03 ? 8 : 0));
  if (anyNumberCount > 2) personalStory -= 15;
  if (techHits.length > 2) personalStory -= 15;
  personalStory = clamp(personalStory);

  let engagementBait =
    countMatches(text, PATTERNS.bait) * 32 +
    (PATTERNS.questionOnlyEnd.test(text) && words < 80 ? 16 : 0) +
    (emojiCount > 6 ? 18 : 0) +
    (features.isPoll ? 10 : 0);
  engagementBait = clamp(engagementBait);

  let promotional =
    countMatches(text, PATTERNS.promo) * 23 +
    (features.linkCount >= 2 ? 8 : 0) +
    (has(text, /\b(our (product|platform|startup|app|saas)|i built|we built|we launched|introducing)\b/i) && features.linkCount > 0 ? 18 : 0);
  promotional = clamp(promotional);

  const jobRelevant =
    sets.roles.size === 0
      ? null
      : [...sets.roles].some((t) => tokensOf(`${text} ${features.authorHeadline}`).has(t)) ||
        [...sets.companies].some((t) => tokensOf(text).has(t));

  let careerValue: number;
  if (jobRelevant !== null || has(text, PATTERNS.jobPost)) {
    careerValue = jobRelevant ? 88 : has(text, PATTERNS.salary) ? 70 : sets.roles.size > 0 || sets.companies.size > 0 ? 22 : 55;
  } else if (has(text, PATTERNS.congrats) && anyNumberCount < 2) {
    careerValue = 25;
  } else if (has(text, PATTERNS.salary)) {
    careerValue = 72;
  } else {
    careerValue = clamp(28 + actionability * 0.5);
  }

  const relevance =
    evidence >= 55 && infoDensity >= 55 ? Math.max(rel.relevance, 50) : rel.relevance;

  const dimensions: Dimensions = {
    relevance,
    infoDensity,
    actionability,
    originality,
    evidence,
    techDepth,
    careerValue,
    personalStory,
    promotional,
    engagementBait
  };

  if (rel.matchedInterests.length) addPos(`Matches your interests (${[...new Set(rel.matchedInterests)].slice(0, 3).join(', ')})`);
  else addNeg('Not related to your interests');
  if (infoDensity >= 65) addPos('High information density');
  else if (infoDensity <= 35) addNeg('Low information density');
  if (evidence >= 55) addPos('Contains data or evidence');
  if (actionability >= 55) addPos('Actionable content');
  if (originality >= 60) addPos('Original insight or experience');
  if (techDepth >= 45) addPos('Technical depth');
  if (personalStory >= 55) addNeg('Mostly personal storytelling');
  if (engagementBait >= 30) addNeg('Engagement bait');
  if (promotional >= 35) addNeg('Promotional content');
  if (rel.avoided.length) addNeg(`Topic you want to avoid (${rel.avoided.slice(0, 2).join(', ')})`);
  if (features.isAd) addNeg('Sponsored content');

  if (features.isAd) classification.push(CLASSIFICATION_LABELS.ad);
  if (has(text, PATTERNS.interview)) classification.push(CLASSIFICATION_LABELS.interviewPrep);
  if (techHits.length >= 2 || techDepth >= 40) classification.push(CLASSIFICATION_LABELS.technical);
  if (/\b(ai|llm|llms|gpt|machine learning|deep learning|neural|transformer|genai|generative ai)\b/i.test(lower))
    classification.push(CLASSIFICATION_LABELS.ai);
  if (/\b(startup|founder|seed|series a|vc|venture|yc\b|y combinator|arr|mrr|bootstrapp)/i.test(lower))
    classification.push(CLASSIFICATION_LABELS.startup);
  if (has(text, DATA_WORDS) || evidence >= 55) classification.push(CLASSIFICATION_LABELS.data);
  if (has(text, PATTERNS.jobPost)) classification.push(CLASSIFICATION_LABELS.job);
  if (has(text, PATTERNS.congrats)) classification.push(CLASSIFICATION_LABELS.careerMilestone);
  if (has(text, PATTERNS.motivation) && infoDensity < 45) classification.push(CLASSIFICATION_LABELS.motivation);
  if (engagementBait >= 30) classification.push(CLASSIFICATION_LABELS.engagementBait);
  if (promotional >= 35) classification.push(CLASSIFICATION_LABELS.promotional);
  if (personalStory >= 50) classification.push(CLASSIFICATION_LABELS.personal);
  if (features.isRepost) classification.push(CLASSIFICATION_LABELS.repost);
  if (features.isPoll) classification.push(CLASSIFICATION_LABELS.poll);
  if (words < 5 && features.imageCount === 0) classification.push(CLASSIFICATION_LABELS.empty);
  if (!classification.length) classification.push('general');

  return {
    dimensions,
    classification,
    reasons: { positive, negative },
    matchedInterests: rel.matchedInterests,
    avoided: rel.avoided
  };
}

function tokensOf(text: string): Set<string> {
  return new Set(tokenize(text));
}

export function finalizeScore(dims: Dimensions, weights: ScoringWeights): number {
  const w = weights;
  const total = w.relevance + w.infoDensity + w.actionability + w.originality + w.evidence + w.techDepth + w.careerValue || 1;
  const core =
    (dims.relevance * w.relevance +
      dims.infoDensity * w.infoDensity +
      dims.actionability * w.actionability +
      dims.originality * w.originality +
      dims.evidence * w.evidence +
      dims.techDepth * w.techDepth +
      dims.careerValue * w.careerValue) /
    total;

  const penalty =
    dims.engagementBait * 0.3 + dims.promotional * 0.2 + Math.max(0, dims.personalStory - 45) * 0.28 + Math.max(0, 25 - dims.relevance) * 0.15;

  return clamp(Math.round(core * 1.35 - penalty));
}

export function heuristicAnalyze(
  features: PostFeatures,
  profile: UserProfile,
  weights: ScoringWeights,
  signals?: FeedbackSignals,
  profileSets?: ProfileTokenSets
): HeuristicOutput {
  const out = computeDimensions(features, profile, signals, profileSets);
  const { dimensions, classification } = out;
  const text = `${features.text ?? ''} ${features.repostText ?? ''}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  let score = finalizeScore(dimensions, weights);

  if (features.isAd) {
    score = 0;
  } else if (
    features.imageCount > 0 &&
    words < 15 &&
    (dimensions.personalStory >= 35 || /(selfie|photo|picture|beautiful|stunning)/i.test(features.imageAlts ?? ''))
  ) {
    score = Math.min(score, 20);
    classification.push(CLASSIFICATION_LABELS.personal);
    out.reasons.negative.push('Primarily visual/personal content');
  }
  if (out.dimensions.relevance < 30 && words > 0) {
    out.reasons.negative.push('Low relevance to your interests');
  }

  const forceShow = !features.isAd && matchesPerson(features.authorName, profile.followedPeople);
  const forceHide = !features.isAd && matchesPerson(features.authorName, profile.mutedPeople);
  if (forceShow) {
    score = Math.max(score, 90);
    out.reasons.positive.push('From someone you chose to always show');
  }
  if (forceHide) {
    score = Math.min(score, 5);
    out.reasons.negative.push('From someone you chose to always hide');
  }
  if (!features.isAd) out.reasons.positive = [...new Set(out.reasons.positive)];

  const confidence = clamp(
    0.3 + Math.min(0.4, words / 150) + (findTechTerms(text.toLowerCase()).length ? 0.15 : 0) + (words > 25 ? 0.1 : 0),
    0,
    1
  );

  return {
    score,
    dimensions,
    classification: [...new Set(classification)],
    reasons: out.reasons,
    confidence,
    isAd: features.isAd,
    isJob: classification.includes(CLASSIFICATION_LABELS.job),
    forceShow,
    forceHide
  };
}
