import type { SetFunction, GetFunction } from "../createStore";

export type PersistOptions<T> = {
  /**
   * Storage to use for persistence (default: localStorage)
   */
  storage?: Storage;
  /**
   * Custom serializer (default: JSON.stringify)
   */
  serialize?: (state: T) => string;
  /**
   * Custom deserializer (default: JSON.parse)
   */
  deserialize?: (str: string) => T;
  /**
   * Keys to persist (if not specified, all state will be persisted)
   */
  partialKeys?: (keyof T)[];
  /**
   * Version for migration support (default: 1)
   */
  version?: number;
  /**
   * Error handler callback
   */
  onError?: (error: Error, context: string) => void;
  /**
   * Merge strategy for rehydration (default: 'replace')
   * - 'replace': Replace the entire state
   * - 'merge': Deep merge with initial state
   */
  merge?: "replace" | "merge";
};

/**
 * Middleware that persists store state to storage
 * @param key - Storage key
 * @param options - Persistence options
 */
export function withPersist<T extends Record<string, any>>(
  key: string,
  options: PersistOptions<T> = {}
) {
  const {
    storage = typeof window !== "undefined" ? window.localStorage : undefined,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    partialKeys,
    version = 1,
    onError = (error, context) =>
      console.error(`[Zenon Persist - ${context}]`, error),
    merge = "replace",
  } = options;

  return (initializer: (set: SetFunction<T>, get: GetFunction<T>) => T) =>
    (set: SetFunction<T>, get: GetFunction<T>): T => {
      let initial: Partial<T> = {};

      // Rehydrate from storage
      if (storage) {
        try {
          const stored = storage.getItem(key);
          if (stored) {
            const parsed = deserialize(stored);

            // Version check
            if (parsed.__version === version) {
              // Extract only specified keys if partialKeys is defined
              if (partialKeys && partialKeys.length > 0) {
                initial = Object.fromEntries(
                  partialKeys
                    .filter((k) => k in parsed)
                    .map((k) => [k, parsed[k]])
                ) as Partial<T>;
              } else {
                // Remove internal fields
                const { __version, ...stateData } = parsed;
                initial = stateData;
              }
            } else {
              onError(
                new Error(
                  `Version mismatch: stored=${parsed.__version}, expected=${version}`
                ),
                "rehydrate"
              );
            }
          }
        } catch (error) {
          onError(error as Error, "rehydrate");
        }
      }

      // Persist wrapper for set function
      const persistSet: SetFunction<T> = (updater, actionName) => {
        set(updater, actionName);

        if (storage) {
          try {
            const currentState = get();
            const toStore = partialKeys
              ? Object.fromEntries(
                  partialKeys
                    .filter((k) => k in currentState)
                    .map((k) => [k, currentState[k]])
                )
              : currentState;

            const storeData = {
              ...toStore,
              __version: version,
            };

            storage.setItem(key, serialize(storeData as T));
          } catch (error) {
            onError(error as Error, "persist");
          }
        }
      };

      // Initialize store with persist wrapper
      const store = initializer(persistSet, get);

      // Merge or replace initial state
      if (Object.keys(initial).length > 0) {
        if (merge === "merge") {
          Object.assign(store, { ...store, ...initial });
        } else {
          Object.assign(store, initial);
        }
      }

      // Save initial state to storage
      if (storage) {
        try {
          const toStore = partialKeys
            ? Object.fromEntries(
                partialKeys.filter((k) => k in store).map((k) => [k, store[k]])
              )
            : store;

          const storeData = {
            ...toStore,
            __version: version,
          };

          storage.setItem(key, serialize(storeData as T));
        } catch (error) {
          onError(error as Error, "initial-save");
        }
      }

      return store;
    };
}
