/**
 * Creature Definitions
 * Based on DATA_STRUCTURE.md and VERTICAL_SLICE.md specifications
 */
import type { Creature } from '../types';
import { loadCreatureFromLocal, listCreaturesFromLocal } from '../../storage/local-fish-storage';

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
  const creatures = Object.values(CREATURES);

  // Add localStorage creatures if available
  if (typeof window !== 'undefined') {
    try {
      const localCreatures = listCreaturesFromLocal();

      // Merge local creatures, avoiding duplicates
      const creatureMap = new Map<string, Creature>();
      creatures.forEach((c: Creature) => creatureMap.set(c.id, c));
      localCreatures.forEach((c: Creature) => creatureMap.set(c.id, c));

      return Array.from(creatureMap.values());
    } catch (error) {
      // If localStorage module fails, just return static creatures
      // localStorage not available, using fallback
    }
  }

  return creatures;
}

/**
 * Get all creatures from blob storage
 * Fetches creature metadata from the API
 */
export async function getAllCreaturesFromBlob(): Promise<Creature[]> {
  try {
    const response = await fetch('/api/list-creatures');
    const result = await response.json();

    if (result.success && result.creatures) {
      return result.creatures;
    }

    return [];
  } catch (error) {
    // Handle blob storage error silently
    return [];
  }
}

/**
 * Get combined creatures (static + blob storage)
 * Blob storage creatures take precedence over static ones with the same ID
 */
export async function getCombinedCreatures(): Promise<Creature[]> {
  const staticCreatures = getAllCreatures();
  const blobCreatures = await getAllCreaturesFromBlob();

  // Create a map with static creatures as base
  const creatureMap = new Map<string, Creature>();
  staticCreatures.forEach(creature => creatureMap.set(creature.id, creature));

  // Override with blob creatures
  blobCreatures.forEach(creature => creatureMap.set(creature.id, creature));

  return Array.from(creatureMap.values());
}

/**
 * Size tier used for biome-based scaling.
 * For now we reuse the common tiers from markdown: prey, mid, predator, boss.
 */
export type SizeTier = 'prey' | 'mid' | 'predator' | 'boss' | string;

/**
 * Get blob creatures filtered by biome.
 * If none exist for that biome, falls back to blob creatures from any biome,
 * and only if there are no blob creatures at all do we fall back to static data.
 */
export async function getBlobCreaturesByBiome(biomeId: string): Promise<Creature[]> {
  try {
    const blobCreatures = await getAllCreaturesFromBlob();

    // First preference: blob creatures that can appear in this biome
    const filtered = blobCreatures.filter((creature) =>
      creature.spawnRules.canAppearIn.includes(biomeId)
    );

    if (filtered.length === 0) {
      // Second preference: any blob creatures at all
      if (blobCreatures.length > 0) {
        return blobCreatures;
      }

      // Final fallback: static creatures
      return getCreaturesByBiome(biomeId);
    }

    return filtered;
  } catch (error) {
    // Handle biome blob loading error silently
    return getCreaturesByBiome(biomeId);
  }
}

/**
 * Get creature by ID (checks blob storage first, then static)
 */
export async function getCreatureById(id: string): Promise<Creature | undefined> {
  // Try blob storage first
  try {
    const response = await fetch(`/api/get-creature?id=${id}`);
    const result = await response.json();

    if (result.success && result.creature) {
      return result.creature;
    }
  } catch (error) {
  }

  // Fall back to static data
  return CREATURES[id];
}

/**
 * Get creature by ID
 */
export function getCreature(id: string): Creature | undefined {
  // First check hardcoded creatures
  const hardcodedCreature = CREATURES[id];
  if (hardcodedCreature) {
    return hardcodedCreature;
  }

  // Check localStorage for custom created fish
  if (typeof window !== 'undefined') {
    try {
      const localCreature = loadCreatureFromLocal(id);
      if (localCreature) {
        return localCreature;
      }
    } catch (error) {
      // localStorage not available for getCreature
    }
  }

  return undefined;
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
