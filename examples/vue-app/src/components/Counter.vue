<template>
  <div>
    <h2>Zenon Counter</h2>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <div style="display: flex; gap: 8px">
      <button @click="increase">+1</button>
      <button @click="decrease">-1</button>
      <button @click="increaseBy(5)">+5</button>
      <button @click="reset">Reset</button>
      <button @click="testError">Test Error</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from "../stores/counter";

const store = useCounter();
const count = store.useSelector((s: any) => s.count); // selector로 부분구독!
const doubled = store.useSelector((s: any) => s.count * 2); // 계산된 값도 가능!
const { increase, decrease, reset, increaseBy } = store;

const testError = () => {
  try {
    increaseBy(-1); // This will throw an error
  } catch (error) {
    console.log("Error caught in component:", error);
  }
};
</script>
