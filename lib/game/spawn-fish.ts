/**
 * Centralized Fish Spawning Utility
 * 
 * This module provides a unified interface for spawning both player and AI fish
 * in the editor and main game, using full Creature/FishData metadata.
 * 
 * Requirements:
 * - Accept full Creature object with all metadata
 * - Support player vs AI spawning modes
 * - Support position/size/speed overrides
 * - Initialize all fields (stats, physics, abilities, sprite)
 * - Easily extensible for future features
 */

import { Fish } from './entities';
import type { PhysicsEngine } from './physics';
import type { Creature } from './types';
import { FishData } from '@/components/FishEditOverlay';
import type { SizeTier } from './data/creatures';

/**
 * Options for spawning a fish entity (game engine)
 */
export interface SpawnFishOptions {
  /** The creature definition to spawn from */
  creature: Creature;

  /** Physics engine instance */
  physics: PhysicsEngine;

  /** Spawn position */
  position: {
    x: number;
    y: number;
  };

  /** Whether this is a player-controlled fish */
  isPlayer?: boolean;

  /** Override size (otherwise uses creature.stats.size with variance) */
  size?: number;

  /** Override speed (otherwise uses creature.stats.speed with variance) */
  speed?: number;

  /** Size variance multiplier (default: 0.9-1.1 for AI, 1.0 for player) */
  sizeVariance?: { min: number; max: number };

  /** Speed variance multiplier (default: 0.9-1.1 for AI, 1.0 for player) */
  speedVariance?: { min: number; max: number };

  /** Reference size for relative size calculation (e.g., player size) */
  relativeToSize?: number;

  /** Custom ID for the fish entity */
  id?: string;
}

/**
 * Options for spawning a fish from FishData (editor)
 */
export interface SpawnFishFromDataOptions {
  isPlayer?: boolean;
  position?: { x: number; y: number };
  overrides?: Partial<FishData>;
}

/**
 * Spawn a fish entity from a Creature definition
 * 
 * This function handles all aspects of fish spawning:
 * - Initializes physics body
 * - Sets stats from creature metadata
 * - Applies size/speed variance
 * - Stores creature ID and metadata references
 * - Supports both player and AI spawning
 * 
 * @param options Spawn configuration options
 * @returns The spawned Fish entity
 */
export function spawnFish(options: SpawnFishOptions): Fish {
  const {
    creature,
    physics,
    position,
    isPlayer = false,
    size: overrideSize,
    speed: overrideSpeed,
    sizeVariance,
    speedVariance,
    relativeToSize,
    id,
  } = options;

  // Calculate size with variance if not overridden
  let finalSize = overrideSize ?? creature.stats.size;

  if (!overrideSize && !isPlayer) {
    // Apply size variance for AI fish
    const variance = sizeVariance ?? getDefaultSizeVariance(creature, relativeToSize);
    const varianceMult = variance.min + Math.random() * (variance.max - variance.min);
    finalSize = creature.stats.size * varianceMult;
  }

  // Calculate speed with variance if not overridden
  let finalSpeed = overrideSpeed ?? creature.stats.speed;

  if (!overrideSpeed && !isPlayer) {
    // Apply speed variance for AI fish
    const variance = speedVariance ?? { min: 0.9, max: 1.1 };
    const varianceMult = variance.min + Math.random() * (variance.max - variance.min);
    finalSpeed = creature.stats.speed * varianceMult;
  }

  // Create the fish entity
  const fish = new Fish(
    physics,
    {
      x: position.x,
      y: position.y,
      size: finalSize,
      type: creature.type === 'mutant' ? 'predator' : creature.type,
      speed: finalSpeed,
    },
    id
  );

  // Store creature metadata on the fish for reference
  // This allows game systems to access essence types, abilities, etc.
  Object.assign(fish, {
    creatureId: creature.id,
    creatureName: creature.name,
    rarity: creature.rarity,
    biomeId: creature.biomeId,
    essenceTypes: creature.essenceTypes,
    grantedAbilities: creature.grantedAbilities ?? [],
    sprite: creature.sprite,
  });

  return fish;
}

/**
 * Calculate default size variance based on creature and reference size
 * 
 * This implements the game's size variance logic:
 * - Small prey: 90-110% of base (tight variance)
 * - Large predators: 100-130% of base (can be very threatening)
 * - Similar size: 80-120% of base (more variety)
 */
function getDefaultSizeVariance(
  creature: Creature,
  relativeToSize?: number
): { min: number; max: number } {
  if (!relativeToSize || relativeToSize <= 0) {
    // No reference size or invalid size - use moderate variance
    return { min: 0.9, max: 1.1 };
  }

  const baseSize = creature.stats.size;

  if (baseSize < relativeToSize * 0.8) {
    // Small prey - keep close to base size
    return { min: 0.9, max: 1.1 }; // 90-110% of base
  } else if (baseSize > relativeToSize * 1.2) {
    // Large predator - keep threatening
    return { min: 1.0, max: 1.3 }; // 100-130% of base
  } else {
    // Similar size - add more variance
    return { min: 0.8, max: 1.2 }; // 80-120% of base
  }
}

/**
 * Spawn a player fish from a Creature definition
 * 
 * Convenience wrapper for spawning player-controlled fish.
 * Uses exact stats from creature without variance.
 */
export function spawnPlayerFish(
  creature: Creature,
  physics: PhysicsEngine,
  position: { x: number; y: number },
  id?: string
): Fish {
  return spawnFish({
    creature,
    physics,
    position,
    isPlayer: true,
    id,
  });
}

/**
 * Spawn an AI fish from a Creature definition
 * 
 * Convenience wrapper for spawning AI-controlled fish.
 * Applies size and speed variance based on creature and player size.
 */
export function spawnAIFish(
  creature: Creature,
  physics: PhysicsEngine,
  position: { x: number; y: number },
  playerSize?: number,
  id?: string
): Fish {
  return spawnFish({
    creature,
    physics,
    position,
    isPlayer: false,
    relativeToSize: playerSize,
    id,
  });
}

/**
 * Compute an encounter size for a creature based on its size tier, biome, and level.
 * This is used by both the game loop and editor to avoid hard-coding absolute sizes.
 */
export function computeEncounterSize(options: {
  creature: Creature;
  biomeId?: string;
  levelNumber?: number;
  playerSize?: number;
}): number {
  const { creature, levelNumber = 1, playerSize } = options;

  const baseStatSize = creature.stats.size || 60;

  // Prefer explicit sizeTier when present, otherwise infer from stats/type.
  const tier: SizeTier = (creature.sizeTier as SizeTier) ?? inferSizeTierFromStats(creature);

  // Base multipliers per tier (relative to stat size).
  const BASE_SIZE_BY_TIER: Record<string, number> = {
    prey: 0.8,
    mid: 1.0,
    predator: 1.3,
    boss: 1.6,
  };

  const tierMult = BASE_SIZE_BY_TIER[tier] ?? 1.0;

  // Simple level-based scaling (15% per level as a starting point).
  const levelMult = 1 + (levelNumber - 1) * 0.15;

  let size = baseStatSize * tierMult * levelMult;

  // Optionally nudge size relative to player so prey tend to be smaller
  // and predators tend to be larger, even as the player grows.
  if (playerSize && playerSize > 0) {
    let targetRatio = 1.0;
    if (creature.type === 'prey') {
      targetRatio = 0.7;
    } else if (creature.type === 'predator' || tier === 'boss') {
      targetRatio = 1.4;
    }
    const desired = playerSize * targetRatio;
    // Blend between computed size and desired ratio to keep behaviour stable.
    size = (size * 0.5) + (desired * 0.5);
  }

  // Clamp to sensible bounds so sprites are visible but not absurd.
  return Math.max(40, Math.min(size, 260));
}

function inferSizeTierFromStats(creature: Creature): SizeTier {
  const s = creature.stats.size;
  if (s <= 70) return 'prey';
  if (s <= 90) return 'mid';
  if (s <= 120) return 'predator';
  return 'boss';
}

/**
 * Shared utility to spawn a fish entity (player or AI) with full data.
 * Used by the editor for consistent spawning.
 * 
 * This function returns a plain object suitable for editor use,
 * unlike spawnFish() which returns a Fish entity with physics.
 */
export function spawnFishFromData(
  fishData: FishData,
  options: SpawnFishFromDataOptions = {}
) {
  const {
    isPlayer = false,
    position = { x: 400, y: 300 },
    overrides = {},
  } = options;

  // Merge overrides
  const data: FishData = { ...fishData, ...overrides };

  // Core entity structure (add more as needed for game/physics)
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    stats: { ...data.stats },
    sprite: data.sprite,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    size: data.stats.size,
    health: data.stats.health,
    damage: data.stats.damage,
    facingRight: true,
    verticalTilt: 0,
    animTime: 0,
    chompPhase: 0,
    chompEndTime: 0,
    hunger: 100,
    hungerDrainRate: 0.1,
    abilities: data.grantedAbilities || [],
    isPlayer,
    // Add more fields as needed for the game/editor
  };
}
