import { Camera } from './game/Camera.ts';
import { Game } from './game/Game.ts';
import { Input } from './game/Input.ts';
import { HUD } from './render/HUD.ts';
import { Renderer } from './render/Renderer.ts';

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

let game = new Game(camera);
const renderer = new Renderer(ctx);
const hud = new HUD(ctx);

const input = new Input();
input.attach(canvas);
input.onButtonPress(() => {
  if (game.state.gameOver) {
    game = new Game(camera);
    return;
  }
  game.pressButton();
});

let lastTime = performance.now();
const frame = (now: number): void => {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  // 큰 스파이크 (탭 전환 등) 클램프
  if (dt > 1 / 30) dt = 1 / 30;

  game.update(dt);
  renderer.draw(game.state);
  hud.draw(game.state);

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
