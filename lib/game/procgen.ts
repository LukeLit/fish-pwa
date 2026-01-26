/**
 * Seeded Random Number Generator for procedural generation
 * Based on fxhash-style seeded randomness
 */
export class SeededRNG {
  private seed: number;
  private state: number;

  constructor(seed?: string | number) {
    // Use fxhash seed if available, otherwise use provided or random
    if (typeof window !== 'undefined' && (window as any).fxhash) {
      seed = (window as any).fxhash;
    }
    if (seed === undefined) {
      seed = Math.random().toString(36).substring(2, 15);
    }
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
    this.state = this.seed;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate a random number between 0 and 1
   */
  random(): number {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate a random float between min (inclusive) and max (exclusive)
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T {
    return array[this.randomInt(0, array.length)];
  }

  /**
   * Shuffle an array using seeded randomness
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Reset the RNG to initial seed
   */
  reset(): void {
    this.state = this.seed;
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Generate a random seed string
 */
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
