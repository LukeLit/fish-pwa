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

/**
 * Options for spawning a fish
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
