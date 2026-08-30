import { describe, expect, it } from 'vitest';
import { AI_PRESETS, getAiPreset } from '../src/ai/presets';

 describe('AI presets', () => {
  it('includes local and hosted free-compatible options', () => {
    expect(AI_PRESETS.map((p) => p.id)).toEqual(expect.arrayContaining(['ollama', 'lmstudio', 'groq', 'openrouter', 'gemini']));
    expect(getAiPreset('ollama').requiresKey).toBe(false);
    expect(getAiPreset('groq').baseUrl).toContain('openai');
  });

  it('falls back to custom for unknown presets', () => {
    expect(getAiPreset('missing').id).toBe('custom');
  });
});
