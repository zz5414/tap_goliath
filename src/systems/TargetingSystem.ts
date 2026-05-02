import { type Enemy } from '../entities/Enemy.ts';
import { type Vec2 } from '../util/math.ts';

export const findNearestEnemy = (
  origin: Vec2,
  enemies: Enemy[]
): Enemy | null => {
  let best: Enemy | null = null;
  let bestDistSq = Infinity;
  for (const e of enemies) {
    const dx = e.pos.x - origin.x;
    const dy = e.pos.y - origin.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = e;
    }
  }
  return best;
};
