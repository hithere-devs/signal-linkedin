import { describe, expect, it } from 'vitest';
import type { PostFeatures } from '../src/types';
import { DEFAULT_PROFILE, DEFAULT_WEIGHTS } from '../src/lib/defaults';
import { computeDimensions, finalizeScore, heuristicAnalyze } from '../src/ai/heuristic';

function features(partial: Partial<PostFeatures> = {}): PostFeatures {
  return {
    id: 'test',
    text: '',
    authorName: 'Someone',
    authorHeadline: '',
    isAd: false,
    imageCount: 0,
    hasVideo: false,
    isRepost: false,
    isPoll: false,
    hasDocument: false,
    hashtags: [],
    linkCount: 0,
    ...partial
  };
}

const analyze = (f: PostFeatures) => heuristicAnalyze(f, DEFAULT_PROFILE, DEFAULT_WEIGHTS);

describe('heuristic scorer', () => {
  it('scores selfie + sob story near zero', () => {
    const r = analyze(
      features({
        text:
          "I still can't believe it. After 200 rejections and so many sleepless nights I finally got my dream job! I cried when I saw the offer. Never give up, trust the process ❤️🙏",
        imageCount: 3,
        imageAlts: 'selfie of a woman smiling in an office'
      })
    );
    expect(r.score).toBeLessThan(25);
    expect(r.dimensions.personalStory).toBeGreaterThan(50);
    expect(r.classification).toContain('personal');
  });

  it('scores concrete interview question posts very high', () => {
    const r = analyze(
      features({
        text:
          `I interviewed for an AI Engineer role last week.\nThese were the questions:\n1. Design a distributed cache\n2. Explain Kafka partitioning\n3. How does RAG handle stale embeddings?\n4. Implement rate limiter\n5. Vector database indexing tradeoffs\nHere is how I approached each one.`,
        hashtags: ['#ai', '#interview']
      })
    );
    expect(r.score).toBeGreaterThan(75);
    expect(r.classification).toContain('interview-prep');
  });

  it('scores data-backed case studies high', () => {
    const r = analyze(
      features({
        text:
          `We ran an A/B test across 120,000 users. Changing our onboarding flow increased conversion from 31% to 47%.\nChurn dropped 12%. Here is the exact breakdown of the three steps we changed and the results.`
      })
    );
    expect(r.dimensions.evidence).toBeGreaterThan(55);
    expect(r.score).toBeGreaterThan(65);
  });

  it('scores generic motivational content low', () => {
    const r = analyze(
      features({
        text: 'Believe in yourself. Never give up on your dreams. Consistency is key. Hard work pays off. Mindset is everything 🙌'
      })
    );
    expect(r.score).toBeLessThan(30);
    expect(r.classification).toContain('motivation');
  });

  it('penalizes engagement bait', () => {
    const bait = analyze(features({ text: 'Agree? Comment YES below if you think hard work beats talent. Tag someone who needs this!' }));
    const plain = analyze(features({ text: 'Hard work beats talent when talent does not work hard.' }));
    expect(bait.dimensions.engagementBait).toBeGreaterThan(30);
    expect(bait.score).toBeLessThan(plain.score);
  });

  it('differentiates relevance between profiles', () => {
    const f = features({ text: '10 lessons I learned becoming a registered nurse in the ICU. Shift routines, patient ratios, charting systems.' });
    const swe = heuristicAnalyze(f, DEFAULT_PROFILE, DEFAULT_WEIGHTS);
    const nurse = heuristicAnalyze(f, { ...DEFAULT_PROFILE, role: 'Nurse', skills: ['patient care', 'charting'], interests: ['healthcare', 'nursing', 'nurse'], industries: ['Healthcare'] }, DEFAULT_WEIGHTS);
    expect(nurse.dimensions.relevance).toBeGreaterThan(swe.dimensions.relevance);
  });

  it('boosts job posts at desired companies', () => {
    const f = features({ text: 'We are hiring a Senior AI Engineer to work on LLM inference infrastructure. Apply now — the role is open.' });
    const withCompany = heuristicAnalyze(
      f,
      { ...DEFAULT_PROFILE, companies: ['OpenAI'], desiredRoles: ['AI Engineer'] },
      DEFAULT_WEIGHTS
    );
    const without = heuristicAnalyze(f, { ...DEFAULT_PROFILE }, DEFAULT_WEIGHTS);
    expect(withCompany.dimensions.careerValue).toBeGreaterThan(without.dimensions.careerValue);
  });

  it('zeroes out ads', () => {
    const r = analyze(features({ isAd: true, text: 'Try our product free for 30 days' }));
    expect(r.score).toBe(0);
    expect(r.isAd).toBe(true);
  });

  it('caps image-only personal posts', () => {
    const r = analyze(features({ text: '', imageCount: 1, imageAlts: 'gym mirror selfie' }));
    expect(r.score).toBeLessThanOrEqual(20);
  });

  it('does not punish valuable reposts', () => {
    const r = analyze(
      features({
        text: '',
        repostText: 'We analyzed 50,000 GitHub PRs and found AI code review cuts merge time by 34%. Full dataset and methodology inside.',
        isRepost: true
      })
    );
    expect(r.score).toBeGreaterThan(60);
  });

  it('always shows followed people and hides muted people', () => {
    const followed = heuristicAnalyze(
      features({ authorName: 'Jane Doe', text: 'A short update.' }),
      { ...DEFAULT_PROFILE, followedPeople: ['Jane Doe'] },
      DEFAULT_WEIGHTS
    );
    const muted = heuristicAnalyze(
      features({ authorName: 'Jane Doe', text: 'A detailed AI engineering update with benchmarks.' }),
      { ...DEFAULT_PROFILE, mutedPeople: ['Jane Doe'] },
      DEFAULT_WEIGHTS
    );
    expect(followed.forceShow).toBe(true);
    expect(followed.score).toBeGreaterThanOrEqual(90);
    expect(muted.forceHide).toBe(true);
    expect(muted.score).toBeLessThanOrEqual(5);
  });
});

describe('dimensions & scoring model', () => {
  const sample = features({
    text: 'Our inference cost dropped 63% after switching to batched embeddings. Latency went from 800ms to 210ms. Here is the architecture breakdown.'
  });

  it('computes all dimensions in range', () => {
    const { dimensions } = computeDimensions(sample, DEFAULT_PROFILE, undefined);
    for (const v of Object.values(dimensions)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('shifting weight toward relevance helps high-relevance posts', () => {
    const hi = features({
      text:
        'I interviewed for an AI Engineer role at an AI startup.\nThese were the questions:\n1. Design a distributed cache\n2. Explain Kafka partitioning\n3. How does RAG handle stale embeddings?\n4. Vector database indexing tradeoffs\nHere is how I approached each one.'
    });
    const dims = computeDimensions(hi, DEFAULT_PROFILE, undefined).dimensions;
    const base = finalizeScore(dims, DEFAULT_WEIGHTS);
    const tilted = finalizeScore(dims, { ...DEFAULT_WEIGHTS, relevance: 0.4, infoDensity: 0.1 });
    expect(tilted).toBeGreaterThanOrEqual(base);
  });

  it('clamps final scores to 0-100', () => {
    const extreme = { ...computeDimensions(sample, DEFAULT_PROFILE, undefined).dimensions };
    for (const k of Object.keys(extreme) as Array<keyof typeof extreme>) extreme[k] = 100;
    expect(finalizeScore(extreme, DEFAULT_WEIGHTS)).toBeLessThanOrEqual(100);
    for (const k of Object.keys(extreme) as Array<keyof typeof extreme>) extreme[k] = 0;
    expect(finalizeScore(extreme, DEFAULT_WEIGHTS)).toBeGreaterThanOrEqual(0);
  });
});
