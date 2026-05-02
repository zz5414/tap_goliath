import { BALANCE } from '../config/balance.ts';
import { type Vec2 } from '../util/math.ts';

export interface XpOrb {
  pos: Vec2;
  value: number;
}

export const createXpOrb = (pos: Vec2, value: number): XpOrb => ({
  pos: { ...pos },
  value,
});

// 본체 픽업 반경 안에서만 끌어당긴다. 그 바깥에서는 정지.
export const updateXpOrb = (
  orb: XpOrb,
  playerPos: Vec2,
  dt: number,
  pickupRadius: number
): void => {
  const dx = playerPos.x - orb.pos.x;
  const dy = playerPos.y - orb.pos.y;
  const dSq = dx * dx + dy * dy;
  if (dSq > pickupRadius * pickupRadius) return;
  const dist = Math.sqrt(dSq) || 1;
  orb.pos.x += (dx / dist) * BALANCE.XP_ORB_SPEED * dt;
  orb.pos.y += (dy / dist) * BALANCE.XP_ORB_SPEED * dt;
};
