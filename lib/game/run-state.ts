/**
 * Run State Management Utilities
 * Manages the current run's state (temporary, reset on new run)
 * 
 * This module provides functions for:
 * - Creating new run states
 * - Saving/loading run states to/from localStorage
 * - Updating run state during gameplay
 * - Managing run progression (levels, upgrades, essence)
 * 
 * @module run-state
 */
import type { RunState } from './types';
import { getCreature } from './data';
import { computeEncounterSize } from './spawn-fish';

/**
 * Create a new run state with default values
 * 
 * Initializes a fresh run state based on the selected fish/creature.
 * All stats are copied from the creature's base stats, and progression
 * values (essence, upgrades, stats) are reset to defaults.
 * 
 * @param fishId - The ID of the creature to start the run with
 * @returns New RunState object, or null if creature not found
 * 
 * @example
 * ```typescript
 * const runState = createNewRunState('goldfish_starter');
 * if (runState) {
 *   saveRunState(runState);
 *   // Start game with this run state
 * }
 * ```
 */
export function createNewRunState(fishId: string): RunState | null {
  const creature = getCreature(fishId);
  if (!creature) {
    console.error(`Cannot create run state: creature ${fishId} not found`);
    return null;
  }

  return {
    runId: `run_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID().slice(0, 9) : Math.random().toString(36).substr(2, 9)}`,
    currentLevel: '1-1',
    selectedFishId: fishId,
    fishState: {
      size: computeEncounterSize({ creature, biomeId: creature.biomeId, levelNumber: 1 }),
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
      maxSize: computeEncounterSize({ creature, biomeId: creature.biomeId, levelNumber: 1 }),
    },
  };
}

/**
 * Save run state to local storage
 * 
 * Persists the run state to localStorage so it survives page refreshes.
 * This should be called after significant game events (level complete,
 * upgrade selected, etc.) to ensure progress is not lost.
 * 
 * @param runState - The run state to save
 * 
 * @example
 * ```typescript
 * const runState = loadRunState();
 * if (runState) {
 *   const updated = addEssenceToRun(runState, 'shallow', 10);
 *   saveRunState(updated);
 * }
 * ```
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
 * 
 * Retrieves the saved run state from localStorage. Returns null if
 * no run is in progress or if the saved data is invalid.
 * 
 * @returns The saved RunState, or null if none exists
 * 
 * @example
 * ```typescript
 * const runState = loadRunState();
 * if (runState) {
 *   // Continue from saved state
 *   console.log(`Continuing run ${runState.runId} at level ${runState.currentLevel}`);
 * } else {
 *   // No saved run, start new game
 * }
 * ```
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
 * 
 * Removes the saved run state from localStorage. This should be called
 * when a run ends (either by death or completion) to ensure the "Continue"
 * button is disabled until a new game is started.
 * 
 * @example
 * ```typescript
 * // On game over
 * const runState = loadRunState();
 * if (runState) {
 *   // Calculate final score, award essence, etc.
 *   clearRunState();
 * }
 * ```
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
 * 
 * Checks localStorage for a saved run state. Used to enable/disable
 * the "Continue" button on the main menu.
 * 
 * @returns true if a run state exists, false otherwise
 * 
 * @example
 * ```typescript
 * if (hasActiveRun()) {
 *   // Enable "Continue" button
 * } else {
 *   // Disable "Continue" button
 * }
 * ```
 */
export function hasActiveRun(): boolean {
  return loadRunState() !== null;
}

/**
 * Update run state essence collection
 * 
 * Adds essence to the run's collected essence totals. This is used
 * when the player collects essence orbs or eats fish that grant essence.
 * 
 * @param runState - Current run state
 * @param essenceType - Type of essence to add (e.g., 'shallow', 'deep_sea')
 * @param amount - Amount of essence to add
 * @returns Updated RunState with new essence totals
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * runState = addEssenceToRun(runState, 'shallow', 10);
 * runState = addEssenceToRun(runState, 'deep_sea', 5);
 * saveRunState(runState);
 * ```
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
 * 
 * Updates run statistics like fish eaten, time survived, and max size.
 * This should be called during gameplay as these values change.
 * 
 * @param runState - Current run state
 * @param updates - Partial stats object with fields to update
 * @returns Updated RunState with new stats
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * runState = updateRunStats(runState, {
 *   fishEaten: runState.stats.fishEaten + 1,
 *   timeSurvived: runState.stats.timeSurvived + 1
 * });
 * saveRunState(runState);
 * ```
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
 * 
 * Updates the fish's current stats (size, speed, health, damage, sprite).
 * Automatically updates maxSize if the new size is larger.
 * 
 * @param runState - Current run state
 * @param updates - Partial fish state with fields to update
 * @returns Updated RunState with new fish state
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * // Fish grows after eating
 * runState = updateFishState(runState, {
 *   size: runState.fishState.size + 5,
 *   health: runState.fishState.health + 2
 * });
 * saveRunState(runState);
 * ```
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
 * 
 * Adds an upgrade ID to the list of selected upgrades for this run.
 * Upgrades persist for the entire run and reset on new run.
 * 
 * @param runState - Current run state
 * @param upgradeId - ID of the upgrade to add
 * @returns Updated RunState with new upgrade
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * runState = addUpgradeToRun(runState, 'coral_speed_1');
 * saveRunState(runState);
 * ```
 */
export function addUpgradeToRun(runState: RunState, upgradeId: string): RunState {
  return {
    ...runState,
    selectedUpgrades: [...runState.selectedUpgrades, upgradeId],
  };
}

/**
 * Use a reroll
 * 
 * Decrements the rerolls remaining counter. Returns null if no
 * rerolls are available.
 * 
 * @param runState - Current run state
 * @returns Updated RunState with decremented rerolls, or null if no rerolls left
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * const updated = useReroll(runState);
 * if (updated) {
 *   runState = updated;
 *   // Show new upgrade options
 *   saveRunState(runState);
 * } else {
 *   // No rerolls left
 * }
 * ```
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
 * 
 * Increments the evolution level counter. This tracks how many times
 * the fish has evolved during this run.
 * 
 * @param runState - Current run state
 * @returns Updated RunState with incremented evolution level
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * runState = incrementEvolution(runState);
 * // Generate new evolved sprite based on evolution level
 * saveRunState(runState);
 * ```
 */
export function incrementEvolution(runState: RunState): RunState {
  return {
    ...runState,
    evolutionLevel: runState.evolutionLevel + 1,
  };
}

/**
 * Progress to next level
 * 
 * Advances the run to the next level (e.g., "1-1" -> "1-2").
 * Resets collected essence and restores hunger for the new level.
 * 
 * @param runState - Current run state
 * @returns Updated RunState for next level
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * // Level complete
 * runState = progressToNextLevel(runState);
 * saveRunState(runState);
 * // Start next level
 * ```
 */
export function progressToNextLevel(runState: RunState): RunState {
  // Parse current level format (e.g., "1-1" -> biome: "1", level: 1)
  const parts = runState.currentLevel.split('-');
  if (parts.length !== 2) {
    console.warn(`Invalid level format: ${runState.currentLevel}, using default progression`);
    return {
      ...runState,
      currentLevel: '1-2',
      collectedEssence: {},
      hunger: 100,
    };
  }

  const [biome, levelNum] = parts;
  const nextLevel = parseInt(levelNum, 10) + 1;

  if (isNaN(nextLevel)) {
    console.warn(`Invalid level number in: ${runState.currentLevel}`);
    return {
      ...runState,
      currentLevel: '1-2',
      collectedEssence: {},
      hunger: 100,
    };
  }

  return {
    ...runState,
    currentLevel: `${biome}-${nextLevel}`,
    collectedEssence: {}, // Reset essence for next level
    hunger: 100, // Restore hunger for next level
  };
}

/**
 * Calculate level-ups from essence amount
 * 
 * Calculates how many level-ups can be earned from a given amount of essence.
 * Default threshold is 30 essence per level-up.
 * 
 * @param essence - Total essence amount
 * @param threshold - Essence required per level-up (default: 30)
 * @returns Object with levelUps and remaining essence
 * 
 * @example
 * ```typescript
 * const result = calculateLevelUps(45, 30);
 * // result = { levelUps: 1, remaining: 15 }
 * ```
 */
export function calculateLevelUps(
  essence: number,
  threshold: number = 30
): { levelUps: number; remaining: number } {
  const levelUps = Math.floor(essence / threshold);
  const remaining = essence % threshold;
  return { levelUps, remaining };
}

/**
 * Apply upgrade effects to run state
 * 
 * Applies the effects of an upgrade to the run state, updating fish stats
 * and adding the upgrade to the selected upgrades list.
 * 
 * @param runState - Current run state
 * @param upgradeId - ID of the upgrade to apply
 * @returns Updated RunState with upgrade effects applied
 * 
 * @example
 * ```typescript
 * let runState = loadRunState();
 * runState = applyUpgrade(runState, 'coral_speed');
 * saveRunState(runState);
 * ```
 */
export function applyUpgrade(runState: RunState, upgradeId: string): RunState {
  // First, add upgrade to list
  let updatedState = addUpgradeToRun(runState, upgradeId);

  // Load upgrade data to apply effects
  // We'll import getUpgrade dynamically to avoid circular dependencies
  try {
    const { getUpgrade } = require('./data/upgrades');
    const upgrade = getUpgrade(upgradeId);

    if (!upgrade) {
      console.warn(`Upgrade ${upgradeId} not found, adding to list only`);
      return updatedState;
    }

    // Apply each effect
    const newFishState = { ...updatedState.fishState };

    upgrade.effects.forEach((effect: { type: string; target: string; value: number | string; perLevel?: boolean }) => {
      if (effect.type === 'stat') {
        const value = typeof effect.value === 'number' ? effect.value : 0;

        // Map effect targets to fish state properties
        switch (effect.target) {
          case 'size':
            newFishState.size += value;
            break;
          case 'speed':
            newFishState.speed += value;
            break;
          case 'health':
            newFishState.health += value;
            break;
          case 'damage':
            newFishState.damage += value;
            break;
          default:
            // Other stats not directly on fishState (evasion, etc.)
            // These would be handled by the game engine
            break;
        }
      }
      // Ability and unlock effects are handled by game engine
    });

    // Update fish state with new stats
    updatedState = updateFishState(updatedState, newFishState);

  } catch (error) {
    console.error('Error applying upgrade effects:', error);
  }

  return updatedState;
}
