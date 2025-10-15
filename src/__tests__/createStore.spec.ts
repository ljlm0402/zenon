import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import { createStore } from "../createStore";

describe("createStore", () => {
  describe("Basic functionality", () => {
    it("should create store with initial state", () => {
      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      expect(store.count).toBe(0);
      expect(typeof store.increment).toBe("function");
    });

    it("should update state correctly", () => {
      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      store.increment();
      expect(store.count).toBe(1);

      store.increment();
      expect(store.count).toBe(2);
    });

    it("should handle multiple state properties", () => {
      const store = createStore((set, get) => ({
        count: 0,
        name: "test",
        increment: () => set({ count: get().count + 1 }, "increment"),
        setName: (name: string) => set({ name }, "setName"),
      }));

      expect(store.count).toBe(0);
      expect(store.name).toBe("test");

      store.increment();
      store.setName("updated");

      expect(store.count).toBe(1);
      expect(store.name).toBe("updated");
    });
  });

  describe("useSelector", () => {
    it("should create computed selector", async () => {
      const store = createStore((set, get) => ({
        count: 0,
        multiplier: 2,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      const doubled = store.useSelector(
        (state) => state.count * state.multiplier
      );

      expect(doubled.value).toBe(0);

      store.increment();
      await nextTick();

      expect(doubled.value).toBe(2);

      store.increment();
      await nextTick();

      expect(doubled.value).toBe(4);
    });

    it("should handle complex selectors", async () => {
      const store = createStore((set, get) => ({
        items: [1, 2, 3],
        filter: "all",
        addItem: (item: number) =>
          set({ items: [...get().items, item] }, "addItem"),
      }));

      const itemCount = store.useSelector((state) => state.items.length);
      const sum = store.useSelector((state) =>
        state.items.reduce((acc: number, val: number) => acc + val, 0)
      );

      expect(itemCount.value).toBe(3);
      expect(sum.value).toBe(6);

      store.addItem(4);
      await nextTick();

      expect(itemCount.value).toBe(4);
      expect(sum.value).toBe(10);
    });

    it("should handle selector errors gracefully", () => {
      const store = createStore(() => ({
        count: 0,
      }));

      const errorSelector = store.useSelector((state) => {
        throw new Error("Selector error");
      });

      expect(() => errorSelector.value).toThrow("Selector error");
    });
  });

  describe("subscribe", () => {
    it("should notify listeners on state change", () => {
      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      const listener = vi.fn();
      store.subscribe(listener);

      store.increment();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ count: 1 }),
        expect.objectContaining({ count: 0 })
      );
    });

    it("should support multiple listeners", () => {
      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);

      store.increment();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe correctly", () => {
      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store.increment();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.increment();
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should handle listener errors gracefully", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      const errorListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const normalListener = vi.fn();

      store.subscribe(errorListener);
      store.subscribe(normalListener);

      store.increment();

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("setSilent", () => {
    it("should update state without triggering listeners via api", () => {
      const store = createStore((set, get, api) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
        silentIncrement: () => api.setSilent({ count: get().count + 1 }),
      }));

      const listener = vi.fn();
      store.subscribe(listener);

      store.silentIncrement();

      expect(store.count).toBe(1);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle errors in set function", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const store = createStore((set, get) => ({
        count: 0,
        items: [] as number[],
        addInvalidItem: () => {
          // This will throw when trying to assign
          const frozen = Object.freeze({ items: [1, 2, 3] });
          try {
            set(frozen as any, "addInvalidItem");
          } catch (error) {
            // Expected to throw
          }
        },
      }));

      expect(store.count).toBe(0);
      store.addInvalidItem();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Reactivity", () => {
    it("should be reactive with Vue", async () => {
      const store = createStore((set, get) => ({
        count: 0,
        increment: () => set({ count: get().count + 1 }, "increment"),
      }));

      const values: number[] = [];

      // Watch for changes
      const watcher = () => {
        values.push(store.count);
      };

      store.subscribe(() => watcher());
      values.push(store.count); // Initial value

      store.increment();
      await nextTick();

      store.increment();
      await nextTick();

      expect(values).toEqual([0, 1, 2]);
    });
  });

  describe("Type safety", () => {
    it("should maintain type safety", () => {
      interface CounterStore {
        count: number;
        name: string;
        increment: () => void;
        setName: (name: string) => void;
      }

      const store = createStore<CounterStore>((set, get) => ({
        count: 0,
        name: "counter",
        increment: () => set({ count: get().count + 1 }, "increment"),
        setName: (name: string) => set({ name }, "setName"),
      }));

      // Type checks
      expect(typeof store.count).toBe("number");
      expect(typeof store.name).toBe("string");
      expect(typeof store.increment).toBe("function");
      expect(typeof store.setName).toBe("function");

      // Runtime checks
      store.increment();
      expect(store.count).toBe(1);

      store.setName("updated");
      expect(store.name).toBe("updated");
    });
  });
});
