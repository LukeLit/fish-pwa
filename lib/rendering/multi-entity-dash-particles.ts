/**
 * Multi-Entity Dash Particle Manager
 *
 * Shared module for dash particles across player and AI fish.
 * Manages per-entity DashParticleSystem instances so all fish
 * show dash effects consistently.
 */

import { DashParticleSystem, type DashParticleConfig, type DashParticleState } from './dash-particles';

export interface EntityDashState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isDashing: boolean;
}

/**
 * Manages dash particles for multiple entities (player + AI fish).
 * Use shared config for consistency. Lazy-creates systems per entity.
 */
export class MultiEntityDashParticleManager {
  private systems = new Map<string, DashParticleSystem>();
  private config: DashParticleConfig;

  constructor(config: DashParticleConfig = {}) {
    this.config = config;
  }

  /**
   * Update all entity dash particles. Call each frame with entity states.
   * Pass empty array for entities that shouldn't emit (e.g. not dashing).
   */
  update(entities: EntityDashState[], deltaTime: number): void {
    const activeIds = new Set(entities.map((e) => e.id));

    // Update systems for active entities
    for (const entity of entities) {
      const animationAction = entity.isDashing ? 'dash' : 'idle';
      const state: DashParticleState = {
        x: entity.x,
        y: entity.y,
        vx: entity.vx,
        vy: entity.vy,
        size: entity.size,
        animationAction,
      };

      let system = this.systems.get(entity.id);
      if (!system) {
        system = new DashParticleSystem(this.config);
        this.systems.set(entity.id, system);
      }
      system.update(state, deltaTime);
    }

    // Prune systems for entities no longer in the list
    for (const id of this.systems.keys()) {
      if (!activeIds.has(id)) {
        this.systems.delete(id);
      }
    }
  }

  /**
   * Draw particles behind entities (flow, streaks). Call before drawing fish.
   */
  drawBehind(ctx: CanvasRenderingContext2D, entityIds: string[]): void {
    for (const id of entityIds) {
      const system = this.systems.get(id);
      if (system) {
        system.drawBehind(ctx);
      }
    }
  }

  /**
   * Draw particles in front of entities (burst). Call after drawing fish.
   */
  drawInFront(ctx: CanvasRenderingContext2D, entityIds: string[]): void {
    for (const id of entityIds) {
      const system = this.systems.get(id);
      if (system) {
        system.drawInFront(ctx);
      }
    }
  }

  /** Reset all systems (e.g. when changing levels) */
  reset(): void {
    this.systems.clear();
  }
}
