// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, inject, provide, type InjectionKey } from "vue";
import { renderToString } from "vue/server-renderer";
import { createStore, type Store } from "../index";
import { withPersist } from "../plugins";

describe("Request-local SSR stores", () => {
  it("isolates overlapping requests while sharing within each component tree", async () => {
    const key: InjectionKey<Store<{ count: number }>> = Symbol("request-store");
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const child = defineComponent({
      async setup() {
        const store = inject(key)!;
        await gate;
        return () => h("span", String(store.count));
      },
    });
    function request(count: number) {
      const store = createStore(() => ({ count }));
      const app = createSSRApp(defineComponent({ setup() {
        provide(key, store);
        return () => h(child);
      } }));
      return { store, html: renderToString(app) };
    }
    const a = request(1);
    const b = request(2);
    a.store.setSilent({ count: 10 });
    release();
    expect(await a.html).toContain(">10</span>");
    expect(await b.html).toContain(">2</span>");
  });
  it("constructs independent persistent stores without browser globals", () => {
    expect(typeof window).toBe("undefined");
    const create = () => createStore(withPersist<{ count: number }>("ssr")(() => ({ count: 0 })));
    const a = create();
    const b = create();
    a.setSilent({ count: 1 });
    expect(b.count).toBe(0);
  });
});
