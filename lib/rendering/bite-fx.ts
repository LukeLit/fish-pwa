/**
 * Bite FX – shared “chomp” effect for fish attacks
 *
 * White pair of fangs chomping down, cartoony/anime style. Spawn at impact
 * point; subclasses OneShotEffectBase for life/update/draw.
 */

import { OneShotEffectBase, type OneShotEffectLife } from './one-shot-effect-base';

export interface BiteEffect extends OneShotEffectLife {
  x: number;
  y: number;
  angle: number;
  scale: number;
}

const DEFAULT_SCALE = 12;
const FANG_OPEN_ANGLE = (60 * Math.PI) / 180; // 60° open at start

/**
 * One-shot bite effect: two white fangs that close (chomp) over lifetime.
 */
export class BiteFx extends OneShotEffectBase<BiteEffect> {
  /**
   * @param durationMs – how long the effect lasts (life 1 → 0)
   */
  constructor(durationMs: number = 250) {
    super(durationMs);
  }

  /**
   * Spawn a bite effect at the given position and angle (attacker → target).
   * Scale can be derived from attacker size (e.g. attacker.size * 0.15).
   */
  spawn(x: number, y: number, angle: number, scale: number = DEFAULT_SCALE): void {
    this.effects.push({
      x,
      y,
      angle,
      scale,
      life: 1,
      maxLife: 1,
    });
  }

  protected drawEffect(ctx: CanvasRenderingContext2D, effect: BiteEffect): void {
    const { x, y, angle, scale, life } = effect;
    // Opening angle: start open (FANG_OPEN_ANGLE), close to 0 as life goes 1 → 0
    const openAngle = FANG_OPEN_ANGLE * life;
    const halfOpen = openAngle / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = life;

    const len = scale * 1.2;
    const tipW = scale * 0.35;
    const baseW = scale * 0.15;

    // Left fang: triangle from center, opening upward-left
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(80, 80, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      -Math.sin(halfOpen) * len - Math.cos(halfOpen) * baseW,
      -Math.cos(halfOpen) * len + Math.sin(halfOpen) * baseW
    );
    ctx.lineTo(
      -Math.sin(halfOpen) * len + Math.cos(halfOpen) * tipW,
      -Math.cos(halfOpen) * len - Math.sin(halfOpen) * tipW
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right fang
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.sin(halfOpen) * len + Math.cos(halfOpen) * baseW,
      -Math.cos(halfOpen) * len + Math.sin(halfOpen) * baseW
    );
    ctx.lineTo(
      Math.sin(halfOpen) * len - Math.cos(halfOpen) * tipW,
      -Math.cos(halfOpen) * len - Math.sin(halfOpen) * tipW
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
