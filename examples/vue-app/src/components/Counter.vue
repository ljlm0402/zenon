<template>
  <div>
    <p>Count: {{ store.count }}</p>
    <button @click="store.increase">+1</button>
    <button @click="store.reset">Reset</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from "@/stores/counter";
const store = useCounter();
</script>
