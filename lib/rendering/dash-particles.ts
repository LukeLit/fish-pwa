/**
 * Dash Particle System
 *
 * Underwater bubble/streak effects driven by animation state.
 * Only active when animation action is 'dash'.
 */

import type { AnimationAction } from '@/lib/game/types';

export interface DashParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  /** Current animation action - particles only emit when 'dash' */
  animationAction: AnimationAction;
}

interface DashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
  kind: 'flow' | 'streak';
  angle?: number;
  length?: number;
}

export interface DashParticleConfig {
  flowCap?: number;
  /** Pixels traveled per flow particle (emission by distance). */
  flowDistancePerParticle?: number;
  /** Pixels traveled per streak particle. */
  streakDistancePerParticle?: number;
  /** Max flow + streak particles to spawn in a single frame (safety cap). */
  maxSpawnPerFrame?: number;
}

const DEFAULT_CONFIG: Required<DashParticleConfig> = {
  flowCap: 200,
  flowDistancePerParticle: 8,
  streakDistancePerParticle: 24,
  maxSpawnPerFrame: 12,
};

/**
 * DashParticleSystem - Emits underwater bubbles and streaks when in dash animation state
 */
export class DashParticleSystem {
  private particles: DashParticle[] = [];
  private previousAction: AnimationAction = 'idle';
  /** Accumulated distance while dashing; used for distance-based emission. */
  private distanceAccumulator = 0;
  private config: Required<DashParticleConfig>;

  constructor(config: DashParticleConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update particles. Call each frame with current entity state.
   * Emission is by distance and speed: particles spawn per pixel traveled.
   * When dash ends, emission stops but existing particles decay naturally.
   */
  update(state: DashParticleState, deltaTime: number): void {
    const { animationAction } = state;
    const moveAngle = Math.atan2(state.vy, state.vx);
    const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
    const isDashing = animationAction === 'dash' && speed > 0.2;

    if (isDashing) {
      const distanceThisFrame = speed * deltaTime;
      this.distanceAccumulator += distanceThisFrame;

      let flowCount = this.particles.filter((p) => p.kind === 'flow').length;
      let streakCount = this.particles.filter((p) => p.kind === 'streak').length;
      let spawnedThisFrame = 0;

      // Flow: spawn one per flowDistancePerParticle pixels traveled
      while (
        this.distanceAccumulator >= this.config.flowDistancePerParticle &&
        flowCount < this.config.flowCap &&
        spawnedThisFrame < this.config.maxSpawnPerFrame
      ) {
        this.distanceAccumulator -= this.config.flowDistancePerParticle;
        this.spawnFlow(state, moveAngle);
        flowCount++;
        spawnedThisFrame++;
      }

      // Streaks: spawn one per streakDistancePerParticle pixels, cap count
      while (
        this.distanceAccumulator >= this.config.streakDistancePerParticle &&
        streakCount < 8 &&
        spawnedThisFrame < this.config.maxSpawnPerFrame
      ) {
        this.distanceAccumulator -= this.config.streakDistancePerParticle;
        this.spawnStreak(state, moveAngle);
        streakCount++;
        spawnedThisFrame++;
      }
    } else {
      // Not dashing: stop emission; reset accumulator for next dash
      this.distanceAccumulator = 0;
    }

    this.previousAction = animationAction;

    // Update existing particles (move and decay; no clearing)
    this.particles = this.particles
      .map((p) => {
        const decay = p.kind === 'flow' ? 0.03 : 0.025;
        return {
          ...p,
          x: p.x + p.vx * deltaTime,
          y: p.y + p.vy * deltaTime,
          life: p.life - decay * deltaTime,
        };
      })
      .filter((p) => p.life > 0);
  }

  private spawnFlow(state: DashParticleState, moveAngle: number): void {
    const tailOffset = state.size * (0.13 + Math.random() * 0.5);
    const trailX = state.x - Math.cos(moveAngle) * tailOffset + (Math.random() - 0.5) * state.size * 0.3;
    const trailY = state.y - Math.sin(moveAngle) * tailOffset + (Math.random() - 0.5) * state.size * 0.2;
    this.particles.push({
      x: trailX,
      y: trailY,
      vx: -state.vx * 0.4 + (Math.random() - 0.5) * 0.15,
      vy: -state.vy * 0.4 - 0.08 + (Math.random() - 0.5) * 0.1,
      life: 1,
      radius: 1.5 + Math.random() * 2.5,
      kind: 'flow',
    });
  }

  private spawnStreak(state: DashParticleState, moveAngle: number): void {
    const trailX = state.x - Math.cos(moveAngle) * state.size * 0.5 + (Math.random() - 0.5) * state.size * 0.4;
    const trailY = state.y - Math.sin(moveAngle) * state.size * 0.5;
    const streakAngle = moveAngle + Math.PI;
    this.particles.push({
      x: trailX,
      y: trailY,
      vx: -state.vx * 0.2,
      vy: -state.vy * 0.2 - 0.05,
      life: 1,
      radius: 1.5,
      kind: 'streak',
      angle: streakAngle,
      length: 8 + Math.random() * 12,
    });
  }

  /**
   * Spawn an instant burst of bubbles at a world position (e.g. combat impact).
   * These use the same bubble look as dash flow particles but radiate outward
   * from the impact point to simulate rough water / turbulence.
   */
  spawnBurst(x: number, y: number, count: number = 10, sizeScale: number = 1): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.6;
      const spread = sizeScale * (5 + Math.random() * 8);
      this.particles.push({
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15, // slight upward drift
        life: 0.7 + Math.random() * 0.3,
        radius: (1.5 + Math.random() * 3) * sizeScale,
        kind: 'flow',
      });
    }
  }

  /** Draw particles behind the fish (flow, streak). Call before drawing the fish. */
  drawBehind(ctx: CanvasRenderingContext2D): void {
    this.drawParticles(ctx, this.particles.filter((p) => p.kind === 'flow' || p.kind === 'streak'));
  }

  /** Draw particles in front of the fish. Call after drawing the fish. (No front layer with distance-based emission.) */
  drawInFront(_ctx: CanvasRenderingContext2D): void {
    // All particles are trail (flow/streak) drawn behind; front layer unused
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: DashParticle[]): void {
    particles.forEach((p) => {
      const alpha = Math.max(0, p.life);
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.kind === 'streak' && p.angle != null && p.length != null) {
        ctx.rotate(p.angle);
        const w = p.radius * p.life;
        const h = (p.length || 10) * p.life;
        const gradient = ctx.createLinearGradient(-h / 2, 0, h / 2, 0);
        gradient.addColorStop(0, `rgba(120, 200, 255, 0)`);
        gradient.addColorStop(0.3, `rgba(160, 220, 255, ${alpha * 0.25})`);
        gradient.addColorStop(0.5, `rgba(200, 240, 255, ${alpha * 0.4})`);
        gradient.addColorStop(0.7, `rgba(160, 220, 255, ${alpha * 0.25})`);
        gradient.addColorStop(1, `rgba(120, 200, 255, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(-h / 2, -w / 2, h, w);
      } else {
        ctx.globalAlpha = alpha;
        const r = p.radius * p.life;
        const bubbleGradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        bubbleGradient.addColorStop(0, `rgba(220, 245, 255, 0.8)`);
        bubbleGradient.addColorStop(0.5, `rgba(160, 220, 255, 0.6)`);
        bubbleGradient.addColorStop(1, `rgba(100, 180, 220, 0.25)`);
        ctx.fillStyle = bubbleGradient;
        ctx.strokeStyle = `rgba(180, 230, 255, 0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  /**
   * Draw all particles (for convenience). Prefer drawBehind/drawInFront for proper layering.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    this.drawParticles(ctx, this.particles);
  }

  /** Reset state (e.g. when changing levels) */
  reset(): void {
    this.particles = [];
    this.previousAction = 'idle';
    this.distanceAccumulator = 0;
  }
}
