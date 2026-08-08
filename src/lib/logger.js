export const logInfo = (...args) => {
  if (import.meta.env.DEV) {
    if (import.meta.env.DEV) console.info(...args);
  }
};

export const logWarn = (...args) => {
  if (import.meta.env.DEV) {
    if (import.meta.env.DEV) console.warn(...args);
  }
};

export const logError = (...args) => {
  if (import.meta.env.DEV) {
    if (import.meta.env.DEV) console.error(...args);
  }
};
