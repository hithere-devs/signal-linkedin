import type { AiConfig, ExtensionSettings, FilterMode, JobTreatment, ScoringWeights, UserProfile } from '../types';

export const DEFAULT_PROFILE: UserProfile = {
  role: 'Software Engineer',
  industries: ['AI', 'SaaS', 'Startups', 'Developer Tools'],
  skills: ['Python', 'TypeScript', 'React', 'LLMs', 'AI Agents', 'Backend Systems'],
  interests: ['AI startups', 'Product building', 'Engineering', 'Fundraising', 'YC', 'Developer tools'],
  careerGoals: [
    'Build startups',
    'Become better technically',
    'Learn from experienced founders',
    'Discover useful engineering practices'
  ],
  companies: [],
  desiredRoles: [],
  topicsToAvoid: [],
  followedPeople: [],
  mutedPeople: []
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  relevance: 0.3,
  infoDensity: 0.2,
  actionability: 0.15,
  originality: 0.1,
  evidence: 0.1,
  techDepth: 0.05,
  careerValue: 0.1
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  threshold: 55,
  mode: 'collapse',
  hideAds: true,
  jobTreatment: 'show',
  debug: false,
  ai: {
    enabled: false,
    preset: 'custom',
    baseUrl: '',
    model: '',
    apiKey: '',
    vision: false
  },
  weights: DEFAULT_WEIGHTS
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown, fallback = '', max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

export function sanitizeTagList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const cleaned = text(item, '', 100).replace(/\s+/g, ' ');
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length === 60) break;
  }
  return out;
}

export function normalizeSettings(raw: unknown): ExtensionSettings {
  const input = record(raw);
  const aiInput = record(input.ai);
  const weightInput = record(input.weights);

  const ai: AiConfig = {
    enabled: bool(aiInput.enabled, DEFAULT_SETTINGS.ai.enabled),
    preset: text(aiInput.preset, DEFAULT_SETTINGS.ai.preset, 50),
    baseUrl: text(aiInput.baseUrl, DEFAULT_SETTINGS.ai.baseUrl, 500),
    model: text(aiInput.model, DEFAULT_SETTINGS.ai.model, 200),
    apiKey: text(aiInput.apiKey, DEFAULT_SETTINGS.ai.apiKey, 2048),
    vision: bool(aiInput.vision, DEFAULT_SETTINGS.ai.vision)
  };

  const weights = Object.fromEntries(
    Object.entries(DEFAULT_WEIGHTS).map(([key, fallback]) => [
      key,
      finiteNumber(weightInput[key], fallback, 0, 1)
    ])
  ) as unknown as ScoringWeights;

  return {
    threshold: Math.round(finiteNumber(input.threshold, DEFAULT_SETTINGS.threshold, 0, 100)),
    mode: enumValue(input.mode, ['hide', 'collapse', 'blur', 'score'] as const, DEFAULT_SETTINGS.mode as FilterMode),
    hideAds: bool(input.hideAds, DEFAULT_SETTINGS.hideAds),
    jobTreatment: enumValue(
      input.jobTreatment,
      ['hide', 'relevant', 'show'] as const,
      DEFAULT_SETTINGS.jobTreatment as JobTreatment
    ),
    debug: bool(input.debug, DEFAULT_SETTINGS.debug),
    ai,
    weights
  };
}

export function normalizeProfile(raw: unknown): UserProfile {
  const input = record(raw);
  return {
    role: text(input.role, DEFAULT_PROFILE.role, 160),
    industries: sanitizeTagList(input.industries, DEFAULT_PROFILE.industries),
    skills: sanitizeTagList(input.skills, DEFAULT_PROFILE.skills),
    interests: sanitizeTagList(input.interests, DEFAULT_PROFILE.interests),
    careerGoals: sanitizeTagList(input.careerGoals, DEFAULT_PROFILE.careerGoals),
    companies: sanitizeTagList(input.companies),
    desiredRoles: sanitizeTagList(input.desiredRoles),
    topicsToAvoid: sanitizeTagList(input.topicsToAvoid),
    followedPeople: sanitizeTagList(input.followedPeople),
    mutedPeople: sanitizeTagList(input.mutedPeople)
  };
}
