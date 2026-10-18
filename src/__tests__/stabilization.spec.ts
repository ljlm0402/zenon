import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createStore, type StoreInitializer } from "../index";
import { withPersist, withErrorBoundary } from "../plugins";

function storageWith(raw: string | null) {
  let value = raw;
  const storage: Storage = {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key, next) => { value = next; }),
    clear: vi.fn(), removeItem: vi.fn(), key: vi.fn(), length: 0,
  };
  return storage;
}
type Counter = { count: number; increment: () => void };
const counter: StoreInitializer<Counter> = (set, get) => ({ count: 0, increment: () => set({ count: get().count + 1 }, "increment") });
afterEach(() => vi.restoreAllMocks());

describe("Failed hydration preserves user data", () => {
  for (const raw of ['{"count":99,"__version":0}', 'invalid', '', 'null']) {
    it(`preserves ${JSON.stringify(raw)} on initialization and later updates`, () => {
      const storage = storageWith(raw);
      const onError = vi.fn();
      const store = createStore(withPersist<Counter>("test", { storage, onError })(counter));
      store.increment();
      expect(store.count).toBe(1);
      expect(storage.getItem("test")).toBe(raw);
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
    });
  }
  it("allows explicitly discarding a failed hydration", () => {
    const storage = storageWith("invalid");
    const store = createStore(withPersist<Counter>("test", { storage, onError: vi.fn(), onHydrationError: "overwrite" })(counter));
    store.increment();
    expect(JSON.parse(storage.getItem("test")!)).toMatchObject({ count: 1, __version: 1 });
  });
  it("does not write when the initial read fails", () => {
    const storage = storageWith(null);
    storage.getItem = vi.fn(() => { throw new Error("read denied"); });
    const store = createStore(withPersist<Counter>("test", { storage, onError: vi.fn() })(counter));
    store.increment();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("rejects a wrong value type before mutating or saving state", () => {
    const raw = '{"count":"bad","__version":1}';
    const storage = storageWith(raw);
    const onError = vi.fn();
    const store = createStore(withPersist<Counter>("test", {
      storage, onError, validate: value => typeof value.count === "number",
    })(counter));
    expect(store.count).toBe(0);
    expect(storage.getItem("test")).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it("validates an empty persisted object but not a missing record", () => {
    const validate = vi.fn(() => false);
    createStore(withPersist<Counter>("test", { storage: storageWith(null), validate })(counter));
    expect(validate).not.toHaveBeenCalled();
    const storage = storageWith('{"__version":1}');
    createStore(withPersist<Counter>("test", { storage, validate, onError: vi.fn() })(counter));
    expect(validate).toHaveBeenCalledWith({});
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("keeps data and defaults if a merge getter throws after another field", () => {
    const raw = '{"count":42,"__version":1}';
    const storage = storageWith(raw);
    const store = createStore(withPersist<Counter>("test", {
      storage, onError: vi.fn(), merge: () => ({ count: 88, get increment(): () => void { throw new Error("merge getter"); } }),
    })(counter));
    expect(store.count).toBe(0);
    expect(storage.getItem("test")).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("does not save initializer updates before validation completes", () => {
    const storage = storageWith('{"count":"bad","__version":1}');
    createStore(withPersist<Counter>("test", { storage, onError: vi.fn(), validate: () => false })((set) => {
      set({ count: 5 }, "initializing");
      return { count: 0, increment() {} };
    }));
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("still restores and saves a valid record", () => {
    const storage = storageWith('{"count":42,"__version":1}');
    const store = createStore(withPersist<Counter>("test", { storage, validate: value => typeof value.count === "number" })(counter));
    store.increment();
    expect(JSON.parse(storage.getItem("test")!).count).toBe(43);
  });
});

describe("Error reporting ownership and return types", () => {
  for (const asyncAction of [false, true]) {
    it(`reports a failed set once (${asyncAction ? "async" : "sync"}) and preserves error identity`, async () => {
      const onError = vi.fn();
      const error = new Error("patch failed");
      const failPatch = { get count(): number { throw error; } };
      const store = createStore(withErrorBoundary({ onError })((set) => ({
        count: 0,
        fail: asyncAction ? async () => { await Promise.resolve(); set(failPatch, "update"); } : () => set(failPatch, "update"),
      })));
      if (asyncAction) await expect(store.fail()).rejects.toBe(error);
      else expect(() => store.fail()).toThrow(error);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(store.count).toBe(0);
    });
  }
  it("reports repeated throws of the same error on separate calls", () => {
    const onError = vi.fn();
    const error = new Error("repeat");
    const store = createStore(withErrorBoundary({ onError })(() => ({ fail() { throw error; } })));
    expect(() => store.fail()).toThrow(error);
    expect(() => store.fail()).toThrow(error);
    expect(onError).toHaveBeenCalledTimes(2);
  });
  it("exposes possibly missing sync and async results", async () => {
    type Results = { read: () => number; load: () => Promise<number> };
    const store = createStore(withErrorBoundary<Results>({ onError: vi.fn(), rethrow: false })(() => ({
      read: () => { throw new Error("read"); }, load: async () => { throw new Error("load"); },
    })));
    expectTypeOf(store.read()).toEqualTypeOf<number | undefined>();
    expectTypeOf(store.load()).toEqualTypeOf<Promise<number | undefined>>();
    expect(store.read()).toBeUndefined();
    await expect(store.load()).resolves.toBeUndefined();
  });
  it("retains success result types when errors are rethrown", () => {
    type Results = { read: () => number };
    const store = createStore(withErrorBoundary<Results>({ onError: vi.fn() })(() => ({ read: () => 1 })));
    expectTypeOf(store.read()).toEqualTypeOf<number>();
  });
});

describe("Error handler resilience", () => {
  it("reports initializer failure once and does not return an invalid store", () => {
    const onError = vi.fn();
    const error = new Error("initializer");
    expect(() => createStore(withErrorBoundary({ onError })(() => { throw error; }))).toThrow(error);
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it("preserves the original action error if the reporting callback fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("original");
    const store = createStore(withErrorBoundary({ onError() { throw new Error("reporter"); } })(() => ({ fail() { throw error; } })));
    expect(() => store.fail()).toThrow(error);
  });
  it("reports primitive throws as Errors but rethrows the original value", () => {
    const onError = vi.fn();
    const store = createStore(withErrorBoundary({ onError })(() => ({ fail() { throw "primitive"; } })));
    let caught: unknown;
    try { store.fail(); } catch (error) { caught = error; }
    expect(caught).toBe("primitive");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "fail", "set");
  });
});

describe("Failure contexts", () => {
  it("keeps get failure context without duplicate action reports", () => {
    const onError = vi.fn();
    const error = new Error("get failed");
    const initializer = withErrorBoundary<{ read: () => number }>({ onError })((_set, get) => ({ read: () => { get(); return 1; } }));
    const store = initializer(vi.fn(), () => { throw error; }, { setSilent: vi.fn(), subscribe: () => () => {} });
    expect(() => store.read()).toThrow(error);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error, "get", "get");
  });
});
