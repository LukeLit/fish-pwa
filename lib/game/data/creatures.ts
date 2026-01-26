/**
 * Creature Definitions
 * Based on DATA_STRUCTURE.md and VERTICAL_SLICE.md specifications
 */
import type { Creature } from '../types';

/**
 * Starter fish - Goldfish
 * Used in the vertical slice for new players
 */
export const CREATURE_GOLDFISH: Creature = {
  id: 'goldfish_starter',
  name: 'Goldfish',
  description: 'A small, hardy fish perfect for beginners. Fast and agile.',
  type: 'prey',
  rarity: 'common',
  sprite: '/sprites/fish/goldfish.png',
  biomeId: 'shallow',
  stats: {
    size: 20, // Very small - smaller than most fish
    speed: 7, // Fast for survival
    health: 15, // Low health - must be careful
    damage: 3, // Low damage - can only eat very small fish
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 3,
    },
  ],
  grantedAbilities: [], // No abilities for starter
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 10,
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * Small prey fish - for the player to eat
 */
export const CREATURE_SMALL_PREY: Creature = {
  id: 'small_prey',
  name: 'Minnow',
  description: 'A tiny fish, easy prey for larger fish.',
  type: 'prey',
  rarity: 'common',
  sprite: '/sprites/fish/minnow.png',
  biomeId: 'shallow',
  stats: {
    size: 10, // Very small
    speed: 5,
    health: 5,
    damage: 1,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 2,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 30,
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * Medium predator - a threat to the player
 */
export const CREATURE_MEDIUM_PREDATOR: Creature = {
  id: 'medium_predator',
  name: 'Bass',
  description: 'A medium-sized predator, dangerous to small fish.',
  type: 'predator',
  rarity: 'common',
  sprite: '/sprites/fish/bass.png',
  biomeId: 'shallow',
  stats: {
    size: 40, // Larger than starter
    speed: 4,
    health: 30,
    damage: 10,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 8,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 15,
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * All creatures available in the game
 */
export const CREATURES: Record<string, Creature> = {
  goldfish_starter: CREATURE_GOLDFISH,
  small_prey: CREATURE_SMALL_PREY,
  medium_predator: CREATURE_MEDIUM_PREDATOR,
};

/**
 * Get all creatures as an array
 */
export function getAllCreatures(): Creature[] {
  return Object.values(CREATURES);
}

/**
 * Get creature by ID
 */
export function getCreature(id: string): Creature | undefined {
  return CREATURES[id];
}

/**
 * Get creatures by biome
 */
export function getCreaturesByBiome(biomeId: string): Creature[] {
  return getAllCreatures().filter((creature) =>
    creature.spawnRules.canAppearIn.includes(biomeId)
  );
}

/**
 * Get starter creatures (unlocked by default)
 */
export function getStarterCreatures(): Creature[] {
  return [CREATURE_GOLDFISH];
}
