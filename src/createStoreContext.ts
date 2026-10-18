import { getCurrentInstance, inject, provide, type App, type InjectionKey } from "vue";

export type StoreContext<TStore extends object, Args extends unknown[]> = {
  /** Create a store for descendants of the current component. Call during setup. */
  provideStore: (...args: Args) => TStore;
  /** Resolve the nearest ancestor/app provider. Call during setup, before awaiting. */
  useStore: () => TStore;
  /** Create a store for one app. In SSR, create a new app for each request. */
  provideTo: (app: App, ...args: Args) => TStore;
};

/** Share this context definition, never a request's store instance. */
export function createStoreContext<TStore extends object, Args extends unknown[]>(
  factory: (...args: Args) => TStore,
  name = "ZenonStore"
): StoreContext<TStore, Args> {
  const key: InjectionKey<TStore> = Symbol(name);
  const apps = new WeakSet<App>();
  const components = new WeakSet<object>();
  const requireInstance = () => {
    const instance = getCurrentInstance();
    if (!instance) throw new Error(`[Zenon ${name}] Call this helper inside component setup, before await.`);
    return instance;
  };

  return {
    provideStore(...args) {
      const instance = requireInstance();
      if (components.has(instance)) throw new Error(`[Zenon ${name}] This component already provides a store.`);
      const store = factory(...args);
      provide(key, store);
      components.add(instance);
      return store;
    },
    useStore() {
      requireInstance();
      const store = inject(key, undefined);
      if (store === undefined) throw new Error(`[Zenon ${name}] No store provider found. Call provideStore in an ancestor or provideTo for this app.`);
      return store;
    },
    provideTo(app, ...args) {
      if (apps.has(app)) throw new Error(`[Zenon ${name}] This app already provides a store. Create a new app for each SSR request.`);
      const store = factory(...args);
      app.provide(key, store);
      apps.add(app);
      return store;
    },
  };
}
