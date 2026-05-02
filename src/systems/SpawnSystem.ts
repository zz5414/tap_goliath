import { BALANCE } from '../config/balance.ts';
import { createChaser, type Enemy } from '../entities/Enemy.ts';
import { type Vec2 } from '../util/math.ts';

export class SpawnSystem {
  // 시작과 동시에 첫 웨이브가 발생하도록 0으로 시작
  private timer = 0;
  private elapsed = 0;
  private waveCount = 0;

  update(dt: number, playerPos: Vec2, enemies: Enemy[]): void {
    this.elapsed += dt;
    this.timer -= dt;
    if (this.timer > 0) return;
    const interval = Math.max(
      BALANCE.ENEMY_SPAWN_INTERVAL_MIN,
      BALANCE.ENEMY_SPAWN_INTERVAL - this.elapsed / BALANCE.ENEMY_SPAWN_INTERVAL_DECAY
    );
    this.timer += interval;
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
