# Goliath Drift — 진행 상태 핸드오프

> 새 세션에서 시작할 때 이 문서를 먼저 읽으세요. 상위 명세는 [`../goliath-survivor-spec.md`](../goliath-survivor-spec.md).

## 한 줄 요약

Phase 0 + Phase 1 PoC가 빌드/플레이 가능한 상태로 메인에 커밋되어 있습니다. 1회 플레이테스트(약 1분 30초) 결과에 따라 본체/포탑 속도를 한 차례 튜닝했습니다. 다음 작업은 **Phase 2 (가중치 회피 + 경험치/레벨업 + 난이도 곡선)** 입니다.

## 프로젝트 위치

| 항목 | 경로 |
|---|---|
| 명세 (상위 진실) | `docs/goliath-survivor-spec.md` |
| 실제 코드 | `goliath-drift/` |
| 튜닝 상수 (모든 수치) | `goliath-drift/src/config/balance.ts` |
| 핸드오프 문서 | `docs/handoff/` |

## 환경

- **런타임/패키지 매니저: bun** (npm 아님). WSL2에 1.3.13 이상 설치되어 있음.
- **Node 의존성: `vite`, `typescript`만.** 런타임 의존성 0.
- **TS strict + `erasableSyntaxOnly` 활성.** 따라서 `constructor(private x)` 같은 파라미터 프로퍼티 문법은 **금지**. 명시적 필드 선언으로 작성해야 빌드가 통과한다.

## 실행 방법

```bash
cd goliath-drift
bun install        # 최초 1회
bun run dev        # http://localhost:8414
bun run build      # tsc + vite build → dist/
bun run preview    # 빌드 결과를 8414로 프리뷰
```

`vite.config.ts`에 `host: true`, `port: 8414`, `strictPort: true`가 박혀 있다. WSL2에서 Windows 브라우저로 `http://localhost:8414`로 접근 가능. 외부 기기에서는 콘솔에 출력되는 `Network: http://172.x.x.x:8414` 주소 사용.

## Phase 0 + Phase 1 — 완료 상태

§12 체크리스트 17개 모두 완료. 폴더/모듈 매핑:

| 모듈 | 파일 | 비고 |
|---|---|---|
| 튜닝 상수 | `src/config/balance.ts` | 모든 수치는 여기서만 수정한다. 코드에 매직 넘버 두지 않기. |
| 수학 헬퍼 | `src/util/math.ts` | `Vec2`, `add/sub/scale`, `wrapAngle`, `toRad/toDeg`, `angularDistance`, `lerp`, `clamp` |
| 카메라 | `src/game/Camera.ts` | dt 보정된 lerp follow, world↔screen 변환 |
| 입력 | `src/game/Input.ts` | `pointerdown`(mouse 좌클릭/터치) + `Space` → button-press 콜백 |
| 본체 | `src/entities/Player.ts` | heading 기반 등속, 무적 타이머 |
| 포탑 | `src/entities/Turret.ts` | **위치 없음. 피벗은 항상 `player.pos`.** `rotateTurretToward()` |
| 적 | `src/entities/Enemy.ts` | chaser만. shooter는 Phase 3 |
| 총알 | `src/entities/Bullet.ts` | `owner: 'player' \| 'enemy'` 필드 보유 (Phase 3 대비) |
| 스폰 | `src/systems/SpawnSystem.ts` | 5초 주기 + 매 웨이브 +1, 본체에서 반경 400 |
| 충돌 | `src/systems/CollisionSystem.ts` | `circleCircle`, `circleRect` |
| 방향 선택 | `src/systems/DirectionPicker.ts` | **현재는 균등 랜덤**. 가중치는 Phase 2에서 교체 |
| 타겟팅 | `src/systems/TargetingSystem.ts` | `findNearestEnemy()` — 매 프레임 갱신 |
| 게임 루프 | `src/game/Game.ts` | update 순서: input → spawn → targeting → player → turret → fire → bullets/enemies → collision → cleanup → camera → HP 체크 |
| 렌더 | `src/render/Renderer.ts` | 격자, 조준 점선, 적/총알, 본체+포탑, 본체 위 HP 막대, 무적 시 깜빡임. 타겟 적은 주황 + 흰 외곽 링 |
| HUD | `src/render/HUD.ts` | HP / Time / Kills, 게임오버 오버레이 |
| 엔트리 | `src/main.ts` | DPR 보정 풀스크린 캔버스, RAF 루프, `dt = min(dt, 1/30)`, 게임오버에서 버튼 한 번에 재시작 |

### 게임 시작 시 보이는 것

- 매우 어두운 배경(`#0a0a12`) + 옅은 격자
- 화면 정중앙: 12×12 청록 사각형(본체) + 흰 포신 + 옅은 점선 조준선
- 좌상단 HP, 우상단 Time/Kills
- 5초 후 첫 적 5마리 스폰. 이후 5초마다 +1마리씩.

## 1차 플레이테스트 (1분 30초) — 사용자 피드백 + 적용된 결정

| 관찰 | 결정 |
|---|---|
| "어디로 움직일지 모르는데 적은 점점 많아진다" — 의도된 카오스이지만 회피 수단(레이더/가중치)이 없으면 좌절감만 남는다 | Phase 2의 **가중치 회피 알고리즘**이 절실. §2.2 정식 구현으로 교체 |
| "레벨업을 하지 못해 보상 루프가 없다" | Phase 2의 XP/레벨업 도입으로 해결 |
| "전체 템포가 다소 빠르다" | 본체 -40%, 포탑 회전 -30% 적용 (아래) |

### 적용된 튜닝 변경 (커밋 예정 차분)

`src/config/balance.ts`:

| 상수 | Spec 기본값 | 현재값 | 변화 |
|---|---|---|---|
| `PLAYER_SPEED` | 120 | **72** | −40% |
| `TURRET_ROTATE_SPEED` | 90 | **63** | −30% |

> 참고: 명세 §6의 표 값은 그대로 두고 코드의 실제 값만 변경했다. 추가 튜닝이 필요하면 동일 파일에서 수정. 다른 상수(발사 주기, 총알 속도 등)는 미변경.

## 알려진 환경 이슈 / 함정

- **WSL2 + Windows 마운트 캐시 지연**: `Edit`/`Write` 직후 `Read`/`stat`이 `ENOENT`로 실패하는 경우가 있음. 파일은 실제로 존재하며, `cat`이나 `sed`로 재시도하면 보인다. 잠시 후 자동 회복.
- **`erasableSyntaxOnly`**: 파라미터 프로퍼티(`constructor(private x: ...)`) 사용 시 빌드 실패. 클래스 필드를 명시적으로 선언할 것. (`Renderer.ts`, `HUD.ts`가 그 예시 패턴.)
- **`noUnusedLocals` / `noUnusedParameters`**: 새 모듈 작성 시 미사용 import/매개변수가 컴파일 에러. 헬퍼 함수 stub 만들 때 주의.

## 다음 작업

[`PHASE-2-PLAN.md`](./PHASE-2-PLAN.md)를 참조.
