/**
 * Combat Resolution Module
 * Health-based damage calculation and attack resolution.
 * Single responsibility: compute damage and apply health changes.
 *
 * ALL combat timers use performance.now() — never game-relative currentTime.
 */

import { COMBAT, AI } from './canvas-constants';

export interface AttackResult {
  damage: number;
  died: boolean;
  overkill: number;
}

/**
 * Compute size-ratio damage multiplier.
 * Bigger attacker → more damage. Smaller attacker → reduced damage.
 */
function sizeRatioMultiplier(ratio: number): number {
  if (ratio >= 2.0) return 2.0 + (ratio - 2.0) * 0.5; // one-shot range, soft cap
  if (ratio >= 1.5) return 1.5;
  if (ratio >= 1.2) return 1.2;
  if (ratio >= 0.8) return 1.0;
  return 0.5; // small attacker vs big target: half damage
}

/**
 * Resolve a single attack: compute damage, apply to target health, return result.
 *
 * @param attacker - entity performing the attack (needs size, position)
 * @param target   - entity receiving damage (health is mutated in-place)
 * @param options  - overrides (attackerDamage base, etc.)
 */
export function resolveAttack(
  attacker: { size: number; x: number; y: number; facingRight?: boolean },
  target: {
    health?: number;
    maxHealth?: number;
    size: number;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    hitFlashEndTime?: number;
    hitPunchScaleEndTime?: number;
    attackFlashEndTime?: number;
    lastDamagedTime?: number;
  },
  options?: { attackerDamage?: number }
): AttackResult {
  const baseDamage = options?.attackerDamage ?? 10;
  const sizeScale = attacker.size / 40; // normalise around size 40
  const ratio = attacker.size / Math.max(target.size, 1);
  const mult = sizeRatioMultiplier(ratio);
  const damage = Math.round(baseDamage * sizeScale * mult);

  const currentHealth = target.health ?? (target.maxHealth ?? 20);
  const newHealth = Math.max(0, currentHealth - damage);

  // Always write back — no conditional
  target.health = newHealth;

  // Set combat animation timers
  const now = performance.now();
  target.hitFlashEndTime = now + COMBAT.HIT_FLASH_DURATION;
  target.hitPunchScaleEndTime = now + COMBAT.HIT_PUNCH_DURATION;
  target.lastDamagedTime = now;

  // Attacker flash
  if ('attackFlashEndTime' in attacker) {
    (attacker as { attackFlashEndTime?: number }).attackFlashEndTime =
      now + COMBAT.ATTACK_FLASH_DURATION;
  }

  return {
    damage,
    died: newHealth <= 0,
    overkill: Math.max(0, damage - currentHealth),
  };
}

/**
 * Whether target should fight back when attacked.
 * Prey: fight back when bigger than attacker.
 * Predator: fight back when >= FISH_FIGHT_BACK_PREDATOR_SIZE_RATIO of attacker.
 */
export function shouldFightBack(
  attacker: { size: number; type?: string },
  target: { size: number; type?: string }
): boolean {
  if (target.type === 'prey') return target.size > attacker.size;
  if (target.type === 'predator' || target.type === 'mutant') {
    return target.size >= attacker.size * AI.FISH_FIGHT_BACK_PREDATOR_SIZE_RATIO;
  }
  return false;
}
