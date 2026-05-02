import { BALANCE } from '../config/balance.ts';
import { type Enemy } from '../entities/Enemy.ts';
import { angularDistance, toRad, type Vec2 } from '../util/math.ts';

// 후보 각도마다 ENEMY_AVOID_RADIUS 내 적의 페널티를 합산하고,
// 가중치 = max(0.01, 1.0 - penalty * 0.001)을 누적분포 추첨한다.
// 결정론적 max-pick은 패턴이 읽혀서 의도적으로 피한다.
export const pickDirection = (
  currentHeading: number,
  playerPos: Vec2,
  enemies: Enemy[]
): number => {
  const N = BALANCE.DIRECTION_CANDIDATES;
  const tolerance = toRad(BALANCE.EXCLUDE_CURRENT_DIR_TOLERANCE);
  const avoidR = BALANCE.ENEMY_AVOID_RADIUS;
  const avoidRSq = avoidR * avoidR;

  const candidates: number[] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    if (angularDistance(angle, currentHeading) < tolerance) continue;
    candidates.push(angle);
  }
  if (candidates.length === 0) {
    return currentHeading + Math.PI;
  }

  // 반경 내 적만 단위 방향+거리로 압축
  type Threat = { dx: number; dy: number; dist: number };
  const threats: Threat[] = [];
  for (const e of enemies) {
    const dx = e.pos.x - playerPos.x;
    const dy = e.pos.y - playerPos.y;
    const dSq = dx * dx + dy * dy;
    if (dSq > avoidRSq) continue;
    const dist = Math.max(1, Math.sqrt(dSq));
    threats.push({ dx: dx / dist, dy: dy / dist, dist });
  }

  const weights = new Array<number>(candidates.length);
  let total = 0;
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i]!;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    let penalty = 0;
    for (const t of threats) {
      const d = cx * t.dx + cy * t.dy;
      if (d <= 0) continue;
      penalty += (BALANCE.ENEMY_AVOID_WEIGHT / t.dist) * d;
    }
    const w = Math.max(0.01, 1.0 - penalty * 0.001);
    weights[i] = w;
    total += w;
  }

  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return candidates[i]!;
  }
  return candidates[candidates.length - 1]!;
};
