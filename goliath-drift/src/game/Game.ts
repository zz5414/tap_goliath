import { BALANCE } from '../config/balance.ts';
import { type Bullet, updateBullet } from '../entities/Bullet.ts';
import { type Enemy, updateEnemy } from '../entities/Enemy.ts';
import { createPlayer, type Player, updatePlayer } from '../entities/Player.ts';
import { rotateTurretToward } from '../entities/Turret.ts';
import { circleCircle, circleRect } from '../systems/CollisionSystem.ts';
import { pickDirection } from '../systems/DirectionPicker.ts';
import { SpawnSystem } from '../systems/SpawnSystem.ts';
import { findNearestEnemy } from '../systems/TargetingSystem.ts';
import { Camera } from './Camera.ts';

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  camera: Camera;
  time: number;
  kills: number;
  paused: boolean;
  gameOver: boolean;
  targetedEnemy: Enemy | null;
}

export class Game {
  state: GameState;
  private spawnSystem = new SpawnSystem();
  private buttonPressed = false;

  constructor(camera: Camera) {
    const player = createPlayer();
    player.heading = Math.random() * Math.PI * 2;
    camera.snapTo(player.pos);
    this.state = {
      player,
      enemies: [],
      bullets: [],
      camera,
      time: 0,
      kills: 0,
      paused: false,
      gameOver: false,
      targetedEnemy: null,
    };
  }

  pressButton(): void {
    if (this.state.gameOver || this.state.paused) return;
    this.buttonPressed = true;
  }

  update(dt: number): void {
    if (this.state.paused || this.state.gameOver) return;
    const s = this.state;

    // 1. input → heading 변경
    if (this.buttonPressed) {
      s.player.heading = pickDirection(s.player.heading);
      this.buttonPressed = false;
    }

    // 2. spawn
    this.spawnSystem.update(dt, s.player.pos, s.enemies);

    // 3. targeting (포탑 회전과 렌더 강조 모두 같은 참조)
    s.targetedEnemy = findNearestEnemy(s.player.pos, s.enemies);

    // 4. player 이동
    updatePlayer(s.player, dt);

    // 5. 포탑 회전
    if (s.targetedEnemy) {
      rotateTurretToward(s.player.turret, s.player.pos, s.targetedEnemy.pos, dt);
    }

    // 6. 발사
    s.player.turret.fireCooldown -= dt;
    if (s.player.turret.fireCooldown <= 0 && s.targetedEnemy) {
      s.player.turret.fireCooldown += s.player.turret.fireInterval;
      const a = s.player.turret.angle;
      s.bullets.push({
        pos: { x: s.player.pos.x, y: s.player.pos.y },
        vel: {
          x: Math.cos(a) * s.player.turret.bulletSpeed,
          y: Math.sin(a) * s.player.turret.bulletSpeed,
        },
        damage: s.player.turret.bulletDamage,
        lifetime: BALANCE.BULLET_LIFETIME,
        owner: 'player',
      });
    } else if (s.player.turret.fireCooldown < 0) {
      // 타겟 없을 땐 쿨다운을 0으로 클램프
      s.player.turret.fireCooldown = 0;
    }

    // 7. bullets / enemies 업데이트
    for (const b of s.bullets) updateBullet(b, dt);
    for (const e of s.enemies) updateEnemy(e, s.player.pos, dt);

    // 8. 충돌
    this.handleCollisions();

    // 9. 정리
    s.bullets = s.bullets.filter((b) => b.lifetime > 0);
    s.enemies = s.enemies.filter((e) => e.hp > 0);

    // 10. 시간 / 카메라
    s.time += dt;
    s.camera.follow(s.player.pos, dt);

    // 11. HP 체크
    if (s.player.hp <= 0) {
      s.player.hp = 0;
      s.gameOver = true;
    }
  }

  private handleCollisions(): void {
    const s = this.state;

    // 총알 ↔ 적
    for (const b of s.bullets) {
      if (b.lifetime <= 0 || b.owner !== 'player') continue;
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        if (circleCircle(b.pos, BALANCE.BULLET_RADIUS, e.pos, e.radius)) {
          e.hp -= b.damage;
          b.lifetime = 0;
          if (e.hp <= 0) s.kills += 1;
          break;
        }
      }
    }

    // 적 ↔ 본체 (사각형)
    if (s.player.invulnTimer > 0) return;
    const half = BALANCE.PLAYER_SIZE / 2;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      if (circleRect(e.pos, e.radius, s.player.pos, half, half)) {
        s.player.hp -= e.damage;
        s.player.invulnTimer = BALANCE.PLAYER_INVULN_DURATION;
        break;
      }
    }
  }
}
