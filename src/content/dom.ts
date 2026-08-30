import type { PostFeatures } from '../types';

// LinkedIn has moved from stable `feed-shared-*` class names to hashed CSS
// classes. Keep the old selectors for older layouts, but use semantic anchors
// as the primary fallback so a CSS rename does not turn the extension off.
const LEGACY_POST_ROOT_SELECTOR =
  'div.feed-shared-update-v2, div[data-urn*="urn:li:aggregate"], div[data-urn*="urn:li:share"]';
const MODERN_POST_ROOT_SELECTOR = '[role="listitem"]';

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Text in the current LinkedIn renderer is split across many span nodes with
 * no whitespace between sibling text nodes. Joining text nodes explicitly
 * keeps `youwe're` from reaching the scorer as one token.
 */
function textWithSpacing(root: Element): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const value = clean(node.textContent);
    if (value) parts.push(value);
  }
  return clean(parts.join(' ')).replace(/\s+([,.;!?%])/g, '$1');
}

function isFeedPost(root: HTMLElement): boolean {
  const hasHeading = Array.from(root.querySelectorAll('h2, h3')).some((el) =>
    /^feed post$/i.test(clean(el.textContent))
  );
  const hasPostAction = !!root.querySelector(
    'button[aria-label^="Open control menu for post by "], button[aria-label^="Hide post by "]'
  );
  const startsLikePost = /^feed post\b/i.test(clean(root.textContent));
  return hasHeading || hasPostAction || startsLikePost;
}

function rootFor(element: Element): HTMLElement | null {
  const modern = element.closest(MODERN_POST_ROOT_SELECTOR) as HTMLElement | null;
  if (modern) return modern;
  const legacy = element.closest(LEGACY_POST_ROOT_SELECTOR) as HTMLElement | null;
  return legacy;
}

export function findFeedPosts(scope: ParentNode = document): HTMLElement[] {
  const roots = new Map<Element, HTMLElement>();
  const candidates = scope.querySelectorAll(
    `${LEGACY_POST_ROOT_SELECTOR}, ${MODERN_POST_ROOT_SELECTOR}, h2, h3`
  );

  candidates.forEach((element) => {
    const root = rootFor(element);
    if (!root || root.classList.contains('signal-done') || !isFeedPost(root)) return;
    roots.set(root, root);
  });

  return [...roots.values()];
}

export function isPromoted(root: HTMLElement): boolean {
  if (
    root.matches('.feed-shared-inline-ad, [data-test-id*="main-feed-activity-component__ad"]') ||
    root.querySelector(
      '.update-components-promoted, [data-test-id*="ad-badge"], .feed-shared-update-v2__update-content--sponsored'
    )
  ) {
    return true;
  }

  const promotedLabels = new Set([
    'promoted',
    'sponsored',
    'sponsorisé',
    'gesponsert',
    'patrocinado',
    'promocionado',
    'sponsorizzato'
  ]);
  const leaves = root.querySelectorAll('span, p, div');
  for (const el of Array.from(leaves).slice(0, 180)) {
    if (el.children.length > 0) continue;
    if (promotedLabels.has(clean(el.textContent).toLowerCase())) return true;
  }
  return false;
}

interface ActorInfo {
  name: string;
  headline: string;
}

function stripRelationship(name: string): string {
  return clean(name).replace(/\s+[•·|].*$/, '').trim();
}

function extractActor(root: HTMLElement): ActorInfo {
  const legacyName =
    root.querySelector<HTMLElement>('.update-components-actor__single-line-title span[aria-hidden="true"]')?.textContent ??
    root.querySelector<HTMLElement>('.update-components-actor__title span[aria-hidden="true"]')?.textContent ??
    root.querySelector<HTMLElement>('.update-components-actor__title')?.textContent ??
    '';
  const legacyHeadline =
    root.querySelector<HTMLElement>('.update-components-actor__description')?.textContent ??
    root.querySelector<HTMLElement>('.update-components-actor__sub-description')?.textContent ??
    '';
  if (legacyName || legacyHeadline) {
    return { name: clean(legacyName), headline: clean(legacyHeadline) };
  }

  const action = root.querySelector<HTMLElement>(
    'button[aria-label^="Open control menu for post by "], button[aria-label^="Hide post by "]'
  );
  const fromAction = action?.getAttribute('aria-label')?.match(/post by (.+)$/i)?.[1] ?? '';
  const profileLink = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"], a[href*="/company/"]'))
    .map((a) => clean(textWithSpacing(a)))
    .find((text) => text.length > 0);
  const profileImage = root.querySelector<HTMLImageElement>('img[alt^="View "][alt*="profile"]');
  const fromImage = profileImage?.alt.replace(/^View\s+/i, '').replace(/[’']s profile$/i, '') ?? '';
  const name = stripRelationship(fromAction || profileLink || fromImage);

  const paragraphs = leafParagraphs(root);
  const authorIndex = paragraphs.findIndex((text) => stripRelationship(text).toLowerCase() === name.toLowerCase());
  const headline = paragraphs
    .slice(authorIndex >= 0 ? authorIndex + 1 : 0, authorIndex >= 0 ? authorIndex + 6 : 6)
    .find((text) => !isUiText(text) && text.length >= 12 && text.length < 180) ?? '';

  return { name, headline };
}

function leafParagraphs(root: HTMLElement): string[] {
  return [...root.querySelectorAll('p')]
    .filter((el) => !el.querySelector('p'))
    .map((el) => clean(textWithSpacing(el)))
    .filter(Boolean);
}

function isTimeText(text: string): boolean {
  return /^(?:\d+\s*(?:s|m|h|d|w|mo|y)|just now)(?:\s*[•·].*)?$/i.test(text);
}

function isUiText(text: string): boolean {
  return (
    !text ||
    /^feed post$/i.test(text) ||
    /^(?:visit my website|follow|connect|author|see .* comment|show translation|reactions?|comments?|reposts?)$/i.test(text) ||
    isTimeText(text) ||
    /^\d[\d,.]*\s*(?:reaction|reactions|comment|comments|repost|reposts|like|likes)$/i.test(text) ||
    /^(?:promoted|sponsored)$/i.test(text)
  );
}

function collectTexts(root: HTMLElement): { main: string; repost: string } {
  const legacyMain = [...root.querySelectorAll('.update-components-text')]
    .filter((el) => !el.closest('.update-components-mini-update-v2'))
    .map((el) => clean(textWithSpacing(el)))
    .filter(Boolean);
  const legacyRepost = [...root.querySelectorAll('.update-components-mini-update-v2 .update-components-text')]
    .map((el) => clean(textWithSpacing(el)))
    .filter(Boolean);
  if (legacyMain.length || legacyRepost.length) {
    return { main: legacyMain.join('\n').trim(), repost: legacyRepost.join('\n').trim() };
  }

  const paragraphs = leafParagraphs(root);
  const author = extractActor(root).name.toLowerCase();
  const authorIndex = paragraphs.findIndex((text) => stripRelationship(text).toLowerCase() === author);
  const secondAuthorIndex = paragraphs.findIndex(
    (text, index) => index > authorIndex + 1 && stripRelationship(text).toLowerCase() === author
  );
  const region = paragraphs.slice(authorIndex >= 0 ? authorIndex + 1 : 0, secondAuthorIndex > 0 ? secondAuthorIndex : undefined);
  const useful = region.filter((text) => !isUiText(text) && text.length >= 18);
  // The first useful paragraph is normally the author's headline. Keep it in
  // actor metadata and score the remaining paragraphs as the post body.
  const main = (useful.length > 1 ? useful.slice(1) : useful).slice(0, 5).join('\n').trim();

  return { main, repost: '' };
}

function extractImages(root: HTMLElement): { urls: string[]; alts: string[] } {
  const urls: string[] = [];
  const alts: string[] = [];
  root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const src = img.currentSrc || img.getAttribute('src') || '';
    const w = img.width || parseInt(img.getAttribute('width') ?? '0', 10);
    const alt = clean(img.alt);
    let imageUrl: URL;
    try {
      imageUrl = new URL(src);
    } catch {
      return;
    }
    if (imageUrl.protocol !== 'https:' || (imageUrl.hostname !== 'licdn.com' && !imageUrl.hostname.endsWith('.licdn.com')) || w < 60) return;
    if (/profile|avatar|ghost-person/i.test(src) || /profile|avatar|ghost person/i.test(alt)) return;
    urls.push(src);
    if (alt && !/no alternative text/i.test(alt)) alts.push(alt);
  });
  return { urls: [...new Set(urls)].slice(0, 4), alts: [...new Set(alts)] };
}

function extractHashtags(text: string): string[] {
  return [...new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? [])].slice(0, 10);
}

function hasModernMedia(root: HTMLElement, selector: string): boolean {
  return !!root.querySelector(selector);
}

export function extractFeatures(root: HTMLElement): PostFeatures | null {
  try {
    const actor = extractActor(root);
    const { main, repost } = collectTexts(root);
    const images = extractImages(root);
    const text = `${main}\n${repost}`.trim();
    const externalLinks = [...root.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')].filter((a) => {
      try {
        return new URL(a.href).hostname !== 'www.linkedin.com' && !a.href.endsWith('linkedin.com/');
      } catch {
        return false;
      }
    });

    const features: PostFeatures = {
      id: root.getAttribute('data-urn') || root.id || root.getAttribute('componentkey') || '',
      text: main.slice(0, 12_000),
      repostText: repost.slice(0, 12_000) || undefined,
      authorName: actor.name.slice(0, 200),
      authorHeadline: actor.headline.slice(0, 500),
      imageAlts: images.alts.join(' ') || undefined,
      isAd: isPromoted(root),
      imageCount: images.urls.length,
      imageUrls: images.urls,
      hasVideo: hasModernMedia(root, '.update-components-video, video, [role="video"]'),
      isRepost: hasModernMedia(root, '.update-components-mini-update-v2, [data-testid*="repost"]'),
      isPoll: hasModernMedia(root, '.update-components-poll, [data-testid*="poll"]') || /\bpoll\b/i.test(text),
      hasDocument: hasModernMedia(root, '.update-components-document, a[href*="/documents/"]'),
      hashtags: extractHashtags(text),
      linkCount: externalLinks.length
    };

    if (!features.text && !features.repostText && !features.imageCount && !features.hasVideo && !features.authorName) {
      return null;
    }
    return features;
  } catch {
    return null;
  }
}
