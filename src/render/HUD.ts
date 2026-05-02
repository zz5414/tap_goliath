import { type GameState } from '../game/Game.ts';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// CSS env(safe-area-inset-*) 값을 읽기 위한 sentinel 엘리먼트
const safeAreaProbe = ((): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;visibility:hidden;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
  document.body.appendChild(el);
  return el;
})();

const readSafeArea = (): { top: number; right: number; bottom: number; left: number } => {
  const cs = getComputedStyle(safeAreaProbe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
};

export class HUD {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  draw(state: GameState): void {
    const ctx = this.ctx;
    const w = state.camera.viewportWidth;
    const safe = readSafeArea();
    const isNarrow = w < 600;
    const fontSize = isNarrow ? 16 : 14;
    const padX = 12 + (isNarrow ? 4 : 0);
    const topY = safe.top + 10;

    this.drawXpBar(state, w, safe);

    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textBaseline = 'top';

    // 좌상단 HP
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`HP ${state.player.hp}/${state.player.hpMax}`, safe.left + padX, topY);

    // 우상단 시간 / 킬
    ctx.textAlign = 'right';
    ctx.fillText(`Time ${formatTime(state.time)}`, w - safe.right - padX, topY);
    ctx.fillText(`Kills ${state.kills}`, w - safe.right - padX, topY + fontSize + 4);

    if (state.gameOver) {
      this.drawGameOver(state);
    }
  }

  private drawXpBar(
    state: GameState,
    w: number,
    safe: { top: number; left: number; right: number }
  ): void {
    const ctx = this.ctx;
    const xp = state.xp;
    const ratio =
      xp.xpToNextLevel > 0
        ? Math.max(0, Math.min(1, xp.xp / xp.xpToNextLevel))
        : 0;
    const barH = 4;
    const barY = safe.top;
    const barX = safe.left;
    const barW = w - safe.left - safe.right;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#3ff';
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lv ${xp.level}`, w / 2, barY + 8);
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
    // 재시작 입력은 DOM 버튼(GameOverMenu)으로 분리됨
  }
}
