// @vitest-environment node
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createStore, createStoreContext } from "../index";

const createCounter = (count: number) => createStore<{ count: number; increment: () => void }>((set, get) => ({
  count, increment: () => set({ count: get().count + 1 }, "increment"),
}));

describe("createStoreContext", () => {
  it("creates nothing until a provider is installed and retains argument/store types", () => {
    const factory = vi.fn(createCounter);
    const context = createStoreContext(factory, "Counter");
    expect(factory).not.toHaveBeenCalled();
    expectTypeOf(context.provideStore).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(context.useStore).returns.toEqualTypeOf<ReturnType<typeof createCounter>>();
  });
  it("shares one component-provided instance across siblings", async () => {
    const context = createStoreContext(createCounter);
    const stores: ReturnType<typeof createCounter>[] = [];
    const child = defineComponent({ setup() {
      const store = context.useStore();
      stores.push(store);
      return () => h("span", String(store.count));
    } });
    let provided!: ReturnType<typeof createCounter>;
    const app = createSSRApp(defineComponent({ setup() {
      provided = context.provideStore(3);
      return () => h("div", [h(child), h(child)]);
    } }));
    expect(await renderToString(app)).toBe("<div><span>3</span><span>3</span></div>");
    expect(stores).toEqual([provided, provided]);
    expect(stores[0]).toBe(stores[1]);
  });
  it("isolates overlapping SSR requests created from one module-level context", async () => {
    const context = createStoreContext(createCounter);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const child = defineComponent({ async setup() {
      const store = context.useStore();
      await gate;
      return () => h("span", String(store.count));
    } });
    const a = createSSRApp(child);
    const b = createSSRApp(child);
    const storeA = context.provideTo(a, 1);
    const storeB = context.provideTo(b, 2);
    const rendered = Promise.all([renderToString(a), renderToString(b)]);
    storeA.increment();
    storeA.increment();
    release();
    expect(await rendered).toEqual(["<span>3</span>", "<span>2</span>"]);
    expect(storeA).not.toBe(storeB);
  });
  it("uses the nearest provider without changing the outer store", async () => {
    const context = createStoreContext(createCounter);
    const leaf = defineComponent({ setup() {
      const store = context.useStore();
      return () => h("span", String(store.count));
    } });
    const nested = defineComponent({ setup() {
      expect(context.useStore().count).toBe(1); // own provide does not replace ancestor injection
      const local = context.provideStore(10);
      local.increment();
      return () => h(leaf);
    } });
    const app = createSSRApp(defineComponent({ setup() {
      return () => h("div", [h(leaf), h(nested), h(leaf)]);
    } }));
    const outer = context.provideTo(app, 1);
    expect(await renderToString(app)).toBe("<div><span>1</span><span>11</span><span>1</span></div>");
    expect(outer.count).toBe(1);
  });
  it("does not confuse contexts with the same display name", async () => {
    const a = createStoreContext(createCounter, "Counter");
    const b = createStoreContext(createCounter, "Counter");
    const app = createSSRApp(defineComponent({ setup() {
      const first = a.useStore();
      const second = b.useStore();
      return () => h("span", `${first.count}/${second.count}`);
    } }));
    a.provideTo(app, 1);
    b.provideTo(app, 2);
    expect(await renderToString(app)).toBe("<span>1/2</span>");
  });
  it("throws an actionable error for a missing provider without creating a fallback", async () => {
    const factory = vi.fn(createCounter);
    const context = createStoreContext(factory, "Counter");
    const app = createSSRApp(defineComponent({ setup() {
      expect(() => context.useStore()).toThrow("No store provider found");
      return () => null;
    } }));
    await renderToString(app);
    expect(factory).not.toHaveBeenCalled();
  });
  it("rejects component helpers outside setup before calling the factory", () => {
    const factory = vi.fn(createCounter);
    const context = createStoreContext(factory);
    expect(() => context.provideStore(0)).toThrow("inside component setup");
    expect(() => context.useStore()).toThrow("inside component setup");
    expect(factory).not.toHaveBeenCalled();
  });
  it("rejects duplicate app registration rather than replacing live state", () => {
    const factory = vi.fn(createCounter);
    const context = createStoreContext(factory);
    const app = createSSRApp({ render: () => null });
    context.provideTo(app, 1);
    expect(() => context.provideTo(app, 2)).toThrow("already provides");
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it("rejects duplicate component registration", async () => {
    const factory = vi.fn(createCounter);
    const context = createStoreContext(factory);
    const app = createSSRApp(defineComponent({ setup() {
      context.provideStore(1);
      expect(() => context.provideStore(2)).toThrow("already provides");
      return () => h("span");
    } }));
    await renderToString(app);
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it("allows retrying an app provider when its factory fails", () => {
    const factory = vi.fn(createCounter).mockImplementationOnce(() => { throw new Error("factory"); });
    const context = createStoreContext(factory);
    const app = createSSRApp({ render: () => null });
    expect(() => context.provideTo(app, 1)).toThrow("factory");
    expect(context.provideTo(app, 2).count).toBe(2);
  });
});
