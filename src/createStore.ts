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

export type ActionName = string;

export type SetFunction<T> = (
  updater: Partial<T>,
  actionName: ActionName
) => void;

export type SetSilentFunction<T> = (updater: Partial<T>) => void;

export type GetFunction<T> = () => T;

export type Listener<T> = (state: T, prevState: T) => void;

export type Unsubscribe = () => void;

export type StoreApi<T> = {
  get: GetFunction<T>;
  set: SetFunction<T>;
  setSilent: SetSilentFunction<T>;
  useSelector: <S>(selector: (state: T) => S) => ComputedRef<S>;
  subscribe: (listener: Listener<T>) => Unsubscribe;
  getListeners: () => Set<Listener<T>>;
};

export type StoreInitializer<T> = (
  set: SetFunction<T>,
  get: GetFunction<T>,
  api: Pick<StoreApi<T>, "setSilent" | "subscribe">
) => T;

export function createStore<T extends Record<string, any>>(
  initializer: StoreInitializer<T>
): T & Pick<StoreApi<T>, "useSelector" | "subscribe"> {
  const state = reactive({}) as T;
  const listeners = new Set<Listener<T>>();

  const set: SetFunction<T> = (updater, actionName) => {
    const prevState = { ...state };

    try {
      Object.assign(state, updater);
    } catch (error) {
      console.error(`[Zenon] Error in set for action "${actionName}":`, error);
      // Rollback on error
      Object.assign(state, prevState);
      throw error;
    }

    // Notify listeners after successful update
    listeners.forEach((listener) => {
      try {
        listener(state, prevState);
      } catch (error) {
        console.error(
          `[Zenon] Error in listener for action "${actionName}":`,
          error
        );
      }
    });
  };

  const setSilent: SetSilentFunction<T> = (updater) => {
    try {
      Object.assign(state, updater);
    } catch (error) {
      console.error("[Zenon] Error in setSilent:", error);
      throw error;
    }
  };

  const get: GetFunction<T> = () => state;

  const useSelector = <S>(selector: (state: T) => S) =>
    computed(() => {
      try {
        return selector(state);
      } catch (error) {
        console.error("[Zenon] Error in selector:", error);
        throw error;
      }
    });

  const subscribe = (listener: Listener<T>): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getListeners = () => listeners;

  const api: Pick<StoreApi<T>, "setSilent" | "subscribe"> = {
    setSilent,
    subscribe,
  };

  const initial = initializer(set, get, api);
  Object.assign(state, initial);

  return Object.assign(state, {
    useSelector,
    subscribe,
  }) as T & Pick<StoreApi<T>, "useSelector" | "subscribe">;
}
