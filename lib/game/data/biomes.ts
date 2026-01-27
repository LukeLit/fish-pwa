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
    sharedCreatures: ['goldfish_starter', 'tiny_fish', 'small_prey', 'medium_fish', 'medium_predator', 'large_predator', 'rare_tropical', 'epic_shark'],
    spawnWeights: {
      goldfish_starter: 10,
      tiny_fish: 40,
      small_prey: 30,
      medium_fish: 20,
      medium_predator: 15,
      large_predator: 5,
      rare_tropical: 5,
      epic_shark: 2,
    },
  },
};

/**
 * Shallow tropical biome - Warm, vibrant waters
 */
export const BIOME_SHALLOW_TROPICAL: Biome = {
  id: 'shallow_tropical',
  name: 'Tropical Paradise',
  baseDepth: 'shallow',
  modifiers: ['tropical'],
  depthRange: {
    min: 0,
    max: 40,
  },
  availableEssenceTypes: ['shallow', 'tropical'],
  visualTheme: 'Warm, vibrant tropical reef with abundant colorful life',
  backgroundAssets: {
    backgroundImage: '/backgrounds/shallow.svg',
    stageElements: ['/backgrounds/coral.svg'],
    lighting: 'bright_warm',
  },
  unlockCost: { shallow: 100, tropical: 50 },
  essenceOrbSpawnRate: 0.6, // Higher spawn rate in tropical waters
  creatureSpawnRules: {
    sharedCreatures: ['tiny_fish', 'small_prey', 'rare_tropical'],
    spawnWeights: {
      tiny_fish: 30,
      small_prey: 25,
      rare_tropical: 15,
    },
  },
};

/**
 * Medium depth biome - Deeper waters
 */
export const BIOME_MEDIUM: Biome = {
  id: 'medium',
  name: 'Twilight Zone',
  baseDepth: 'medium',
  modifiers: [],
  depthRange: {
    min: 50,
    max: 200,
  },
  availableEssenceTypes: ['shallow', 'deep_sea'],
  visualTheme: 'Dimly lit waters with bioluminescent creatures',
  backgroundAssets: {
    backgroundImage: '/backgrounds/shallow.svg',
    stageElements: [],
    lighting: 'dim',
  },
  unlockCost: { shallow: 200, deep_sea: 100 },
  essenceOrbSpawnRate: 0.4,
  creatureSpawnRules: {
    sharedCreatures: ['medium_fish', 'medium_predator', 'large_predator'],
    spawnWeights: {
      medium_fish: 20,
      medium_predator: 25,
      large_predator: 15,
    },
  },
};

/**
 * Medium polluted biome - Contaminated waters
 */
export const BIOME_MEDIUM_POLLUTED: Biome = {
  id: 'medium_polluted',
  name: 'Toxic Depths',
  baseDepth: 'medium',
  modifiers: ['polluted'],
  depthRange: {
    min: 50,
    max: 200,
  },
  availableEssenceTypes: ['shallow', 'polluted'],
  visualTheme: 'Dark, murky waters with toxic waste and mutated life',
  backgroundAssets: {
    backgroundImage: '/backgrounds/shallow.svg',
    stageElements: [],
    lighting: 'dark_murky',
  },
  unlockCost: { shallow: 150, polluted: 75 },
  essenceOrbSpawnRate: 0.3, // Lower spawn rate due to pollution
  creatureSpawnRules: {
    sharedCreatures: ['medium_predator', 'large_predator'],
    spawnWeights: {
      medium_predator: 30,
      large_predator: 20,
    },
  },
};

/**
 * Deep biome - Abyssal depths
 */
export const BIOME_DEEP: Biome = {
  id: 'deep',
  name: 'Abyssal Depths',
  baseDepth: 'deep',
  modifiers: [],
  depthRange: {
    min: 200,
    max: 1000,
  },
  availableEssenceTypes: ['deep_sea'],
  visualTheme: 'Pitch black waters with ancient creatures and crushing pressure',
  backgroundAssets: {
    backgroundImage: '/backgrounds/shallow.svg',
    stageElements: [],
    lighting: 'dark',
  },
  unlockCost: { deep_sea: 300 },
  essenceOrbSpawnRate: 0.2, // Very low spawn rate
  creatureSpawnRules: {
    sharedCreatures: ['large_predator', 'epic_shark'],
    spawnWeights: {
      large_predator: 20,
      epic_shark: 10,
    },
  },
};

/**
 * All biomes available in the game
 */
export const BIOMES: Record<string, Biome> = {
  shallow: BIOME_SHALLOW,
  shallow_tropical: BIOME_SHALLOW_TROPICAL,
  medium: BIOME_MEDIUM,
  medium_polluted: BIOME_MEDIUM_POLLUTED,
  deep: BIOME_DEEP,
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
