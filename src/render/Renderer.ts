import { BALANCE } from '../config/balance.ts';
import { type GameState } from '../game/Game.ts';
import { hazardsInRect } from '../systems/HazardSystem.ts';
import { type Vec2 } from '../util/math.ts';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const ctx = this.ctx;
    const { viewportWidth: w, viewportHeight: h } = state.camera;

    // 배경
    ctx.fillStyle = BALANCE.COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(state);
    this.drawHazards(state);
    this.drawAimLine(state);
    this.drawBullets(state);
    this.drawXpOrbs(state);
    this.drawEnemies(state);
    this.drawPlayer(state);
  }

  private drawHazards(state: GameState): void {
    const ctx = this.ctx;
    const cam = state.camera.pos;
    const w = state.camera.viewportWidth;
    const h = state.camera.viewportHeight;
    const margin = BALANCE.HAZARD_RADIUS_MAX + 8;
    const hazards = hazardsInRect(
      cam.x - w / 2 - margin,
      cam.y - h / 2 - margin,
      cam.x + w / 2 + margin,
      cam.y + h / 2 + margin
    );
    for (const hz of hazards) {
      const p = state.camera.worldToScreen(hz.pos);
      // 외곽 헤일로
      ctx.fillStyle = 'rgba(255,80,40,0.10)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, hz.radius + 6, 0, Math.PI * 2);
      ctx.fill();
      // 본체
      ctx.fillStyle = BALANCE.COLOR_HAZARD;
      ctx.beginPath();
      ctx.arc(p.x, p.y, hz.radius, 0, Math.PI * 2);
      ctx.fill();
      // 코어 — 위험성 강조
      ctx.fillStyle = BALANCE.COLOR_HAZARD_CORE;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(3, hz.radius * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGrid(state: GameState): void {
    const ctx = this.ctx;
    const cellSize = 80;
    const cam = state.camera.pos;
    const w = state.camera.viewportWidth;
    const h = state.camera.viewportHeight;
    const offsetX = ((-cam.x % cellSize) + cellSize) % cellSize;
    const offsetY = ((-cam.y % cellSize) + cellSize) % cellSize;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX - cellSize; x < w + cellSize; x += cellSize) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = offsetY - cellSize; y < h + cellSize; y += cellSize) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  }

  private drawAimLine(state: GameState): void {
    const ctx = this.ctx;
    const start = state.camera.worldToScreen(state.player.pos);
    const a = state.player.turret.angle;
    const len = BALANCE.AIM_LINE_LENGTH;
    ctx.strokeStyle = BALANCE.COLOR_AIM_LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(start.x + Math.cos(a) * len, start.y + Math.sin(a) * len);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawBullets(state: GameState): void {
    const ctx = this.ctx;
    for (const b of state.bullets) {
      const p = state.camera.worldToScreen(b.pos);
      ctx.fillStyle =
        b.owner === 'player' ? BALANCE.COLOR_BULLET_PLAYER : BALANCE.COLOR_BULLET_ENEMY;
      ctx.beginPath();
      ctx.arc(p.x, p.y, BALANCE.BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawXpOrbs(state: GameState): void {
    const ctx = this.ctx;
    ctx.fillStyle = BALANCE.COLOR_XP_ORB;
    for (const orb of state.xpOrbs) {
      const p = state.camera.worldToScreen(orb.pos);
      const r = BALANCE.XP_ORB_RADIUS;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y);
      ctx.lineTo(p.x, p.y + r);
      ctx.lineTo(p.x - r, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawEnemies(state: GameState): void {
    const ctx = this.ctx;
    const targeted = state.targetedEnemy;
    for (const e of state.enemies) {
      const p = state.camera.worldToScreen(e.pos);
      const isTargeted = e === targeted;
      ctx.fillStyle = isTargeted ? BALANCE.COLOR_ENEMY_TARGETED : BALANCE.COLOR_ENEMY;
      ctx.beginPath();
      ctx.arc(p.x, p.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      if (isTargeted) {
        ctx.strokeStyle = BALANCE.COLOR_TARGET_RING;
        ctx.lineWidth = BALANCE.TARGET_RING_WIDTH;
        ctx.beginPath();
        ctx.arc(p.x, p.y, e.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawPlayer(state: GameState): void {
    const ctx = this.ctx;
    const player = state.player;
    const screen = state.camera.worldToScreen(player.pos);

    // 무적시간 깜빡임
    const blink =
      player.invulnTimer > 0 && Math.floor(player.invulnTimer * 12) % 2 === 0;

    // 오작동 임박 경고: 마지막 MALFUNCTION_WARN_DURATION 동안 빨간 테두리 깜빡임
    const warning =
      player.malfunctionTimer < BALANCE.MALFUNCTION_WARN_DURATION &&
      Math.floor(player.malfunctionTimer * 16) % 2 === 0;

    if (!blink) {
      ctx.fillStyle = BALANCE.COLOR_PLAYER;
      const size = BALANCE.PLAYER_SIZE;
      ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size);
      if (warning) {
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          screen.x - size / 2 - 1.5,
          screen.y - size / 2 - 1.5,
          size + 3,
          size + 3
        );
      }
    }

    // 포탑: 본체 정중앙에서 angle 방향으로 뻗는 직사각형
    this.drawTurret(screen, player.turret.angle);

    // HP 막대 (본체 위)
    this.drawPlayerHpBar(screen, player.hp, player.hpMax);

    // 장전 진행 바 (본체 아래)
    this.drawReloadBar(
      screen,
      player.turret.fireCooldown,
      player.turret.fireInterval,
      state.targetedEnemy !== null
    );
  }

  private drawTurret(pivot: Vec2, angle: number): void {
    const ctx = this.ctx;
    const len = BALANCE.TURRET_LENGTH;
    const wid = BALANCE.TURRET_WIDTH;
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(angle);
    ctx.fillStyle = BALANCE.COLOR_TURRET;
    // 중심점에서 전방으로만 len 뻗는 형태
    ctx.fillRect(0, -wid / 2, len, wid);
    ctx.restore();
  }

  private drawPlayerHpBar(screen: Vec2, hp: number, hpMax: number): void {
    const ctx = this.ctx;
    const w = 24;
    const h = 3;
    const yOff = -BALANCE.PLAYER_SIZE / 2 - 8;
    const ratio = Math.max(0, hp / hpMax);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(screen.x - w / 2, screen.y + yOff, w, h);
    ctx.fillStyle = ratio > 0.4 ? '#5fc' : ratio > 0.2 ? '#fb3' : '#f33';
    ctx.fillRect(screen.x - w / 2, screen.y + yOff, w * ratio, h);
  }

  private drawReloadBar(
    screen: Vec2,
    cooldown: number,
    interval: number,
    hasTarget: boolean
  ): void {
    const ctx = this.ctx;
    const w = 24;
    const h = 2;
    const yOff = BALANCE.PLAYER_SIZE / 2 + 4;
    // cooldown은 발사 직후 interval로 리셋되어 0으로 감소 → 진행도는 1 - cooldown/interval
    const ratio =
      interval > 0 ? Math.max(0, Math.min(1, 1 - cooldown / interval)) : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(screen.x - w / 2, screen.y + yOff, w, h);
    // 타겟이 없으면 쿨다운이 0으로 클램프되어 항상 가득 차므로 흐리게 표시
    ctx.fillStyle = ratio >= 1 ? (hasTarget ? '#fe4' : 'rgba(255,228,68,0.45)') : '#fb3';
    ctx.fillRect(screen.x - w / 2, screen.y + yOff, w * ratio, h);
  }
}
