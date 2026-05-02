# 골리앗 키우기 (Goliath Survivor) — 기획 및 구현 명세

> Vampire Survivors 형식의 원버튼 슈팅 게임. Claude Code로 구현하기 위한 작업 명세서.

---

## 1. 게임 개요

### 1줄 컨셉
탑다운 시점의 뱀파이어 서바이벌 클론. **단 하나의 버튼**으로 플레이한다. 버튼을 누르면 본체가 임의의 방향으로 방향을 튼다. 사격은 자동.

### 디자인 철학: "의도된 불편한 조작감"
- 1버튼은 조작이 *너무* 쉽다. 그래서 일부러 불편하게 만든다.
- 플레이어는 "방향을 모르는 채로" 튕겨다니며, 그 안에서 *최선의 타이밍*을 찾는다.
- 가만히 있을수록 조준은 정확해진다 → 적에게 둘러싸이기 전에 누를 수밖에 없는 압력.

### 타겟 플랫폼
- **1차: 모바일 웹** (터치 = 버튼). PWA로 설치 가능하면 보너스.
- **2차: 데스크톱 웹** (마우스 클릭 또는 스페이스바 = 버튼).
- 가로/세로 무관하게 작동해야 함 (반응형 캔버스).

### 세션 길이 목표
1런 = **10–15분**. VS보다 짧게. 인지 부하가 더 크기 때문.

---

## 2. 핵심 메커니즘

### 2.1 본체 이동
- 본체는 항상 **일정한 속도**로 현재 방향벡터를 따라 이동한다.
- 버튼을 누르면 → **방향벡터만** 즉시 변경. 속도는 유지.
- 이동은 *연속적*이다. 텔레포트 아님.
- 맵은 **무한**이다 (월드 좌표 사용, 카메라가 본체를 따라간다).

### 2.2 가중치 랜덤 방향 선택
> "운빨 사망"을 막기 위한 핵심 장치.

버튼을 눌렀을 때 새 방향을 정하는 알고리즘:

1. 8~16개의 후보 각도를 균등하게 샘플링한다 (예: 0°, 22.5°, 45°, ..., 337.5°).
2. 각 후보에 대해 **점수**를 계산한다:
   - 기본 점수: 1.0
   - **가까운 적 페널티**: 반지름 R 내의 모든 적에 대해, 해당 후보 방향이 적 쪽을 향할수록 점수 감소.
     - 페널티 = `Σ (1 / distance) * max(0, dot(candidateDir, enemyDir))`
     - 즉, "가깝고 정면인 적"일수록 더 큰 페널티.
3. 점수에 비례한 가중치로 *확률적*으로 하나를 선택한다 (그냥 최대값 픽 X — 그러면 결정론적이 되어 재미가 사라짐).
4. **현재 진행 방향과 동일한 후보는 제외**한다 (안 누른 거랑 같아지므로).

이 알고리즘은 **레이더가 없을 때의 기본 본능**이다. 레이더는 그 위에 *의식적 회피*를 더하는 시스템.

### 2.3 포탑 회전과 자동 발사
- 포탑은 **본체의 정중앙**에 위치한다. 별도의 위치 좌표를 갖지 않으며, 항상 `player.pos`를 회전 피벗으로 삼는다.
- 포탑은 본체와 **별개의 각도**를 가진다 (본체의 진행 방향과 무관하게 회전).
- 본체가 사각형이라도 포탑은 그 중심에 박혀 있는 것처럼 보여야 함 → 포신은 중심에서 바깥쪽으로 뻗어나간 직사각형으로 그린다.
- 매 프레임, **가장 가까운 적**을 타겟으로 잡는다. 이 적이 *현재 타겟*이며, 별도의 색으로 강조된다 (§2.4).
- 포탑은 타겟 방향으로 **선형 보간(rotate-toward)** — 즉, 한 프레임에 최대 X도까지만 회전 가능.
- 따라서 본체가 자주 방향을 바꾸면 → 포탑이 따라가다가 발사 타이밍을 놓친다.
- 발사는 **고정 주기** (예: 0.6초마다). 발사 시점의 포탑 각도로 총알이 직선 발사된다.
- 총알의 발사 위치는 **본체 중심**이다 (포탑 끝이 아님 — 포탑이 중앙에 있으므로 동일).
- 본체의 *위치*가 변하면 포탑의 절대 위치도 함께 이동하지만, 포탑의 *각도*는 본체 이동의 영향을 받지 않는다.

### 2.4 적
- **PoC**에선 단 하나의 적 타입: 본체로 직선 추적하는 원형 적.
- **5초마다** 적의 화면 바깥 가장자리에서 N마리 스폰.
- 시간이 지날수록 N과 스폰 빈도가 증가 (난이도 곡선).
- 적과 닿으면 → 본체 HP 감소 (1초 무적시간).
- 적 사망 → 경험치 구슬 드롭.
- **현재 포탑이 조준 중인 적은 별도의 색으로 표시된다**. 매 프레임 가장 가까운 적을 다시 계산하므로, 본체 이동 / 적 이동에 따라 강조되는 적은 바뀐다. 이를 통해 플레이어는 "지금 누가 맞을 위험이 있는지"를 즉시 알 수 있다 → 본체를 굳이 안 누르고 버틸지, 회피할지의 판단 근거가 된다.

### 2.5 경험치와 레벨업
- 경험치 구슬은 본체와 가까워지면 **자석처럼 끌려온다** (반지름 D 이내).
- 경험치가 임계치에 도달 → **게임 일시정지** + 업그레이드 선택 카드 3장 제시.
- 레벨업이 누적되면 임계치는 점진적으로 증가.

### 2.6 사망 / 승리
- HP 0 → 게임오버 화면 (생존시간, 처치수, 레벨 표시).
- 명시적 승리 조건 없음 (VS와 동일한 무한 모드). 후일 15분 보스 도입 가능.

---

## 3. 게임 엔티티

각 엔티티는 **기본 도형**으로만 표현한다 (PoC).

| 엔티티 | 모양 | 색 | 비고 |
|---|---|---|---|
| 골리앗 본체 | 사각형 | 청록 (#5fc) | 12×12 px |
| 골리앗 포탑 | 가는 직사각형 | 흰색 | **본체 정중앙을 피벗**으로 회전. 길이 14, 두께 3. 중앙에서 양방향으로 뻗는 게 아니라, 중심점에서 *전방으로만* 14px 뻗는 형태 |
| 적 (기본) | 원 | 빨강 (#f33) | 반지름 7 |
| 적 (조준 중) | 원 | 주황 (#fb3) | 동일 반지름. 외곽 흰 링(1px)을 추가로 그려 강조 |
| 총알 (아군) | 원 | 노랑 (#fe4) | 반지름 3. **본체 중심에서 발사** |
| 총알 (적) | 원 | 마젠타 (#f3f) | 반지름 3, Phase 3 |
| 경험치 구슬 | 마름모/작은 원 | 시안 (#3ff) | 반지름 4 |
| 레이더 회전선 | 직선 | 흰색 알파 0.3 | Phase 2+ |
| 포탑 지향선 (옅음) | 점선 | 흰색 알파 0.15 | 본체 중심에서 포탑 방향으로 길게 뻗는 보조선 |

---

## 4. 비주얼 피드백 (필수 항목)

플레이어가 *봐야 알 수 있는* 정보:

1. **포탑 지향 방향** — 포탑 자체로 표현 (본체 중앙에서 뻗어나가는 직사각형). 추가로 옅은 점선 트레이서로 강화.
2. **현재 조준 중인 적 (가장 핵심)** — 가장 가까운 적이 다른 색(주황) + 외곽 링으로 강조된다. 이 시각 신호가 있어야 플레이어는 "지금 안 누르면 곧 이 적이 죽는다"를 인지하고 *참는 결정*을 할 수 있다. 강조 대상은 매 프레임 재계산되므로 자연스럽게 따라 움직인다.
3. **다음 발사까지 게이지** — 포신 끝에 작은 차징 바 또는 포신 색의 채도 변화.
4. **HP** — 화면 좌상단 숫자 + 본체 위에 작은 막대.
5. **경험치 바** — 화면 상단 가로 바.
6. **레벨, 생존시간, 처치수** — 화면 우상단 텍스트.
7. **레이더 회전선** (Phase 2+) — 본체 중심으로 한 가닥의 직선이 회전. 감지된 적은 잠깐 흰 점으로 표시되었다 사라짐.
8. **무적시간 표시** — 피격 후 본체 깜빡임.

❌ **본체 이동 궤적 흔적은 넣지 않는다** (사용자 지정).

---

## 5. 입력

| 디바이스 | 입력 | 동작 |
|---|---|---|
| 모바일 | 화면 어디든 탭 | 방향 전환 |
| 데스크톱 | 마우스 좌클릭 | 방향 전환 |
| 데스크톱 | 스페이스바 | 방향 전환 |

- 멀티터치/드래그 무시.
- 일시정지 메뉴/UI 클릭은 별도 처리 (탭 이벤트 차단).

---

## 6. 튜닝 파라미터 (한 곳에 모음)

`src/config/balance.ts` 한 파일로 통합. 모든 수치는 여기서만 수정.

```typescript
export const BALANCE = {
  // 본체
  PLAYER_SPEED: 120,              // px/s
  PLAYER_HP_MAX: 100,
  PLAYER_INVULN_DURATION: 1.0,    // s
  PLAYER_RADIUS: 8,               // 충돌용

  // 포탑
  TURRET_ROTATE_SPEED: 90,        // deg/s, 업그레이드 대상
  TURRET_FIRE_INTERVAL: 0.6,      // s, 업그레이드 대상
  BULLET_SPEED: 320,              // px/s, 업그레이드 대상
  BULLET_DAMAGE: 10,              // 업그레이드 대상
  BULLET_LIFETIME: 1.5,           // s

  // 방향 선택 (가중치 랜덤)
  DIRECTION_CANDIDATES: 12,       // 후보 각도 수
  ENEMY_AVOID_RADIUS: 200,        // px
  ENEMY_AVOID_WEIGHT: 800,        // 페널티 강도
  EXCLUDE_CURRENT_DIR_TOLERANCE: 15, // deg, 현재 방향과 ±이만큼 후보 제외

  // 적 (기본형)
  ENEMY_SPEED: 60,                // px/s
  ENEMY_HP: 20,
  ENEMY_DAMAGE: 10,
  ENEMY_RADIUS: 7,
  ENEMY_SPAWN_INTERVAL: 5.0,      // s
  ENEMY_SPAWN_COUNT_INITIAL: 5,
  ENEMY_SPAWN_COUNT_GROWTH: 1,    // 매 스폰마다 +N
  ENEMY_SPAWN_DISTANCE: 400,      // 본체에서 이만큼 떨어진 곳에 스폰

  // 경험치
  XP_ORB_PICKUP_RADIUS: 80,       // 자석 효과 시작 반지름
  XP_ORB_SPEED: 240,              // 자석에 끌릴 때 속도
  XP_PER_KILL: 5,
  XP_LEVELUP_BASE: 20,            // 레벨1→2 필요량
  XP_LEVELUP_GROWTH: 1.4,         // 레벨당 곱

  // 카메라
  CAMERA_LERP: 0.1,               // 0=고정, 1=즉시

  // 색상 (렌더러에서 직접 참조)
  COLOR_BG: '#0a0a12',
  COLOR_PLAYER: '#5fc',
  COLOR_TURRET: '#fff',
  COLOR_ENEMY: '#f33',
  COLOR_ENEMY_TARGETED: '#fb3',   // 조준 중인 적
  COLOR_TARGET_RING: '#fff',      // 조준 적 외곽 링
  COLOR_BULLET_PLAYER: '#fe4',
  COLOR_BULLET_ENEMY: '#f3f',
  COLOR_XP_ORB: '#3ff',
  COLOR_AIM_LINE: 'rgba(255,255,255,0.15)',

  // 포탑 시각
  TURRET_LENGTH: 14,              // px, 본체 중심에서 뻗는 길이
  TURRET_WIDTH: 3,                // px
  TARGET_RING_WIDTH: 1,           // px, 조준 적 외곽 링 두께
};
```

이 한 파일을 잘 수정할 수 있는 것이 *튜닝의 전부*다. 코드 곳곳에 매직 넘버를 두지 않는다.

---

## 7. 기술 스택

### 언어 / 런타임
- **TypeScript** (strict 모드, `"strict": true`).
- **Vite** 빌드 (HMR, 빠른 새로고침).
- **HTML5 Canvas 2D** API. WebGL/PixiJS/Three.js 등 미사용 (PoC엔 과함).

### 의존성
- 런타임 의존성 **0개** 목표. 모두 표준 API로 해결.
- 개발 의존성: `vite`, `typescript`, `@types/node` 정도.

### 폴더 구조
```
goliath-survivor/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                 # 엔트리포인트, 캔버스 초기화, 루프 시작
│   ├── game/
│   │   ├── Game.ts             # 전체 게임 상태 (싱글톤)
│   │   ├── GameLoop.ts         # requestAnimationFrame 루프, dt 계산
│   │   ├── Camera.ts           # 월드 ↔ 스크린 좌표 변환
│   │   └── Input.ts            # 탭/클릭/스페이스 → button-press 이벤트
│   ├── entities/
│   │   ├── Player.ts           # 골리앗 본체
│   │   ├── Turret.ts           # 포탑 (Player 안에 컴포지션)
│   │   ├── Enemy.ts
│   │   ├── Bullet.ts
│   │   └── XpOrb.ts
│   ├── systems/
│   │   ├── DirectionPicker.ts  # 가중치 랜덤 알고리즘
│   │   ├── SpawnSystem.ts      # 적 스폰
│   │   ├── CollisionSystem.ts  # 사각/원 충돌
│   │   └── XpSystem.ts         # 레벨업 처리
│   ├── render/
│   │   ├── Renderer.ts         # draw 호출 진입점
│   │   └── HUD.ts              # 화면 고정 UI
│   ├── ui/
│   │   ├── LevelUpMenu.ts      # 카드 3장 선택
│   │   └── GameOverScreen.ts
│   ├── config/
│   │   └── balance.ts          # 모든 튜닝 수치
│   └── util/
│       ├── math.ts             # vec2 헬퍼, lerp, clamp, angle 변환
│       └── rng.ts              # seedable RNG (디버깅에 유용)
└── README.md
```

### 좌표계
- **월드 좌표**: 무한. 본체는 월드 (px, py)에 위치.
- **스크린 좌표**: Canvas 픽셀. `Camera.worldToScreen(x, y)` 로만 변환.
- 본체는 보통 화면 중앙. 카메라가 lerp로 따라감.

### 시간
- 모든 업데이트는 `dt` (delta time, 초 단위) 인자 받음.
- `requestAnimationFrame` 기반. 큰 dt 스파이크는 `dt = min(dt, 1/30)`로 클램프.

---

## 8. 구현 단계 (이 순서대로)

> 각 단계 끝에서 *플레이 가능한* 빌드가 나오는 것이 원칙.

### Phase 0: 프로젝트 셋업 (30분)
- [ ] `npm create vite@latest goliath-survivor -- --template vanilla-ts`
- [ ] 캔버스를 풀스크린으로 설정 (윈도우 리사이즈 핸들링).
- [ ] 검은 배경에 빨간 사각형 하나 그리기. dt 기반 좌우 이동 확인.

### Phase 1: 코어 루프 (가장 중요)
> "이 게임 재밌는가?"를 판정하는 단계.

- [ ] **Player**: 월드 좌표, 일정 속도로 현재 방향 이동.
- [ ] **Input**: 탭/클릭/스페이스 → "버튼 프레스" 이벤트 발행.
- [ ] **DirectionPicker (단순 버전)**: 일단 균등 랜덤. 가중치 X. 적 회피 X.
- [ ] **Camera**: 본체 따라가는 lerp 카메라.
- [ ] **Enemy**: 본체로 직진하는 추적형. 일정 거리에서 스폰.
- [ ] **Turret**: 가장 가까운 적 방향으로 회전 보간.
- [ ] **Bullet**: 발사 주기마다 포탑 각도로 발사. 직선 이동, lifetime 끝나면 소멸.
- [ ] **CollisionSystem**: 본체↔적, 총알↔적 충돌.
- [ ] **HP 및 사망**: 본체 HP 0 → 게임오버 텍스트.
- [ ] **HUD**: HP, 생존시간, 처치수.

✅ 이 시점에서 한 번 플레이해서 *재밌는지 판정*.

### Phase 2: 가중치 + 경험치 + 레벨업
- [ ] **DirectionPicker (가중치 버전)**: §2.2의 알고리즘 정식 구현.
- [ ] **XpOrb**: 적 사망 시 드롭. 자석 효과.
- [ ] **XpSystem**: 경험치 누적, 레벨업 임계치 계산.
- [ ] **LevelUpMenu**: 게임 일시정지 + 카드 3장 선택. 일단 *플레이스홀더 업그레이드*만:
  - 포탑 회전속도 +20%
  - 발사 주기 -15%
  - 총알 속도 +25%
  - 본체 이동속도 +10%
  - HP 회복 +30
- [ ] **난이도 곡선**: 시간 경과에 따른 적 스폰 수/주기 변화.

### Phase 3: 레이더 + 발사형 적
- [ ] **Radar 시스템**: 본체 중심 회전선. 감지된 적의 위치를 일정 시간 *기억*.
- [ ] **DirectionPicker (레이더 통합)**: 기억된 적 위치들을 가중치 계산에 반영.
- [ ] **새 적 타입: 사수 (Shooter)**: 멈춰서 본체 방향으로 일정 주기로 발사.
- [ ] 적의 총알(`Bullet`에 owner 필드 추가)도 본체와 충돌 처리.
- [ ] 레이더 업그레이드 옵션 추가 (회전속도, 감지반경, 다중 레이더).

### Phase 4+: 빌드 다양성 (사용자 결정에 따라 추가)
- 빌드 트리 4종 (Charon Boosters / 연사 / 다중 포탑 / 레이더 특화).
- 추가 적 타입 (탱커, 자살돌격, 분열형).
- 보스 (5분, 10분 마크).
- 사운드, 파티클, 화면 흔들림.
- PWA 매니페스트 + 오프라인 캐시.

---

## 9. 핵심 알고리즘 의사코드

### 9.1 가중치 랜덤 방향
```typescript
function pickDirection(player: Player, enemies: Enemy[]): Vec2 {
  const N = BALANCE.DIRECTION_CANDIDATES;
  const candidates: { angle: number; weight: number }[] = [];

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * 2 * Math.PI;

    // 현재 방향 근처는 제외
    const angleDiff = angularDistance(angle, player.heading);
    if (angleDiff < toRad(BALANCE.EXCLUDE_CURRENT_DIR_TOLERANCE)) continue;

    const dir: Vec2 = { x: Math.cos(angle), y: Math.sin(angle) };

    // 적 페널티 계산
    let penalty = 0;
    for (const e of enemies) {
      const toEnemy = sub(e.pos, player.pos);
      const dist = length(toEnemy);
      if (dist > BALANCE.ENEMY_AVOID_RADIUS) continue;
      const enemyDir = scale(toEnemy, 1 / dist);
      const dot = dir.x * enemyDir.x + dir.y * enemyDir.y;
      if (dot > 0) {
        penalty += (BALANCE.ENEMY_AVOID_WEIGHT / Math.max(dist, 1)) * dot;
      }
    }

    const weight = Math.max(0.01, 1.0 - penalty * 0.001);
    candidates.push({ angle, weight });
  }

  // 가중치 비례 추첨
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return { x: Math.cos(c.angle), y: Math.sin(c.angle) };
  }
  // fallback
  return { x: 1, y: 0 };
}
```

### 9.2 포탑 회전 보간
포탑은 자체 위치가 없으므로, 피벗은 `player.pos`다.
```typescript
function rotateTurretToward(turret: Turret, pivot: Vec2, target: Vec2, dt: number) {
  const desired = Math.atan2(target.y - pivot.y, target.x - pivot.x);
  const diff = wrapAngle(desired - turret.angle); // -PI ~ PI
  const maxStep = toRad(turret.rotateSpeed) * dt;
  if (Math.abs(diff) < maxStep) {
    turret.angle = desired;
  } else {
    turret.angle += Math.sign(diff) * maxStep;
  }
}
```

### 9.3 가장 가까운 적 찾기 (조준 대상)
```typescript
function findNearestEnemy(player: Player, enemies: Enemy[]): Enemy | null {
  let best: Enemy | null = null;
  let bestDistSq = Infinity;
  for (const e of enemies) {
    const dx = e.pos.x - player.pos.x;
    const dy = e.pos.y - player.pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = e;
    }
  }
  return best;
}
```
이 결과를 `gameState.targetedEnemy`에 저장하여 (1) 포탑 회전 (2) 적 강조 렌더링 두 곳에서 같은 참조를 사용한다.

### 9.4 메인 루프
```typescript
let lastTime = performance.now();
function frame(now: number) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 1 / 30); // 스파이크 클램프

  if (!game.paused) {
    game.update(dt);
  }
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

---

## 10. 타입 정의 초안

```typescript
// util/math.ts
export type Vec2 = { x: number; y: number };

// entities/Player.ts
export interface Player {
  pos: Vec2;
  heading: number;          // radians
  speed: number;
  hp: number;
  hpMax: number;
  invulnTimer: number;      // 0이면 피격 가능
  turret: Turret;
}

export interface Turret {
  // pos 없음. 피벗은 항상 player.pos (본체 정중앙).
  angle: number;            // radians, 절대 각
  rotateSpeed: number;      // deg/s
  fireInterval: number;     // s
  fireCooldown: number;     // s, 0이 되면 발사
  bulletSpeed: number;
  bulletDamage: number;
}

// entities/Enemy.ts
export interface Enemy {
  pos: Vec2;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  type: 'chaser' | 'shooter';
  // shooter 전용
  fireCooldown?: number;
}

// entities/Bullet.ts
export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  damage: number;
  lifetime: number;
  owner: 'player' | 'enemy';
}

// entities/XpOrb.ts
export interface XpOrb {
  pos: Vec2;
  value: number;
}

// game/Game.ts
export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  xpOrbs: XpOrb[];
  camera: Vec2;
  time: number;             // 게임 시간 (s)
  level: number;
  xp: number;
  xpToNextLevel: number;
  kills: number;
  paused: boolean;
  gameOver: boolean;
  // 매 프레임 update()에서 갱신되는 파생 상태.
  // 포탑 회전 타겟이자, 렌더러가 강조해서 그릴 적.
  targetedEnemy: Enemy | null;
}
```

---

## 11. 받아들이지 않을 유혹 (Anti-goals)

PoC 단계에서 *하지 말 것*. 발견하면 즉시 다음 Phase로 미룬다.

- 멀티 입력 (홀드, 더블탭) — **1버튼 원칙 위배**.
- 화려한 파티클/셰이더 — 손맛 검증 후에.
- 이미지 에셋, 스프라이트 시트 — 도형으로 충분.
- 사운드 — Phase 4 이후.
- 멀티플레이어, 리더보드, 저장.
- 프레임워크 도입 (React, Pixi 등).
- 적 AI의 정교화 (그룹 전술, 패턴) — 단순 추적이면 충분.

---

## 12. Phase 1 체크리스트 (Claude Code에 그대로 던질 단위 작업)

```
[ ] 1. Vite + TS 프로젝트 셋업, 풀스크린 캔버스, 리사이즈 핸들링
[ ] 2. balance.ts 작성 (§6 그대로)
[ ] 3. util/math.ts: Vec2, add, sub, scale, length, normalize, wrapAngle, toRad, toDeg
[ ] 4. game/Camera.ts: lerp 카메라, worldToScreen / screenToWorld
[ ] 5. game/Input.ts: 탭/클릭/스페이스 → 'button-press' 콜백
[ ] 6. entities/Player.ts: pos, heading, 매 프레임 등속 이동
[ ] 7. entities/Turret.ts: angle만 가짐 (pos 없음). rotateToward(turret, pivot=player.pos, target, dt). fireCooldown 처리
[ ] 8. entities/Bullet.ts, entities/Enemy.ts (chaser only)
[ ] 9. systems/SpawnSystem.ts: 5초마다 본체 주변 거리 D에 N마리
[ ] 10. systems/CollisionSystem.ts: 원-원, 원-사각 충돌
[ ] 11. systems/DirectionPicker.ts: 일단 균등 랜덤만 (가중치는 Phase 2)
[ ] 12. systems/TargetingSystem.ts: 매 프레임 findNearestEnemy 호출 → game.targetedEnemy 갱신. 포탑 회전과 발사는 이 참조를 사용
[ ] 13. game/Game.ts: 모든 엔티티 리스트, update(dt), render(ctx). update 순서: input → spawn → targeting → player move → turret rotate → fire → bullets/enemies → collision → cleanup
[ ] 14. render/Renderer.ts: 배경, 엔티티, 포탑은 player.pos에서 angle 방향으로 그리기, targetedEnemy는 주황색 + 외곽 흰 링
[ ] 15. render/HUD.ts: HP / 시간 / 킬 카운트
[ ] 16. main.ts: 게임 루프, dt 클램프
[ ] 17. 게임오버 텍스트 (HP 0 시 루프 멈춤)
```

이 17개를 다 끝내면 **재미 검증 가능한 PoC**가 완성된다.

---

## 13. 작업 시작 시 Claude Code에 줄 첫 프롬프트 예시

> "이 명세 파일(`goliath-survivor-spec.md`)을 읽어줘. Phase 0과 Phase 1 (§8, §12) 만 구현하고 싶어. Phase 2 이후는 *건드리지 말 것*. 작업은 §12 체크리스트 순서를 따라가되, 각 항목을 끝낼 때마다 빌드가 되는지 확인하고 다음으로 넘어가. balance.ts의 수치는 §6에 정의된 그대로 사용해."

---
