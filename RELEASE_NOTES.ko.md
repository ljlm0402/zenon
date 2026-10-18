# 2.0.0-rc.1 변경 안내 — 안정화 및 데이터 복구

이 문서는 미게시 릴리스 후보의 안내다. package.json과 npm lockfile 버전은 2.0.0-rc.1로 준비했으며, Git 태그 생성과 npm 게시는 아직 수행하지 않았다. 게시 시 후보 채널은 next다.

## 변경 내용

- 실제 빌드 결과와 일치하는 ESM/CJS 진입점 및 타입 선언을 제공한다.
- 모든 기본 미들웨어가 초기화 함수의 세 번째 api 인자를 전달한다.
- `setSilent`, 얕은 스냅샷 `getState`, 반환 인스턴스 타입 `Store<T>`를 공개한다.
- 저장 데이터로 액션·프로토타입 관련 필드·미선언 키를 덮어쓰지 않는다.
- 동기·비동기 액션 실패를 처리하고, 오류를 삼키는 액션의 반환 타입에 undefined를 반영한다.
- `withPersist`의 버전 변환, 백업, 상태 조회와 명시적 재시도를 제공한다.
- 클린 설치·실제 배포 패키지·SSR 격리·실패 복구 회귀 검증을 자동화한다.

## 호환성 및 이전 방법

### 저장 실패 정책

복원 실패 시 원본을 보존하고 해당 인스턴스의 자동 쓰기를 차단한다. 기존처럼 손상된 데이터나 맞지 않는 버전을 초기값으로 대체하려는 경우에만 `onHydrationError: "overwrite"`를 사용한다. 이 옵션도 백업 충돌, 동시 변경 감지, 마이그레이션 결과 저장 실패를 무시하지 않는다.

마이그레이션에는 `migrate`를 제공한다. 현재보다 높은 버전은 변환하지 않으며 음수·소수·문자열 버전도 거부한다. 버전이 없을 때는 fromVersion이 undefined다. 사용자 migrate 함수는 지원하는 버전만 명시적으로 처리하고 나머지는 예외로 거부해야 한다.

자동 복원은 초기 스키마의 데이터 키만 허용한다. 이전 데이터의 필드 이름이 바뀌었다면 migrate에서 새 필드로 옮긴다. partialKeys 필터는 변환 이후 적용되므로 migrate는 이전 필드를 읽을 수 있다. validate는 필터링한 데이터에 적용되며, custom merge는 그 이후 실행된다. callback은 입력을 직접 변경하지 않는 동기 순수 함수로 작성한다.

마이그레이션은 백업과 새 버전 저장이 성공한 다음 메모리에 반영된다. 복원 중 저장 실패도 원본이 있으면 자동 쓰기를 차단한다. 빈 저장소의 초기 저장 실패나 평상시 쓰기 실패는 메모리 상태를 유지하며 retryPersist로 재시도할 수 있다.

### 백업 수명과 충돌

기본 백업 키는 `<저장 키>:zenon:backup`이다. 원본 문자열을 그대로 보관하며 자동 삭제하거나 다른 내용으로 덮어쓰지 않는다. 동일 원본의 재시도는 기존 백업을 재사용한다. 다른 백업이 있으면 중단한다. 다음 스키마 업그레이드 전에는 백업을 별도로 보관한 뒤 제거하거나 `backupKey`를 새 키로 지정한다. 용량 부족 시 백업을 생략하고 진행하지 않는다.

Web Storage의 단일 setItem 실패가 기존 값을 보존한다는 계약을 전제로 한다. custom Storage 역시 이 계약을 지켜야 한다. 백업과 본문은 서로 다른 쓰기이므로 원자적 다중 키 트랜잭션은 아니다. 변환 콜백 실행 중 본문 변경을 감지하지만 다른 탭과의 완전한 동시성 제어를 보장하지 않는다.

### 오류 처리 반환 타입

`rethrow: false` 또는 동적 boolean 옵션에서는 `HandledState<T>`로 액션 반환 타입에 undefined가 포함된다. 반환값을 사용하기 전에 undefined를 처리한다. 반환값이 있는 액션에 `compose<T>`를 사용 중이라면 타입 변경 경계인 withErrorBoundary를 외부에 배치할 수 있다.

```ts
const initializer = compose<State>(withPersist<State>("app"))(createState);
const store = createStore(withErrorBoundary<State>({
  rethrow: false,
  onError: console.error,
})(initializer));
```

액션 내부에서 직접 catch한 오류는 전파되지 않으므로 action 경계에서 보고하지 않는다. 중첩된 공개 액션이나 여러 오류 경계의 보고는 각각 유지된다. 액션 전체 롤백은 제공하지 않는다.

### 공개 타입과 예약 이름

반환값에는 `Store<T>`를 사용한다. `StoreApi<T>`는 내부 계약이다. `useSelector`, `subscribe`, `setSilent`, `getState`를 상태나 액션 이름으로 사용하지 않는다. `compose`는 미들웨어 전용 타입이며 임의 함수 합성 용도로 사용하던 코드는 별도 함수 합성으로 분리한다.

## 복구 API 사용 예

```ts
import { createStore } from "zenon";
import { withPersist, type PersistController } from "zenon/plugins";

type State = { count: number; increment: () => void };
let persistence: PersistController | undefined;
const store = createStore(withPersist<State>("counter", {
  version: 2,
  backupKey: "counter:backup:before-v2",
  migrate: (previous, fromVersion) => {
    if (fromVersion !== 1) throw new Error("지원하지 않는 저장 버전");
    return { count: Number(previous.oldCount) };
  },
  validate: value => typeof value.count === "number" && Number.isFinite(value.count),
  onReady: controller => { persistence = controller; },
})((set, get) => ({
  count: 0,
  increment: () => set({ count: get().count + 1 }, "increment"),
})));

persistence?.getStatus(); // status, writesBlocked, error, backupKey
// 원본 또는 백업 충돌을 수정한 뒤 명시적으로 다시 읽기:
persistence?.rehydrate();
// 평상시 저장 실패 후 현재 메모리 값을 다시 저장:
persistence?.retryPersist();
```

getStatus는 반응형 ref가 아닌 새 스냅샷이다. onReady는 인스턴스마다 호출하며 그 콜백 안의 복구 호출은 false를 반환한다. rehydrate는 현재 메모리 값의 해당 필드를 덮어쓰므로 아직 저장하지 않은 변경이 있을 때 주의한다. Vue 반응성은 갱신하지만 subscribe 알림은 보내지 않는다. retryPersist는 복원 차단 상태를 우회하지 않는다. 두 메서드는 성공 여부를 boolean으로 반환한다.

백업으로 되돌리려면 앱에서 백업 내용을 확인하고 본문 키를 원본 백업으로 복구한 다음 rehydrate를 호출한다. 자동 백업 삭제·자동 폐기 API는 제공하지 않는다.

## 출시 판단

기본 데이터 보존 정책, 반환 타입 및 compose 계약에 호환성 변화가 있으므로 현재 1.x 사용자에게 무조건 호환되는 패치로 게시하지 않는다. 다음 메이저 릴리스 후보로 검토하고, 원격 CI와 리뷰가 끝난 뒤 별도로 버전과 게시를 결정한다.

## SSR context 후속 추가

`createStoreContext(factory, name)`은 타입이 유지되는 `provideStore`, `useStore`, `provideTo`를 제공한다. 같은 context 정의를 공유해도 provider마다 새 인스턴스를 생성하며, 중첩 provider와 앱 단위 등록을 지원한다. 같은 앱·컴포넌트에 중복 등록하거나 provider가 없으면 오류가 발생한다. factory는 새로운 스토어를 동기적으로 만들어야 하며, SSR에서는 앱도 요청별로 새로 생성한다. 예제 Counter는 독립 스토어 생성 함수 대신 root provider와 소비자 composable을 연결했다.

publish workflow는 prerelease를 next로 분리하고 Git 태그/패키지 버전 불일치를 차단한다. 목표 일정은 RELEASE_PLAN.ko.md에 기록했으며 실제 게시·버전 변경은 아직 하지 않았다.
