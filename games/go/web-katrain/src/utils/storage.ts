function getBrowserStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window !== 'undefined') return window[name] ?? null;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    if (!descriptor || !('value' in descriptor)) return null;
    return (descriptor.value as Storage | undefined) ?? null;
  } catch {
    return null;
  }
}

export function getLocalStorage(): Storage | null {
  return getBrowserStorage('localStorage');
}

export function getSessionStorage(): Storage | null {
  return getBrowserStorage('sessionStorage');
}

export function getIndexedDB(): IDBFactory | null {
  try {
    return typeof globalThis.indexedDB === 'undefined' ? null : globalThis.indexedDB;
  } catch {
    return null;
  }
}

export function readLocalStorage(key: string): string | null {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  try {
    const storage = getLocalStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  try {
    const storage = getLocalStorage();
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readSessionStorage(key: string): string | null {
  try {
    return getSessionStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeSessionStorage(key: string, value: string): boolean {
  try {
    const storage = getSessionStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeSessionStorage(key: string): boolean {
  try {
    const storage = getSessionStorage();
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
