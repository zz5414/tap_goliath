import { BALANCE } from '../config/balance.ts';
import { angularDistance, toRad } from '../util/math.ts';

// Phase 1: 단순 균등 랜덤. 현재 진행 방향 근처는 제외하여 "안 누른 것과 같은" 결과를 막는다.
// Phase 2에서 가중치 회피로 대체된다.
export const pickDirection = (currentHeading: number): number => {
  const N = BALANCE.DIRECTION_CANDIDATES;
  const tolerance = toRad(BALANCE.EXCLUDE_CURRENT_DIR_TOLERANCE);
  const candidates: number[] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    if (angularDistance(angle, currentHeading) < tolerance) continue;
    candidates.push(angle);
  }
  if (candidates.length === 0) {
    return currentHeading + Math.PI;
  }
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx]!;
};
