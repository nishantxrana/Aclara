export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface Cache<T> {
  get(key: string): T | null;
  set(key: string, data: T): void;
  invalidate(key: string): void;
  clear(): void;
}

export function createCache<T>(ttlSeconds: number): Cache<T> {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (entry === undefined) {
        return null;
      }
      if (Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.data;
    },

    set(key: string, data: T): void {
      store.set(key, {
        data,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    },

    invalidate(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
}
