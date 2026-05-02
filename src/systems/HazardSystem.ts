import { BALANCE } from '../config/balance.ts';
import { type Vec2 } from '../util/math.ts';

export interface Hazard {
  pos: Vec2;
  radius: number;
}

interface HazardRecord {
  hazard: Hazard;
  // 활성화 임계값 (0..1). ramp(time) > threshold 일 때 활성화.
  threshold: number;
}

// chunkX, chunkY → HazardRecord | null. null = "이 청크엔 영원히 위험지 없음"(안전구역).
const cache = new Map<string, HazardRecord | null>();

const key = (cx: number, cy: number): string => `${cx},${cy}`;

// xorshift 기반 결정론적 해시 (좌표 → [0,1))
const hash01 = (cx: number, cy: number, salt: number): number => {
  let h = (cx * 73856093) ^ (cy * 19349663) ^ (salt * 2654435761);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0x1_0000_0000;
};

const generate = (cx: number, cy: number): HazardRecord | null => {
  const threshold = hash01(cx, cy, 1);
  const size = BALANCE.HAZARD_CHUNK_SIZE;
  const r =
    BALANCE.HAZARD_RADIUS_MIN +
    hash01(cx, cy, 4) * (BALANCE.HAZARD_RADIUS_MAX - BALANCE.HAZARD_RADIUS_MIN);
  // 청크 내부에 가장자리 마진을 두고 위치
  const margin = r + 4;
  const ox = margin + hash01(cx, cy, 2) * (size - margin * 2);
  const oy = margin + hash01(cx, cy, 3) * (size - margin * 2);
  const pos: Vec2 = { x: cx * size + ox, y: cy * size + oy };
  // 시작 안전구역 내부면 영원히 제외
  const safeR = BALANCE.HAZARD_SAFE_ZONE_RADIUS + r;
  if (pos.x * pos.x + pos.y * pos.y < safeR * safeR) return null;
  return { hazard: { pos, radius: r }, threshold };
};

const get = (cx: number, cy: number): HazardRecord | null => {
  const k = key(cx, cy);
  if (cache.has(k)) return cache.get(k)!;
  const rec = generate(cx, cy);
  cache.set(k, rec);
  return rec;
};

// 시간 ramp: DELAY 동안은 0, 이후 DURATION 동안 0 → PROBABILITY로 선형 증가.
// 청크의 threshold(0..1)가 ramp보다 작으면 활성화. 따라서 threshold >= PROBABILITY인
// 청크는 끝까지 활성화되지 않음(기존 PROBABILITY=0.55 분포 유지).
const computeRamp = (time: number): number => {
  const t = time - BALANCE.HAZARD_RAMP_DELAY;
  if (t <= 0) return 0;
  const p = Math.min(1, t / BALANCE.HAZARD_RAMP_DURATION);
  return p * BALANCE.HAZARD_CHUNK_PROBABILITY;
};

export const hazardsInRect = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  time: number
): Hazard[] => {
  const ramp = computeRamp(time);
  if (ramp <= 0) return [];
  const size = BALANCE.HAZARD_CHUNK_SIZE;
  const cMinX = Math.floor(minX / size);
  const cMaxX = Math.floor(maxX / size);
  const cMinY = Math.floor(minY / size);
  const cMaxY = Math.floor(maxY / size);
  const out: Hazard[] = [];
  for (let cy = cMinY; cy <= cMaxY; cy++) {
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      const rec = get(cx, cy);
      if (rec && rec.threshold < ramp) out.push(rec.hazard);
    }
  }
  return out;
};

export const hazardsNear = (pos: Vec2, range: number, time: number): Hazard[] =>
  hazardsInRect(pos.x - range, pos.y - range, pos.x + range, pos.y + range, time);

// 게임 재시작 시 캐시 클리어 — 결정론은 동일 좌표에서 같지만, 메모리 누수 방지.
export const resetHazards = (): void => {
  cache.clear();
};
