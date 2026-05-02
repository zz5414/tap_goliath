import { BALANCE } from '../config/balance.ts';
import { toRad, wrapAngle, type Vec2 } from '../util/math.ts';

export interface Turret {
  // 위치 없음. 피벗은 항상 player.pos.
  angle: number;
  rotateSpeed: number;
  fireInterval: number;
  fireCooldown: number;
  bulletSpeed: number;
  bulletDamage: number;
}

export const createTurret = (): Turret => ({
  angle: 0,
  rotateSpeed: BALANCE.TURRET_ROTATE_SPEED,
  fireInterval: BALANCE.TURRET_FIRE_INTERVAL,
  fireCooldown: BALANCE.TURRET_FIRE_INTERVAL,
  bulletSpeed: BALANCE.BULLET_SPEED,
  bulletDamage: BALANCE.BULLET_DAMAGE,
});

export const rotateTurretToward = (
  turret: Turret,
  pivot: Vec2,
  target: Vec2,
  dt: number
): void => {
  const desired = Math.atan2(target.y - pivot.y, target.x - pivot.x);
  const diff = wrapAngle(desired - turret.angle);
  const maxStep = toRad(turret.rotateSpeed) * dt;
  if (Math.abs(diff) <= maxStep) {
    turret.angle = desired;
  } else {
    turret.angle += Math.sign(diff) * maxStep;
  }
};
