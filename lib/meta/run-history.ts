/**
 * Run history management
 */
import { GameStorage, RunHistoryEntry } from './storage';

export class RunHistoryManager {
  private storage: GameStorage;

  constructor() {
    this.storage = GameStorage.getInstance();
  }

  /**
   * Get all run history
   */
  async getAll(): Promise<RunHistoryEntry[]> {
    return this.storage.getRunHistory();
  }

  /**
   * Get recent runs (last N)
   */
  async getRecent(count: number = 10): Promise<RunHistoryEntry[]> {
    const all = await this.getAll();
    return all.slice(-count).reverse();
  }

  /**
   * Get best run
   */
  async getBest(): Promise<RunHistoryEntry | null> {
    const all = await this.getAll();
    if (all.length === 0) return null;
    return all.reduce((best, run) => (run.score > best.score ? run : best));
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalRuns: number;
    totalEssence: number;
    averageScore: number;
    bestScore: number;
    totalPlayTime: number;
  }> {
    const all = await this.getAll();
    if (all.length === 0) {
      return {
        totalRuns: 0,
        totalEssence: 0,
        averageScore: 0,
        bestScore: 0,
        totalPlayTime: 0,
      };
    }

    const totalEssence = all.reduce((sum, run) => sum + run.essenceEarned, 0);
    const totalScore = all.reduce((sum, run) => sum + run.score, 0);
    const totalTime = all.reduce((sum, run) => sum + run.duration, 0);
    const bestScore = Math.max(...all.map(r => r.score));

    return {
      totalRuns: all.length,
      totalEssence,
      averageScore: Math.floor(totalScore / all.length),
      bestScore,
      totalPlayTime: totalTime,
    };
  }
}
