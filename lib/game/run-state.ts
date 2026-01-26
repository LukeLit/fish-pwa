/**
 * Run State Management Utilities
 * Manages the current run's state (temporary, reset on new run)
 */
import type { RunState } from './types';
import { getCreature } from './data';

/**
 * Create a new run state with default values
 */
export function createNewRunState(fishId: string): RunState | null {
  const creature = getCreature(fishId);
  if (!creature) {
    console.error(`Cannot create run state: creature ${fishId} not found`);
    return null;
  }

  return {
    runId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentLevel: '1-1',
    selectedFishId: fishId,
    fishState: {
      size: creature.stats.size,
      speed: creature.stats.speed,
      health: creature.stats.health,
      damage: creature.stats.damage,
      sprite: creature.sprite,
    },
    collectedEssence: {},
    selectedUpgrades: [],
    rerollsRemaining: 3, // Default rerolls per run
    evolutionLevel: 0,
    hunger: 100, // Start with full hunger
    stats: {
      fishEaten: 0,
      timeSurvived: 0,
      maxSize: creature.stats.size,
    },
  };
}

/**
 * Save run state to local storage
 */
export function saveRunState(runState: RunState): void {
  try {
    localStorage.setItem('fish_game_run_state', JSON.stringify(runState));
  } catch (error) {
    console.error('Failed to save run state:', error);
  }
}

/**
 * Load run state from local storage
 */
export function loadRunState(): RunState | null {
  try {
    const saved = localStorage.getItem('fish_game_run_state');
    if (!saved) return null;
    return JSON.parse(saved) as RunState;
  } catch (error) {
    console.error('Failed to load run state:', error);
    return null;
  }
}

/**
 * Clear run state from local storage
 */
export function clearRunState(): void {
  try {
    localStorage.removeItem('fish_game_run_state');
  } catch (error) {
    console.error('Failed to clear run state:', error);
  }
}

/**
 * Check if a run is in progress
 */
export function hasActiveRun(): boolean {
  return loadRunState() !== null;
}

/**
 * Update run state essence collection
 */
export function addEssenceToRun(
  runState: RunState,
  essenceType: string,
  amount: number
): RunState {
  return {
    ...runState,
    collectedEssence: {
      ...runState.collectedEssence,
      [essenceType]: (runState.collectedEssence[essenceType] || 0) + amount,
    },
  };
}

/**
 * Update run state stats
 */
export function updateRunStats(
  runState: RunState,
  updates: Partial<RunState['stats']>
): RunState {
  return {
    ...runState,
    stats: {
      ...runState.stats,
      ...updates,
    },
  };
}

/**
 * Update fish state
 */
export function updateFishState(
  runState: RunState,
  updates: Partial<RunState['fishState']>
): RunState {
  const newFishState = {
    ...runState.fishState,
    ...updates,
  };

  // Update maxSize if size increased
  const maxSize =
    newFishState.size > runState.stats.maxSize
      ? newFishState.size
      : runState.stats.maxSize;

  return {
    ...runState,
    fishState: newFishState,
    stats: {
      ...runState.stats,
      maxSize,
    },
  };
}

/**
 * Add upgrade to run
 */
export function addUpgradeToRun(runState: RunState, upgradeId: string): RunState {
  return {
    ...runState,
    selectedUpgrades: [...runState.selectedUpgrades, upgradeId],
  };
}

/**
 * Use a reroll
 */
export function useReroll(runState: RunState): RunState | null {
  if (runState.rerollsRemaining <= 0) {
    return null;
  }
  return {
    ...runState,
    rerollsRemaining: runState.rerollsRemaining - 1,
  };
}

/**
 * Increment evolution level
 */
export function incrementEvolution(runState: RunState): RunState {
  return {
    ...runState,
    evolutionLevel: runState.evolutionLevel + 1,
  };
}

/**
 * Progress to next level
 */
export function progressToNextLevel(runState: RunState): RunState {
  const [biome, levelNum] = runState.currentLevel.split('-');
  const nextLevel = parseInt(levelNum) + 1;
  
  return {
    ...runState,
    currentLevel: `${biome}-${nextLevel}`,
    collectedEssence: {}, // Reset essence for next level
    hunger: 100, // Restore hunger for next level
  };
}
