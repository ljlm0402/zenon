<p align="center">
  <img width="800" src="https://github.com/ljlm0402/zenon/raw/images/logo.png" alt="zenon logo" />
</p>

<h1 align="center">Zenon</h1>
<p align="center">A minimalist, Zustand-inspired state manager for <b>Vue 3</b></p>

---

## ✨ Features

- 🍃 <b>Vue 3</b> Composition API 전용
- ⚡️ <b>Zustand와 거의 동일한 DX</b>: set/get/selector 모두 지원
- 🧑‍💻 <b>TypeScript 친화적</b>: 타입 추론/분리/액션 모두 쉬움
- 🚀 <b>초경량 & 심플</b>: 1-file store, 러닝커브 ZERO
- 🧩 <b>부분구독(Selector)</b> 지원, 컴포넌트별 최적화 OK

---

## 📦 설치

```bash
pnpm add zenon
# or
npm install zenon
# or
yarn add zenon
```

---

## ⚡️ 기본 사용법

```ts
// stores/counter.ts
import { createStore } from "zenon";

type State = { count: number };
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
```

---

## 🎯 컴포넌트에서 사용

```vue
<template>
  <div>
    <h2>Zenon Counter</h2>
    <p>Count: {{ count }}</p>
    <button @click="increase">+1</button>
    <button @click="reset">Reset</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from "@/stores/counter";
const store = useCounter();
const count = store.useSelector((s) => s.count);
const { increase, reset } = store;
</script>
```

---

## 🚦 Selector로 부분 구독

```ts
const store = useCounter();
const count = store.useSelector((s) => s.count); // count만 반응
const double = store.useSelector((s) => s.count * 2); // 파생값도 OK
```

---

## 🧑‍💻 타입 분리 예시

```ts
type UserState = { name: string; age: number };
type UserActions = { setName: (name: string) => void };

export const useUser = () =>
  createStore<UserState & UserActions>((set, get) => ({
    name: "아구몬",
    age: 32,
    setName: (name) => set({ name }),
  }));
```

---

## 📚 License

MIT

---

## ⭐️ Star & Contribute

아이디어, PR, 피드백 모두 환영합니다!
