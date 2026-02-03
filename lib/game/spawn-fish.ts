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
 * Player size constants based on art asset specifications
 * Art supports min scale 20, max scale 300
 * Players start small and grow to defeat bosses by level 1-4
 */
export const PLAYER_START_SIZE = 20;  // Starting size for new runs
export const PLAYER_MAX_SIZE = 300;    // Target size by level 1-4

/**
 * Absolute size ranges per tier - simple and predictable.
 * No complex multipliers or player-relative blending.
 */
export const TIER_SIZE_RANGES: Record<string, { min: number; max: number }> = {
  prey: { min: 15, max: 25 },      // Smaller than player start
  mid: { min: 25, max: 50 },       // Similar to player start, some eatable
  predator: { min: 60, max: 120 },  // Dangerous early, eatable later
  boss: { min: 200, max: 350 },    // End-goal, requires growth to defeat
};

/**
 * Compute an encounter size for a creature based on its tier.
 * 
 * SIMPLIFIED DESIGN:
 * - Sizes are determined by tier, not creature stats
 * - Small random variance within tier for visual variety
 * - Level scaling adds 10% per level
 * - No player-relative blending (removed - was causing confusion)
 * 
 * @param forceSmall - If true, use the minimum of the tier range
 */
export function computeEncounterSize(options: {
  creature: Creature;
  biomeId?: string;
  levelNumber?: number;
  playerSize?: number; // Kept for API compatibility, but not used
  forceSmall?: boolean;
}): number {
  const { creature, levelNumber = 1, forceSmall = false } = options;

  // Determine tier from explicit sizeTier, creature type, or infer from stats
  const tier: SizeTier = (creature.sizeTier as SizeTier)
    ?? inferTierFromType(creature.type)
    ?? inferSizeTierFromStats(creature);

  const range = TIER_SIZE_RANGES[tier] ?? TIER_SIZE_RANGES.mid;

  // Pick size within tier range
  let size: number;
  if (forceSmall) {
    // Use minimum of range for "easy targets"
    size = range.min;
  } else {
    // Random variance within tier range
    size = range.min + Math.random() * (range.max - range.min);
  }

  // Level scaling: +10% per level beyond 1
  const levelMult = 1 + (levelNumber - 1) * 0.10;
  size *= levelMult;

  // Clamp to reasonable bounds
  return Math.round(Math.max(20, Math.min(size, 200)));
}

/**
 * Infer tier from creature type (prey/predator/mutant)
 */
function inferTierFromType(type: string): SizeTier | null {
  if (type === 'prey') return 'prey';
  if (type === 'predator') return 'predator';
  if (type === 'mutant') return 'predator';
  return null;
}

/**
 * Fallback: infer tier from stats.size if type doesn't give us info
 */
function inferSizeTierFromStats(creature: Creature): SizeTier {
  const s = creature.stats.size;
  if (s <= 50) return 'prey';
  if (s <= 80) return 'mid';
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
