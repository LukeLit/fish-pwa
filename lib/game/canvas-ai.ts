/**
 * AI System for Canvas Game
 * Handles predator/prey behavior, chase/flee logic, and KO state
 */

import type { CanvasConfig } from './canvas-config';
import { DASH_SPEED_MULTIPLIER, KO_STAMINA_REGEN_MULTIPLIER, KO_WAKE_THRESHOLD, KO_DRIFT_SPEED, PREY_FLEE_STAMINA_MULTIPLIER } from './dash-constants';
import { PHYSICS, SPAWN, ANIMATION } from './canvas-constants';

export interface AIFish {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: 'prey' | 'predator' | 'mutant' | string;
  stamina?: number;
  maxStamina?: number;
  isDashing?: boolean;
  chaseTargetId?: string;
  chaseStartTime?: number;
  lifecycleState: 'spawning' | 'active' | 'knocked_out' | 'despawning' | 'removed';
  facingRight: boolean;
  verticalTilt: number;
  animTime: number;
  opacity?: number;
  spawnTime?: number;
  despawnTime?: number;
}

export interface PlayerState {
  x: number;
  y: number;
  size: number;
}

export interface UpdateStaminaFunction {
  (entity: { stamina: number; maxStamina: number; isDashing: boolean }, deltaTime: number, options?: {
    drainRate?: number;
    rampMultiplier?: number;
    fleeMultiplier?: number;
    regenRate?: number;
  }): void;
}

/**
 * Update AI fish behavior
 */
export function updateAIFish(
  fish: AIFish,
  deltaTime: number,
  others: AIFish[],
  player: PlayerState,
  now: number,
  config: CanvasConfig['ai'],
  isEditMode: boolean,
  isPaused: boolean,
  isGameMode: boolean,
  updateStamina: UpdateStaminaFunction,
  worldBounds: { minX: number; maxX: number; minY: number; maxY: number }
): void {
  // Ensure AI fish have stamina
  if (fish.stamina === undefined) fish.stamina = 100;
  if (fish.maxStamina === undefined) fish.maxStamina = 100;
  if (fish.isDashing === undefined) fish.isDashing = false;

  // Update opacity based on lifecycle state
  if (fish.despawnTime !== undefined) {
    const elapsed = now - fish.despawnTime;
    fish.opacity = Math.max(0, 1 - elapsed / SPAWN.FADE_DURATION);
    if (fish.opacity <= 0) {
      fish.lifecycleState = 'removed';
    }
  } else if (fish.spawnTime !== undefined) {
    const elapsed = now - fish.spawnTime;
    fish.opacity = Math.max(0, Math.min(1, elapsed / SPAWN.FADE_DURATION));
    if (fish.opacity >= 1 && fish.lifecycleState === 'spawning') {
      fish.lifecycleState = 'active';
    }
  } else {
    fish.opacity = 1;
    if (!fish.lifecycleState) {
      fish.lifecycleState = 'active';
    }
  }

  if (isEditMode || isPaused) {
    // Lock fish movement in edit mode
    fish.vx = 0;
    fish.vy = 0;
    if (fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant') {
      fish.isDashing = false;
    }
  } else if (isGameMode) {
    // KO fish: drift slowly, regenerate stamina, wake at threshold
    if (fish.lifecycleState === 'knocked_out') {
      fish.stamina = Math.min(
        fish.maxStamina ?? 100,
        (fish.stamina ?? 0) + config.staminaRegen * KO_STAMINA_REGEN_MULTIPLIER * (deltaTime / 60)
      );
      if ((fish.stamina ?? 0) >= (fish.maxStamina ?? 100) * KO_WAKE_THRESHOLD) {
        fish.lifecycleState = 'active';
      }
      fish.vx = (fish.vx ?? 0) * 0.98 + (Math.random() - 0.5) * KO_DRIFT_SPEED * 0.02;
      fish.vy = (fish.vy ?? 0) * 0.98 + (Math.random() - 0.5) * KO_DRIFT_SPEED * 0.02;
      const driftMag = Math.sqrt((fish.vx ?? 0) ** 2 + (fish.vy ?? 0) ** 2);
      if (driftMag > KO_DRIFT_SPEED) {
        fish.vx = (fish.vx! / driftMag) * KO_DRIFT_SPEED;
        fish.vy = (fish.vy! / driftMag) * KO_DRIFT_SPEED;
      }
    } else if ((fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant') && fish.lifecycleState === 'active') {
      const activeOthers = others.filter(
        (f) => (f.lifecycleState === 'active' || f.lifecycleState === 'knocked_out') && (f.opacity ?? 1) >= 1
      );
      const speedMult = (fish.isDashing && (fish.stamina ?? 0) > 0) ? DASH_SPEED_MULTIPLIER : 1;
      const baseSpeed = config.baseSpeed * speedMult;

      if (fish.type === 'predator' || fish.type === 'mutant') {
        updatePredatorBehavior(fish, activeOthers, player, now, baseSpeed, config, updateStamina, deltaTime);
      } else if (fish.type === 'prey') {
        updatePreyBehavior(fish, activeOthers, player, baseSpeed, config, updateStamina, deltaTime);
      }

      // Clamp speed
      const effectiveMax = (fish.type === 'predator' || fish.type === 'mutant')
        ? baseSpeed * config.predatorChaseSpeed
        : baseSpeed * config.preyFleeSpeed;
      const sp = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
      if (sp > effectiveMax && sp > 0) {
        fish.vx = (fish.vx / sp) * effectiveMax;
        fish.vy = (fish.vy / sp) * effectiveMax;
      }
    } else if (fish.type !== 'prey' && fish.type !== 'predator') {
      // Non-AI or edit mode: occasional random direction
      if (Math.random() < 0.01) {
        fish.vx = (Math.random() - 0.5) * 2;
        fish.vy = (Math.random() - 0.5) * 2;
      }
    }

    // Delta-time adjusted position update
    fish.x += fish.vx * deltaTime;
    fish.y += fish.vy * deltaTime;
  }

  // Update facing direction
  if (Math.abs(fish.vx) > 0.1) {
    fish.facingRight = fish.vx > 0;
  }

  // Update vertical tilt
  const maxTilt = PHYSICS.MAX_TILT;
  const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, fish.vy * PHYSICS.TILT_SENSITIVITY));
  fish.verticalTilt += (targetTilt - fish.verticalTilt) * PHYSICS.TILT_SMOOTHING;

  // Update animation time (consistent with physics system)
  const fishSpeed = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
  const normalizedSpeed = Math.min(1, fishSpeed / PHYSICS.MAX_SPEED);
  fish.animTime += ANIMATION.ANIM_TIME_BASE + normalizedSpeed * ANIMATION.ANIM_TIME_SPEED_MULT;

  // Keep fish in world bounds - bounce off edges
  if (fish.x < worldBounds.minX || fish.x > worldBounds.maxX) {
    fish.vx = -fish.vx;
    fish.x = Math.max(worldBounds.minX, Math.min(worldBounds.maxX, fish.x));
  }
  if (fish.y < worldBounds.minY || fish.y > worldBounds.maxY) {
    fish.vy = -fish.vy;
    fish.y = Math.max(worldBounds.minY, Math.min(worldBounds.maxY, fish.y));
  }
}

/**
 * Update predator behavior (chase prey/player)
 */
function updatePredatorBehavior(
  fish: AIFish,
  others: AIFish[],
  player: PlayerState,
  now: number,
  baseSpeed: number,
  config: CanvasConfig['ai'],
  updateStamina: UpdateStaminaFunction,
  deltaTime: number
): void {
  let targetX: number | null = null;
  let targetY: number | null = null;
  let targetId: string | null = null;
  let distToTarget = Infinity;

  // Check chase timeout
  const chaseElapsed = fish.chaseStartTime != null ? now - fish.chaseStartTime : 0;
  const sameTarget = fish.chaseTargetId != null;
  if (sameTarget && chaseElapsed > config.chaseTimeoutMs) {
    fish.chaseTargetId = undefined;
    fish.chaseStartTime = undefined;
  }

  // Find nearest prey (if not timed out)
  if (chaseElapsed <= config.chaseTimeoutMs) {
    for (const other of others) {
      if (other.size < fish.size * 0.8 && (other.type === 'prey' || other.lifecycleState === 'knocked_out')) {
        const dx = other.x - fish.x;
        const dy = other.y - fish.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < config.detectionRange && d < distToTarget) {
          distToTarget = d;
          targetX = other.x;
          targetY = other.y;
          targetId = other.id;
        }
      }
    }
    // Or hunt player if smaller
    if (player.size < fish.size * 0.8) {
      const pdx = player.x - fish.x;
      const pdy = player.y - fish.y;
      const pd = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pd < config.detectionRange && pd < distToTarget) {
        distToTarget = pd;
        targetX = player.x;
        targetY = player.y;
        targetId = 'player';
      }
    }
  }

  const maxSpeed = baseSpeed * config.predatorChaseSpeed;
  if (targetX != null && targetY != null && distToTarget > 5) {
    fish.chaseTargetId = targetId ?? undefined;
    if (fish.chaseStartTime == null) fish.chaseStartTime = now;
    const dx = targetX - fish.x;
    const dy = targetY - fish.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    fish.vx = (dx / len) * maxSpeed;
    fish.vy = (dy / len) * maxSpeed;
    fish.isDashing = distToTarget < fish.size * 6 && (fish.stamina ?? 0) > 15;
  } else {
    fish.chaseTargetId = undefined;
    fish.chaseStartTime = undefined;
    fish.vx += (Math.random() - 0.5) * 0.05;
    fish.vy += (Math.random() - 0.5) * 0.05;
    fish.isDashing = false;
  }

  updateStamina(fish, deltaTime);
  if ((fish.stamina ?? 0) <= 0) fish.isDashing = false;
}

/**
 * Update prey behavior (flee from predators/player)
 */
function updatePreyBehavior(
  fish: AIFish,
  others: AIFish[],
  player: PlayerState,
  baseSpeed: number,
  config: CanvasConfig['ai'],
  updateStamina: UpdateStaminaFunction,
  deltaTime: number
): void {
  let fleeX = 0;
  let fleeY = 0;
  let nearestThreatDist = Infinity;
  let threatened = false;

  for (const other of others) {
    if (other.size > fish.size * 1.2 && (other.type === 'predator' || other.type === 'mutant')) {
      const dx = fish.x - other.x;
      const dy = fish.y - other.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < config.detectionRange) {
        threatened = true;
        if (d < nearestThreatDist) nearestThreatDist = d;
        if (d > 0) {
          fleeX += dx / d;
          fleeY += dy / d;
        }
      }
    }
  }
  // Flee from player if player is bigger
  if (player.size > fish.size * 1.2) {
    const pdx = fish.x - player.x;
    const pdy = fish.y - player.y;
    const pd = Math.sqrt(pdx * pdx + pdy * pdy);
    if (pd < config.detectionRange) {
      threatened = true;
      if (pd < nearestThreatDist) nearestThreatDist = pd;
      if (pd > 0) {
        fleeX += pdx / pd;
        fleeY += pdy / pd;
      }
    }
  }

  const maxSpeed = baseSpeed * config.preyFleeSpeed;
  if (threatened) {
    const mag = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
    fish.vx = (fleeX / mag) * maxSpeed;
    fish.vy = (fleeY / mag) * maxSpeed;
    fish.isDashing = nearestThreatDist < fish.size * 8 && (fish.stamina ?? 0) > 15;
  } else {
    // Wander
    fish.vx += (Math.random() - 0.5) * 0.05;
    fish.vy += (Math.random() - 0.5) * 0.05;
    fish.isDashing = false;
  }

  // Prey flee stamina penalty
  const fleeDrainMult = fish.isDashing ? PREY_FLEE_STAMINA_MULTIPLIER : 1;
  updateStamina(fish, deltaTime, { fleeMultiplier: fleeDrainMult });
  if ((fish.stamina ?? 0) <= 0) fish.isDashing = false;
}
