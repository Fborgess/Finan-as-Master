// Safe storage wrappers with in-memory fallback for iOS Safari / Private Browsing / Restricted WebViews

const memoryStore: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      // Storage unavailable or blocked by browser policy
    }
    return memoryStore[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore[key] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Storage quota exceeded or disabled
    }
  },
  removeItem: (key: string): void => {
    delete memoryStore[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Storage error ignored
    }
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const val = sessionStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      // Storage unavailable
    }
    return memoryStore['sess_' + key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore['sess_' + key] = value;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(key, value);
      }
    } catch (e) {
      // Storage quota exceeded or disabled
    }
  },
  removeItem: (key: string): void => {
    delete memoryStore['sess_' + key];
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      // Storage error ignored
    }
  },
};
