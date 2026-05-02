import { type Game } from '../game/Game.ts';

interface Card {
  id: string;
  title: string;
  desc: string;
  apply: (game: Game) => void;
}

const CARDS: Card[] = [
  {
    id: 'turret_speed',
    title: '회전 가속',
    desc: '포탑 회전속도 +20%',
    apply: (g) => {
      g.state.player.turret.rotateSpeed *= 1.2;
    },
  },
  {
    id: 'fire_rate',
    title: '연사력',
    desc: '발사 주기 −15%',
    apply: (g) => {
      g.state.player.turret.fireInterval *= 0.85;
    },
  },
  {
    id: 'bullet_speed',
    title: '총알 가속',
    desc: '총알 속도 +25%',
    apply: (g) => {
      g.state.player.turret.bulletSpeed *= 1.25;
    },
  },
  {
    id: 'bullet_damage',
    title: '탄환 화력',
    desc: '총알 데미지 +20%',
    apply: (g) => {
      g.state.player.turret.bulletDamage *= 1.2;
    },
  },
  {
    id: 'move_speed',
    title: '드리프트 가속',
    desc: '본체 이동속도 +10%',
    apply: (g) => {
      g.state.player.speed *= 1.1;
    },
  },
  {
    id: 'heal',
    title: '수리 키트',
    desc: 'HP +30 (최대치 한도)',
    apply: (g) => {
      const p = g.state.player;
      p.hp = Math.min(p.hpMax, p.hp + 30);
    },
  },
];

let container: HTMLDivElement | null = null;

const pickThree = (): Card[] => {
  const pool = [...CARDS];
  const out: Card[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
};

const styleAssign = (el: HTMLElement, s: Record<string, string>): void => {
  Object.assign(el.style, s);
};

const show = (game: Game): void => {
  game.state.paused = true;

  const isNarrow = window.innerWidth < 600;

  const overlay = document.createElement('div');
  styleAssign(overlay, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    flexDirection: isNarrow ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isNarrow ? '12px' : '16px',
    padding:
      'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
    zIndex: '10',
    flexWrap: 'wrap',
    pointerEvents: 'auto',
    overflowY: 'auto',
    boxSizing: 'border-box',
    touchAction: 'manipulation',
  });
  // 빈 영역 클릭이 캔버스로 새지 않도록 차단
  overlay.addEventListener('pointerdown', (e) => e.stopPropagation());

  for (const card of pickThree()) {
    const el = document.createElement('div');
    styleAssign(el, {
      flex: isNarrow ? '0 0 auto' : '1 1 200px',
      width: isNarrow ? '100%' : 'auto',
      maxWidth: isNarrow ? '420px' : '260px',
      minHeight: isNarrow ? '96px' : '180px',
      background: '#15151f',
      border: '1px solid rgba(95,255,204,0.3)',
      borderRadius: '12px',
      padding: isNarrow ? '18px 16px' : '20px 16px',
      color: '#fff',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      userSelect: 'none',
      boxSizing: 'border-box',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });

    const title = document.createElement('div');
    title.textContent = card.title;
    styleAssign(title, {
      fontSize: isNarrow ? '20px' : '18px',
      marginBottom: '10px',
      color: '#5fc',
    });

    const desc = document.createElement('div');
    desc.textContent = card.desc;
    styleAssign(desc, {
      fontSize: isNarrow ? '14px' : '13px',
      opacity: '0.85',
      lineHeight: '1.5',
    });

    el.appendChild(title);
    el.appendChild(desc);
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      apply(game, card);
    });
    overlay.appendChild(el);
  }

  document.body.appendChild(overlay);
  container = overlay;
};

const hide = (): void => {
  if (!container) return;
  container.remove();
  container = null;
};

const apply = (game: Game, card: Card): void => {
  card.apply(game);
  game.state.pendingLevelUps -= 1;
  hide();
  if (game.state.pendingLevelUps > 0) {
    // 다음 레벨업 카드 즉시 노출
    show(game);
  } else {
    game.state.paused = false;
  }
};

export const tickLevelUpMenu = (game: Game): void => {
  if (game.state.gameOver) {
    if (container) {
      hide();
      game.state.paused = false;
    }
    return;
  }
  if (!container && game.state.pendingLevelUps > 0) {
    show(game);
  }
};

export const closeLevelUpMenu = (): void => hide();
