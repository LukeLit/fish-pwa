/**
 * Phase system (Ocean → Space)
 */
import { SeededRNG } from './procgen';

export type PhaseType = 'ocean' | 'space';

export interface PhaseConfig {
  type: PhaseType;
  name: string;
  difficulty: number;
  spawnRate: number;
  enemySizeMultiplier: number;
  backgroundColor: string;
  transitionTime: number;
}

export class PhaseManager {
  private currentPhase: PhaseType = 'ocean';
  private phaseStartTime: number = 0;
  private phaseConfigs: Map<PhaseType, PhaseConfig> = new Map();
  private rng: SeededRNG;

  constructor(seed: string) {
    this.rng = new SeededRNG(seed);
    this.initializePhases();
  }

  private initializePhases(): void {
    this.phaseConfigs.set('ocean', {
      type: 'ocean',
      name: 'Ocean Depths',
      difficulty: 1,
      spawnRate: 0.02,
      enemySizeMultiplier: 1,
      backgroundColor: '#0ea5e9',
      transitionTime: 3000,
    });

    this.phaseConfigs.set('space', {
      type: 'space',
      name: 'Cosmic Void',
      difficulty: 2,
      spawnRate: 0.03,
      enemySizeMultiplier: 1.5,
      backgroundColor: '#1e1b4b',
      transitionTime: 5000,
    });
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): PhaseType {
    return this.currentPhase;
  }

  /**
   * Get current phase config
   */
  getCurrentConfig(): PhaseConfig {
    return this.phaseConfigs.get(this.currentPhase) || this.phaseConfigs.get('ocean')!;
  }

  /**
   * Check if should transition to next phase
   */
  shouldTransition(playerSize: number): boolean {
    if (this.currentPhase === 'ocean' && playerSize >= 50) {
      return true;
    }
    return false;
  }

  /**
   * Transition to next phase
   */
  transitionToNext(): PhaseType | null {
    if (this.currentPhase === 'ocean') {
      this.currentPhase = 'space';
      this.phaseStartTime = Date.now();
      return 'space';
    }
    return null; // No more phases
  }

  /**
   * Get spawn parameters for current phase
   */
  getSpawnParams(): {
    rate: number;
    minSize: number;
    maxSize: number;
    types: ('prey' | 'predator' | 'food')[];
  } {
    const config = this.getCurrentConfig();
    const baseSize = 10;

    if (this.currentPhase === 'ocean') {
      return {
        rate: config.spawnRate,
        minSize: baseSize,
        maxSize: baseSize * 3,
        types: ['prey', 'predator', 'food'],
      };
    } else {
      // Space phase
      return {
        rate: config.spawnRate,
        minSize: baseSize * 2,
        maxSize: baseSize * 5,
        types: ['prey', 'predator'], // Less food in space
      };
    }
  }

  /**
   * Get phase elapsed time
   */
  getPhaseElapsedTime(): number {
    return Date.now() - this.phaseStartTime;
  }

  /**
   * Reset to initial phase
   */
  reset(): void {
    this.currentPhase = 'ocean';
    this.phaseStartTime = Date.now();
  }
}
