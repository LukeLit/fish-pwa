/**
 * Multi-type Essence Management
 * Extends the legacy essence system to support multiple essence types
 */
import { GameStorage } from '../meta/storage';
import { ESSENCE_TYPES, getAllEssenceTypes } from './data/essence-types';
import type { EssenceType } from './types';

/**
 * Extended essence manager supporting multiple essence types
 */
export class MultiEssenceManager {
  private storage: GameStorage;

  constructor() {
    this.storage = GameStorage.getInstance();
  }

  /**
   * Get all essence types
   */
  getEssenceTypes(): EssenceType[] {
    return getAllEssenceTypes();
  }

  /**
   * Get essence type by ID
   */
  getEssenceType(id: string): EssenceType | undefined {
    return ESSENCE_TYPES[id];
  }

  /**
   * Get current essence amount for a specific type
   */
  async getAmount(essenceType: string): Promise<number> {
    const playerState = await this.loadPlayerEssence();
    return playerState[essenceType] || 0;
  }

  /**
   * Get all essence amounts
   */
  async getAllAmounts(): Promise<Record<string, number>> {
    return this.loadPlayerEssence();
  }

  /**
   * Add essence of a specific type
   */
  async add(essenceType: string, amount: number): Promise<void> {
    const current = await this.loadPlayerEssence();
    current[essenceType] = (current[essenceType] || 0) + amount;
    await this.savePlayerEssence(current);
  }

  /**
   * Add multiple essence types at once
   */
  async addMultiple(essenceAmounts: Record<string, number>): Promise<void> {
    const current = await this.loadPlayerEssence();
    for (const [type, amount] of Object.entries(essenceAmounts)) {
      current[type] = (current[type] || 0) + amount;
    }
    await this.savePlayerEssence(current);
  }

  /**
   * Spend essence (returns true if successful)
   */
  async spend(essenceType: string, amount: number): Promise<boolean> {
    const current = await this.getAmount(essenceType);
    if (current >= amount) {
      const allEssence = await this.loadPlayerEssence();
      allEssence[essenceType] = current - amount;
      await this.savePlayerEssence(allEssence);
      return true;
    }
    return false;
  }

  /**
   * Spend multiple essence types (all-or-nothing)
   */
  async spendMultiple(essenceCosts: Record<string, number>): Promise<boolean> {
    const current = await this.loadPlayerEssence();

    // Check if player has enough of each type
    for (const [type, cost] of Object.entries(essenceCosts)) {
      if ((current[type] || 0) < cost) {
        return false;
      }
    }

    // Deduct all costs
    for (const [type, cost] of Object.entries(essenceCosts)) {
      current[type] = (current[type] || 0) - cost;
    }

    await this.savePlayerEssence(current);
    return true;
  }

  /**
   * Calculate essence earned from collected essence in a run
   * For roguelite mode, essence is collected during gameplay
   */
  calculateEarnedFromRun(collectedEssence: Record<string, number>): Record<string, number> {
    return collectedEssence;
  }

  /**
   * Get total essence across all types
   */
  async getTotalEssence(): Promise<number> {
    const allEssence = await this.loadPlayerEssence();
    return Object.values(allEssence).reduce((sum, amount) => sum + amount, 0);
  }

  /**
   * Load player essence from storage
   */
  private async loadPlayerEssence(): Promise<Record<string, number>> {
    try {
      const saved = localStorage.getItem('fish_game_player_essence');
      if (!saved) {
        return {};
      }
      return JSON.parse(saved) as Record<string, number>;
    } catch (error) {
      console.error('Failed to load player essence:', error);
      return {};
    }
  }

  /**
   * Save player essence to storage
   */
  private async savePlayerEssence(essence: Record<string, number>): Promise<void> {
    try {
      localStorage.setItem('fish_game_player_essence', JSON.stringify(essence));
    } catch (error) {
      console.error('Failed to save player essence:', error);
    }
  }

  /**
   * Migrate legacy essence to new system (convert to 'shallow' type)
   */
  async migrateLegacyEssence(): Promise<void> {
    try {
      const legacyAmount = await this.storage.getEssence();
      if (legacyAmount > 0) {
        await this.add('shallow', legacyAmount);
        await this.storage.setEssence(0); // Clear legacy essence
        console.log(`Migrated ${legacyAmount} legacy essence to 'shallow' type`);
      }
    } catch (error) {
      console.error('Failed to migrate legacy essence:', error);
    }
  }
}
