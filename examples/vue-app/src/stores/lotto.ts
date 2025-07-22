import { createStore, compose } from "zenon";
import { withLogger, withPersist } from "zenon/plugins";

type LottoState = { numbers: number[] };
type LottoActions = {
  drawing: () => void;
};

const getRandomLottoNumbers = (): number[] => {
  const nums = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums.slice(0, 6).sort((a, b) => a - b);
}

// Compose DX
export const withAppPreset = compose(
  withLogger({ store: "lotto", timestamp: true, expanded: true }),
  withPersist("lotto", { storage: window.sessionStorage })
);

export const useLotto = () =>
  createStore(
    withAppPreset((set) => ({
      numbers: [],
      drawing: () => set({ numbers: getRandomLottoNumbers() }, "drawing"),
    }))
  );