import { createStore } from "zenon"; // pnpm link 또는 npm 설치 후

export const useCounter = () =>
  createStore((set, get) => ({
    count: 0,
    increase: () => set({ count: get().count + 1 }),
    reset: () => set({ count: 0 }),
  }));
