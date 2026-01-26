/**
 * Essence currency management
 */
import { GameStorage } from './storage';

export class EssenceManager {
  private storage: GameStorage;

  constructor() {
    this.storage = GameStorage.getInstance();
  }

  /**
   * Get current essence amount
   */
  async getAmount(): Promise<number> {
    return this.storage.getEssence();
  }

  /**
   * Add essence (e.g., on death or high score)
   */
  async add(amount: number): Promise<void> {
    await this.storage.addEssence(amount);
  }

  /**
   * Spend essence (returns true if successful)
   */
  async spend(amount: number): Promise<boolean> {
    const current = await this.getAmount();
    if (current >= amount) {
      await this.storage.setEssence(current - amount);
      return true;
    }
    return false;
  }

  /**
   * Calculate essence earned from a run
   * Based on score, phase reached, size achieved, etc.
   */
  calculateEarned(params: {
    score: number;
    phase: string;
    maxSize: number;
    duration: number;
  }): number {
    let essence = 0;

    // Base essence from score (logarithmic scaling)
    essence += Math.floor(Math.log10(params.score + 1) * 10);

    // Phase bonus
    const phaseMultipliers: Record<string, number> = {
      ocean: 1,
      space: 2,
    };
    essence *= phaseMultipliers[params.phase] || 1;

    // Size bonus
    essence += Math.floor(params.maxSize / 10);

    // Duration bonus (minutes)
    const minutes = params.duration / 60;
    essence += Math.floor(minutes * 2);

    // Minimum essence
    return Math.max(1, Math.floor(essence));
  }
}
