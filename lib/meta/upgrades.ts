/**
 * Upgrade system and tech tree data
 */
import { GameStorage } from './storage';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'ocean' | 'mutagen' | 'space' | 'meta';
  baseCost: number;
  maxLevel: number;
  costMultiplier: number;
  prerequisites?: string[];
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: 'starting_size',
    name: 'Starting Size',
    description: 'Start each run larger',
    category: 'ocean',
    baseCost: 10,
    maxLevel: 10,
    costMultiplier: 1.5,
  },
  {
    id: 'growth_speed',
    name: 'Growth Speed',
    description: 'Grow faster from eating',
    category: 'ocean',
    baseCost: 15,
    maxLevel: 10,
    costMultiplier: 1.5,
  },
  {
    id: 'starting_speed',
    name: 'Starting Speed',
    description: 'Move faster from the start',
    category: 'ocean',
    baseCost: 12,
    maxLevel: 10,
    costMultiplier: 1.5,
  },
  {
    id: 'mutation_frequency',
    name: 'Mutation Frequency',
    description: 'More frequent mutations',
    category: 'mutagen',
    baseCost: 25,
    maxLevel: 5,
    costMultiplier: 2,
    prerequisites: ['starting_size'],
  },
  {
    id: 'mutation_duration',
    name: 'Mutation Duration',
    description: 'Mutations last longer',
    category: 'mutagen',
    baseCost: 30,
    maxLevel: 5,
    costMultiplier: 2,
    prerequisites: ['mutation_frequency'],
  },
  {
    id: 'space_unlock',
    name: 'Space Access',
    description: 'Unlock space phase',
    category: 'space',
    baseCost: 100,
    maxLevel: 1,
    costMultiplier: 1,
    prerequisites: ['growth_speed'],
  },
  {
    id: 'space_efficiency',
    name: 'Space Efficiency',
    description: 'Earn more in space',
    category: 'space',
    baseCost: 50,
    maxLevel: 5,
    costMultiplier: 1.8,
    prerequisites: ['space_unlock'],
  },
  {
    id: 'essence_multiplier',
    name: 'Essence Multiplier',
    description: 'Earn more essence',
    category: 'meta',
    baseCost: 200,
    maxLevel: 5,
    costMultiplier: 2.5,
  },
  {
    id: 'infinite_growth',
    name: 'Infinite Growth',
    description: 'Remove growth cap',
    category: 'meta',
    baseCost: 500,
    maxLevel: 1,
    costMultiplier: 1,
    prerequisites: ['essence_multiplier'],
  },
];

export class UpgradeManager {
  private storage: GameStorage;

  constructor() {
    this.storage = GameStorage.getInstance();
  }

  /**
   * Get upgrade level
   */
  async getLevel(upgradeId: string): Promise<number> {
    return this.storage.getUpgradeLevel(upgradeId);
  }

  /**
   * Get cost for next level
   */
  async getCost(upgradeId: string): Promise<number> {
    const definition = UPGRADE_DEFINITIONS.find(u => u.id === upgradeId);
    if (!definition) return Infinity;

    const currentLevel = await this.getLevel(upgradeId);
    if (currentLevel >= definition.maxLevel) return Infinity;

    return Math.floor(definition.baseCost * Math.pow(definition.costMultiplier, currentLevel));
  }

  /**
   * Check if upgrade can be purchased
   */
  async canPurchase(upgradeId: string, essence: number): Promise<boolean> {
    const definition = UPGRADE_DEFINITIONS.find(u => u.id === upgradeId);
    if (!definition) return false;

    const currentLevel = await this.getLevel(upgradeId);
    if (currentLevel >= definition.maxLevel) return false;

    // Check prerequisites
    if (definition.prerequisites) {
      const prereqLevels = await Promise.all(
        definition.prerequisites.map(prereq => this.getLevel(prereq))
      );
      const hasPrereqs = prereqLevels.every(level => level > 0);
      if (!hasPrereqs) return false;
    }

    const cost = await this.getCost(upgradeId);
    return essence >= cost;
  }

  /**
   * Purchase upgrade
   */
  async purchase(upgradeId: string, essence: number): Promise<boolean> {
    const canPurchase = await this.canPurchase(upgradeId, essence);
    if (!canPurchase) return false;

    const currentLevel = await this.getLevel(upgradeId);
    await this.storage.setUpgrade(upgradeId, currentLevel + 1);
    return true;
  }

  /**
   * Get all upgrades with their levels
   */
  async getAllUpgrades(): Promise<Array<UpgradeDefinition & { level: number; cost: number }>> {
    const upgrades = await Promise.all(
      UPGRADE_DEFINITIONS.map(async def => ({
        ...def,
        level: await this.getLevel(def.id),
        cost: await this.getCost(def.id),
      }))
    );
    return upgrades;
  }
}
