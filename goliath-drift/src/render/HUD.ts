import { type GameState } from '../game/Game.ts';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export class HUD {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const ctx = this.ctx;
    const w = state.camera.viewportWidth;

    this.drawXpBar(state, w);

    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'top';

    // 좌상단 HP
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`HP ${state.player.hp}/${state.player.hpMax}`, 12, 12);

    // 우상단 시간 / 킬
    ctx.textAlign = 'right';
    ctx.fillText(`Time ${formatTime(state.time)}`, w - 12, 12);
    ctx.fillText(`Kills ${state.kills}`, w - 12, 30);

    if (state.gameOver) {
      this.drawGameOver(state);
    }
  }

  private drawXpBar(state: GameState, w: number): void {
    const ctx = this.ctx;
    const xp = state.xp;
    const ratio =
      xp.xpToNextLevel > 0
        ? Math.max(0, Math.min(1, xp.xp / xp.xpToNextLevel))
        : 0;
    const barH = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, w, barH);
    ctx.fillStyle = '#3ff';
    ctx.fillRect(0, 0, w * ratio, barH);

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lv ${xp.level}`, w / 2, 12);
  }

  private drawGameOver(state: GameState): void {
    const ctx = this.ctx;
    const w = state.camera.viewportWidth;
    const h = state.camera.viewportHeight;

    ctx.fillStyle = 'rgba(10,10,18,0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 36px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('GAME OVER', w / 2, h / 2 - 40);

    ctx.font = '16px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`Survived ${formatTime(state.time)}`, w / 2, h / 2);
    ctx.fillText(`Kills ${state.kills}`, w / 2, h / 2 + 24);

    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Tap / Click / Space to restart', w / 2, h / 2 + 60);
  }
}
