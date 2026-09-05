export function isExtension(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
}

export function isPreview(): boolean {
  const previewBuild = typeof __SIGNAL_WEB_PREVIEW__ !== 'undefined' && __SIGNAL_WEB_PREVIEW__;
  return (
    !isExtension() &&
    typeof location !== 'undefined' &&
    (previewBuild || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname))
  );
}

export function appVersion(): string {
  return isExtension()
    ? chrome.runtime.getManifest().version
    : typeof __SIGNAL_VERSION__ === 'string'
      ? __SIGNAL_VERSION__
      : '1.0.0';
}

export const SOURCE_URL = 'https://github.com/hithere-devs/signal-linkedin';
export const LINKEDIN_URL = 'https://www.linkedin.com/feed/';
