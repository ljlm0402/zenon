import type { StoreInitializer, SetFunction } from "../createStore";

export type PersistStatus = {
  status: "ready" | "error" | "unavailable";
  writesBlocked: boolean;
  error?: Error;
  backupKey: string;
};

export type PersistController = {
  /** A fresh, non-reactive status snapshot. */
  getStatus: () => Readonly<PersistStatus>;
  /** Re-read storage, replacing matching data fields without subscriber notifications. */
  rehydrate: () => boolean;
  /** Retry saving live state; never bypass a failed hydration. */
  retryPersist: () => boolean;
};

export type PersistOptions<T> = {
  storage?: Storage;
  serialize?: (state: T) => string;
  deserialize?: (str: string) => T;
  partialKeys?: (keyof T)[];
  version?: number;
  onHydrationError?: "preserve" | "overwrite";
  validate?: (persisted: Partial<T>) => boolean;
  /** Synchronous migration of older or unversioned data. Future versions are rejected. */
  migrate?: (persisted: Record<string, unknown>, fromVersion: number | undefined) => Partial<T>;
  /** Exact original bytes are backed up before a migrated record is committed. */
  backupKey?: string;
  /** Capture an instance-local controller. Recovery calls during this callback return false. */
  onReady?: (controller: PersistController) => void;
  onError?: (error: Error, context: string) => void;
  /** String modes both shallowly overlay keys; use a pure callback for custom merging. */
  merge?: "replace" | "merge" | ((persisted: Partial<T>, current: T) => T);
};

const unsafeKeys = new Set(["__proto__", "prototype", "constructor", "__version"]);
function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as { then?: unknown }).then === "function") {
    throw new Error("Persisted state must be a synchronous object");
  }
}

export function withPersist<T extends Record<string, any>>(
  key: string,
  options: PersistOptions<T> = {}
) {
  const {
    serialize = JSON.stringify, deserialize = JSON.parse, partialKeys,
    version = 1, onHydrationError = "preserve", validate, migrate,
    backupKey = `${key}:zenon:backup`, onReady,
    onError = (error, context) => console.error(`[Zenon Persist - ${context}]`, error),
    merge = "replace",
  } = options;
  if (!Number.isInteger(version) || version < 0) throw new Error("Persist version must be a non-negative integer");
  if (backupKey === key) throw new Error("Persist backupKey must differ from the state key");

  return (initializer: StoreInitializer<T>): StoreInitializer<T> => (set, get, api) => {
    let storage: Storage | undefined;
    let initializing = true;
    let recovering = false;
    let status: PersistStatus = { status: "unavailable", writesBlocked: true, backupKey };
    const report = (error: unknown, context: string, blocked: boolean) => {
      const normalized = error instanceof Error ? error : new Error(String(error));
      status = { status: "error", writesBlocked: blocked, error: normalized, backupKey };
      try { onError(normalized, context); }
      catch (handlerError) { console.error("[Zenon Persist] Error handler failed:", handlerError); }
    };
    const resolveStorage = () => {
      try {
        storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
        if (!storage) status = { status: "unavailable", writesBlocked: true, backupKey };
        return Boolean(storage);
      } catch (error) {
        report(error, "storage", true);
        return false;
      }
    };
    const ready = () => { status = { status: "ready", writesBlocked: false, backupKey }; };
    const encode = (state: T) => {
      const entries = Object.entries(state).filter(([field, value]) =>
        !unsafeKeys.has(field) && typeof value !== "function" && typeof value !== "symbol" &&
        (!partialKeys || partialKeys.includes(field))
      );
      return serialize({ ...Object.fromEntries(entries), __version: version } as unknown as T);
    };
    const save = (state: T, context: string): boolean => {
      if (!storage || status.writesBlocked) return false;
      try {
        storage.setItem(key, encode(state));
        ready();
        return true;
      } catch (error) {
        report(error, context, false);
        return false;
      }
    };
    const persistSet: SetFunction<T> = (patch, action) => {
      set(patch, action);
      if (!initializing && !recovering) save(get(), "persist");
    };
    const store = initializer(persistSet, get, api);
    // Determine the schema once; live actions and public API fields cannot become persisted fields.
    const dataKeys = Object.keys(store).filter(field =>
      !unsafeKeys.has(field) && typeof store[field] !== "function" &&
      (!partialKeys || partialKeys.includes(field))
    );
    const filter = (data: Record<string, unknown>) => Object.fromEntries(
      Object.entries(data).filter(([field]) => dataKeys.includes(field))
    ) as Partial<T>;

    const hydrate = (current: T, apply: (patch: Partial<T>) => void): boolean => {
      if (recovering) return false;
      recovering = true;
      let context = "rehydrate";
      let migrated = false;
      let prepared = false;
      let hadStoredRecord = false;
      try {
        if (!resolveStorage() || !storage) return false;
        const raw = storage.getItem(key);
        hadStoredRecord = raw !== null;
        let patch: Partial<T> = {};
        if (raw !== null) {
          const parsed = deserialize(raw);
          assertRecord(parsed);
          const from = parsed.__version;
          if (from !== undefined && (!Number.isInteger(from) || (from as number) < 0)) {
            throw new Error("Invalid stored version");
          }
          if (typeof from === "number" && from > version) throw new Error("Stored version is newer than this application");
          let data: Record<string, unknown> = Object.fromEntries(
            Object.entries(parsed).filter(([field]) => !unsafeKeys.has(field))
          );
          if (from !== version) {
            if (!migrate) throw new Error(`Version mismatch: stored=${from}, expected=${version}`);
            const result = migrate(data, from as number | undefined);
            assertRecord(result);
            data = result;
            migrated = true;
          }
          const filtered = filter(data);
          if (validate && !validate(filtered)) throw new Error("Persisted state failed validation");
          const restored = typeof merge === "function" ? merge(filtered, { ...current }) : filtered;
          assertRecord(restored);
          // All getters are evaluated before applying any field.
          patch = filter(restored);
        }
        const candidate = { ...current, ...patch };
        prepared = true;
        context = "initial-save";
        const encoded = encode(candidate);
        // Avoid overwriting a value changed during user migration/validation callbacks.
        context = "conflict";
        if (storage.getItem(key) !== raw) throw new Error("Stored state changed during hydration; retry explicitly");
        if (migrated && raw !== null) {
          context = "backup";
          const existing = storage.getItem(backupKey);
          if (existing !== null && existing !== raw) throw new Error("Backup key already contains different data");
          if (existing === null) storage.setItem(backupKey, raw);
        }
        context = "initial-save";
        storage.setItem(key, encoded);
        // Migration writes must succeed before exposing the migrated state.
        apply(patch);
        ready();
        return true;
      } catch (error) {
        // Explicit overwrite applies only to parse/validation failures, never failed
        // migration commits, backups, or concurrent changes to the original record.
        const overwrite = onHydrationError === "overwrite" && context === "rehydrate";
        report(error, context, !overwrite && !(prepared && !migrated && !hadStoredRecord && context === "initial-save"));
        if (overwrite) save(current, "initial-save");
        return false;
      } finally {
        recovering = false;
      }
    };

    hydrate(store, patch => Object.assign(store, patch));
    const controller: PersistController = {
      getStatus: () => ({ ...status }),
      rehydrate: () => !initializing && !recovering && hydrate(get(), patch => api.setSilent(patch)),
      retryPersist: () => !initializing && !recovering && save(get(), "persist"),
    };
    if (onReady) {
      try { onReady(controller); }
      catch (error) { console.error("[Zenon Persist] onReady callback failed:", error); }
    }
    initializing = false;
    return store;
  };
}
