import { BALANCE } from '../config/balance.ts';
import { type XpOrb, updateXpOrb } from '../entities/XpOrb.ts';
import { type Vec2 } from '../util/math.ts';

export interface XpStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export const xpThreshold = (level: number): number =>
  Math.floor(BALANCE.XP_LEVELUP_BASE * BALANCE.XP_LEVELUP_GROWTH ** (level - 1));

export const createXpStats = (): XpStats => ({
  level: 1,
  xp: 0,
  xpToNextLevel: xpThreshold(1),
});

// 구슬 자석 + 흡수. 흡수된 구슬은 결과 배열에서 제외하고 levelUps로 발생 횟수를 알린다.
export const updateXp = (
  stats: XpStats,
  orbs: XpOrb[],
  playerPos: Vec2,
  pickupRadius: number,
  dt: number
): { remaining: XpOrb[]; levelUps: number } => {
  let levelUps = 0;
  const remaining: XpOrb[] = [];
  const collectR = BALANCE.PLAYER_RADIUS + BALANCE.XP_ORB_RADIUS;
  const collectRSq = collectR * collectR;
  for (const orb of orbs) {
    updateXpOrb(orb, playerPos, dt, pickupRadius);
    const dx = orb.pos.x - playerPos.x;
    const dy = orb.pos.y - playerPos.y;
    if (dx * dx + dy * dy <= collectRSq) {
      stats.xp += orb.value;
      while (stats.xp >= stats.xpToNextLevel) {
        stats.xp -= stats.xpToNextLevel;
        stats.level += 1;
        stats.xpToNextLevel = xpThreshold(stats.level);
        levelUps += 1;
      }
      continue;
    }
    remaining.push(orb);
  }
  return { remaining, levelUps };
};
