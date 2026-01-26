/**
 * Sample Upgrade Definitions
 * Based on DATA_STRUCTURE.md specification
 */
import type { UpgradeNode } from '../types';

/**
 * Shallow essence upgrade tree
 */
export const SHALLOW_UPGRADES: UpgradeNode[] = [
  {
    id: 'coral_speed',
    name: 'Coral Speed',
    description: 'Increases speed, allowing faster movement through shallow waters.',
    category: 'shallow',
    requiredEssenceTypes: { shallow: 10 },
    prerequisites: [],
    maxLevel: 5,
    baseCost: 10,
    costMultiplier: 1.3,
    effects: [
      {
        type: 'stat',
        target: 'speed',
        value: 1,
        perLevel: true,
      },
    ],
    impactLevel: 'medium',
  },
  {
    id: 'reef_agility',
    name: 'Reef Agility',
    description: 'Increases evasion, making it easier to avoid predators.',
    category: 'shallow',
    requiredEssenceTypes: { shallow: 15 },
    prerequisites: [],
    maxLevel: 3,
    baseCost: 15,
    costMultiplier: 1.5,
    effects: [
      {
        type: 'stat',
        target: 'evasion',
        value: 10,
        perLevel: true,
      },
    ],
    impactLevel: 'low',
  },
  {
    id: 'shallow_size',
    name: 'Shallow Growth',
    description: 'Increases starting size, allowing you to eat more fish from the start.',
    category: 'shallow',
    requiredEssenceTypes: { shallow: 20 },
    prerequisites: [],
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.4,
    effects: [
      {
        type: 'stat',
        target: 'size',
        value: 5,
        perLevel: true,
      },
    ],
    impactLevel: 'high',
  },
];

/**
 * Deep Sea essence upgrade tree
 */
export const DEEP_SEA_UPGRADES: UpgradeNode[] = [
  {
    id: 'deep_sea_resilience',
    name: 'Deep Sea Resilience',
    description: 'Increases health, allowing you to survive longer in the depths.',
    category: 'deep_sea',
    requiredEssenceTypes: { deep_sea: 15 },
    prerequisites: [],
    maxLevel: 10,
    baseCost: 15,
    costMultiplier: 1.5,
    effects: [
      {
        type: 'stat',
        target: 'health',
        value: 5,
        perLevel: true,
      },
    ],
    impactLevel: 'high',
  },
  {
    id: 'pressure_adaptation',
    name: 'Pressure Adaptation',
    description: 'Reduces damage taken from predators.',
    category: 'deep_sea',
    requiredEssenceTypes: { deep_sea: 20 },
    prerequisites: ['deep_sea_resilience'],
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.6,
    effects: [
      {
        type: 'stat',
        target: 'damage_reduction',
        value: 5,
        perLevel: true,
      },
    ],
    impactLevel: 'medium',
  },
];

/**
 * Meta upgrade tree (purchased with Evo Points)
 */
export const META_UPGRADES: UpgradeNode[] = [
  {
    id: 'meta_starting_size',
    name: 'Starting Size',
    description: 'Permanently increases starting size for all runs.',
    category: 'meta',
    requiredEssenceTypes: {}, // No essence required, uses Evo Points
    prerequisites: [],
    maxLevel: 10,
    baseCost: 50,
    costPerLevel: 10,
    effects: [
      {
        type: 'stat',
        target: 'starting_size',
        value: 5,
        perLevel: true,
      },
    ],
    impactLevel: 'game_changing',
  },
  {
    id: 'meta_starting_speed',
    name: 'Starting Speed',
    description: 'Permanently increases starting speed for all runs.',
    category: 'meta',
    requiredEssenceTypes: {},
    prerequisites: [],
    maxLevel: 5,
    baseCost: 40,
    costPerLevel: 10,
    effects: [
      {
        type: 'stat',
        target: 'starting_speed',
        value: 1,
        perLevel: true,
      },
    ],
    impactLevel: 'high',
  },
  {
    id: 'meta_essence_multiplier',
    name: 'Essence Multiplier',
    description: 'Increases essence collection by 10% per level.',
    category: 'meta',
    requiredEssenceTypes: {},
    prerequisites: [],
    maxLevel: 5,
    baseCost: 100,
    costPerLevel: 20,
    effects: [
      {
        type: 'stat',
        target: 'essence_multiplier',
        value: 10,
        perLevel: true,
      },
    ],
    impactLevel: 'game_changing',
  },
  {
    id: 'meta_hunger_reduction',
    name: 'Slower Hunger',
    description: 'Reduces hunger drain by 10% per level.',
    category: 'meta',
    requiredEssenceTypes: {},
    prerequisites: [],
    maxLevel: 5,
    baseCost: 60,
    costPerLevel: 15,
    effects: [
      {
        type: 'stat',
        target: 'hunger_drain',
        value: -10,
        perLevel: true,
      },
    ],
    impactLevel: 'high',
  },
];

/**
 * All upgrade trees
 */
export const UPGRADE_TREES: Record<string, UpgradeNode[]> = {
  shallow: SHALLOW_UPGRADES,
  deep_sea: DEEP_SEA_UPGRADES,
  meta: META_UPGRADES,
};

/**
 * Get all upgrades from a specific tree
 */
export function getUpgradeTree(category: string): UpgradeNode[] {
  return UPGRADE_TREES[category] || [];
}

/**
 * Get a specific upgrade by ID
 */
export function getUpgrade(upgradeId: string): UpgradeNode | undefined {
  for (const tree of Object.values(UPGRADE_TREES)) {
    const upgrade = tree.find((u) => u.id === upgradeId);
    if (upgrade) return upgrade;
  }
  return undefined;
}

/**
 * Get all upgrades across all trees
 */
export function getAllUpgrades(): UpgradeNode[] {
  return Object.values(UPGRADE_TREES).flat();
}

/**
 * Calculate upgrade cost at a specific level
 */
export function calculateUpgradeCost(upgrade: UpgradeNode, currentLevel: number): number {
  if (upgrade.costMultiplier) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
  } else if (upgrade.costPerLevel) {
    return upgrade.baseCost + upgrade.costPerLevel * currentLevel;
  }
  return upgrade.baseCost;
}

/**
 * Check if upgrade prerequisites are met
 */
export function arePrerequisitesMet(
  upgrade: UpgradeNode,
  unlockedUpgrades: Record<string, number>
): boolean {
  for (const prereqId of upgrade.prerequisites) {
    if (!unlockedUpgrades[prereqId] || unlockedUpgrades[prereqId] < 1) {
      return false;
    }
  }
  return true;
}
