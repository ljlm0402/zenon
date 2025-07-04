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
const count = store.useSelector((s) => s.count); // selector로 부분구독!
const { increase, reset } = store;
</script>
