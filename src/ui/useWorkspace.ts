import { useCallback, useEffect, useRef, useState } from 'react';
import type { BootstrapPayload, CloudStatus, ExtensionSettings } from '../types';
import { isExtension } from '../lib/environment';
import { sendMessage } from '../lib/runtime';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useWorkspace() {
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const revision = useRef(0);
  const pending = useRef(0);

  const reload = useCallback(async () => {
    try {
      const [payload, status] = await Promise.all([
        sendMessage<BootstrapPayload>({ type: 'bootstrap' }),
        sendMessage<CloudStatus>({ type: 'cloud:status' }).catch(() => null),
      ]);
      if (pending.current === 0) setBoot(payload);
      setCloud(status);
      return payload;
    } catch (reason) {
      setError(errorMessage(reason));
      return null;
    }
  }, []);

  useEffect(() => {
    void reload();
    const refresh = () => {
      if (!pending.current) void reload();
    };
    if (!isExtension()) {
      window.addEventListener('signal-preview-change', refresh);
      window.addEventListener('storage', refresh);
      return () => {
        window.removeEventListener('signal-preview-change', refresh);
        window.removeEventListener('storage', refresh);
      };
    }
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (
        area === 'local' &&
        ['signal.settings', 'signal.profile', 'signal.signals'].some((key) => key in changes)
      )
        refresh();
    };
    chrome.storage.onChanged.addListener(changed);
    return () => chrome.storage.onChanged.removeListener(changed);
  }, [reload]);

  const patchSetting = useCallback(
    async (key: keyof ExtensionSettings, value: unknown) => {
      const currentRevision = ++revision.current;
      pending.current++;
      setSaving(true);
      setError(null);
      setBoot((current) =>
        current ? { ...current, settings: { ...current.settings, [key]: value } } : current
      );
      const write = writes.current
        .catch(() => {})
        .then(() => sendMessage<ExtensionSettings>({ type: 'setSetting', key, value }));
      writes.current = write;
      try {
        const settings = await write;
        if (currentRevision === revision.current)
          setBoot((current) => (current ? { ...current, settings } : current));
      } catch (reason) {
        setError(errorMessage(reason));
      } finally {
        pending.current--;
        if (!pending.current) {
          setSaving(false);
          // Reconcile failed or externally interleaved writes with actual storage.
          void reload();
        }
      }
    },
    [reload]
  );

  return { boot, setBoot, cloud, setCloud, error, setError, saving, reload, patchSetting };
}
