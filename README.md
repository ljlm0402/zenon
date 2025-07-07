<h1 align="center">
  <br>
  <img src="https://github.com/ljlm0402/zenon/raw/images/logo.png" alt="Project Logo" width="800" />
  <br>
  <br>
  zenon
  <br>
</h1>

<h4 align="center">🦉 A minimalist, Zustand-inspired state manager for <b>Vue 3</b></h4>

<p align ="center">
    <a href="https://nodei.co/npm/zenon" target="_blank">
    <img src="https://nodei.co/npm/zenon.png" alt="npm Info" />
</a>

</p>

<p align="center">
    <a href="http://npm.im/zenon" target="_blank">
      <img src="https://img.shields.io/npm/v/zenon.svg" alt="npm Version" />
    </a>
    <a href="http://npm.im/zenon" target="_blank">
      <img src="https://img.shields.io/github/v/release/ljlm0402/zenon" alt="npm Release Version" />
    </a>
    <a href="http://npm.im/zenon" target="_blank">
      <img src="https://img.shields.io/npm/dm/zenon.svg" alt="npm Downloads" />
    </a>
    <a href="http://npm.im/zenon" target="_blank">
      <img src="https://img.shields.io/npm/l/zenon.svg" alt="npm Package License" />
    </a>
</p>

<p align="center">
  <a href="https://github.com/ljlm0402/zenon/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/ljlm0402/zenon" alt="github Stars" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/network/members" target="_blank">
    <img src="https://img.shields.io/github/forks/ljlm0402/zenon" alt="github Forks" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/stargazers" target="_blank">
    <img src="https://img.shields.io/github/contributors/ljlm0402/zenon" alt="github Contributors" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/issues" target="_blank">
    <img src="https://img.shields.io/github/issues/ljlm0402/zenon" alt="github Issues" />
  </a>
</p>

---

## ✨ Features

- 🍃 <b>Vue 3</b> Composition API only

- ⚡️ <b>Almost identical DX to Zustand</b>: supports set/get/selector

- 🧑‍💻 <b>TypeScript friendly</b>: easy type inference, separation, and actions

- 🚀 <b>Lightweight & simple</b>: true 1-file store, ZERO learning curve

- 🧩 <b>Selector-based partial subscription</b> supported for optimal component performance


## 💾 Installation

```bash
pnpm add zenon
# or
npm install zenon
# or
yarn add zenon
```

## 📝 Usage

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

## 🎯 Comoponents Usage

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

## 🚦 Partial Subscription with Selector

```ts
const store = useCounter();
const count = store.useSelector((s) => s.count); // Subscribe only to count
const double = store.useSelector((s) => s.count * 2); // Derived value is also OK
```

## 🧑‍💻 Type Separation Example

```ts
type UserState = { name: string; age: number };
type UserActions = { setName: (name: string) => void };

export const useUser = () =>
  createStore<UserState & UserActions>((set, get) => ({
    name: "Agumon",
    age: 32,
    setName: (name) => set({ name }),
  }));
```

## 📚 License

MIT


## ⭐️ Star & Contribute

Ideas, PRs, and feedback are all welcome!
