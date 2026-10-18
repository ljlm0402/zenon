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
- 🛡️ **TypeScript 지원** - 명시적 상태 타입과 미들웨어 타입 지원
- 📦 **제로 의존성** - Vue 3 외 추가 의존성 없음
- 🧩 **간단한 API** - Zustand에서 영감을 받은 직관적인 API
- 🧪 **검증 자동화** - 단위·회귀 테스트와 실제 배포 패키지 검사
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
  rethrow: false, // 처리 후 에러 재발생 (기본값: true)
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
): Store<T>;
```

**반환값:** 다음 메서드를 가진 `Store<T>`:

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
import { createStore, type Store, type SetFunction, type GetFunction } from "zenon";

// 스토어 타입 정의
type CounterState = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

export const useCounter = (): Store<CounterState> =>
  createStore<CounterState>((set, get) => ({
    count: 0,
    increment: () => set({ count: get().count + 1 }, "increment"),
    decrement: () => set({ count: get().count - 1 }, "decrement"),
  }));
```

**내보낸 타입들:**

- `Store<T>` - 스토어 인스턴스 타입
- `SetFunction<T>` - 상태 설정 함수 타입
- `GetFunction<T>` - 상태 가져오기 함수 타입
- `Listener<T>` - 구독 콜백 타입
- `StoreMiddleware<T>` - 미들웨어 함수 타입

## 🧪 테스팅

테스트는 핵심 동작과 주요 실패 시나리오를 검증합니다:

- ✅ 핵심 스토어 기능 (반응성, 구독, 선택자)
- ✅ 모든 미들웨어 플러그인 (logger, persist, error boundary)
- ✅ 에러 핸들링과 엣지 케이스
- ✅ TypeScript 타입 안전성

테스트 실행:

```bash
npm run check # types, tests, build, packed consumer checks
```

## 🤝 기여하기

기여는 언제나 환영합니다! 이슈를 열거나 풀 리퀘스트를 제출해 주세요.

## 💳 라이선스

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ljlm0402">AGUMON</a> 🦖
</p>

## 동작 범위와 주의사항

- 위 `useCounter = () => createStore(...)` 예제는 호출마다 독립 인스턴스를 만듭니다. SPA에서 공유하려면 모듈에 `const store = createStore(...)`를 한 번 만들고 `useCounter = () => store`로 반환하세요. SSR은 요청별 인스턴스를 생성해야 합니다.
- `createStore<State>`와 `compose<State>`, 각 플러그인의 `<State>`를 명시하면 상태 타입을 일관되게 검증할 수 있습니다. 순환하는 초기화 콜백의 타입 추론만으로 모든 잘못된 패치를 검출한다고 보장하지 않습니다.
- `getState()`와 구독 콜백의 `prevState`는 얕은 스냅샷입니다. 중첩 객체는 공유되므로 변경 시 새 객체로 교체하세요.
- `setSilent`는 Vue 반응성을 유지하지만 `subscribe` 알림과 logger/persist/error-boundary의 `set` 래퍼를 통과하지 않습니다. 직접 상태를 변경해도 구독 알림·자동 저장이 실행되지 않습니다.
- `withPersist`는 선언된 데이터 필드만 복원하고 액션·알 수 없는 키·프로토타입 관련 키는 무시합니다. `partialKeys: []`는 아무 데이터도 복원하거나 저장하지 않습니다.
- `merge: "replace"`와 `"merge"`는 호환성을 위해 모두 최상위 키를 얕게 덮어씁니다. 중첩 병합은 콜백으로 지정하세요. `migrate`가 없으면 버전 불일치에 초기값을 사용합니다. `migrate`를 지정하면 이전 버전 데이터를 검증·백업 후 변환합니다. 복원 실패 시 기본 정책은 원본 보존이며 해당 인스턴스의 모든 저장을 중단합니다. 기존처럼 초기값으로 덮어쓰려면 `onHydrationError: "overwrite"`를 명시하세요. `onReady`로 받은 컨트롤러의 `rehydrate()`로 원본 복구 후 다시 읽을 수 있습니다.
- `withErrorBoundary`는 동기 예외와 Promise 거부를 처리합니다. `rethrow` 기본값은 `true`입니다. `false`이면 실패한 액션의 결과는 `undefined`일 수 있습니다. `rethrow: false` 또는 동적 boolean 옵션은 반환 타입에 `undefined`를 포함합니다. `HandledState<T>`가 이 반환 상태를 표현합니다. 기존 `compose<T>`에서 값을 반환하는 액션과 조합할 때 타입 수정이 필요할 수 있습니다.
- `preventRollback`은 래핑된 `set` 실패에 대한 얕은 복원만 제어합니다. 액션 전체의 트랜잭션, 이미 전달한 알림·저장 내용 복원, 비동기 동시 실행 롤백을 보장하지 않습니다. 코어의 패치 실패 복원은 별도입니다.
- 공개 메서드 이름 `useSelector`, `subscribe`, `setSilent`, `getState`는 상태·액션 이름으로 사용하지 마세요.

전체 분석과 개선 우선순위는 [검토 보고서](./PROJECT_REVIEW.ko.md)를 참고하세요.

### 복원 데이터 검증

`validate`는 허용된 필드만 남긴 복원 데이터에 적용합니다. 저장 레코드가 없으면 호출하지 않습니다. `false` 반환 또는 예외 발생 시 초기값을 사용하고 원본 저장 데이터를 보존합니다. 검증·병합 콜백은 입력을 변경하지 않는 순수 함수로 작성하세요.

```ts
withPersist<CounterState>("counter", {
  version: 1,
  validate: (data) => typeof data.count === "number" && Number.isFinite(data.count),
  onHydrationError: "preserve", // 기본값: 복구 실패 후 저장 차단
});
```

오류 경계의 전파되는 set/get 실패는 액션 경계에서 보고하여 중복 콜백을 줄입니다. 액션 내부에서 직접 잡아 처리한 예외는 전파되지 않으므로 보고하지 않습니다. `rethrow: false`로 set/get에서 처리한 예외는 그 지점에서 보고합니다. 오류 콜백 자체의 실패는 콘솔로 기록하고 원래 예외를 유지합니다. 중첩된 공개 액션이나 여러 오류 경계를 거친 실패는 각 액션·경계에서 보고될 수 있습니다.

SSR에서는 요청마다 `createStore`를 호출하고 그 인스턴스를 해당 앱의 `provide`/`inject`로 공유하세요. 서버 모듈 전역에 사용자 상태를 만들지 마세요. 동시 SSR 렌더링 격리는 `src/__tests__/ssr.spec.ts`로 검증합니다. 클라이언트 hydration 직렬화·주입 기능은 아직 제공하지 않습니다.

### 마이그레이션과 복구

`withPersist`는 `migrate`, `backupKey`, `onReady`를 지원합니다. `onReady`는 인스턴스별 `PersistController`를 전달하며, `getStatus()`로 저장 상태를 확인하고 `rehydrate()`로 복원을 재시도하거나 `retryPersist()`로 현재 상태의 저장을 재시도할 수 있습니다.

이전 버전 변환은 검증과 원본 백업, 새 버전 저장이 모두 성공해야 메모리에 반영됩니다. 기본 백업 키 `<key>:zenon:backup`은 자동 덮어쓰기·삭제되지 않습니다. 다른 내용이 있으면 먼저 별도 보관하거나 `backupKey`를 변경하세요. `rehydrate`는 메모리 값을 덮어쓸 수 있으며 수동 구독 알림은 보내지 않습니다.

구체적인 사용 예, 이전 방법, 데이터 보존 범위는 [미출시 변경 안내](./RELEASE_NOTES.ko.md)를 참고하세요.
