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
  kind: 'burst' | 'flow' | 'streak';
  angle?: number;
  length?: number;
}

export interface DashParticleConfig {
  flowCap?: number;
  flowSpawnPerFrame?: number;
  burstCooldownMs?: number;
  burstCount?: number;
}

const DEFAULT_CONFIG: Required<DashParticleConfig> = {
  flowCap: 200,
  flowSpawnPerFrame: 1,
  burstCooldownMs: 800,
  burstCount: 12,
};

/**
 * DashParticleSystem - Emits underwater bubbles and streaks when in dash animation state
 */
export class DashParticleSystem {
  private particles: DashParticle[] = [];
  private previousAction: AnimationAction = 'idle';
  private lastBurstTime = 0;
  private config: Required<DashParticleConfig>;

  constructor(config: DashParticleConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update particles. Call each frame with current entity state.
   * Particles only emit when animationAction is 'dash' and entity is moving.
   */
  update(state: DashParticleState, deltaTime: number): void {
    const { animationAction } = state;
    const moveAngle = Math.atan2(state.vy, state.vx);
    const speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
    const isDashing = animationAction === 'dash' && speed > 0.2;

    if (isDashing) {
      const now = performance.now();

      // One-time burst when entering dash state
      const justEnteredDash = this.previousAction !== 'dash';
      const cooldownElapsed = now - this.lastBurstTime > this.config.burstCooldownMs;
      if (justEnteredDash && cooldownElapsed) {
        this.lastBurstTime = now;
        this.spawnBurst(state, moveAngle);
      }

      // Persistent flow while in dash
      const flowCount = this.particles.filter((p) => p.kind === 'flow').length;
      const toSpawn = Math.min(this.config.flowSpawnPerFrame, this.config.flowCap - flowCount);
      for (let i = 0; i < toSpawn; i++) {
        this.spawnFlow(state, moveAngle);
      }

      // Sparse streaks
      const streakCount = this.particles.filter((p) => p.kind === 'streak').length;
      if (streakCount < 8 && Math.random() < 0.15) {
        this.spawnStreak(state, moveAngle);
      }
    }

    this.previousAction = animationAction;

    // Update existing particles
    this.particles = this.particles
      .map((p) => {
        const decay = p.kind === 'burst' ? 0.06 : p.kind === 'flow' ? 0.03 : 0.025;
        return {
          ...p,
          x: p.x + p.vx * deltaTime,
          y: p.y + p.vy * deltaTime,
          life: p.life - decay * deltaTime,
        };
      })
      .filter((p) => p.life > 0);
  }

  private spawnBurst(state: DashParticleState, moveAngle: number): void {
    const headOffset = state.size * 0.4;
    const burstX = state.x + Math.cos(moveAngle) * headOffset;
    const burstY = state.y + Math.sin(moveAngle) * headOffset;

    for (let i = 0; i < this.config.burstCount; i++) {
      const spread = (Math.random() - 0.5) * state.size * 0.5;
      const perpAngle = moveAngle + Math.PI / 2;
      this.particles.push({
        x: burstX + Math.cos(perpAngle) * spread,
        y: burstY + Math.sin(perpAngle) * spread,
        vx: -state.vx * 0.15 + (Math.random() - 0.5) * 0.3,
        vy: -state.vy * 0.15 - 0.15 - Math.random() * 0.2,
        life: 1,
        radius: 4 + Math.random() * 6,
        kind: 'burst',
      });
    }
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

  /** Draw particles behind the fish (flow, streak). Call before drawing the fish. */
  drawBehind(ctx: CanvasRenderingContext2D): void {
    this.drawParticles(ctx, this.particles.filter((p) => p.kind === 'flow' || p.kind === 'streak'));
  }

  /** Draw particles in front of the fish (burst). Call after drawing the fish. */
  drawInFront(ctx: CanvasRenderingContext2D): void {
    this.drawParticles(ctx, this.particles.filter((p) => p.kind === 'burst'));
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
        bubbleGradient.addColorStop(0, `rgba(220, 245, 255, 0.7)`);
        bubbleGradient.addColorStop(0.5, `rgba(160, 220, 255, 0.5)`);
        bubbleGradient.addColorStop(1, `rgba(100, 180, 220, 0.2)`);
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
  }
}
