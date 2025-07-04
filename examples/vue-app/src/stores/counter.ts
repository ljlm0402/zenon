import { createStore } from "zenon";

type State = {
  count: number;
};
type Actions = {
  increase: () => void;
  reset: () => void;
};

export const useCounter = () =>
  createStore<State & Actions>((set, get) => ({
    count: 0,
    increase: () => set({ count: get().count + 1 }),
    reset: () => set({ count: 0 }),
  }));
