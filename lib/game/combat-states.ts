/**
 * Combat State Consolidation
 * Single source of truth for combat/movement states (dashing, exhausted, knocked out).
 * Prep for combat overhaul - all state definitions and helpers live here.
 */

/**
 * Combat-relevant states only.
 * - normal: Not dashing, not exhausted, not KO'd
 * - dashing: Actively dashing; stamina draining; full speed; can trigger attacks
 * - exhausted: Stamina = 0; cannot dash; 75% move speed; vulnerable to KO on hit
 * - knocked_out: Hit while exhausted (or lost stamina battle); drifting; regening stamina; wake at threshold
 */
export type CombatState = 'normal' | 'dashing' | 'exhausted' | 'knocked_out';

/**
 * Fish lifecycle + combat states.
 * Lifecycle: spawning, active, despawning, removed
 * Combat (subset of active): exhausted, knocked_out
 */
export type FishLifecycleState =
  | 'spawning'
  | 'active'
  | 'exhausted'
  | 'knocked_out'
  | 'dying'
  | 'despawning'
  | 'removed';

/** Entity that can have combat state (player or fish) */
export interface CombatEntity {
  isDashing?: boolean;
  lifecycleState?: FishLifecycleState;
  stamina?: number;
  maxStamina?: number;
  baseMaxStamina?: number;
}

/**
 * True if entity is actively dashing (stamina draining, full speed).
 */
export function isDashing(entity: CombatEntity): boolean {
  const stam = entity.stamina ?? 0;
  return !!(entity.isDashing && stam > 0);
}

/**
 * True if entity has no stamina; cannot dash; 75% speed; vulnerable to KO.
 */
export function isExhausted(entity: CombatEntity): boolean {
  const stam = entity.stamina ?? 0;
  return stam <= 0;
}

/**
 * True if entity is knocked out (drifting, regening, wake at threshold).
 */
export function isKnockedOut(entity: CombatEntity): boolean {
  return entity.lifecycleState === 'knocked_out';
}

/**
 * Get combat state for entity (player or fish).
 */
export function getCombatState(entity: CombatEntity): CombatState {
  if (entity.lifecycleState === 'knocked_out') return 'knocked_out';
  const stam = entity.stamina ?? 0;
  if (stam <= 0) return 'exhausted';
  if (entity.isDashing && stam > 0) return 'dashing';
  return 'normal';
}
