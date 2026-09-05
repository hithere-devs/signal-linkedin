export interface UserProfile {
  role: string;
  industries: string[];
  skills: string[];
  interests: string[];
  careerGoals: string[];
  companies: string[];
  desiredRoles: string[];
  topicsToAvoid: string[];
  followedPeople: string[];
  mutedPeople: string[];
}

export interface ScoringWeights {
  relevance: number;
  infoDensity: number;
  actionability: number;
  originality: number;
  evidence: number;
  techDepth: number;
  careerValue: number;
}

export interface Dimensions {
  relevance: number;
  infoDensity: number;
  actionability: number;
  originality: number;
  evidence: number;
  techDepth: number;
  careerValue: number;
  personalStory: number;
  promotional: number;
  engagementBait: number;
}

export interface PostFeatures {
  id: string;
  text: string;
  repostText?: string;
  authorName: string;
  authorHeadline: string;
  imageAlts?: string;
  isAd: boolean;
  imageCount: number;
  imageUrls?: string[];
  hasVideo: boolean;
  isRepost: boolean;
  isPoll: boolean;
  hasDocument: boolean;
  hashtags: string[];
  linkCount: number;
}

export interface ScoreReasons {
  positive: string[];
  negative: string[];
}

export type ProviderKind = 'heuristic' | 'llm' | 'hybrid';

export interface AnalysisResult {
  hash: string;
  score: number;
  classification: string[];
  dimensions: Dimensions;
  reasons: ScoreReasons;
  isAd: boolean;
  isJob: boolean;
  confidence: number;
  provider: ProviderKind;
  analyzedAt: number;
  forceShow?: boolean;
  forceHide?: boolean;
}

export type FilterMode = 'hide' | 'collapse' | 'blur' | 'score';
export type JobTreatment = 'hide' | 'relevant' | 'show';

export interface AiConfig {
  enabled: boolean;
  preset?: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  vision: boolean;
}

export interface ExtensionSettings {
  enabled: boolean;
  threshold: number;
  mode: FilterMode;
  hideAds: boolean;
  jobTreatment: JobTreatment;
  debug: boolean;
  ai: AiConfig;
  weights: ScoringWeights;
}

export interface FeedbackSignals {
  positive: Record<string, number>;
  negative: Record<string, number>;
}

export interface DailyStats {
  date: string;
  analyzed: number;
  shown: number;
  hidden: number;
  adsHidden: number;
  scoreShownSum: number;
  scoreHiddenSum: number;
  categories: Record<string, number>;
  reasonsHidden: Record<string, number>;
}

export interface BootstrapPayload {
  settings: ExtensionSettings;
  profile: UserProfile;
  signals: FeedbackSignals;
  overrides: Record<string, 'show' | 'hide'>;
}

export interface CloudUser {
  id: string;
  email: string;
}

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: CloudUser;
}

export interface CloudSyncMeta {
  localUpdatedAt: number;
  lastSyncedAt: number | null;
  remoteUpdatedAt: number | null;
  pending: boolean;
  lastError?: string;
}

export interface SyncedAiConfig extends Omit<AiConfig, 'apiKey'> {}

export interface SyncedSettings extends Omit<ExtensionSettings, 'ai'> {
  ai: SyncedAiConfig;
}

export interface SyncSnapshot {
  version: 1;
  updatedAt: number;
  settings: SyncedSettings;
  profile: UserProfile;
  signals: FeedbackSignals;
  overrides: Record<string, 'show' | 'hide'>;
  stats: DailyStats[];
}

export interface CloudStatus {
  configured: boolean;
  origin?: string;
  signedIn: boolean;
  user?: CloudUser;
  lastSyncedAt: number | null;
  pending: boolean;
  lastError?: string;
}

export interface CloudAuthResponse {
  status: CloudStatus;
  notice?: string;
}

export interface AnalyzeResponse {
  result: AnalysisResult;
  settings: ExtensionSettings;
}

export type Message =
  | { type: 'bootstrap' }
  | { type: 'analyze'; features: PostFeatures }
  | { type: 'setSetting'; key: keyof ExtensionSettings; value: unknown }
  | { type: 'setAi'; value: Partial<AiConfig> }
  | { type: 'setProfile'; value: UserProfile }
  | { type: 'setWeights'; value: ScoringWeights }
  | { type: 'override'; hash: string; action: 'show' | 'hide' }
  | { type: 'feedback'; hash: string; dir: 'up' | 'down'; tags: string[] }
  | { type: 'stats:add'; payload: StatsDelta }
  | { type: 'stats:getToday' }
  | { type: 'stats:getHistory'; days: number }
  | { type: 'stats:reset' }
  | { type: 'data:export' }
  | { type: 'data:clear' }
  | { type: 'ai:test' }
  | { type: 'cloud:status' }
  | { type: 'cloud:signup'; email: string; password: string }
  | { type: 'cloud:signin'; email: string; password: string }
  | { type: 'cloud:signout' }
  | { type: 'cloud:recover'; email: string }
  | { type: 'cloud:sync'; direction?: 'auto' | 'push' | 'pull' }
  | { type: 'cloud:deleteAccount' }
  | { type: 'openPage'; page: 'dashboard' | 'settings' | 'demo'; section?: 'profile' | 'feed' | 'ai' | 'account' | 'privacy' };

export interface StatsDelta {
  analyzed?: number;
  shown?: number;
  hidden?: number;
  adsHidden?: number;
  scoreShownSum?: number;
  scoreHiddenSum?: number;
  categories?: Record<string, number>;
  reasonsHidden?: Record<string, number>;
}
