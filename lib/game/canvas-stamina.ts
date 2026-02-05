/**
 * Stamina Management Helper
 * Shared stamina update logic for player and AI fish
 */

import { DASH_STAMINA_DRAIN_RATE } from './dash-constants';
import { STAMINA } from './canvas-constants';

export interface StaminaEntity {
  stamina: number;
  maxStamina: number;
  isDashing: boolean;
}

/**
 * Create a stamina update function that can be used by both player and AI
 */
export function createStaminaUpdater(
  isPlayer: (entity: StaminaEntity) => boolean
): (entity: StaminaEntity, deltaTime: number, options?: {
  drainRate?: number;
  rampMultiplier?: number;
  fleeMultiplier?: number;
  regenRate?: number;
}) => void {
  return (entity, deltaTime, options = {}) => {
    const {
      drainRate = DASH_STAMINA_DRAIN_RATE,
      rampMultiplier = 1,
      fleeMultiplier = 1,
      regenRate = isPlayer(entity) ? STAMINA.PLAYER_REGEN_RATE : STAMINA.AI_REGEN_RATE,
    } = options;

    if (entity.isDashing) {
      entity.stamina = Math.max(0, entity.stamina - drainRate * rampMultiplier * fleeMultiplier * (deltaTime / 60));
    } else {
      entity.stamina = Math.min(entity.maxStamina, entity.stamina + regenRate * (deltaTime / 60));
    }
  };
}
