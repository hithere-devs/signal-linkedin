import { describe, expect, it } from 'vitest';
import { fnv1a, normalizeForHash, postHash, tokenize } from '../src/lib/hash';

describe('hashing', () => {
  it('is deterministic', () => {
    expect(fnv1a('hello world')).toBe(fnv1a('hello world'));
  });

  it('differs across inputs', () => {
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });

  it('normalizes whitespace, casing and urls', () => {
    expect(normalizeForHash('Hello   WORLD http://x.com/a')).toBe(normalizeForHash('hello world url'));
  });

  it('same post yields same hash regardless of whitespace', () => {
    const a = postHash({ text: 'Some post about   Kafka\nand caching', authorName: 'Jane Doe', mediaCount: 2 });
    const b = postHash({ text: 'some post about kafka and caching', authorName: 'jane doe', mediaCount: 2 });
    expect(a).toBe(b);
  });

  it('tokenize drops stopwords and numbers', () => {
    const tokens = tokenize('I am learning Kafka and Redis in 2024');
    expect(tokens).toContain('kafka');
    expect(tokens).toContain('redis');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('2024');
  });
});
