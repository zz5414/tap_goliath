import { BALANCE } from '../config/balance.ts';
import { type Vec2 } from '../util/math.ts';

export interface Hazard {
  pos: Vec2;
  radius: number;
}

// chunkX, chunkY → Hazard | null. null은 "이 청크엔 위험지 없음" 캐시.
const cache = new Map<string, Hazard | null>();

const key = (cx: number, cy: number): string => `${cx},${cy}`;

// xorshift 기반 결정론적 해시 (좌표 → [0,1))
const hash01 = (cx: number, cy: number, salt: number): number => {
  let h = (cx * 73856093) ^ (cy * 19349663) ^ (salt * 2654435761);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0x1_0000_0000;
};

const generate = (cx: number, cy: number): Hazard | null => {
  if (hash01(cx, cy, 1) >= BALANCE.HAZARD_CHUNK_PROBABILITY) return null;
  const size = BALANCE.HAZARD_CHUNK_SIZE;
  const r =
    BALANCE.HAZARD_RADIUS_MIN +
    hash01(cx, cy, 4) * (BALANCE.HAZARD_RADIUS_MAX - BALANCE.HAZARD_RADIUS_MIN);
  // 청크 내부에 가장자리 마진을 두고 위치
  const margin = r + 4;
  const ox = margin + hash01(cx, cy, 2) * (size - margin * 2);
  const oy = margin + hash01(cx, cy, 3) * (size - margin * 2);
  const pos: Vec2 = { x: cx * size + ox, y: cy * size + oy };
  // 시작 안전구역 내부면 제거
  const safeR = BALANCE.HAZARD_SAFE_ZONE_RADIUS + r;
  if (pos.x * pos.x + pos.y * pos.y < safeR * safeR) return null;
  return { pos, radius: r };
};

const get = (cx: number, cy: number): Hazard | null => {
  const k = key(cx, cy);
  if (cache.has(k)) return cache.get(k)!;
  const h = generate(cx, cy);
  cache.set(k, h);
  return h;
};

export const hazardsInRect = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Hazard[] => {
  const size = BALANCE.HAZARD_CHUNK_SIZE;
  const cMinX = Math.floor(minX / size);
  const cMaxX = Math.floor(maxX / size);
  const cMinY = Math.floor(minY / size);
  const cMaxY = Math.floor(maxY / size);
  const out: Hazard[] = [];
  for (let cy = cMinY; cy <= cMaxY; cy++) {
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      const h = get(cx, cy);
      if (h) out.push(h);
    }
  }
  return out;
};

export const hazardsNear = (pos: Vec2, range: number): Hazard[] =>
  hazardsInRect(pos.x - range, pos.y - range, pos.x + range, pos.y + range);

// 게임 재시작 시 캐시 클리어 — 결정론은 동일 좌표에서 같지만, 메모리 누수 방지.
export const resetHazards = (): void => {
  cache.clear();
};
