import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { createStore, createStoreContext } from "../index";

function counter() {
  return createStore<{ count: number; increment: () => void }>((set, get) => ({
    count: 0, increment: () => set({ count: get().count + 1 }, "increment"),
  }));
}

describe("store contexts in mounted components", () => {
  it("updates sibling consumers through one shared provider", async () => {
    const context = createStoreContext(counter);
    const child = defineComponent({ setup() {
      const store = context.useStore();
      const count = store.useSelector(state => state.count);
      return () => h("button", { onClick: store.increment }, String(count.value));
    } });
    const root = defineComponent({ setup() {
      context.provideStore();
      return () => h("div", [h(child), h(child)]);
    } });
    const wrapper = mount(root);
    try {
      await wrapper.findAll("button")[0].trigger("click");
      expect(wrapper.findAll("button").map(button => button.text())).toEqual(["1", "1"]);
    } finally { wrapper.unmount(); }
  });
  it("creates fresh state after unmount and remount", async () => {
    const factory = vi.fn(counter);
    const context = createStoreContext(factory);
    const root = defineComponent({ setup() {
      const store = context.provideStore();
      return () => h("button", { onClick: store.increment }, String(store.count));
    } });
    const first = mount(root);
    try {
      await first.find("button").trigger("click");
      expect(first.text()).toBe("1");
    } finally { first.unmount(); }
    const second = mount(root);
    try {
      expect(second.text()).toBe("0");
      expect(factory).toHaveBeenCalledTimes(2);
    } finally { second.unmount(); }
  });
});
