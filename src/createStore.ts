import { reactive, computed, type ComputedRef } from "vue";

export type StoreApi<T> = {
  get: () => T;
  set: (updater: Partial<T>) => void;
  useSelector: <S>(selector: (state: T) => S) => ComputedRef<S>;
};

export function createStore<T extends Record<string, any>>(
  initializer: (set: StoreApi<T>["set"], get: StoreApi<T>["get"]) => T
): T & Pick<StoreApi<T>, "useSelector"> {
  const state = reactive({}) as T;

  const set: StoreApi<T>["set"] = (updater) => {
    Object.assign(state, updater);
  };

  const get: StoreApi<T>["get"] = () => state;

  const useSelector = <S>(selector: (state: T) => S) => {
    return computed(() => selector(state));
  };

  const initial = initializer(set, get);
  Object.assign(state, initial);

  return Object.assign(state, { useSelector }) as T &
    Pick<StoreApi<T>, "useSelector">;
}
