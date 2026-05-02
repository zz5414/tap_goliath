import { BALANCE } from '../config/balance.ts';
import { createChaser, type Enemy } from '../entities/Enemy.ts';
import { type Vec2 } from '../util/math.ts';

export class SpawnSystem {
  private timer = BALANCE.ENEMY_SPAWN_INTERVAL;
  private waveCount = 0;

  update(dt: number, playerPos: Vec2, enemies: Enemy[]): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += BALANCE.ENEMY_SPAWN_INTERVAL;
    const count =
      BALANCE.ENEMY_SPAWN_COUNT_INITIAL +
      this.waveCount * BALANCE.ENEMY_SPAWN_COUNT_GROWTH;
    this.waveCount += 1;
    for (let i = 0; i < count; i++) {
      enemies.push(createChaser(this.randomSpawnPoint(playerPos)));
    }
  }

  private randomSpawnPoint(playerPos: Vec2): Vec2 {
    const angle = Math.random() * Math.PI * 2;
    const r = BALANCE.ENEMY_SPAWN_DISTANCE;
    return {
      x: playerPos.x + Math.cos(angle) * r,
      y: playerPos.y + Math.sin(angle) * r,
    };
  }
}
