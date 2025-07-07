export function withPersist<T extends Record<string, any>>(
  key: string,
  options: { storage?: Storage } = {}
) {
  const storage =
    options.storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);

  return (
      initializer: (
        set: (updater: Partial<T>, actionName?: string) => void,
        get: () => T
      ) => T
    ) =>
    (
      set: (updater: Partial<T>, actionName?: string) => void,
      get: () => T
    ): T => {
      let initial: T = {} as T;
      if (storage) {
        const saved = storage.getItem(key);
        if (saved) {
          try {
            initial = { ...JSON.parse(saved) };
          } catch {
            initial = {} as T;
          }
        }
      }
      const persistSet = (updater: Partial<T>, actionName?: string) => {
        set(updater, actionName);
        if (storage) {
          try {
            storage.setItem(key, JSON.stringify(get()));
          } catch {}
        }
      };
      const store = initializer(persistSet, get);
      Object.assign(store, initial);
      if (storage) storage.setItem(key, JSON.stringify(store));
      return store;
    };
}
