import { BALANCE } from '../config/balance.ts';
import { type Bullet, updateBullet } from '../entities/Bullet.ts';
import { type Enemy, updateEnemy } from '../entities/Enemy.ts';
import { createPlayer, type Player, updatePlayer } from '../entities/Player.ts';
import { rotateTurretToward } from '../entities/Turret.ts';
import { createXpOrb, type XpOrb } from '../entities/XpOrb.ts';
import { circleCircle, circleRect } from '../systems/CollisionSystem.ts';
import { pickDirection } from '../systems/DirectionPicker.ts';
import { hazardsNear, resetHazards } from '../systems/HazardSystem.ts';
import { SpawnSystem } from '../systems/SpawnSystem.ts';
import { findNearestEnemy } from '../systems/TargetingSystem.ts';
import { createXpStats, updateXp, type XpStats } from '../systems/XpSystem.ts';
import { Camera } from './Camera.ts';

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  xpOrbs: XpOrb[];
  xp: XpStats;
  pendingLevelUps: number;
  // 첫 레벨업 메뉴에서는 필수 카드 3종을 강제로 보여주기 위한 플래그
  firstCardShown: boolean;
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
    resetHazards();
    this.state = {
      player,
      enemies: [],
      bullets: [],
      xpOrbs: [],
      xp: createXpStats(),
      pendingLevelUps: 0,
      firstCardShown: false,
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

    // 1. 오작동: 일정 주기마다 자동 클릭이 트리거됨
    s.player.malfunctionTimer -= dt;
    if (s.player.malfunctionTimer <= 0) {
      this.buttonPressed = true;
      s.player.malfunctionTimer += s.player.malfunctionInterval;
    }

    // 2. input → heading 변경
    if (this.buttonPressed) {
      s.player.heading = pickDirection(s.player.heading, s.player.pos, s.enemies);
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

    // 6. 발사 — 포신 수만큼 부채꼴로 동시 발사 (+ 후방 포대 옵션)
    s.player.turret.fireCooldown -= dt;
    if (s.player.turret.fireCooldown <= 0 && s.targetedEnemy) {
      s.player.turret.fireCooldown += s.player.turret.fireInterval;
      const t = s.player.turret;
      const n = Math.max(1, t.barrels);
      const center = (n - 1) / 2;
      const fan = (baseAngle: number): void => {
        for (let i = 0; i < n; i++) {
          const a = baseAngle + (i - center) * BALANCE.TURRET_BARREL_SPREAD;
          s.bullets.push({
            pos: { x: s.player.pos.x, y: s.player.pos.y },
            vel: {
              x: Math.cos(a) * t.bulletSpeed,
              y: Math.sin(a) * t.bulletSpeed,
            },
            damage: t.bulletDamage,
            lifetime: BALANCE.BULLET_LIFETIME,
            owner: 'player',
          });
        }
      };
      fan(t.angle);
      if (t.hasRearCannon) fan(t.angle + Math.PI);
    } else if (s.player.turret.fireCooldown < 0) {
      // 타겟 없을 땐 쿨다운을 0으로 클램프
      s.player.turret.fireCooldown = 0;
    }

    // 7. bullets / enemies 업데이트
    for (const b of s.bullets) updateBullet(b, dt);
    for (const e of s.enemies) updateEnemy(e, s.player.pos, dt);

    // 8. 충돌
    this.handleCollisions();

    // 9. XP 흡수 / 레벨업
    const result = updateXp(s.xp, s.xpOrbs, s.player.pos, s.player.pickupRadius, dt);
    s.xpOrbs = result.remaining;
    s.pendingLevelUps += result.levelUps;

    // 10. 정리
    s.bullets = s.bullets.filter((b) => b.lifetime > 0);
    s.enemies = s.enemies.filter((e) => e.hp > 0);

    // 11. 시간 / 카메라
    s.time += dt;
    s.camera.follow(s.player.pos, dt);

    // 12. HP 체크
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
          if (e.hp <= 0) {
            s.kills += 1;
            s.xpOrbs.push(createXpOrb(e.pos, BALANCE.XP_PER_KILL));
          }
          break;
        }
      }
    }

    // 위험 지형 ↔ 적 (플레이어 무적 여부와 무관하게 항상 처리)
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const er = BALANCE.HAZARD_RADIUS_MAX + e.radius;
      for (const h of hazardsNear(e.pos, er, s.time)) {
        if (circleCircle(e.pos, e.radius, h.pos, h.radius)) {
          e.hp -= BALANCE.HAZARD_DAMAGE_TO_ENEMY;
          if (e.hp <= 0) {
            s.kills += 1;
            s.xpOrbs.push(createXpOrb(e.pos, BALANCE.XP_PER_KILL));
          }
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
        return;
      }
    }

    // 위험 지형 ↔ 본체
    const range = BALANCE.HAZARD_RADIUS_MAX + half + 8;
    for (const h of hazardsNear(s.player.pos, range, s.time)) {
      if (circleRect(h.pos, h.radius, s.player.pos, half, half)) {
        s.player.hp -= BALANCE.HAZARD_DAMAGE;
        s.player.invulnTimer = BALANCE.PLAYER_INVULN_DURATION;
        return;
      }
    }
  }
}
