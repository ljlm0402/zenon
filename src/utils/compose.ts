import type { StoreInitializer, StoreMiddleware } from "../createStore";

/** Compose middleware from right to left, retaining the initializer API. */
export function compose<T extends Record<string, any>>(
  ...middlewares: StoreMiddleware<T>[]
): StoreMiddleware<T> {
  return (initializer: StoreInitializer<T>) =>
    middlewares.reduceRight((current, middleware) => middleware(current), initializer);
}
