/*****************************************************************
 * ZENON - Minimal Zustand-like State Manager for Vue 3
 * (c) 2025-present AGUMON (https://github.com/ljlm0402/zenon)
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the project root for more information.
 *
 * Made with ❤️ by AGUMON 🦖
 *****************************************************************/

import { reactive, computed, type ComputedRef } from "vue";

export type StoreApi<T> = {
  get: () => T;
  set: (updater: Partial<T>, actionName?: string) => void;
  useSelector: <S>(selector: (state: T) => S) => ComputedRef<S>;
};

export function createStore<T extends Record<string, any>>(
  initializer: (set: StoreApi<T>["set"], get: StoreApi<T>["get"]) => T
): T & Pick<StoreApi<T>, "useSelector"> {
  const state = reactive({}) as T;

  const set: StoreApi<T>["set"] = (updater, _actionName) => {
    Object.assign(state, updater);
  };
  const get: StoreApi<T>["get"] = () => state;
  const useSelector = <S>(selector: (state: T) => S) =>
    computed(() => selector(state));

  const initial = initializer(set, get);
  Object.assign(state, initial);

  return Object.assign(state, { useSelector }) as T &
    Pick<StoreApi<T>, "useSelector">;
}
