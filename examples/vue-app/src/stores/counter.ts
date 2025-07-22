import { createStore } from "zenon";
import { withLogger, withPersist } from "zenon/plugins";

type CounterState = { count: number };
type CounterActions = {
  increase: () => void;
  reset: () => void;
};

// Middleware Chain DX
export const useCounter = () =>
  createStore(
    withLogger({ store: "counter", timestamp: true, expanded: true })(
      withPersist<CounterState & CounterActions>("counter", {
        storage: window.sessionStorage,
      })((set, get) => ({
        count: 0,
        increase: () => set({ count: get().count + 1 }, "increase"),
        reset: () => set({ count: 0 }, "reset"),
      }))
    )
  );
