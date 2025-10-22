<h1 align="center">
  <br>
  <img src="https://github.com/ljlm0402/zenon/raw/images/logo.png" alt="Zenon Logo" width="600" />
  <br>
  <br>
  Zenon
  <br>
</h1>

<h4 align="center">🦉 Vue 3를 위한 심플하고 강력한 상태 관리 라이브러리</h4>

<p align="center">
  <a href="https://nodei.co/npm/zenon" target="_blank">
    <img src="https://nodei.co/npm/zenon.png" alt="npm Info" />
  </a>
</p>

<p align="center">
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/npm/v/zenon.svg" alt="npm Version" />
  </a>
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/github/v/release/ljlm0402/zenon" alt="Release Version" />
  </a>
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/npm/dm/zenon.svg" alt="npm Downloads" />
  </a>
  <a href="http://npm.im/zenon" target="_blank">
    <img src="https://img.shields.io/npm/l/zenon.svg" alt="License" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/ljlm0402/zenon/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/ljlm0402/zenon" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/network/members" target="_blank">
    <img src="https://img.shields.io/github/forks/ljlm0402/zenon" alt="GitHub Forks" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/graphs/contributors" target="_blank">
    <img src="https://img.shields.io/github/contributors/ljlm0402/zenon" alt="Contributors" />
  </a>
  <a href="https://github.com/ljlm0402/zenon/issues" target="_blank">
    <img src="https://img.shields.io/github/issues/ljlm0402/zenon" alt="Issues" />
  </a>
</p>

<p align="center">
    <strong><a href="./README.md">English</a> · 한국어</strong>
</p>

---

## ✨ 주요 기능

- ⚡️ **경량화** - 작은 번들 크기와 빠른 성능
- 🔄 **반응형** - Vue 3의 반응형 시스템 기반
- 🔌 **플러그 가능** - 미들웨어로 기능 확장 (Logger, Persist, ErrorBoundary)
- 🎯 **부분 구독** - `useSelector`로 필요한 상태만 구독
- 🛡️ **완전한 TypeScript 지원** - 100% 타입 안전성
- 📦 **제로 의존성** - Vue 3 외 추가 의존성 없음
- 🧩 **간단한 API** - Zustand에서 영감을 받은 직관적인 API
- 🧪 **프로덕션 준비 완료** - 30개 이상의 테스트 케이스로 완벽 검증
- 🎨 **Composition API 우선** - Vue 3의 모던 API 스타일

## 📦 설치

```bash
npm install zenon
# or
pnpm add zenon
# or
yarn add zenon
```

## 📝 빠른 시작

### 기본 사용법

```ts
// stores/counter.ts
import { createStore } from "zenon";

export const useCounter = () =>
  createStore((set, get) => ({
    count: 0,
    increment: () => set({ count: get().count + 1 }, "increment"),
    decrement: () => set({ count: get().count - 1 }, "decrement"),
    reset: () => set({ count: 0 }, "reset"),
  }));
```

```vue
<!-- Counter.vue -->
<template>
  <div>
    <h2>카운트: {{ count }}</h2>
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
    <button @click="reset">초기화</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from "./stores/counter";

const store = useCounter();
const count = store.useSelector((s) => s.count); // 부분 구독
const { increment, decrement, reset } = store;
</script>
```

### 미들웨어 사용

```ts
import { createStore, compose } from "zenon";
import { withLogger, withPersist, withErrorBoundary } from "zenon/plugins";

export const useCounter = () =>
  createStore(
    compose(
      withLogger({ store: "counter", timestamp: true }),
      withPersist("zenon-counter", {
        storage: window.localStorage,
        version: 1,
      }),
      withErrorBoundary({
        onError: (error, actionName) => {
          console.error(`${actionName}에서 에러 발생:`, error);
        },
      })
    )((set, get) => ({
      count: 0,
      increment: () => set({ count: get().count + 1 }, "increment"),
      reset: () => set({ count: 0 }, "reset"),
    }))
  );
```

## 🧩 미들웨어 플러그인

Zenon은 함께 조합할 수 있는 3가지 강력한 미들웨어 플러그인을 제공합니다:

### withLogger

모든 상태 변경을 타임스탬프와 함께 콘솔에 로깅합니다.

```ts
import { withLogger } from "zenon/plugins";

withLogger({
  store: "counter", // 로깅용 스토어 이름
  timestamp: true, // 타임스탬프 포함 (기본값: false)
  expanded: false, // 로그 자동 확장 (기본값: false)
});
```

### withPersist

스토어 상태를 localStorage 또는 sessionStorage에 영속화합니다.

```ts
import { withPersist } from "zenon/plugins";

withPersist("zenon-counter", {
  storage: window.localStorage, // 기본값: localStorage
  version: 1, // 마이그레이션 제어를 위한 버전
  partialKeys: ["count"], // 특정 키만 영속화
  serialize: JSON.stringify, // 커스텀 직렬화
  deserialize: JSON.parse, // 커스텀 역직렬화
  onError: (error) => console.error(error), // 에러 핸들러
  merge: (persisted, current) => ({ ...current, ...persisted }), // 병합 전략
});
```

### withErrorBoundary

스토어 액션의 에러를 캐치하고 처리합니다.

```ts
import { withErrorBoundary } from "zenon/plugins";

withErrorBoundary({
  onError: (error, actionName) => {
    // 에러 처리 (예: 에러 추적 서비스로 전송)
    console.error(`${actionName}에서 에러:`, error);
  },
  preventRollback: false, // 에러 발생 시 상태 롤백 방지 (기본값: false)
  rethrow: false, // 처리 후 에러 재발생 (기본값: false)
});
```

### 여러 플러그인 조합하기

```ts
import { createStore, compose } from "zenon";
import { withLogger, withPersist, withErrorBoundary } from "zenon/plugins";

// Compose 스타일 (권장)
export const useStore = () =>
  createStore(
    compose(
      withLogger({ store: "app" }),
      withPersist("app-state"),
      withErrorBoundary({ onError: console.error })
    )((set, get) => ({
      // 스토어 구현
    }))
  );

// 또는 체인 스타일
export const useStore = () =>
  createStore(
    withLogger({ store: "app" })(
      withPersist("app-state")(
        withErrorBoundary({ onError: console.error })((set, get) => ({
          // 스토어 구현
        }))
      )
    )
  );
```

## 📚 API 레퍼런스

### createStore

반응형 상태 관리가 가능한 새 스토어를 생성합니다.

```ts
function createStore<T>(
  initializer: (set: SetFunction<T>, get: GetFunction<T>) => T
): StoreApi<T>;
```

**반환값:** 다음 메서드를 가진 `StoreApi<T>`:

- `useSelector<U>(selector: (state: T) => U): ComputedRef<U>` - 부분 상태 구독
- `subscribe(listener: Listener<T>): () => void` - 모든 상태 변경 구독
- `setSilent(patch: Partial<T>)` - 구독자 알림 없이 상태 업데이트
- `getState(): T` - 현재 상태 스냅샷 가져오기
- 초기화 함수에서 정의한 모든 스토어 액션

### useSelector

스토어 상태의 특정 부분만 구독합니다. 선택된 값이 변경될 때만 재렌더링을 트리거합니다.

```ts
const store = useCounter();
const count = store.useSelector((s) => s.count); // count만 구독
const double = store.useSelector((s) => s.count * 2); // 파생 값도 가능
```

### subscribe

콜백 함수로 모든 상태 변경을 구독합니다.

```ts
const unsubscribe = store.subscribe((state, prevState) => {
  console.log("상태 변경됨:", { state, prevState });
});

// 정리
unsubscribe();
```

### setSilent

구독자에게 알리지 않고 상태를 업데이트합니다. 배치 업데이트나 내부 상태 변경에 유용합니다.

```ts
store.setSilent({ count: 10 }); // 리스너 트리거 없이 상태 업데이트
```

## 🔷 TypeScript 지원

Zenon은 TypeScript로 작성되었으며 완전한 타입 안정성을 기본 제공합니다.

```ts
import { createStore, StoreApi, SetFunction, GetFunction } from "zenon";

// 스토어 타입 정의
type CounterState = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

export const useCounter = (): StoreApi<CounterState> =>
  createStore<CounterState>((set, get) => ({
    count: 0,
    increment: () => set({ count: get().count + 1 }, "increment"),
    decrement: () => set({ count: get().count - 1 }, "decrement"),
  }));
```

**내보낸 타입들:**

- `StoreApi<T>` - 스토어 인스턴스 타입
- `SetFunction<T>` - 상태 설정 함수 타입
- `GetFunction<T>` - 상태 가져오기 함수 타입
- `Listener<T>` - 구독 콜백 타입
- `StoreMiddleware<T>` - 미들웨어 함수 타입

## 🧪 테스팅

Zenon은 모든 기능을 커버하는 30개 이상의 테스트 케이스로 철저하게 테스트되었습니다:

- ✅ 핵심 스토어 기능 (반응성, 구독, 선택자)
- ✅ 모든 미들웨어 플러그인 (logger, persist, error boundary)
- ✅ 에러 핸들링과 엣지 케이스
- ✅ TypeScript 타입 안전성

테스트 실행:

```bash
pnpm test
```

## 🤝 기여하기

기여는 언제나 환영합니다! 이슈를 열거나 풀 리퀘스트를 제출해 주세요.

## 💳 라이선스

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ljlm0402">AGUMON</a> 🦖
</p>
