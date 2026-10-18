import { describe, expect, it, vi } from "vitest";
import { createStore } from "../index";
import { withPersist, type PersistController, type PersistOptions } from "../plugins";

type State = { count: number; increment: () => void };
function memory(raw: string | null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set("state", raw);
  const storage: Storage = {
    getItem: vi.fn(key => values.get(key) ?? null),
    setItem: vi.fn((key, value) => { values.set(key, value); }),
    removeItem: vi.fn(key => { values.delete(key); }),
    clear: vi.fn(() => values.clear()), key: vi.fn(), length: 0,
  };
  return { storage, values };
}
function setup(raw: string | null, options: PersistOptions<State> = {}) {
  const { storage, values } = memory(raw);
  let controller!: PersistController;
  const onError = vi.fn();
  const store = createStore(withPersist<State>("state", {
    storage, onError, version: 3,
    onReady: value => { controller = value; },
    ...options,
  })((set, get) => ({ count: 0, increment: () => set({ count: get().count + 1 }, "increment") })));
  return { store, controller, storage, values, onError };
}

describe("Version migrations", () => {
  it("accepts ordinary data fields named then", () => {
    const { storage } = memory('{"then":"later","__version":1}');
    const store = createStore(withPersist<{ then: string }>("state", { storage })(() => ({ then: "now" })));
    expect(store.then).toBe("later");
  });
  for (const version of [1, 2]) {
    it(`migrates version ${version}, backing up exact source bytes`, () => {
      const raw = `{ "oldCount": 12, "__version": ${version} }`;
      const migrate = vi.fn(data => ({ count: Number(data.oldCount) }));
      const { store, values, controller } = setup(raw, { migrate, validate: data => typeof data.count === "number" });
      expect(store.count).toBe(12);
      expect(values.get("state:zenon:backup")).toBe(raw);
      expect(JSON.parse(values.get("state")!)).toEqual({ count: 12, __version: 3 });
      expect(migrate).toHaveBeenCalledWith({ oldCount: 12 }, version);
      expect(controller.getStatus()).toMatchObject({ status: "ready", writesBlocked: false });
    });
  }
  it("allows explicit migration of unversioned data", () => {
    const migrate = vi.fn(() => ({ count: 4 }));
    expect(setup('{"oldCount":4}', { migrate }).store.count).toBe(4);
    expect(migrate).toHaveBeenCalledWith({ oldCount: 4 }, undefined);
  });
  for (const version of [4, -1, 1.5, "1"]) {
    it(`rejects unsupported stored version ${JSON.stringify(version)}`, () => {
      const raw = JSON.stringify({ count: 12, __version: version });
      const migrate = vi.fn(() => ({ count: 12 }));
      const { store, values, controller } = setup(raw, { migrate });
      expect(store.count).toBe(0);
      expect(values.get("state")).toBe(raw);
      expect(migrate).not.toHaveBeenCalled();
      expect(controller.getStatus().writesBlocked).toBe(true);
    });
  }
  it("preserves original data on migration failure and blocks ordinary writes", () => {
    const raw = '{"oldCount":4,"__version":1}';
    const { store, controller, values } = setup(raw, { migrate() { throw new Error("migration"); } });
    store.increment();
    expect(controller.retryPersist()).toBe(false);
    expect(values.get("state")).toBe(raw);
    expect(values.has("state:zenon:backup")).toBe(false);
  });
  it("rejects asynchronous migrations", () => {
    const raw = '{"__version":1}';
    const { values, controller } = setup(raw, { migrate: (() => Promise.resolve({ count: 7 })) as any });
    expect(values.get("state")).toBe(raw);
    expect(controller.getStatus().status).toBe("error");
  });
  it("validates migrated data before creating a backup or writing", () => {
    const raw = '{"__version":1}';
    const { values, store } = setup(raw, { migrate: () => ({ count: -1 }), validate: data => Number(data.count) >= 0 });
    expect(store.count).toBe(0);
    expect(values.get("state")).toBe(raw);
    expect(values.has("state:zenon:backup")).toBe(false);
  });
  it("supports custom serialization while retaining raw backup bytes", () => {
    const raw = 'prefix:{"oldCount":2,"__version":1}';
    const { store, values } = setup(raw, {
      deserialize: text => JSON.parse(text.slice(7)), serialize: data => `prefix:${JSON.stringify(data)}`,
      migrate: data => ({ count: Number(data.oldCount) }),
    });
    expect(store.count).toBe(2);
    expect(values.get("state:zenon:backup")).toBe(raw);
    expect(values.get("state")).toBe('prefix:{"count":2,"__version":3}');
  });
  it("does not allow migrations to replace actions or restore unselected fields", () => {
    const { store, values } = setup('{"__version":1}', {
      partialKeys: ["count"], migrate: () => ({ count: 2, increment: null } as any),
    });
    store.increment();
    expect(store.count).toBe(3);
    expect(JSON.parse(values.get("state")!)).toEqual({ count: 3, __version: 3 });
  });
});

describe("Backup and recovery", () => {
  function blockedStorage(failKey: string, previousBackup?: string) {
    const raw = '{"oldCount":5,"__version":1}';
    const { storage, values } = memory(raw);
    if (previousBackup) values.set("state:zenon:backup", previousBackup);
    const write = storage.setItem;
    storage.setItem = vi.fn((key, value) => {
      if (key === failKey) throw new Error("quota");
      write(key, value);
    });
    return { raw, storage, values, write };
  }
  for (const failKey of ["state", "state:zenon:backup"]) {
    it(`keeps source and memory unchanged if writing ${failKey} fails, then retries`, () => {
      const { raw, storage, values, write } = blockedStorage(failKey);
      const { store, controller } = setup(null, { storage, migrate: data => ({ count: Number(data.oldCount) }) });
      expect(values.get("state")).toBe(raw);
      expect(store.count).toBe(0);
      expect(controller.retryPersist()).toBe(false);
      storage.setItem = write;
      expect(controller.rehydrate()).toBe(true);
      expect(store.count).toBe(5);
      expect(values.get("state:zenon:backup")).toBe(raw);
    });
  }
  it("does not bypass a backup failure with the overwrite policy", () => {
    const { raw, storage, values } = blockedStorage("state:zenon:backup");
    const { controller, store } = setup(null, {
      storage, onHydrationError: "overwrite", migrate: () => ({ count: 5 }),
    });
    store.increment();
    expect(values.get("state")).toBe(raw);
    expect(controller.getStatus().writesBlocked).toBe(true);
    expect(controller.retryPersist()).toBe(false);
  });
  it("never overwrites a conflicting backup", () => {
    const { raw, storage, values } = blockedStorage("unused", "older backup");
    const { controller } = setup(null, { storage, migrate: () => ({ count: 5 }) });
    expect(values.get("state")).toBe(raw);
    expect(values.get("state:zenon:backup")).toBe("older backup");
    expect(controller.getStatus().error?.message).toContain("Backup key");
  });
  it("detects source changes inside a migration and blocks later writes", () => {
    const { storage, values } = memory('{"__version":1}');
    const other = '{"count":99,"__version":3}';
    const { controller, store } = setup(null, { storage, migrate: () => {
      values.set("state", other);
      return { count: 5 };
    } });
    store.increment();
    expect(values.get("state")).toBe(other);
    expect(controller.getStatus().writesBlocked).toBe(true);
  });
  it("rehydrates repaired storage into the live reactive state without notifications", () => {
    const { store, values, controller } = setup("broken");
    const listener = vi.fn();
    store.subscribe(listener);
    const selected = store.useSelector(value => value.count);
    values.set("state", '{"count":9,"__version":3}');
    expect(controller.rehydrate()).toBe(true);
    expect(selected.value).toBe(9);
    expect(listener).not.toHaveBeenCalled();
    store.increment();
    expect(JSON.parse(values.get("state")!).count).toBe(10);
  });
  it("retries a failed normal write without rehydrating older state", () => {
    const { store, storage, values, controller } = setup(null);
    const write = storage.setItem;
    storage.setItem = () => { throw new Error("quota"); };
    store.increment();
    expect(controller.getStatus()).toMatchObject({ status: "error", writesBlocked: false });
    storage.setItem = write;
    expect(controller.retryPersist()).toBe(true);
    expect(JSON.parse(values.get("state")!).count).toBe(1);
  });
  it("isolates controllers when reusing one middleware factory", () => {
    const controllers: PersistController[] = [];
    const middleware = withPersist<State>("state", { storage: memory(null).storage, onReady: c => controllers.push(c) });
    const init = () => ({ count: 0, increment() {} });
    const a = createStore(middleware(init));
    const b = createStore(middleware(init));
    a.setSilent({ count: 10 });
    controllers[0].retryPersist();
    expect(b.count).toBe(0);
    controllers[1].rehydrate();
    expect(b.count).toBe(10);
    expect(controllers[0]).not.toBe(controllers[1]);
  });
  it("rejects reentrant recovery while onReady is being called", () => {
    setup(null, { onReady: c => {
      expect(c.rehydrate()).toBe(false);
      expect(c.retryPersist()).toBe(false);
    } });
  });
  it("rejects a backup key equal to the primary key", () => {
    expect(() => withPersist("state", { backupKey: "state" })).toThrow("differ");
  });
});
