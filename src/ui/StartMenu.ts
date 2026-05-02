import { type GameMode } from '../game/Game.ts';

let container: HTMLDivElement | null = null;

const styleAssign = (el: HTMLElement, s: Record<string, string>): void => {
  Object.assign(el.style, s);
};

const makeButton = (
  label: string,
  sub: string,
  onPick: () => void,
  accent: string
): HTMLButtonElement => {
  const btn = document.createElement('button');
  styleAssign(btn, {
    pointerEvents: 'auto',
    padding: '20px 28px',
    minWidth: '220px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    background: '#15151f',
    color: '#fff',
    border: `1px solid ${accent}`,
    borderRadius: '14px',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  });

  const title = document.createElement('div');
  title.textContent = label;
  styleAssign(title, { fontSize: '20px', color: accent });

  const desc = document.createElement('div');
  desc.textContent = sub;
  styleAssign(desc, { fontSize: '12px', opacity: '0.75', lineHeight: '1.5' });

  btn.appendChild(title);
  btn.appendChild(desc);
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onPick();
  });
  return btn;
};

export const showStartMenu = (onPick: (mode: GameMode) => void): void => {
  if (container) return;

  const isNarrow = window.innerWidth < 600;

  const overlay = document.createElement('div');
  styleAssign(overlay, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '18px',
    padding:
      'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
    zIndex: '12',
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    touchAction: 'manipulation',
  });
  // 빈 영역 클릭이 캔버스로 새지 않게
  overlay.addEventListener('pointerdown', (e) => e.stopPropagation());

  const title = document.createElement('div');
  title.textContent = 'Goliath Drift';
  styleAssign(title, {
    fontSize: '32px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#5fc',
    marginBottom: '4px',
  });

  const subtitle = document.createElement('div');
  subtitle.textContent = '모드를 선택하세요';
  styleAssign(subtitle, {
    fontSize: '14px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '12px',
  });

  const buttons = document.createElement('div');
  styleAssign(buttons, {
    display: 'flex',
    flexDirection: isNarrow ? 'column' : 'row',
    gap: '14px',
    alignItems: 'stretch',
  });

  const pick = (mode: GameMode): void => {
    hide();
    onPick(mode);
  };

  buttons.appendChild(
    makeButton('일반 모드', '탭하면 자동으로 방향이 바뀝니다', () => pick('normal'), '#5fc')
  );
  buttons.appendChild(
    makeButton(
      'God 모드',
      '원하는 방향을 탭/드래그해 직접 조종합니다',
      () => pick('god'),
      '#fb3'
    )
  );

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  overlay.appendChild(buttons);
  document.body.appendChild(overlay);
  container = overlay;
};

const hide = (): void => {
  if (!container) return;
  container.remove();
  container = null;
};

export const closeStartMenu = (): void => hide();
