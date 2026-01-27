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
  sprite: '/sprites/fish/goldfish.svg',
  biomeId: 'shallow',
  playable: true, // Can be selected as player fish
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
  sprite: '/sprites/fish/minnow.svg',
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
  sprite: '/sprites/fish/bass.svg',
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
 * Tiny prey fish - Very small and easy to catch
 */
export const CREATURE_TINY_FISH: Creature = {
  id: 'tiny_fish',
  name: 'Guppy',
  description: 'The smallest fish in the ocean. Easy prey.',
  type: 'prey',
  rarity: 'common',
  sprite: '/sprites/fish/minnow.svg',
  biomeId: 'shallow',
  stats: {
    size: 5, // Tiny
    speed: 6,
    health: 3,
    damage: 0,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 1,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 40, // Very common
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * Medium competition fish - Similar size to starter
 */
export const CREATURE_MEDIUM_FISH: Creature = {
  id: 'medium_fish',
  name: 'Perch',
  description: 'A medium-sized fish, neither prey nor predator.',
  type: 'prey',
  rarity: 'common',
  sprite: '/sprites/fish/goldfish.svg',
  biomeId: 'shallow',
  stats: {
    size: 25, // Similar to goldfish
    speed: 5,
    health: 20,
    damage: 5,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 5,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 20,
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * Large predator - Dangerous to small fish
 */
export const CREATURE_LARGE_PREDATOR: Creature = {
  id: 'large_predator',
  name: 'Pike',
  description: 'A large predator, very dangerous.',
  type: 'predator',
  rarity: 'uncommon',
  sprite: '/sprites/fish/bass.svg',
  biomeId: 'shallow',
  stats: {
    size: 60, // Much larger
    speed: 3,
    health: 50,
    damage: 15,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 12,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 5, // Less common
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * Rare fish with multiple essence types
 */
export const CREATURE_RARE_TROPICAL: Creature = {
  id: 'rare_tropical',
  name: 'Rainbow Fish',
  description: 'A rare, colorful fish found in shallow tropical waters.',
  type: 'prey',
  rarity: 'rare',
  sprite: '/sprites/fish/goldfish.svg',
  biomeId: 'shallow',
  stats: {
    size: 30,
    speed: 6,
    health: 25,
    damage: 5,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 8,
    },
    {
      type: 'tropical',
      baseYield: 5,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 5, // Rare spawn
    minDepth: 0,
    maxDepth: 50,
  },
};

/**
 * Epic predator with multiple essence types
 */
export const CREATURE_EPIC_SHARK: Creature = {
  id: 'epic_shark',
  name: 'Great White',
  description: 'A massive, powerful predator of the deep.',
  type: 'predator',
  rarity: 'epic',
  sprite: '/sprites/fish/bass.svg',
  biomeId: 'shallow',
  stats: {
    size: 100,
    speed: 4,
    health: 80,
    damage: 25,
  },
  essenceTypes: [
    {
      type: 'shallow',
      baseYield: 15,
    },
    {
      type: 'deep_sea',
      baseYield: 10,
    },
  ],
  spawnRules: {
    canAppearIn: ['shallow'],
    spawnWeight: 2, // Very rare spawn
    minDepth: 20,
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
  tiny_fish: CREATURE_TINY_FISH,
  medium_fish: CREATURE_MEDIUM_FISH,
  large_predator: CREATURE_LARGE_PREDATOR,
  rare_tropical: CREATURE_RARE_TROPICAL,
  epic_shark: CREATURE_EPIC_SHARK,
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
