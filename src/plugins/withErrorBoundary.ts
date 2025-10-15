/*****************************************************************
 * ZENON - Minimal Zustand-like State Manager for Vue 3
 * (c) 2025-present AGUMON (https://github.com/ljlm0402/zenon)
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the project root for more information.
 *
 * Made with ❤️ by AGUMON 🦖
 *****************************************************************/

import type { SetFunction, GetFunction, ActionName } from "../createStore";

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
   * Whether to prevent state rollback on error (default: false)
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
export function withErrorBoundary<T extends Record<string, any>>(
  options: ErrorBoundaryOptions
) {
  const { onError, preventRollback = false, rethrow = true } = options;

  return (initializer: (set: SetFunction<T>, get: GetFunction<T>) => T) =>
    (set: SetFunction<T>, get: GetFunction<T>): T => {
      const errorBoundarySet: SetFunction<T> = (updater, actionName) => {
        const prevState = preventRollback ? undefined : { ...get() };

        try {
          set(updater, actionName);
        } catch (error) {
          onError(error as Error, actionName, "set");

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
          onError(error as Error, "get", "get");
          if (rethrow) {
            throw error;
          }
          return {} as T;
        }
      };

      // Wrap the initializer to catch errors in action functions
      const store = initializer(errorBoundarySet, errorBoundaryGet);

      // Wrap all action functions with error boundary
      const wrappedStore = { ...store };
      for (const key in store) {
        if (typeof store[key] === "function") {
          const originalFn = store[key];
          wrappedStore[key] = ((...args: any[]) => {
            try {
              return originalFn(...args);
            } catch (error) {
              onError(error as Error, key, "set");
              if (!rethrow) {
                return undefined;
              }
              throw error;
            }
          }) as any;
        }
      }

      return wrappedStore;
    };
}
