/**
 * Stamina Management Helper (re-export from stamina-hunger)
 * @deprecated Use stamina-hunger module directly. This file exists for backwards compatibility.
 */

import { updateStamina } from './stamina-hunger';

export interface StaminaEntity {
  stamina: number;
  maxStamina: number;
  isDashing: boolean;
}

/**
 * Create a stamina update function that can be used by both player and AI.
 * Wraps stamina-hunger.updateStamina for backwards compatibility.
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
    updateStamina(entity as { stamina?: number; maxStamina?: number; baseMaxStamina?: number; hunger?: number; isDashing?: boolean }, deltaTime, {
      ...options,
      isPlayer: isPlayer(entity),
    });
  };
}
