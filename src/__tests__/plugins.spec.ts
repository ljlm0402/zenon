import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore } from "../createStore";
import { withLogger } from "../plugins/withLogger";
import { withPersist } from "../plugins/withPersist";
import { withErrorBoundary } from "../plugins/withErrorBoundary";
import { compose } from "../utils/compose";

describe("Plugins", () => {
  describe("withLogger", () => {
    let consoleGroupSpy: any;
    let consoleGroupCollapsedSpy: any;
    let consoleLogSpy: any;
    let consoleGroupEndSpy: any;

    beforeEach(() => {
      consoleGroupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
      consoleGroupCollapsedSpy = vi
        .spyOn(console, "groupCollapsed")
        .mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      consoleGroupEndSpy = vi
        .spyOn(console, "groupEnd")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleGroupSpy.mockRestore();
      consoleGroupCollapsedSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it("should log actions with default options", () => {
      const store = createStore(
        withLogger()((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      expect(consoleGroupCollapsedSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledTimes(3); // prev state, action, next state
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it("should support expanded logs", () => {
      const store = createStore(
        withLogger({ expanded: true })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      expect(consoleGroupSpy).toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
    });

    it("should include store name in logs", () => {
      const store = createStore(
        withLogger({ store: "counter" })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        expect.stringContaining("[counter]"),
        expect.any(String)
      );
    });

    it("should include timestamp when enabled", () => {
      const store = createStore(
        withLogger({ timestamp: true })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith(
        expect.stringContaining("@"),
        expect.any(String)
      );
    });

    it("should not log functions in state", () => {
      const store = createStore(
        withLogger()((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      const loggedState = consoleLogSpy.mock.calls.find(
        (call: any) => call[0] === "%cprev state"
      )?.[2];

      expect(loggedState).toBeDefined();
      expect(loggedState.increment).toBeUndefined();
      expect(loggedState.count).toBe(0);
    });
  });

  describe("withPersist", () => {
    let mockStorage: Storage;

    beforeEach(() => {
      const store: Record<string, string> = {};
      mockStorage = {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          for (const key in store) {
            delete store[key];
          }
        }),
        key: vi.fn((index: number) => Object.keys(store)[index] || null),
        length: 0,
      };
    });

    it("should persist state to storage", () => {
      const store = createStore(
        withPersist("test-store", { storage: mockStorage })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      expect(mockStorage.setItem).toHaveBeenCalled();

      store.increment();

      const storedValue = mockStorage.getItem("test-store");
      expect(storedValue).toBeTruthy();
      const parsed = JSON.parse(storedValue!);
      expect(parsed.count).toBe(1);
    });

    it("should rehydrate from storage", () => {
      // First store instance
      const store1 = createStore(
        withPersist("test-store", { storage: mockStorage })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store1.increment();
      store1.increment();
      expect(store1.count).toBe(2);

      // Second store instance (should rehydrate)
      const store2 = createStore(
        withPersist("test-store", { storage: mockStorage })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      expect(store2.count).toBe(2);
    });

    it("should support partial persistence", () => {
      interface TestStore {
        count: number;
        name: string;
        increment: () => void;
        setName: (name: string) => void;
      }

      const store = createStore<TestStore>(
        withPersist<TestStore>("test-store", {
          storage: mockStorage,
          partialKeys: ["count"],
        })((set, get) => ({
          count: 0,
          name: "test",
          increment: () => set({ count: get().count + 1 }, "increment"),
          setName: (name: string) => set({ name }, "setName"),
        }))
      );

      store.increment();
      store.setName("updated");

      const storedValue = mockStorage.getItem("test-store");
      const parsed = JSON.parse(storedValue!);

      expect(parsed.count).toBe(1);
      expect(parsed.name).toBeUndefined();
    });

    it("should handle version mismatch", () => {
      const onError = vi.fn();

      // Store with version 1
      mockStorage.setItem(
        "test-store",
        JSON.stringify({ count: 5, __version: 1 })
      );

      // Create store with version 2
      const store = createStore(
        withPersist("test-store", {
          storage: mockStorage,
          version: 2,
          onError,
        })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      expect(onError).toHaveBeenCalled();
      expect(store.count).toBe(0); // Should use initial state
    });

    it("should handle serialization errors", () => {
      const onError = vi.fn();

      const store = createStore(
        withPersist("test-store", {
          storage: mockStorage,
          serialize: () => {
            throw new Error("Serialization error");
          },
          onError,
        })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.stringContaining("persist")
      );
    });

    it("should handle deserialization errors", () => {
      const onError = vi.fn();

      mockStorage.setItem("test-store", "invalid json");

      const store = createStore(
        withPersist("test-store", {
          storage: mockStorage,
          onError,
        })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      expect(onError).toHaveBeenCalled();
    });

    it("should support custom serializer/deserializer", () => {
      const store = createStore(
        withPersist("test-store", {
          storage: mockStorage,
          serialize: (state) => `custom:${JSON.stringify(state)}`,
          deserialize: (str) => JSON.parse(str.replace("custom:", "")),
        })((set, get) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      store.increment();

      const storedValue = mockStorage.getItem("test-store");
      expect(storedValue).toContain("custom:");
    });
  });

  describe("withErrorBoundary", () => {
    it("should catch and handle errors", () => {
      const onError = vi.fn();

      const store = createStore(
        withErrorBoundary({ onError })((set, get) => ({
          count: 0,
          errorAction: () => {
            set({ count: 10 }, "errorAction");
            throw new Error("Test error");
          },
        }))
      );

      expect(() => store.errorAction()).toThrow("Test error");
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Test error" }),
        "errorAction",
        "set"
      );
    });

    it("should support preventRollback option", () => {
      const onError = vi.fn();

      const store = createStore(
        withErrorBoundary({
          onError,
          preventRollback: true,
        })((set, get) => ({
          count: 0,
          errorAction: () => {
            set({ count: 10 }, "errorAction");
            throw new Error("Test error");
          },
        }))
      );

      expect(() => store.errorAction()).toThrow("Test error");
      expect(store.count).toBe(10); // Not rolled back
    });

    it("should support rethrow option", () => {
      const onError = vi.fn();

      const store = createStore(
        withErrorBoundary({
          onError,
          rethrow: false,
        })((set, get) => ({
          count: 0,
          errorAction: () => {
            set({ count: 10 }, "errorAction");
            throw new Error("Test error");
          },
        }))
      );

      expect(() => store.errorAction()).not.toThrow();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe("Plugin composition", () => {
    it("should compose multiple plugins", () => {
      const onError = vi.fn();
      const mockStorage: Storage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      const store = createStore(
        compose(
          withLogger({ store: "counter" }),
          withPersist("counter-store", { storage: mockStorage }),
          withErrorBoundary({ onError })
        )((set: any, get: any) => ({
          count: 0,
          increment: () => set({ count: get().count + 1 }, "increment"),
        }))
      );

      expect(store.count).toBe(0);
      store.increment();
      expect(store.count).toBe(1);
    });
  });
});
