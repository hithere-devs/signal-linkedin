export interface RuntimeResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function sendMessage<T>(message: unknown): Promise<T> {
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
