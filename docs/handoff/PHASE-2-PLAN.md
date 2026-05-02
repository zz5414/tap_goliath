# Phase 2 작업 계획 — 가중치 회피 + 경험치/레벨업 + 난이도 곡선

> 상위 명세 §8 Phase 2 + §2.2 + §2.5 + §9.1 참조. 이 문서는 그것을 *코드 작업 단위*로 분해한 것.

## 목표 (이 단계가 끝나면 검증해야 할 것)

1. **버튼이 의미를 갖는다.** 균등 랜덤 → 가중치 회피로 바뀌면, 플레이어가 "지금 누르면 적 쪽으로 갈 위험이 있다"를 직관적으로 느껴야 한다.
2. **보상 루프가 돈다.** 적 처치 → XP 구슬 → 자석 흡수 → 레벨업 → 카드 선택 → 강해진 느낌 → 다시 처치. 1런(10–15분 목표) 안에 최소 4–6회 레벨업이 자연스럽게 일어나야 함.
3. **난이도가 시간에 따라 차오른다.** 첫 1분과 5분이 *체감상 다른* 게임이어야 한다.

## 작업 항목

### A. DirectionPicker 가중치 버전 (§2.2, §9.1)

**파일**: `src/systems/DirectionPicker.ts` (현재 균등 랜덤만 있음. 시그니처 변경 + 본문 교체)

- 시그니처를 `(currentHeading, playerPos, enemies) => number`로 확장.
- 각 후보 각도에 대해 `ENEMY_AVOID_RADIUS` 내 적의 페널티 합산:
  - `penalty += (ENEMY_AVOID_WEIGHT / max(distance, 1)) * max(0, dot(candidateDir, enemyDir))`
- 가중치 = `max(0.01, 1.0 - penalty * 0.001)`
- 누적분포 추첨 (`Math.random() * total`). **결정론적 max-pick 금지** — 그러면 패턴이 읽힌다.
- 현재 진행 방향 ±`EXCLUDE_CURRENT_DIR_TOLERANCE` 후보는 계속 제외.

**호출부 수정**: `src/game/Game.ts`의 `pickDirection(s.player.heading)` → `pickDirection(s.player.heading, s.player.pos, s.enemies)`.

**검증**: 적이 우측에 모여 있을 때 버튼을 여러 번 눌러보면 좌측 방향이 더 자주 선택되는지 콘솔 로그로 확인. 또는 디버그 모드에서 후보 각도와 가중치를 시각화 (옵션).

### B. XP 구슬 + 자석 + XP 시스템 (§2.5)

**신규 파일**:
- `src/entities/XpOrb.ts` — `{ pos: Vec2; value: number }`. `update(orb, playerPos, dt)`에서 `XP_ORB_PICKUP_RADIUS` 안에 들어오면 `XP_ORB_SPEED`로 본체 쪽으로 끌린다.
- `src/systems/XpSystem.ts` — 구슬 생성, 흡수 판정, 레벨업 임계치 계산.

**Game 상태 추가**: `xpOrbs: XpOrb[]`, `level: number`, `xp: number`, `xpToNextLevel: number`.

**적 사망 훅**: 현재 `Game.handleCollisions()`에서 `s.kills += 1` 직후 `s.xpOrbs.push({ pos: e.pos, value: BALANCE.XP_PER_KILL })`.

**레벨업 임계치**: `xpToNextLevel = floor(BALANCE.XP_LEVELUP_BASE * BALANCE.XP_LEVELUP_GROWTH ** (level - 1))`.

**렌더**: `Renderer.drawXpOrbs()`가 비어 있음. 시안색 마름모(또는 작은 원, 반지름 `XP_ORB_RADIUS`).

**HUD**: 화면 상단 가로 XP 바, 레벨 텍스트.

### C. 레벨업 메뉴 (§2.5)

**신규 파일**: `src/ui/LevelUpMenu.ts`.

- XP 임계치 도달 → `game.state.paused = true`, 카드 3장 무작위 추첨해서 표시.
- DOM 오버레이로 그려도 되고 캔버스에 직접 그려도 된다. **DOM이 카드 텍스트 처리에 더 쉽고, 모바일 탭 라우팅도 자연스럽다** (탭이 Input의 button-press와 충돌하지 않게 stopPropagation 처리).
- 카드 풀 (Phase 2 플레이스홀더):
  1. 포탑 회전속도 +20%
  2. 발사 주기 −15%
  3. 총알 속도 +25%
  4. 본체 이동속도 +10%
  5. HP 회복 +30 (max 초과 금지)
- 카드 선택 → 효과 적용 → `paused = false`.

**주의**: 일시정지 동안 `Input`의 button-press는 메뉴 클릭에만 반응해야 함. `Game.pressButton()` 내부의 `if (paused) return` 가드는 이미 있으니 OK. 다만 메뉴 카드의 `pointerdown`이 캔버스로 버블링되면 게임에 빈 클릭이 들어가므로 `e.stopPropagation()` 또는 카드 DOM 위에 `pointer-events: auto` 컨테이너 두기.

### D. 난이도 곡선 (§2.5)

**파일**: `src/systems/SpawnSystem.ts`.

현재는 `BALANCE.ENEMY_SPAWN_INTERVAL` 고정. 시간에 따라:

- 스폰 주기를 점진 단축 (예: `interval = max(1.5, 5.0 - time / 60)`)
- 또는 웨이브당 마릿수 증가 곡선을 더 가파르게

수치는 `balance.ts`에 새 상수로 노출 (예: `ENEMY_SPAWN_INTERVAL_MIN`, `ENEMY_SPAWN_INTERVAL_DECAY`). 매직 넘버 금지.

선택사항: 일정 시간 후 더 빠르거나 더 단단한 chaser 변종(파생). 다만 새 적 *타입*은 Phase 3 영역이니 PoC 단계에선 chaser 한 종 유지가 원칙.

## 작업 순서 권장

각 단계 끝에 빌드(`bun run build`)와 짧은 플레이 확인.

1. **A (DirectionPicker 가중치)** — 가장 코드 적고, "버튼이 의미를 갖는가"를 즉시 검증할 수 있는 핵심.
2. **B (XP 구슬 + 자석)** — 레벨업 메뉴 없이도 XP 바가 차오르는 것까지.
3. **C (레벨업 메뉴)** — 보상 루프 폐쇄.
4. **D (난이도 곡선)** — 마지막. 위 3개가 돌아가야 곡선이 의미를 가진다.

## 받아들이지 말 유혹 (§11 anti-goals 재확인)

- 멀티 입력(홀드, 더블탭) 도입 금지. 1버튼 원칙.
- 파티클/사운드/이미지 에셋 추가 금지. 도형으로.
- 레이더는 **Phase 3** 영역. Phase 2에서 손대지 않는다.
- 새 적 타입(shooter, tank 등)은 Phase 3 이후.
- React/Pixi 등 프레임워크 도입 금지.

## 완료 기준 (Phase 2 → 3 넘어가기 전 체크)

- [ ] 적이 우측에 군집해 있을 때 버튼이 좌측 방향을 *유의미하게 더 자주* 고른다.
- [ ] 적 처치 시 시안색 구슬이 떨어지고, 본체 근처에 가면 끌려와 흡수된다.
- [ ] HUD 상단의 XP 바가 차고, 차면 게임이 멈추고 카드 3장이 뜬다.
- [ ] 카드 선택 후 효과가 즉시 반영된다(예: 회전속도 카드를 고르면 포탑이 더 빨라진다).
- [ ] 5분 시점이 1분 시점보다 *명확히* 더 정신없다.
- [ ] 의존성 0개 유지, `bun run build` 클린.

## 시작하기 전 빠른 점검

```bash
cd goliath-drift && bun install && bun run build && bun run dev
```

빌드가 깨끗하게 나면 시작. 만약 어딘가 깨졌다면 그것부터 복구하고 Phase 2에 들어갈 것.
