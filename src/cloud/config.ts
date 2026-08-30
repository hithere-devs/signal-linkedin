export interface CloudConfig {
  url: string;
  anonKey: string;
  origin: string;
}

export function getCloudConfig(): CloudConfig | null {
  const url = __SIGNAL_CLOUD_CONFIG__.url.trim().replace(/\/+$/, '');
  const anonKey = __SIGNAL_CLOUD_CONFIG__.anonKey.trim();
  if (!url || !anonKey) return null;

  try {
    const parsed = new URL(url);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) return null;
    return { url, anonKey, origin: parsed.origin };
  } catch {
    return null;
  }
}
