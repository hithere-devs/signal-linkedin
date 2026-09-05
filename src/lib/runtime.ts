export interface RuntimeResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function sendMessage<T>(message: unknown): Promise<T> {
  if (isPreview()) {
    return import('../preview/runtime').then(({ sendPreviewMessage }) => sendPreviewMessage(message as Message) as Promise<T>);
  }
  if (!isExtension()) return Promise.reject(new Error('Open Signal from the Chrome extension, or run npm run preview for the local demo.'));
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse<T> | undefined) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message || 'The extension service worker is unavailable.'));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || 'The extension returned an unexpected response.'));
        return;
      }
      resolve(response.data as T);
    });
  });
}
import { isExtension, isPreview } from './environment';
import type { Message } from '../types';
