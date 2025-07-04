import { reactive, readonly } from "vue";

export type StoreApi<T> = {
  get: () => T;
  set: (updater: Partial<T>) => void;
};

export function createStore<T extends Record<string, any>>(
  initializer: (set: StoreApi<T>["set"], get: StoreApi<T>["get"]) => T
): Readonly<T> {
  const state = reactive({}) as T;

  const set: StoreApi<T>["set"] = (updater) => {
    Object.assign(state, updater);
  };

  const get: StoreApi<T>["get"] = () => state;

  const initial = initializer(set, get);
  Object.assign(state, initial);

  return readonly(state) as Readonly<T>;
}
