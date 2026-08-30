export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(scope: string, enabled: () => boolean): Logger {
  const prefix = `[signal:${scope}]`;
  return {
    debug: (...args) => {
      if (enabled()) console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (enabled()) console.info(prefix, ...args);
    },
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args)
  };
}
