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
- 🎯 **계산된 선택자** - `useSelector`로 필요한 반응형 값을 계산
- 🛡️ **TypeScript 지원** - 명시적 상태 타입과 미들웨어 타입 지원
- 📦 **제로 의존성** - Vue 3 외 추가 의존성 없음
- 🧩 **간단한 API** - Zustand에서 영감을 받은 직관적인 API
- 🧪 **검증 자동화** - 단위·회귀 테스트와 실제 배포 패키지 검사
- 🎨 **Composition API 우선** - Vue 3의 모던 API 스타일

## 2.0.0 주요 변경 사항

2.0.0은 저장 데이터 복구와 범위별 스토어 공유를 추가하고, 패키지 로딩·미들웨어·오류 처리를 개선한 버전입니다. 아래는 1.2.0 대비 변경 사항입니다.

### 수정 사항

| 영역 | 2.0.0 변경 내용 |
| --- | --- |
| 패키지 로딩 | ESM/CJS 진입점과 TypeScript 선언을 실제 빌드 파일에 맞춰 import/require 실패를 수정했습니다. |
| 미들웨어 | 모든 기본 미들웨어가 초기화 함수의 세 번째 `api` 인자를 전달합니다. |
| 데이터 복원 | 선언된 데이터 필드만 복원하고 액션·미선언 필드·프로토타입 관련 키를 제외합니다. 저장소 접근 오류를 처리하고 `partialKeys: []`의 저장·복원 동작을 통일했습니다. |
| 오류 처리 | 동기 예외와 Promise 거부를 처리하고 액션의 `this`를 유지합니다. set/get 오류의 중복 보고를 줄이고 오류 핸들러 실패가 원래 예외를 가리지 않도록 했습니다. |
| 상태 갱신·알림 | 패치 getter를 적용 전에 평가하고 대입 실패 시 얕은 복원을 보강했습니다. 구독 알림 대상은 알림 시작 시점의 목록으로 고정합니다. |
| 타입·공개 API | `setSilent`, 얕은 `getState`, `Store<T>`를 공개하고 미들웨어 조합과 오류 처리 반환 타입을 보완했습니다. |

### 추가 기능

- **데이터 마이그레이션·검증:** `migrate`로 이전 저장 스키마를 변환하고 `validate`로 복원 값을 검증합니다. 사용자 정의 `merge` 콜백으로 병합 방식을 지정할 수 있습니다.
- **원본 백업·복구:** 마이그레이션 결과 저장 전에 원본을 백업합니다. `onReady`로 받은 `PersistController`의 `getStatus()`로 상태를 확인하고, `rehydrate()`로 다시 읽거나 `retryPersist()`로 저장을 재시도합니다.
- **범위별 스토어 공유:** `createStoreContext`의 `provideStore`, `useStore`, `provideTo`로 컴포넌트 트리와 SSR 요청별 상태를 공유합니다. factory는 새 스토어를 반환해야 하며 SSR 앱도 요청마다 새로 생성해야 합니다.
- **배포 검증:** 실제 패키지 소비자와 버전 일치 검사를 CI에 추가했습니다. 정식 버전은 `latest`, 후보 버전은 `next` 채널로 구분합니다.

### 1.x에서 업그레이드할 때

- 복원 실패 시 기본값은 **원본 보존과 자동 쓰기 차단**입니다. 실패 데이터를 의도적으로 버릴 때만 `onHydrationError: "overwrite"`를 사용하세요. 이 옵션도 백업·마이그레이션 결과 저장 실패를 무시하지 않습니다.
- `rethrow: false` 또는 동적 boolean 옵션의 액션 반환 타입에는 `undefined`가 포함됩니다. 결과 사용 전에 해당 경우를 처리하세요.
- `compose`는 스토어 미들웨어 전용 타입입니다. 복원할 필드는 초기 상태에 선언하고, `useSelector`, `subscribe`, `setSilent`, `getState`는 상태·액션 이름으로 사용하지 마세요.
- `getState()`는 얕은 스냅샷입니다. `setSilent`는 수동 구독과 자동 저장을 우회합니다. 액션 전체 롤백, 선택자 기반 리스너 구독, 자동 SSR 직렬화·클라이언트 hydration은 포함하지 않습니다.

**릴리스 검증:** 기능·회귀 테스트 110개와 릴리스 정책 테스트 4개, 소스·예제 타입 검사와 빌드, 원격 CI를 통과했습니다. Vue 3.2.0·3.5.17 / Node 22.16.0에서 실제 패키지의 ESM/CJS·SSR·NodeNext 타입을 검증했습니다. 모든 버전 조합이나 소비 앱의 동작까지 보장하는 결과는 아닙니다.

복구 정책과 이전 예제는 [2.0.0 변경 및 이전 안내](./docs/RELEASE_NOTES.ko.md)를 참고하세요.

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
function createStore<T extends Record<string, any>>(
  initializer: StoreInitializer<T>
): Store<T>;
```

`StoreInitializer<T>`는 `(set, get, api)`를 받으며 `api`는 `setSilent`와 `subscribe`를 제공합니다.

**반환값:** 다음 메서드를 가진 `Store<T>`:

- `useSelector<U>(selector: (state: T) => U): ComputedRef<U>` - 상태에서 계산된 반응형 값 생성
- `subscribe(listener: Listener<T>): () => void` - `set`을 통한 상태 갱신 구독
- `setSilent(patch: Partial<T>)` - 구독자 알림 없이 상태 업데이트
- `getState(): T` - 현재 상태 스냅샷 가져오기
- 초기화 함수에서 정의한 모든 스토어 액션

### useSelector

스토어 상태에서 계산한 Vue computed ref를 반환합니다. 콜백 기반 `subscribe` API와는 별개입니다.

```ts
const store = useCounter();
const count = store.useSelector((s) => s.count); // count만 구독
const double = store.useSelector((s) => s.count * 2); // 파생 값도 가능
```

### subscribe

`set`을 통한 갱신을 콜백으로 받습니다. 직접 상태 변경과 `setSilent`는 이 리스너에 알리지 않습니다.

```ts
const unsubscribe = store.subscribe((state, prevState) => {
  console.log("상태 변경됨:", { state, prevState });
});

// 정리
unsubscribe();
```

### setSilent

Vue 반응형 상태를 갱신하지만 수동 구독과 저장을 포함한 미들웨어 set 래퍼를 우회합니다. 배치 처리나 트랜잭션 기능은 아닙니다.

```ts
store.setSilent({ count: 10 }); // 리스너 트리거 없이 상태 업데이트
```

## 🔷 TypeScript 지원

Zenon은 상태·액션·미들웨어 타입을 제공합니다. 초기화 함수를 조합할 때는 명시적 상태 타입 인자로 타입 검사를 유지하세요.

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

전체 분석과 개선 우선순위는 [검토 보고서](./docs/PROJECT_REVIEW.ko.md)를 참고하세요.

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

구체적인 사용 예, 이전 방법, 데이터 보존 범위는 [2.0.0 변경 및 이전 안내](./docs/RELEASE_NOTES.ko.md)를 참고하세요.

### SSR·컴포넌트 범위의 상태 공유

```ts
// counterContext.ts — 정의만 공유하고 실제 상태는 provider마다 생성합니다.
import { createStore, createStoreContext } from "zenon";

type Counter = { count: number; increment: () => void };
export const counterContext = createStoreContext((initialCount: number) =>
  createStore<Counter>((set, get) => ({
    count: initialCount,
    increment: () => set({ count: get().count + 1 }, "increment"),
  })), "Counter"
);
```

- SSR 앱 생성 함수: 요청마다 새 `createSSRApp`을 만들고 `counterContext.provideTo(app, initialCount)`로 등록합니다. 반환값으로 해당 요청의 스토어를 받습니다.
- 부모 컴포넌트의 동기 setup: `const store = counterContext.provideStore(0)`로 하위 컴포넌트용 스토어를 생성합니다.
- 하위 컴포넌트의 동기 setup: `const store = counterContext.useStore()`로 가장 가까운 provider를 사용합니다.

factory 인자와 반환 타입은 그대로 추론됩니다. factory는 매번 새로운 스토어를 동기적으로 반환해야 합니다. 이미 만든 singleton을 반환하면 요청 격리를 보장할 수 없습니다. 같은 앱/컴포넌트에 같은 context를 두 번 등록하거나 provider 없이 사용하면 오류가 발생합니다. 서로 다른 context는 이름이 같아도 독립적입니다.

컴포넌트 helper는 setup에서 await 전에 호출하세요. 자기 컴포넌트가 제공한 값은 provideStore의 반환값으로 사용하고, useStore는 조상 또는 앱의 provider를 읽습니다. 중첩 provider는 하위 트리에서만 기존 provider를 가립니다. SSR 앱 자체도 요청마다 새로 만들어야 합니다. 자동 HTML 직렬화·클라이언트 hydration은 포함하지 않습니다.
