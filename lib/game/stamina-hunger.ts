/**
 * Stamina & Hunger Management
 * Unified Monster Hunter-style system: hunger scales max stamina.
 * Shared by player and AI - same code path.
 */

import { HUNGER_MAX, HUNGER_FRAME_RATE } from './hunger-constants';
import {
  DASH_STAMINA_DRAIN_RATE,
  AI_DASH_STAMINA_DRAIN_RATE,
  DASH_ATTACK_STAMINA_COST,
  PREY_FLEE_STAMINA_MULTIPLIER,
  ATTACK_LARGER_STAMINA_MULTIPLIER,
  EXHAUSTED_REGEN_MULTIPLIER,
} from './dash-constants';
import { STAMINA } from './canvas-constants';
import type { FishLifecycleState } from './combat-states';

export interface HungerStaminaEntity {
  hunger?: number;
  hungerDrainRate?: number;
  baseMaxStamina?: number;
  stamina?: number;
  maxStamina?: number;
  isDashing?: boolean;
  lifecycleState?: FishLifecycleState;
}

/** Compute effective max stamina from hunger (0-100). Bar shrinks when hungry. */
export function computeEffectiveMaxStamina(baseMaxStamina: number, hunger: number): number {
  return Math.max(0, baseMaxStamina * (Math.max(0, hunger) / 100));
}

/** True if stamina > 0 (can dash). */
export function canDash(entity: HungerStaminaEntity): boolean {
  const s = entity.stamina ?? 0;
  return s > 0;
}

/** True if stamina <= 0 (exhausted: 75% speed, vulnerable to KO on hit). */
export function isExhausted(entity: HungerStaminaEntity): boolean {
  const s = entity.stamina ?? 0;
  return s <= 0;
}

/** True if starved: hunger <= 0 or effective max stamina is 0. */
export function isStarved(entity: HungerStaminaEntity): boolean {
  const hunger = entity.hunger ?? 100;
  const base = entity.baseMaxStamina ?? entity.maxStamina ?? STAMINA.DEFAULT_MAX;
  if (hunger <= 0) return true;
  return computeEffectiveMaxStamina(base, hunger) <= 0;
}

/** Drain hunger over time. Movement factor: 0-1 (idle = COLLISION.STATIONARY_DRAIN_FRACTION). */
export function updateHunger(
  entity: HungerStaminaEntity,
  deltaTime: number,
  options: { movementFactor?: number } = {}
): void {
  const hunger = entity.hunger ?? HUNGER_MAX;
  const drainRate = entity.hungerDrainRate ?? 2.5;
  const movementFactor = options.movementFactor ?? 1;
  const effectiveDrainRate = drainRate * movementFactor;
  const newHunger = Math.max(0, hunger - (effectiveDrainRate / HUNGER_FRAME_RATE) * deltaTime);
  if ('hunger' in entity) (entity as { hunger: number }).hunger = newHunger;
}

/** Drain stamina on dash, regen when idle. Uses effective max from hunger. */
export function updateStamina(
  entity: HungerStaminaEntity,
  deltaTime: number,
  options: {
    drainRate?: number;
    rampMultiplier?: number;
    fleeMultiplier?: number;
    regenRate?: number;
    regenMultiplier?: number;
    isPlayer?: boolean;
  } = {}
): void {
  const baseMax = entity.baseMaxStamina ?? entity.maxStamina ?? STAMINA.DEFAULT_MAX;
  const hunger = entity.hunger ?? HUNGER_MAX;
  const effectiveMax = computeEffectiveMaxStamina(baseMax, hunger);
  let stamina = entity.stamina ?? effectiveMax;

  const {
    drainRate = DASH_STAMINA_DRAIN_RATE,
    rampMultiplier = 1,
    fleeMultiplier = 1,
    regenRate = options.isPlayer ? STAMINA.PLAYER_REGEN_RATE : STAMINA.AI_REGEN_RATE,
    regenMultiplier: customRegenMult,
  } = options;

  if (entity.isDashing && stamina > 0) {
    stamina = Math.max(0, stamina - drainRate * rampMultiplier * fleeMultiplier * (deltaTime / 60));
  } else {
    const inRecoveryZone = stamina <= effectiveMax * 0.25;
    const exhaustedMult = inRecoveryZone ? EXHAUSTED_REGEN_MULTIPLIER : 1;
    const regenMult = customRegenMult ?? exhaustedMult;
    stamina = Math.min(effectiveMax, stamina + regenRate * regenMult * (deltaTime / 60));
  }

  if ('stamina' in entity) (entity as { stamina: number }).stamina = stamina;
  if ('maxStamina' in entity) (entity as { maxStamina: number }).maxStamina = effectiveMax;
}

/** Apply stamina cost (e.g. from dash attack). Clamps to 0. */
export function applyStaminaCost(
  entity: HungerStaminaEntity,
  cost: number,
  options?: { targetSizeRatio?: number }
): void {
  const mult = options?.targetSizeRatio != null && options.targetSizeRatio < 1
    ? ATTACK_LARGER_STAMINA_MULTIPLIER
    : 1;
  const current = entity.stamina ?? STAMINA.DEFAULT_MAX;
  const newStamina = Math.max(0, current - cost * mult);
  if ('stamina' in entity) (entity as { stamina: number }).stamina = newStamina;
}

/** Target with lifecycle (fish). */
interface TargetWithLifecycle extends HungerStaminaEntity {
  lifecycleState?: FishLifecycleState;
}

/**
 * Apply attack to target. If target is exhausted, KO immediately.
 * Otherwise apply stamina cost; if cost brings to 0, target becomes exhausted.
 */
export function applyAttackToTarget(
  attacker: HungerStaminaEntity,
  target: TargetWithLifecycle,
  cost: number,
  options?: { targetSizeRatio?: number }
): void {
  const targetStamina = target.stamina ?? STAMINA.DEFAULT_MAX;
  if (targetStamina <= 0) {
    target.lifecycleState = 'knocked_out';
    if ('stamina' in target) (target as { stamina: number }).stamina = 0;
    return;
  }
  applyStaminaCost(target, cost, options);
}

/** Restore hunger when eating. */
export function restoreHunger(entity: HungerStaminaEntity, amount: number): void {
  const current = entity.hunger ?? HUNGER_MAX;
  const added = Math.min(amount, HUNGER_MAX - current);
  if ('hunger' in entity) (entity as { hunger: number }).hunger = current + added;
}

/** Init hunger/stamina fields on entity. */
export function initHungerStamina(
  entity: HungerStaminaEntity,
  defaults: {
    hunger?: number;
    hungerDrainRate?: number;
    baseMaxStamina?: number;
    stamina?: number;
  } = {}
): void {
  const baseMax = defaults.baseMaxStamina ?? STAMINA.BASE_MAX_START;
  const hunger = defaults.hunger ?? HUNGER_MAX;
  const effectiveMax = computeEffectiveMaxStamina(baseMax, hunger);
  Object.assign(entity, {
    hunger: defaults.hunger ?? HUNGER_MAX,
    hungerDrainRate: defaults.hungerDrainRate ?? 2.5,
    baseMaxStamina: baseMax,
    stamina: defaults.stamina ?? effectiveMax,
    maxStamina: effectiveMax,
  });
}
