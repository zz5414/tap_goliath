export type Vec2 = { x: number; y: number };

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const lengthSq = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const length = (a: Vec2): number => Math.sqrt(lengthSq(a));

export const normalize = (a: Vec2): Vec2 => {
  const len = length(a);
  if (len < 1e-9) return { x: 1, y: 0 };
  return { x: a.x / len, y: a.y / len };
};

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const toRad = (deg: number): number => (deg * Math.PI) / 180;
export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

// -PI..PI 범위로 각도 정규화
export const wrapAngle = (a: number): number => {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
};

export const angularDistance = (a: number, b: number): number =>
  Math.abs(wrapAngle(a - b));

export const angleToVec = (rad: number): Vec2 => ({
  x: Math.cos(rad),
  y: Math.sin(rad),
});
