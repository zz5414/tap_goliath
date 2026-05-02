import { BALANCE } from '../config/balance.ts';
import { lerp, type Vec2 } from '../util/math.ts';

export class Camera {
  pos: Vec2 = { x: 0, y: 0 };
  viewportWidth = 0;
  viewportHeight = 0;

  setViewport(w: number, h: number): void {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  follow(target: Vec2, dt: number): void {
    // dt 보정된 lerp: t를 프레임률 독립적으로
    const t = 1 - Math.pow(1 - BALANCE.CAMERA_LERP, dt * 60);
    this.pos.x = lerp(this.pos.x, target.x, t);
    this.pos.y = lerp(this.pos.y, target.y, t);
  }

  snapTo(target: Vec2): void {
    this.pos.x = target.x;
    this.pos.y = target.y;
  }

  worldToScreen(world: Vec2): Vec2 {
    return {
      x: world.x - this.pos.x + this.viewportWidth / 2,
      y: world.y - this.pos.y + this.viewportHeight / 2,
    };
  }

  screenToWorld(screen: Vec2): Vec2 {
    return {
      x: screen.x + this.pos.x - this.viewportWidth / 2,
      y: screen.y + this.pos.y - this.viewportHeight / 2,
    };
  }
}
