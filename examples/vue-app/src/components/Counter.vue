<template>
  <div>
    <h2>🧮 Counter</h2>
    <p>Count: {{ count }}</p>
    <button @click="increase">+1</button>
    <button @click="reset">Reset</button>
  </div>

  <div>
    <h2>🎲 Lotto Draw</h2>
    <div v-if="numbers.length > 0" class="lotto-numbers">
      <span v-for="n in numbers" :key="n" class="lotto-ball">{{ n }}</span>
    </div>
    <button @click="drawing">Drawing</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from "@/stores/counter";
import { useLotto } from "@/stores/lotto";

const counter = useCounter();
const count = counter.useSelector((s) => s.count); // selector로 부분구독!
const { increase, reset } = counter;

const lottoer = useLotto();
const numbers = lottoer.useSelector((s) => s.numbers);
const { drawing } = lottoer;
</script>
<style scoped>
.lotto-numbers {
  margin: 12px 0;
}
.lotto-ball {
  display: inline-block;
  margin: 0 6px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #42b883;
  color: #fff;
  font-weight: bold;
  text-align: center;
  line-height: 36px;
  font-size: 1.25rem;
}
</style>
