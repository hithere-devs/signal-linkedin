import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, normalizeProfile, normalizeSettings, sanitizeTagList } from '../src/lib/defaults';

describe('settings normalization', () => {
  it('clamps numbers and rejects invalid enum values', () => {
    const settings = normalizeSettings({
      threshold: 900,
      mode: 'destroy',
      jobTreatment: 'maybe',
      weights: { relevance: -4, evidence: 12 },
      ai: { enabled: 'yes', baseUrl: 42, model: ' model ' }
    });

    expect(settings.threshold).toBe(100);
    expect(settings.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(settings.jobTreatment).toBe(DEFAULT_SETTINGS.jobTreatment);
    expect(settings.weights.relevance).toBe(0);
    expect(settings.weights.evidence).toBe(1);
    expect(settings.ai.enabled).toBe(false);
    expect(settings.ai.baseUrl).toBe('');
    expect(settings.ai.model).toBe('model');
  });

  it('deduplicates and bounds profile tags', () => {
    const tags = sanitizeTagList([' React ', 'react', '', 12, ...Array.from({ length: 80 }, (_, i) => `tag-${i}`)]);
    expect(tags[0]).toBe('React');
    expect(tags).toHaveLength(60);

    const profile = normalizeProfile({ role: 12, interests: 'AI' });
    expect(profile.role).toBe(DEFAULT_PROFILE.role);
    expect(profile.interests).toEqual(DEFAULT_PROFILE.interests);
  });
});
