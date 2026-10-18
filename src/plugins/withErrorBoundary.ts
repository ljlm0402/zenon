/*****************************************************************
 * ZENON - Minimal Zustand-like State Manager for Vue 3
 * (c) 2025-present AGUMON (https://github.com/ljlm0402/zenon)
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the project root for more information.
 *
 * Made with ❤️ by AGUMON 🦖
 *****************************************************************/

import type { StoreInitializer, SetFunction, GetFunction, ActionName } from "../createStore";

export type ErrorBoundaryOptions = {
  /**
   * Error handler callback
   */
  onError: (
    error: Error,
    actionName: ActionName,
    context: "set" | "get"
  ) => void;
  /**
   * Whether to prevent shallow rollback when the wrapped set throws (default: false).
   * Successful updates before an action error are not rolled back.
   */
  preventRollback?: boolean;
  /**
   * Whether to rethrow errors after handling (default: true)
   */
  rethrow?: boolean;
};

/**
 * Middleware that wraps store actions with error boundary
 * @param options - Error boundary options
 */
export type HandledState<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends PromiseLike<unknown>
      ? Promise<Awaited<R> | undefined>
      : R | undefined
    : T[K];
};

export function withErrorBoundary<T extends Record<string, any>>(
  options: ErrorBoundaryOptions & { rethrow: false }
): (initializer: StoreInitializer<T>) => StoreInitializer<HandledState<T>>;
export function withErrorBoundary<T extends Record<string, any>>(
  options: ErrorBoundaryOptions & { rethrow?: true }
): (initializer: StoreInitializer<T>) => StoreInitializer<T>;
export function withErrorBoundary<T extends Record<string, any>>(
  options: ErrorBoundaryOptions
): (initializer: StoreInitializer<T>) => StoreInitializer<HandledState<T>>;
export function withErrorBoundary<T extends Record<string, any>>(
  options: ErrorBoundaryOptions
): any {
  const { onError, preventRollback = false, rethrow = true } = options;
  const report = (error: unknown, action: string, context: "set" | "get") => {
    try {
      onError(error instanceof Error ? error : new Error(String(error)), action, context);
    } catch (handlerError) {
      console.error("[Zenon ErrorBoundary] Error handler failed:", handlerError);
    }
  };

  return (initializer: StoreInitializer<T>) =>
    (set: SetFunction<T>, get: GetFunction<T>, api: Parameters<StoreInitializer<T>>[2]): T => {
      const origins = new WeakMap<object, { action: string; context: "set" | "get" }>();
      const remember = (error: unknown, action: string, context: "set" | "get") => {
        if (error !== null && (typeof error === "object" || typeof error === "function")) {
          origins.set(error, { action, context });
        }
      };
      const reportAction = (error: unknown, action: string) => {
        const objectError = error !== null && (typeof error === "object" || typeof error === "function");
        const origin = objectError ? origins.get(error) : undefined;
        if (objectError) origins.delete(error);
        report(error, origin?.action ?? action, origin?.context ?? "set");
      };
      const errorBoundarySet: SetFunction<T> = (updater, actionName) => {
        const prevState = preventRollback ? undefined : { ...get() };

        try {
          set(updater, actionName);
        } catch (error) {
          // Propagated failures are reported at the action boundary, once.
          if (!rethrow) report(error, actionName, "set");
          else remember(error, actionName, "set");

          // Rollback to previous state if not prevented
          if (!preventRollback && prevState) {
            try {
              Object.assign(get(), prevState);
            } catch (rollbackError) {
              console.error(
                "[Zenon ErrorBoundary] Rollback failed:",
                rollbackError
              );
            }
          }

          if (rethrow) {
            throw error;
          }
        }
      };

      const errorBoundaryGet: GetFunction<T> = () => {
        try {
          return get();
        } catch (error) {
          if (!rethrow) report(error, "get", "get");
          else remember(error, "get", "get");
          if (rethrow) {
            throw error;
          }
          return {} as T;
        }
      };

      // Wrap the initializer to catch errors in action functions
      let store: T;
      try {
        store = initializer(errorBoundarySet, errorBoundaryGet, api);
      } catch (error) {
        // There is no valid store to return when initialization fails.
        reportAction(error, "initializer");
        throw error;
      }

      // Wrap all action functions with error boundary
      const wrappedStore = { ...store };
      for (const key in store) {
        if (typeof store[key] === "function") {
          const originalFn = store[key];
          wrappedStore[key] = (function (this: unknown, ...args: any[]) {
            const handleError = (error: unknown) => {
              reportAction(error, key);
              if (!rethrow) {
                return undefined;
              }
              throw error;
            };
            try {
              const result = originalFn.apply(this, args);
              if (result && typeof result.then === "function") {
                return Promise.resolve(result).catch(handleError);
              }
              return result;
            } catch (error) {
              return handleError(error);
            }
          }) as any;
        }
      }

      return wrappedStore;
    };
}
