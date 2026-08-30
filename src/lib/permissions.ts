export function hostPattern(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}/*`;
  } catch {
    return null;
  }
}

export async function requestHostAccess(rawUrl: string): Promise<boolean> {
  const pattern = hostPattern(rawUrl);
  if (!pattern) throw new Error('Enter a valid HTTP or HTTPS base URL first.');
  if (await chrome.permissions.contains({ origins: [pattern] })) return true;
  return chrome.permissions.request({ origins: [pattern] });
}

export async function requestImageAccess(): Promise<boolean> {
  const origin = 'https://*.licdn.com/*';
  if (await chrome.permissions.contains({ origins: [origin] })) return true;
  return chrome.permissions.request({ origins: [origin] });
}
