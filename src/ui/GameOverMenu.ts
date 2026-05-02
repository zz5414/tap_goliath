import { type Game } from '../game/Game.ts';

let container: HTMLDivElement | null = null;

const styleAssign = (el: HTMLElement, s: Record<string, string>): void => {
  Object.assign(el.style, s);
};

const show = (onRestart: () => void): void => {
  // 캔버스의 GAME OVER 텍스트 아래 중앙에 재시작 버튼만 띄운다.
  // 오버레이 자체는 pointerEvents:none — 버튼 외 영역의 입력은 캔버스로 흘러가지 않게
  // 캔버스 입력 핸들러가 game.gameOver 일 때 무시하도록 main.ts에서 처리됨.
  const wrap = document.createElement('div');
  styleAssign(wrap, {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: '11',
  });

  const btn = document.createElement('button');
  btn.textContent = '재시작';
  styleAssign(btn, {
    pointerEvents: 'auto',
    transform: 'translateY(120px)',
    padding: '14px 36px',
    fontSize: '18px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    background: '#15151f',
    color: '#5fc',
    border: '1px solid rgba(95,255,204,0.6)',
    borderRadius: '12px',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  });

  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onRestart();
  });

  wrap.appendChild(btn);
  document.body.appendChild(wrap);
  container = wrap;
};

const hide = (): void => {
  if (!container) return;
  container.remove();
  container = null;
};

export const tickGameOverMenu = (game: Game, onRestart: () => void): void => {
  if (!game.state.gameOver) {
    if (container) hide();
    return;
  }
  if (container) return;
  show(() => {
    hide();
    onRestart();
  });
};

export const closeGameOverMenu = (): void => hide();
