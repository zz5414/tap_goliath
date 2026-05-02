import { type Vec2 } from '../util/math.ts';

export const circleCircle = (
  a: Vec2,
  ra: number,
  b: Vec2,
  rb: number
): boolean => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = ra + rb;
  return dx * dx + dy * dy <= r * r;
};

export const circleRect = (
  c: Vec2,
  cr: number,
  rect: Vec2,
  halfW: number,
  halfH: number
): boolean => {
  const closestX = Math.max(rect.x - halfW, Math.min(c.x, rect.x + halfW));
  const closestY = Math.max(rect.y - halfH, Math.min(c.y, rect.y + halfH));
  const dx = c.x - closestX;
  const dy = c.y - closestY;
  return dx * dx + dy * dy <= cr * cr;
};
