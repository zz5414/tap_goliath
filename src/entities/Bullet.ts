import { type Vec2 } from '../util/math.ts';

export type BulletOwner = 'player' | 'enemy';

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  damage: number;
  lifetime: number;
  owner: BulletOwner;
}

export const updateBullet = (bullet: Bullet, dt: number): void => {
  bullet.pos.x += bullet.vel.x * dt;
  bullet.pos.y += bullet.vel.y * dt;
  bullet.lifetime -= dt;
};
