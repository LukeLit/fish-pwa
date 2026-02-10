/**
 * One-Shot Effect Base
 *
 * Base class for short-lived attack FX (bite, hit, etc.). Each effect spawns
 * at a position, animates over a fixed duration, then is removed. Subclasses
 * define spawn(...) and drawEffect() for their visual.
 */

export interface OneShotEffectLife {
  life: number;
  maxLife: number;
}

/**
 * Abstract base for one-shot visual effects. Manages life decay and draw loop;
 * subclasses add spawn() and drawEffect() for their specific shape.
 */
export abstract class OneShotEffectBase<E extends OneShotEffectLife> {
  protected effects: E[] = [];

  constructor(protected durationMs: number = 200) {}

  /**
   * Decay life and remove dead effects. Call each frame.
   * deltaTime is frame-normalized (1 ≈ one frame at 60fps); durationMs is in milliseconds.
   */
  update(deltaTime: number): void {
    const frameMs = deltaTime * (1000 / 60);
    this.effects = this.effects
      .map((e) => ({
        ...e,
        life: e.life - (frameMs / this.durationMs) * e.maxLife,
      }))
      .filter((e) => e.life > 0) as E[];
  }

  /** Clear all active effects (e.g. on level change). */
  reset(): void {
    this.effects = [];
  }

  /**
   * Draw all active effects in world space. Call after applying camera transform.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const effect of this.effects) {
      this.drawEffect(ctx, effect);
    }
  }

  /** Override: draw a single effect at its position/angle. */
  protected abstract drawEffect(ctx: CanvasRenderingContext2D, effect: E): void;
}
