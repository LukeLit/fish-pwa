/**
 * Hit FX – directional impact lines at attack contact
 *
 * Short lines radiating from the impact point, anime-style. Spawn at hit
 * position with direction (attacker → target); subclasses OneShotEffectBase.
 */

import { OneShotEffectBase, type OneShotEffectLife } from './one-shot-effect-base';

export interface HitEffect extends OneShotEffectLife {
  x: number;
  y: number;
  directionAngle: number;
}

const LINE_COUNT = 8;
const SPREAD_RAD = 0.45; // ± spread around direction
const BASE_LENGTH = 18;
const LINE_WIDTH = 1.5;

/**
 * One-shot hit effect: directional impact lines from the point of impact.
 */
export class HitFx extends OneShotEffectBase<HitEffect> {
  /**
   * @param durationMs – how long the effect lasts (life 1 → 0)
   */
  constructor(durationMs: number = 200) {
    super(durationMs);
  }

  /**
   * Spawn a hit effect at the impact point. directionAngle is attacker → target
   * (e.g. Math.atan2(target.y - attacker.y, target.x - attacker.x)).
   */
  spawn(x: number, y: number, directionAngle: number = 0): void {
    this.effects.push({
      x,
      y,
      directionAngle,
      life: 1,
      maxLife: 1,
    });
  }

  protected drawEffect(ctx: CanvasRenderingContext2D, effect: HitEffect): void {
    const { x, y, directionAngle, life } = effect;
    // Length and opacity: expand then fade (peak around life 0.7)
    const length = BASE_LENGTH * life * 1.2;
    const alpha = life;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    for (let i = 0; i < LINE_COUNT; i++) {
      // Distribute angles around directionAngle with spread
      const t = (i / (LINE_COUNT - 1 || 1)) * 2 - 1;
      const angle = directionAngle + t * SPREAD_RAD;
      const ex = Math.cos(angle) * length;
      const ey = Math.sin(angle) * length;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // Perpendicular cross lines for classic impact look
    const perpAngle = directionAngle + Math.PI / 2;
    for (const sign of [-1, 1]) {
      const a = perpAngle + sign * (SPREAD_RAD * 0.5);
      const ex = Math.cos(a) * length * 0.6;
      const ey = Math.sin(a) * length * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    ctx.restore();
  }
}
