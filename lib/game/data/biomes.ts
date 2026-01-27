/**
 * Biome Definitions
 * Based on DATA_STRUCTURE.md specification
 */
import type { Biome } from '../types';

/**
 * Starting biome - Shallow waters
 */
export const BIOME_SHALLOW: Biome = {
  id: 'shallow',
  name: 'Coral Shallows',
  baseDepth: 'shallow',
  modifiers: [],
  depthRange: {
    min: 0,
    max: 50,
  },
  availableEssenceTypes: ['shallow'],
  visualTheme: 'Bright, colorful coral reef with tropical fish and clear waters',
  backgroundAssets: {
    backgroundImage: '/backgrounds/shallow.svg',
    stageElements: ['/backgrounds/coral.svg', '/backgrounds/plants.svg'],
    lighting: 'bright',
  },
  unlockCost: {}, // Starting biome, no cost
  essenceOrbSpawnRate: 0.5, // Moderate spawn rate
  creatureSpawnRules: {
    sharedCreatures: ['goldfish_starter', 'tiny_fish', 'small_prey', 'medium_fish', 'medium_predator', 'large_predator'],
    spawnWeights: {
      goldfish_starter: 10,
      tiny_fish: 40,
      small_prey: 30,
      medium_fish: 20,
      medium_predator: 15,
      large_predator: 5,
    },
  },
};

/**
 * All biomes available in the game
 */
export const BIOMES: Record<string, Biome> = {
  shallow: BIOME_SHALLOW,
  // Additional biomes can be added here as they are implemented
};

/**
 * Get all biomes as an array
 */
export function getAllBiomes(): Biome[] {
  return Object.values(BIOMES);
}

/**
 * Get biome by ID
 */
export function getBiome(id: string): Biome | undefined {
  return BIOMES[id];
}

/**
 * Check if biome exists
 */
export function isValidBiome(id: string): boolean {
  return id in BIOMES;
}
