import { Camera } from './game/Camera.ts';
import { Game, type GameMode } from './game/Game.ts';
import { Input } from './game/Input.ts';
import { HUD } from './render/HUD.ts';
import { Renderer } from './render/Renderer.ts';
import { closeGameOverMenu, tickGameOverMenu } from './ui/GameOverMenu.ts';
import { closeLevelUpMenu, tickLevelUpMenu } from './ui/LevelUpMenu.ts';
import { closeStartMenu, showStartMenu } from './ui/StartMenu.ts';
import { type Vec2 } from './util/math.ts';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('canvas#game not found');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2d context not available');

const camera = new Camera();

const resize = (): void => {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.setViewport(w, h);
};
resize();
window.addEventListener('resize', resize);

let game: Game | null = null;
const renderer = new Renderer(ctx);
const hud = new HUD(ctx);

const input = new Input();
input.attach(canvas);

const screenToWorldTarget = (screen: Vec2): Vec2 => camera.screenToWorld(screen);

input.onButtonPress((screenPos) => {
  if (!game || game.state.gameOver) return;
  const target = screenPos ? screenToWorldTarget(screenPos) : null;
  game.pressButton(target);
});

input.onPointerDrag((screenPos) => {
  if (!game || game.state.gameOver || game.state.paused) return;
  if (game.state.mode !== 'god') return;
  game.steerToward(screenToWorldTarget(screenPos));
});

const startGame = (mode: GameMode): void => {
  closeLevelUpMenu();
  closeGameOverMenu();
  closeStartMenu();
  game = new Game(camera, mode);
};

const openStart = (): void => {
  closeLevelUpMenu();
  closeGameOverMenu();
  game = null;
  showStartMenu(startGame);
};

const restart = (): void => openStart();

openStart();

let lastTime = performance.now();
const frame = (now: number): void => {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  // 큰 스파이크 (탭 전환 등) 클램프
  if (dt > 1 / 30) dt = 1 / 30;

  if (game) {
    game.update(dt);
    tickLevelUpMenu(game);
    tickGameOverMenu(game, restart);
    renderer.draw(game.state);
    hud.draw(game.state);
  } else {
    // 시작 메뉴 노출 중 — 캔버스를 비워둔다
    const w = camera.viewportWidth;
    const h = camera.viewportHeight;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);
  }

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
