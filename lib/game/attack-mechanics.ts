/**
 * Attack Mechanics Module
 * Handles fish attack behavior including lunging, biting, and retraction
 */

import type Matter from 'matter-js';
import type { PhysicsEngine } from './physics';

/**
 * Attack state for an entity
 */
export interface AttackState {
  isAttacking: boolean;
  attackStartTime: number;
  lastAttackTime: number;
  attackCooldown: number; // ms between attacks
  attackPhase: 'idle' | 'lunge' | 'bite' | 'retract';
  lungeTarget?: { x: number; y: number };
  originalPosition?: { x: number; y: number };
}

/**
 * Attack configuration constants
 */
export const ATTACK_CONFIG = {
  // Cooldown to allow animations to play
  ATTACK_COOLDOWN: 500, // ms between attacks
  
  // Lunge phase (moving toward target)
  LUNGE_DURATION: 150, // ms
  LUNGE_SPEED_MULTIPLIER: 3.0, // Speed boost during lunge
  
  // Bite phase (actual damage dealt)
  BITE_DURATION: 100, // ms
  
  // Retract phase (pulling back slightly)
  RETRACT_DURATION: 200, // ms
  RETRACT_DISTANCE: 15, // pixels to retract
  
  // Total attack animation time
  get TOTAL_ATTACK_TIME() {
    return this.LUNGE_DURATION + this.BITE_DURATION + this.RETRACT_DURATION;
  }
};

/**
 * Initialize attack state for an entity
 */
export function createAttackState(): AttackState {
  return {
    isAttacking: false,
    attackStartTime: 0,
    lastAttackTime: 0,
    attackCooldown: ATTACK_CONFIG.ATTACK_COOLDOWN,
    attackPhase: 'idle',
  };
}

/**
 * Check if entity can attack (cooldown check)
 */
export function canAttack(state: AttackState, currentTime: number): boolean {
  if (state.isAttacking) return false;
  return currentTime - state.lastAttackTime >= state.attackCooldown;
}

/**
 * Start an attack
 */
export function startAttack(
  state: AttackState, 
  currentTime: number,
  attackerPos: { x: number; y: number },
  targetPos: { x: number; y: number }
): AttackState {
  return {
    ...state,
    isAttacking: true,
    attackStartTime: currentTime,
    lastAttackTime: currentTime,
    attackPhase: 'lunge',
    lungeTarget: { ...targetPos },
    originalPosition: { ...attackerPos },
  };
}

/**
 * Update attack animation state
 * Returns the current phase and whether damage should be dealt
 */
export function updateAttackAnimation(
  state: AttackState,
  currentTime: number
): { state: AttackState; shouldDealDamage: boolean } {
  if (!state.isAttacking) {
    return { state, shouldDealDamage: false };
  }

  const elapsed = currentTime - state.attackStartTime;
  let shouldDealDamage = false;

  // Update phase based on elapsed time
  if (elapsed < ATTACK_CONFIG.LUNGE_DURATION) {
    // Still lunging
    state = { ...state, attackPhase: 'lunge' };
  } else if (elapsed < ATTACK_CONFIG.LUNGE_DURATION + ATTACK_CONFIG.BITE_DURATION) {
    // Bite phase - deal damage at start of this phase
    if (state.attackPhase !== 'bite') {
      shouldDealDamage = true;
    }
    state = { ...state, attackPhase: 'bite' };
  } else if (elapsed < ATTACK_CONFIG.TOTAL_ATTACK_TIME) {
    // Retract phase
    state = { ...state, attackPhase: 'retract' };
  } else {
    // Attack complete
    state = {
      ...state,
      isAttacking: false,
      attackPhase: 'idle',
      lungeTarget: undefined,
      originalPosition: undefined,
    };
  }

  return { state, shouldDealDamage };
}

/**
 * Apply attack movement forces (lunge and retract)
 */
export function applyAttackForces(
  state: AttackState,
  body: Matter.Body,
  physics: PhysicsEngine,
  baseSpeed: number
): void {
  if (!state.isAttacking || !state.lungeTarget || !state.originalPosition) return;

  const currentPos = { x: body.position.x, y: body.position.y };

  if (state.attackPhase === 'lunge') {
    // Lunge toward target
    const dx = state.lungeTarget.x - currentPos.x;
    const dy = state.lungeTarget.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 1) {
      const angle = Math.atan2(dy, dx);
      const forceX = Math.cos(angle) * baseSpeed * ATTACK_CONFIG.LUNGE_SPEED_MULTIPLIER * 0.02;
      const forceY = Math.sin(angle) * baseSpeed * ATTACK_CONFIG.LUNGE_SPEED_MULTIPLIER * 0.02;
      physics.applyForce(body, { x: forceX, y: forceY });
    }
  } else if (state.attackPhase === 'retract') {
    // Retract back slightly
    const dx = state.originalPosition.x - currentPos.x;
    const dy = state.originalPosition.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < ATTACK_CONFIG.RETRACT_DISTANCE) {
      // Calculate direction away from target
      const awayDx = currentPos.x - state.lungeTarget.x;
      const awayDy = currentPos.y - state.lungeTarget.y;
      const awayDist = Math.sqrt(awayDx * awayDx + awayDy * awayDy);
      
      if (awayDist > 0) {
        const angle = Math.atan2(awayDy, awayDx);
        const forceX = Math.cos(angle) * baseSpeed * 0.01;
        const forceY = Math.sin(angle) * baseSpeed * 0.01;
        physics.applyForce(body, { x: forceX, y: forceY });
      }
    }
  }
  // During 'bite' phase, no additional forces applied
}
