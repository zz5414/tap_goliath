import { BALANCE } from '../config/balance.ts';
import { type Vec2 } from '../util/math.ts';
import { createTurret, type Turret } from './Turret.ts';

export interface Player {
  pos: Vec2;
  heading: number; // radians
  speed: number;
  hp: number;
  hpMax: number;
  invulnTimer: number;
  turret: Turret;
}

export const createPlayer = (): Player => ({
  pos: { x: 0, y: 0 },
  heading: 0,
  speed: BALANCE.PLAYER_SPEED,
  hp: BALANCE.PLAYER_HP_MAX,
  hpMax: BALANCE.PLAYER_HP_MAX,
  invulnTimer: 0,
  turret: createTurret(),
});

export const updatePlayer = (player: Player, dt: number): void => {
  player.pos.x += Math.cos(player.heading) * player.speed * dt;
  player.pos.y += Math.sin(player.heading) * player.speed * dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
};
