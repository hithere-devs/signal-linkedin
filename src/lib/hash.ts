export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + (Math.imul(h ^ 0xdeadbeef, 0x93ad5a1) >>> 0).toString(16).padStart(8, '0');
}

export function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' url ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function postHash(parts: { text: string; authorName: string; mediaCount: number }): string {
  return fnv1a(`${normalizeForHash(parts.authorName)}|${parts.mediaCount}|${normalizeForHash(parts.text).slice(0, 4000)}`);
}

const STOPWORDS = new Set(
  ('a an the and or but if then else for of to in on at by with from as is are was were be been being it its this that these those i me my we our you your he she his her they them their what which who whom how why when where all any both each few more most other some such no nor not only own same so than too very can will just should now do does did doing have has had having here there about into over after before between out against during without within along across behind beyond plus via per etc'.split(
    /\s+/
  ) as string[])
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}#+]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}
