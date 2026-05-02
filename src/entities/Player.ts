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
  // 오작동: malfunctionTimer가 0 이하가 되면 자동 클릭되어 방향이 변경됨
  malfunctionInterval: number;
  malfunctionTimer: number;
  // 경험치 구슬을 끌어당기는 반경 — 업그레이드로 증가시킬 수 있다
  pickupRadius: number;
}

export const createPlayer = (): Player => ({
  pos: { x: 0, y: 0 },
  heading: 0,
  speed: BALANCE.PLAYER_SPEED,
  hp: BALANCE.PLAYER_HP_MAX,
  hpMax: BALANCE.PLAYER_HP_MAX,
  invulnTimer: 0,
  turret: createTurret(),
  malfunctionInterval: BALANCE.MALFUNCTION_INTERVAL,
  malfunctionTimer: BALANCE.MALFUNCTION_INTERVAL,
  pickupRadius: BALANCE.XP_ORB_PICKUP_RADIUS,
});

export const updatePlayer = (player: Player, dt: number): void => {
  player.pos.x += Math.cos(player.heading) * player.speed * dt;
  player.pos.y += Math.sin(player.heading) * player.speed * dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
};
