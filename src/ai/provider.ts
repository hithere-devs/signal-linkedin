import type { AiConfig, PostFeatures, UserProfile } from '../types';
import { analyzeWithLlm, testAiConnection, type LlmOutput } from './llm';

export interface DeepAnalysisContext {
  features: PostFeatures;
  profile: UserProfile;
  config: AiConfig;
}

export interface AIProvider {
  readonly name: string;
  analyze(ctx: DeepAnalysisContext): Promise<LlmOutput | null>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}

class OpenAICompatProvider implements AIProvider {
  readonly name = 'openai-compat';

  constructor(private cfg: AiConfig) {}

  async analyze(ctx: DeepAnalysisContext): Promise<LlmOutput | null> {
    try {
      return await analyzeWithLlm(this.cfg, ctx.features, ctx.profile);
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return testAiConnection(this.cfg);
  }
}

export function getProvider(cfg: AiConfig): AIProvider | null {
  if (!cfg.enabled || !cfg.baseUrl || !cfg.model) return null;
  return new OpenAICompatProvider(cfg);
}

export function shouldSendImages(features: PostFeatures, cfg: AiConfig): boolean {
  return cfg.vision && !!features.imageUrls && features.imageUrls.length > 0;
}
