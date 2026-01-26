/**
 * Player State Management Utilities
 * Manages permanent player data (persists across runs)
 */
import type { PlayerState, ScoreParams, ScoreResult } from './types';

/**
 * Create a new player state with default values
 */
export function createNewPlayerState(): PlayerState {
  return {
    evoPoints: 0,
    essence: {},
    metaUpgrades: {},
    unlockedFish: ['goldfish_starter'], // Goldfish is unlocked by default
    unlockedBiomes: ['shallow'], // Shallow biome is unlocked by default
    bestiary: {},
    highScore: 0,
    totalRuns: 0,
  };
}

/**
 * Save player state to local storage
 */
export function savePlayerState(playerState: PlayerState): void {
  try {
    localStorage.setItem('fish_game_player_state', JSON.stringify(playerState));
  } catch (error) {
    console.error('Failed to save player state:', error);
  }
}

/**
 * Load player state from local storage
 */
export function loadPlayerState(): PlayerState {
  try {
    const saved = localStorage.getItem('fish_game_player_state');
    if (!saved) {
      const newState = createNewPlayerState();
      savePlayerState(newState);
      return newState;
    }
    return JSON.parse(saved) as PlayerState;
  } catch (error) {
    console.error('Failed to load player state:', error);
    const newState = createNewPlayerState();
    savePlayerState(newState);
    return newState;
  }
}

/**
 * Add Evo Points to player state
 */
export function addEvoPoints(playerState: PlayerState, amount: number): PlayerState {
  return {
    ...playerState,
    evoPoints: playerState.evoPoints + amount,
  };
}

/**
 * Spend Evo Points
 */
export function spendEvoPoints(
  playerState: PlayerState,
  amount: number
): PlayerState | null {
  if (playerState.evoPoints < amount) {
    return null;
  }
  return {
    ...playerState,
    evoPoints: playerState.evoPoints - amount,
  };
}

/**
 * Add essence to player's permanent collection
 */
export function addEssence(
  playerState: PlayerState,
  essenceType: string,
  amount: number
): PlayerState {
  return {
    ...playerState,
    essence: {
      ...playerState.essence,
      [essenceType]: (playerState.essence[essenceType] || 0) + amount,
    },
  };
}

/**
 * Spend essence
 */
export function spendEssence(
  playerState: PlayerState,
  essenceCosts: Record<string, number>
): PlayerState | null {
  // Check if player has enough essence
  for (const [type, cost] of Object.entries(essenceCosts)) {
    if ((playerState.essence[type] || 0) < cost) {
      return null;
    }
  }

  // Deduct essence
  const newEssence = { ...playerState.essence };
  for (const [type, cost] of Object.entries(essenceCosts)) {
    newEssence[type] = (newEssence[type] || 0) - cost;
  }

  return {
    ...playerState,
    essence: newEssence,
  };
}

/**
 * Unlock a fish
 */
export function unlockFish(playerState: PlayerState, fishId: string): PlayerState {
  if (playerState.unlockedFish.includes(fishId)) {
    return playerState;
  }
  return {
    ...playerState,
    unlockedFish: [...playerState.unlockedFish, fishId],
  };
}

/**
 * Unlock a biome
 */
export function unlockBiome(playerState: PlayerState, biomeId: string): PlayerState {
  if (playerState.unlockedBiomes.includes(biomeId)) {
    return playerState;
  }
  return {
    ...playerState,
    unlockedBiomes: [...playerState.unlockedBiomes, biomeId],
  };
}

/**
 * Discover a creature (add to bestiary)
 */
export function discoverCreature(
  playerState: PlayerState,
  creatureId: string
): PlayerState {
  return {
    ...playerState,
    bestiary: {
      ...playerState.bestiary,
      [creatureId]: true,
    },
  };
}

/**
 * Upgrade a meta upgrade
 */
export function upgradeMetaUpgrade(
  playerState: PlayerState,
  upgradeId: string
): PlayerState {
  return {
    ...playerState,
    metaUpgrades: {
      ...playerState.metaUpgrades,
      [upgradeId]: (playerState.metaUpgrades[upgradeId] || 0) + 1,
    },
  };
}

/**
 * Update high score
 */
export function updateHighScore(
  playerState: PlayerState,
  score: number
): PlayerState {
  if (score > playerState.highScore) {
    return {
      ...playerState,
      highScore: score,
    };
  }
  return playerState;
}

/**
 * Increment total runs
 */
export function incrementTotalRuns(playerState: PlayerState): PlayerState {
  return {
    ...playerState,
    totalRuns: playerState.totalRuns + 1,
  };
}

/**
 * Calculate score from run stats
 * Formula: (Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)
 */
export function calculateScore(params: ScoreParams): ScoreResult {
  const score =
    params.size * 10 +
    params.fishEaten * 5 +
    params.timeSurvived * 2 +
    params.essenceCollected * 3;

  const evoPoints = Math.max(1, Math.floor(score / 10));

  return {
    score,
    evoPoints,
  };
}

/**
 * Get total essence collected (sum of all types)
 */
export function getTotalEssence(playerState: PlayerState): number {
  return Object.values(playerState.essence).reduce((sum, amount) => sum + amount, 0);
}

/**
 * Check if player has unlocked a fish
 */
export function hasFishUnlocked(playerState: PlayerState, fishId: string): boolean {
  return playerState.unlockedFish.includes(fishId);
}

/**
 * Check if player has unlocked a biome
 */
export function hasBiomeUnlocked(playerState: PlayerState, biomeId: string): boolean {
  return playerState.unlockedBiomes.includes(biomeId);
}

/**
 * Check if player has discovered a creature
 */
export function hasCreatureDiscovered(
  playerState: PlayerState,
  creatureId: string
): boolean {
  return playerState.bestiary[creatureId] === true;
}

/**
 * Get meta upgrade level
 */
export function getMetaUpgradeLevel(
  playerState: PlayerState,
  upgradeId: string
): number {
  return playerState.metaUpgrades[upgradeId] || 0;
}
