import { BALANCE } from '../config/balance.ts';
import { normalize, sub, type Vec2 } from '../util/math.ts';

export type EnemyType = 'chaser' | 'shooter';

export interface Enemy {
  pos: Vec2;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  type: EnemyType;
  fireCooldown?: number;
}

export const createChaser = (pos: Vec2): Enemy => ({
  pos: { ...pos },
  hp: BALANCE.ENEMY_HP,
  speed: BALANCE.ENEMY_SPEED,
  radius: BALANCE.ENEMY_RADIUS,
  damage: BALANCE.ENEMY_DAMAGE,
  type: 'chaser',
});

export const updateEnemy = (enemy: Enemy, target: Vec2, dt: number): void => {
  if (enemy.type === 'chaser') {
    const dir = normalize(sub(target, enemy.pos));
    enemy.pos.x += dir.x * enemy.speed * dt;
    enemy.pos.y += dir.y * enemy.speed * dt;
  }
};
