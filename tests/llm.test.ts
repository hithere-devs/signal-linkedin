import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeWithLlm } from '../src/ai/llm';
import { DEFAULT_PROFILE } from '../src/lib/defaults';
import type { AiConfig, PostFeatures } from '../src/types';

const config: AiConfig = {
  enabled: true,
  preset: 'custom',
  baseUrl: 'https://api.example.com/v1',
  model: 'test-model',
  apiKey: 'test-key',
  vision: false
};

const features: PostFeatures = {
  id: 'post-1',
  text: 'A benchmark with concrete results.',
  authorName: 'Test Author',
  authorHeadline: 'Engineer',
  isAd: false,
  imageCount: 0,
  hasVideo: false,
  isRepost: false,
  isPoll: false,
  hasDocument: false,
  hashtags: [],
  linkCount: 0
};

afterEach(() => vi.unstubAllGlobals());

describe('LLM response validation', () => {
  it('bounds scores, tags, dimensions, and reasons', async () => {
    const modelOutput = {
      score: 900,
      classification: ['technical', 'not-an-allowed-tag', 'x'.repeat(100)],
      dimensions: { relevance: 140, promotional: -10, injected: 99 },
      reasons: { positive: ['  Concrete evidence  ', 42], negative: ['x'.repeat(200)] },
      confidence: 4
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelOutput) } }]
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await analyzeWithLlm(config, features, DEFAULT_PROFILE);
    expect(result.score).toBe(100);
    expect(result.classification).toEqual(['technical']);
    expect(result.dimensions).toEqual({ relevance: 100, promotional: 0 });
    expect(result.reasons?.positive).toEqual(['Concrete evidence']);
    expect(result.reasons?.negative?.[0]).toHaveLength(120);
    expect(result.confidence).toBe(1);
  });
});
