<h1 align="center">
  <br>
  <img src="https://github.com/ljlm0402/zenon/raw/images/logo.png" alt="Zenon Logo" width="600" />
  <br>
  <br>
  Zenon
  <br>
</h1>

<h4 align="center">🦉 A minimalist, Zustand-inspired state manager for <b>Vue 3</b></h4>

<p align="center">
  <a href="https://nodei.co/npm/zenon" target="_blank">
    <img src="https://nodei.co/npm/zenon.png" alt="npm Info" />
  </a>
</p>

<p align="center">
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/npm/v/zenon.svg" alt="npm Version" />
  </a>
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/github/v/release/ljlm0402/zenon" alt="Release Version" />
  </a>
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/npm/dm/zenon.svg" alt="npm Downloads" />
  </a>
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/npm/l/zenon.svg" alt="License" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/ljlm0402/zenon/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/ljlm0402/zenon" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/network/members" target="_blank">
    <img src="https://img.shields.io/github/forks/ljlm0402/zenon" alt="GitHub Forks" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/graphs/contributors" target="_blank">
    <img src="https://img.shields.io/github/contributors/ljlm0402/zenon" alt="Contributors" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/issues" target="_blank">
    <img src="https://img.shields.io/github/issues/ljlm0402/zenon" alt="Issues" />
  </a>
</p>

<p align="center">
  <strong>· English <a href="./README.ko.md">· Korean</a></strong>
</p>

---

## ✨ Features

- 🍃 **Vue 3 Composition API** - Modern reactive state management
- ⚡️ **Zustand-like DX** - Familiar API with `set`, `get`, and selectors
- 🧑‍💻 **Full TypeScript Support** - Complete type safety and inference
- 🚀 **Lightweight** - Minimal bundle size, zero dependencies (except Vue)
- 🎯 **Selector-based Subscriptions** - Optimize rendering with partial updates
- 🔌 **Pluggable Middleware** - Logger, Persist, ErrorBoundary, and more
- 🧩 **Composable** - Chain or compose multiple middlewares
- 📦 **Tree-shakeable** - Import only what you need
- ✅ **Tested** - Unit, regression, and package consumer checks

## 💾 Installation

```bash
pnpm add zenon
# or
npm install zenon
# or
yarn add zenon
```

## 📝 Quick Start

### Basic Usage

```ts
// stores/counter.ts
import { createStore } from "zenon";

export const useCounter = () =>
  createStore((set, get) => ({
    count: 0,
    increment: () => set({ count: get().count + 1 }, "increment"),
    decrement: () => set({ count: get().count - 1 }, "decrement"),
    reset: () => set({ count: 0 }, "reset"),
  }));
```

```vue
<!-- Counter.vue -->
<template>
  <div>
    <h2>Count: {{ count }}</h2>
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
    <button @click="reset">Reset</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from "./stores/counter";

const store = useCounter();
const count = store.useSelector((s) => s.count); // Partial subscription
const { increment, decrement, reset } = store;
</script>
```

### With Middleware

```ts
import { createStore, compose } from "zenon";
import { withLogger, withPersist, withErrorBoundary } from "zenon/plugins";

export const useCounter = () =>
  createStore(
    compose(
      withLogger({ store: "counter", timestamp: true }),
      withPersist("zenon-counter", {
        storage: window.localStorage,
        version: 1,
      }),
      withErrorBoundary({
        onError: (error, actionName) => {
          console.error(`Error in ${actionName}:`, error);
        },
      })
    )((set, get) => ({
      count: 0,
      increment: () => set({ count: get().count + 1 }, "increment"),
      reset: () => set({ count: 0 }, "reset"),
    }))
  );
```

## 🧩 Middleware Plugins

Zenon provides three powerful middleware plugins that can be composed together:

### withLogger

Logs all state changes to the console with timestamps.

```ts
import { withLogger } from "zenon/plugins";

withLogger({
  store: "counter", // Store name for logging
  timestamp: true, // Include timestamps (default: false)
  expanded: false, // Auto-expand logs (default: false)
});
```

### withPersist

Persists store state to localStorage or sessionStorage.

```ts
import { withPersist } from "zenon/plugins";

withPersist("zenon-counter", {
  storage: window.localStorage, // default: localStorage
  version: 1, // Version for migration control
  partialKeys: ["count"], // Persist only specific keys
  serialize: JSON.stringify, // Custom serializer
  deserialize: JSON.parse, // Custom deserializer
  onError: (error) => console.error(error), // Error handler
  merge: (persisted, current) => ({ ...current, ...persisted }), // Merge strategy
});
```

### withErrorBoundary

Catches and handles errors in store actions.

```ts
import { withErrorBoundary } from "zenon/plugins";

withErrorBoundary({
  onError: (error, actionName) => {
    // Handle error (e.g., send to error tracking service)
    console.error(`Error in ${actionName}:`, error);
  },
  preventRollback: false, // Prevent state rollback on error (default: false)
  rethrow: false, // Rethrow error after handling (default: true)
});
```

### Composing Multiple Plugins

```ts
import { createStore, compose } from "zenon";
import { withLogger, withPersist, withErrorBoundary } from "zenon/plugins";

// Compose style (recommended)
export const useStore = () =>
  createStore(
    compose(
      withLogger({ store: "app" }),
      withPersist("app-state"),
      withErrorBoundary({ onError: console.error })
    )((set, get) => ({
      // Your store implementation
    }))
  );

// Or chain style
export const useStore = () =>
  createStore(
    withLogger({ store: "app" })(
      withPersist("app-state")(
        withErrorBoundary({ onError: console.error })((set, get) => ({
          // Your store implementation
        }))
      )
    )
  );
```

## 📚 API Reference

### createStore

Creates a new store with reactive state management.

```ts
function createStore<T>(
  initializer: (set: SetFunction<T>, get: GetFunction<T>) => T
): Store<T>;
```

**Returns:** `Store<T>` with the following methods:

- `useSelector<U>(selector: (state: T) => U): ComputedRef<U>` - Subscribe to partial state
- `subscribe(listener: Listener<T>): () => void` - Subscribe to all state changes
- `setSilent(patch: Partial<T>)` - Update state without triggering subscribers
- `getState(): T` - Get current state snapshot
- Plus all store actions defined in your initializer

### useSelector

Subscribe to a specific part of the store state. Only triggers re-renders when the selected value changes.

```ts
const store = useCounter();
const count = store.useSelector((s) => s.count); // Subscribe only to count
const double = store.useSelector((s) => s.count * 2); // Derived values work too
```

### subscribe

Subscribe to all state changes with a callback function.

```ts
const unsubscribe = store.subscribe((state, prevState) => {
  console.log("State changed:", { state, prevState });
});

// Cleanup
unsubscribe();
```

### setSilent

Update state without notifying subscribers. Useful for batch updates or internal state changes.

```ts
store.setSilent({ count: 10 }); // Updates state without triggering listeners
```

## 🏗 TypeScript Support

Zenon is written in TypeScript and provides full type safety out of the box.

```ts
import { createStore, type Store, type SetFunction, type GetFunction } from "zenon";

// Type your store
type CounterState = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

export const useCounter = (): Store<CounterState> =>
  createStore<CounterState>((set, get) => ({
    count: 0,
    increment: () => set({ count: get().count + 1 }, "increment"),
    decrement: () => set({ count: get().count - 1 }, "decrement"),
  }));
```

**Exported Types:**

- `Store<T>` - Store instance type
- `SetFunction<T>` - State setter function type
- `GetFunction<T>` - State getter function type
- `Listener<T>` - Subscribe callback type
- `StoreMiddleware<T>` - Middleware function type

## 🧪 Testing

The test suite covers core behavior and selected failure cases:

- ✅ Core store functionality (reactivity, subscriptions, selectors)
- ✅ All middleware plugins (logger, persist, error boundary)
- ✅ Error handling and edge cases
- ✅ TypeScript type safety

Run tests:

```bash
npm run check # types, tests, build, packed consumer checks
```

## 🤝 Contributing

Contributions are always welcome! Please feel free to open an issue or submit a pull request.

## 💳 License

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ljlm0402">AGUMON</a> 🦖
</p>

## Behavioral boundaries

- The factory examples create a new store per call. For a shared SPA store, create one module-level instance and return it from the composable. In SSR, create a separate instance per request.
- Specify `createStore<State>`, `compose<State>` and plugin type arguments for consistent patch checking; inference through recursive initializer callbacks is not a complete type-safety guarantee.
- `getState()` and listener `prevState` are shallow snapshots; nested objects are shared. Replace nested values instead of mutating them in place.
- `setSilent` updates Vue reactivity but bypasses subscriber notifications and middleware set wrappers, including persistence. Direct mutations also bypass these wrappers.
- Persistence restores only declared data fields, never actions, unknown keys or prototype-related keys. `partialKeys: []` saves and restores no data.
- Both legacy `merge` string modes shallowly overlay keys. Supply a callback for nested merging. Version mismatches use defaults unless a synchronous `migrate` callback is supplied; failed hydration preserves the original record and disables all writes for that instance. Explicitly set `onHydrationError: "overwrite"` to discard it. Capture the instance controller through `onReady` and call `rehydrate()` after repairing storage.
- Error boundaries handle synchronous exceptions and Promise rejections. `rethrow` defaults to `true`; when false, failed actions may return/resolve `undefined` and the return type now includes `undefined` (`HandledState<T>`). A dynamic boolean is typed conservatively. Composition with value-returning actions may require updating the composed state type.
- `preventRollback` controls shallow recovery of a failing wrapped `set`, not an action-wide transaction or reversal of notifications, persistence, or concurrent async changes. Core patch-failure recovery is separate.
- Reserve `useSelector`, `subscribe`, `setSilent` and `getState` for the public API.

### Hydration validation and failure ownership

`validate: (persisted) => boolean` checks the filtered persisted data before merging. It is not called for a missing record. Returning false or throwing rejects hydration and preserves the original storage by default. Validation and merge callbacks should be pure.

Propagated set/get failures are reported at the action boundary instead of twice. Errors caught inside the action are not reported. Suppressed set/get failures (`rethrow: false`) are reported where handled. A failing error callback is logged without replacing the original exception. Nested public actions or multiple error boundaries may report the same propagated failure at their respective boundaries.

Create an instance per SSR request and share it through that app's provide/inject. Concurrent server rendering is tested; automatic client hydration serialization is not provided.

### Migrations and recovery

`migrate(previous, fromVersion)` converts older or unversioned records to the current schema. Future, negative, fractional, and nonnumeric versions are rejected. `partialKeys` and `validate` apply after migration, before custom merging. Callbacks must be synchronous and pure.

The original string is backed up at `backupKey` (default: `<key>:zenon:backup`) before committing migrated data. Migration storage writes must succeed before updating memory. A different existing backup blocks migration; archive it or choose another backup key. Backups are never automatically overwritten or deleted. Web Storage is not a multi-key or cross-tab transaction; custom storage must preserve previous values when a write throws.

Capture a `PersistController` with `onReady: controller => { persistence = controller; }`:

- `getStatus()` returns a nonreactive snapshot: `status` (`ready`, `error`, `unavailable`), `writesBlocked`, optional `error`, and `backupKey`.
- `rehydrate()` explicitly rereads storage, overwriting matching in-memory fields without subscriber notifications. It returns success/failure and can resume writes after repaired hydration.
- `retryPersist()` retries writing current memory, but never bypasses blocked hydration. It returns success/failure.

Recovery calls made inside `onReady` or during another recovery return false. A failed migration/backup or detected concurrent storage change blocks automatic writes even with `onHydrationError: "overwrite"`. Repair the cause and call `rehydrate()`. An empty-store initial write failure or ordinary update failure can use `retryPersist()`.

### Request- and component-scoped stores

```ts
import { createStore, createStoreContext } from "zenon";

export const counterContext = createStoreContext((count: number) =>
  createStore(() => ({ count })), "Counter"
);

// Per request: create a fresh SSR app, then register a fresh store.
const store = counterContext.provideTo(app, initialCount);
// In a parent's synchronous setup: counterContext.provideStore(initialCount)
// In descendants' synchronous setup: counterContext.useStore()
```

The context holds a unique injection key and the factory, not a global store. Factory arguments and store types are inferred. The factory must synchronously return a fresh instance; returning a singleton defeats request isolation. A new SSR app is required per request.

`provideStore` returns the new store for the provider component. `useStore` resolves the nearest ancestor/app provider, not a provider on the same component. Missing providers, use outside component setup, and duplicate registration on the same app/component throw actionable errors. Call component helpers before awaiting. Nested providers affect only their descendants; contexts with identical display names remain independent.

This API does not serialize state into HTML or perform client hydration.
