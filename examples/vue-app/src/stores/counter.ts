import { createStore, compose } from "zenon";
import { withLogger, withPersist, withErrorBoundary } from "zenon/plugins";
import type { SetFunction, GetFunction, StoreApi } from "zenon";

type CounterState = { count: number };
type CounterActions = {
  increase: () => void;
  decrease: () => void;
  reset: () => void;
  increaseBy: (amount: number) => void;
};

const STORE_KEY = "zenon-counter";

// Compose DX with Error Boundary
export const useCounter = () =>
  createStore(
    compose(
      withLogger({ store: "counter", timestamp: true, expanded: false }),
      withPersist<CounterState & CounterActions>(STORE_KEY, {
        storage: window.sessionStorage,
        version: 1,
        onError: (error, context) => {
          console.error(`[Counter Persist Error - ${context}]:`, error);
        },
      }),
      withErrorBoundary<CounterState & CounterActions>({
        onError: (error, actionName, context) => {
          console.error(`[Counter Error - ${actionName}]:`, error);
        },
        rethrow: false, // Don't break the app on errors
      })
    )(
      (
        set: SetFunction<CounterState & CounterActions>,
        get: GetFunction<CounterState & CounterActions>,
        api: Pick<
          StoreApi<CounterState & CounterActions>,
          "setSilent" | "subscribe"
        >
      ) => ({
        count: 0,
        increase: () => set({ count: get().count + 1 }, "increase"),
        decrease: () => set({ count: get().count - 1 }, "decrease"),
        reset: () => set({ count: 0 }, "reset"),
        increaseBy: (amount: number) => {
          if (amount < 0) {
            throw new Error("Amount must be positive");
          }
          set({ count: get().count + amount }, "increaseBy");
        },
      })
    )
  );

// Middleware Chain DX
// export const useCounter = () =>
//   createStore(
//     withLogger({ store: "counter", timestamp: true, expanded: true })(
//       withPersist<CounterState & CounterActions>(STORE_KEY, {
//         storage: window.sessionStorage,
//       })((set, get) => ({
//         count: 0,
//         increase: () => set({ count: get().count + 1 }, "increase"),
//         reset: () => set({ count: 0 }, "reset"),
//       }))
//     )
//   );
