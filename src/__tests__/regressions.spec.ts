import { afterEach, describe, expect, it, vi } from "vitest";
import { createStore, compose, type Store, type StoreInitializer } from "../index";
import { withLogger, withPersist, withErrorBoundary } from "../plugins";

type State = { count: number; increment: () => void };
const initializer: StoreInitializer<State> = (set, get, api) => ({
  count: 0,
  increment: () => api.setSilent({ count: get().count + 1 }),
});
afterEach(() => vi.restoreAllMocks());

function storageWith(value: string | null): Storage {
  let stored = value;
  return { getItem: vi.fn(() => stored), setItem: vi.fn((_key, value) => { stored = value; }), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 };
}

describe("API and composition regressions", () => {
  it("exposes silent updates and a shallow snapshot", () => {
    const store: Store<State> = createStore(initializer);
    const listener = vi.fn();
    const selected = store.useSelector(s => s.count);
    store.subscribe(listener);
    const snapshot = store.getState();
    store.setSilent({ count: 3 });
    expect(selected.value).toBe(3);
    expect(snapshot.count).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });
  for (const [name, middleware] of [
    ["logger", withLogger<State>()],
    ["persist", withPersist<State>("test", { storage: storageWith(null) })],
    ["boundary", withErrorBoundary<State>({ onError: vi.fn() })],
    ["composed", compose<State>(withLogger<State>(), withPersist<State>("test", { storage: storageWith(null) }), withErrorBoundary<State>({ onError: vi.fn() }))],
  ] as const) {
    it(`forwards initializer api through ${name}`, () => {
      const store = createStore(middleware(initializer));
      store.increment();
      expect(store.count).toBe(1);
    });
  }
  it("supports empty composition", () => {
    expect(createStore(compose<State>()(initializer)).count).toBe(0);
  });
  it("does not visit listeners added during the current notification", () => {
    const later = vi.fn();
    const store = createStore<{ count: number; increment: () => void }>((set, get) => ({ count: 0, increment: () => set({ count: get().count + 1 }, "increment") }));
    store.subscribe(() => store.subscribe(later));
    store.increment();
    expect(later).not.toHaveBeenCalled();
    store.increment();
    expect(later).toHaveBeenCalledTimes(1);
  });
  it("does not partially apply a patch whose getter throws", () => {
    const store = createStore((set) => ({ count: 0, fail: () => set({ count: 1, get extra() { throw new Error("getter"); } }, "fail") }));
    const listener = vi.fn();
    store.subscribe(listener);
    expect(() => store.fail()).toThrow("getter");
    expect(store.count).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("Persistence regressions", () => {
  it("treats an empty partialKeys list as persisting and restoring nothing", () => {
    const storage = storageWith('{"count":99,"__version":1}');
    const store = createStore(withPersist<State>("test", { storage, partialKeys: [] })(initializer));
    expect(store.count).toBe(0);
    expect(JSON.parse(storage.getItem("test")!)).toEqual({ __version: 1 });
  });
  it("preserves actions and ignores unknown and prototype-related fields", () => {
    const storage = storageWith('{"count":5,"increment":null,"unknown":1,"__proto__":{"polluted":true},"constructor":null,"__version":1}');
    const store = createStore(withPersist<State>("test", { storage })(initializer));
    store.increment();
    expect(store.count).toBe(6);
    expect(Object.getPrototypeOf(store)).toBe(Object.prototype);
    expect("unknown" in store).toBe(false);
    expect("polluted" in store).toBe(false);
  });
  it("handles a denied localStorage getter without preventing store creation", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("denied"); });
    const onError = vi.fn();
    const store = createStore(withPersist<State>("test", { onError })(initializer));
    store.increment();
    expect(store.count).toBe(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "storage");
  });
  for (const value of ["null", "[]", "12", '"text"']) {
    it(`rejects invalid persisted shape ${value}`, () => {
      const onError = vi.fn();
      const store = createStore(withPersist<State>("test", { storage: storageWith(value), onError })(initializer));
      expect(store.count).toBe(0);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), "rehydrate");
    });
  }
  it("supports a custom nested merge without losing defaults", () => {
    type Nested = { preferences: { theme: string; locale: string } };
    const store = createStore(withPersist<Nested>("test", {
      storage: storageWith('{"preferences":{"theme":"dark"},"__version":1}'),
      merge: (persisted, current) => ({ preferences: { ...current.preferences, ...persisted.preferences } }),
    })(() => ({ preferences: { theme: "light", locale: "ko" } })));
    expect(store.preferences).toEqual({ theme: "dark", locale: "ko" });
  });
  it("keeps in-memory updates when storage writes fail", () => {
    const storage = storageWith(null);
    storage.setItem = vi.fn(() => { throw new Error("quota"); });
    const onError = vi.fn();
    const store = createStore(withPersist<State>("test", { storage, onError })((set, get) => ({ count: 0, increment: () => set({ count: get().count + 1 }, "increment") })));
    store.increment();
    expect(store.count).toBe(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "persist");
  });
});

describe("Error boundary action behavior", () => {
  it("preserves the receiver of method actions", () => {
    type MethodState = { count: number; read: () => number };
    const store = createStore(withErrorBoundary<MethodState>({ onError: vi.fn() })(() => ({ count: 7, read() { return this.count; } })));
    expect(store.read()).toBe(7);
  });
  it("reports rejected async actions and rethrows by default", async () => {
    const onError = vi.fn();
    const store = createStore(withErrorBoundary({ onError })(() => ({ fail: async () => { throw new Error("async failure"); } })));
    await expect(store.fail()).rejects.toThrow("async failure");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "fail", "set");
  });
  it("resolves handled async errors when rethrow is false", async () => {
    const onError = vi.fn();
    const store = createStore(withErrorBoundary({ onError, rethrow: false })(() => ({ fail: async () => { throw new Error("async failure"); } })));
    await expect(store.fail()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it("does not undo completed updates or concurrent changes on async failure", async () => {
    let reject!: (reason: Error) => void;
    const pending = new Promise<void>((_resolve, fail) => { reject = fail; });
    const store = createStore(withErrorBoundary({ onError: vi.fn() })((set) => ({ count: 0, fail: async () => { set({ count: 1 }, "start"); await pending; } })));
    const result = store.fail();
    store.setSilent({ count: 9 });
    reject(new Error("failure"));
    await expect(result).rejects.toThrow("failure");
    expect(store.count).toBe(9);
  });
});

describe("Composition contract", () => {
  it("applies middleware in the declared order", () => {
    const events: string[] = [];
    const middleware = (name: string) => (init: StoreInitializer<State>): StoreInitializer<State> => (set, get, api) => {
      events.push(`${name}:init`);
      return init((patch, action) => { events.push(name); set(patch, action); }, get, api);
    };
    const store = createStore(compose<State>(middleware("outer"), middleware("inner"))((set) => ({ count: 0, increment: () => set({ count: 1 }, "increment") })));
    store.increment();
    expect(events).toEqual(["outer:init", "inner:init", "inner", "outer"]);
  });
  it("forwards subscribe through the complete middleware chain", () => {
    const listener = vi.fn();
    const store = createStore(compose<State>(withPersist<State>("test", { storage: storageWith(null) }), withErrorBoundary<State>({ onError: vi.fn() }))((set, get, api) => {
      api.subscribe(listener);
      return { count: 0, increment: () => set({ count: get().count + 1 }, "increment") };
    }));
    store.increment();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
