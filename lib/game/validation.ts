/**
 * Data Validation Utilities
 * Helper functions to validate game data integrity
 */
import type { Creature, Biome, UpgradeNode, RunState, PlayerState } from './types';
import { ESSENCE_TYPES, BIOMES, CREATURES, UPGRADE_TREES } from './data';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate creature data
 */
export function validateCreature(creature: Creature): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!creature.id) errors.push('Creature missing id');
  if (!creature.name) errors.push('Creature missing name');
  if (!creature.biomeId) errors.push('Creature missing biomeId');

  // Validate biome exists
  if (creature.biomeId && !BIOMES[creature.biomeId]) {
    errors.push(`Creature ${creature.id} references non-existent biome: ${creature.biomeId}`);
  }

  // Validate stats
  if (creature.stats.size <= 0) errors.push('Creature size must be > 0');
  if (creature.stats.size < 60) errors.push('Creature size must be >= 60 (minimum renderable size)');
  if (creature.stats.speed <= 0) warnings.push('Creature speed should be > 0');
  if (creature.stats.health <= 0) errors.push('Creature health must be > 0');

  // Validate essence types
  for (const essence of creature.essenceTypes) {
    if (!ESSENCE_TYPES[essence.type]) {
      errors.push(`Creature ${creature.id} references non-existent essence type: ${essence.type}`);
    }
    if (essence.baseYield <= 0) {
      warnings.push(`Creature ${creature.id} has essence type ${essence.type} with yield <= 0`);
    }
  }

  // Validate spawn rules
  if (creature.spawnRules.canAppearIn.length === 0) {
    warnings.push(`Creature ${creature.id} cannot appear in any biome`);
  }

  for (const biomeId of creature.spawnRules.canAppearIn) {
    if (!BIOMES[biomeId]) {
      errors.push(`Creature ${creature.id} spawn rule references non-existent biome: ${biomeId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate biome data
 */
export function validateBiome(biome: Biome): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!biome.id) errors.push('Biome missing id');
  if (!biome.name) errors.push('Biome missing name');

  // Validate depth range
  if (biome.depthRange.min < 0) errors.push('Biome depth min must be >= 0');
  if (biome.depthRange.max <= biome.depthRange.min) {
    errors.push('Biome depth max must be > min');
  }

  // Validate essence types
  for (const essenceType of biome.availableEssenceTypes) {
    if (!ESSENCE_TYPES[essenceType]) {
      errors.push(`Biome ${biome.id} references non-existent essence type: ${essenceType}`);
    }
  }

  // Validate spawn rate
  if (biome.essenceOrbSpawnRate < 0 || biome.essenceOrbSpawnRate > 1) {
    warnings.push('Biome essence orb spawn rate should be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate upgrade node
 */
export function validateUpgrade(upgrade: UpgradeNode): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!upgrade.id) errors.push('Upgrade missing id');
  if (!upgrade.name) errors.push('Upgrade missing name');

  // Validate costs
  if (upgrade.baseCost <= 0) errors.push('Upgrade base cost must be > 0');
  if (upgrade.maxLevel <= 0) errors.push('Upgrade max level must be > 0');

  // Validate cost scaling
  if (upgrade.costMultiplier && upgrade.costMultiplier <= 1) {
    warnings.push(`Upgrade ${upgrade.id} has cost multiplier <= 1 (no scaling)`);
  }

  // Validate prerequisites
  for (const prereqId of upgrade.prerequisites) {
    const prereqExists = Object.values(UPGRADE_TREES)
      .flat()
      .some((u) => u.id === prereqId);

    if (!prereqExists) {
      errors.push(`Upgrade ${upgrade.id} references non-existent prerequisite: ${prereqId}`);
    }

    // Check for circular dependencies
    if (prereqId === upgrade.id) {
      errors.push(`Upgrade ${upgrade.id} cannot be its own prerequisite`);
    }
  }

  // Validate essence requirements
  for (const [essenceType, amount] of Object.entries(upgrade.requiredEssenceTypes)) {
    if (!ESSENCE_TYPES[essenceType]) {
      errors.push(`Upgrade ${upgrade.id} requires non-existent essence type: ${essenceType}`);
    }
    if (amount <= 0) {
      errors.push(`Upgrade ${upgrade.id} essence requirement must be > 0`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate run state
 */
export function validateRunState(runState: RunState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!runState.runId) errors.push('RunState missing runId');
  if (!runState.selectedFishId) errors.push('RunState missing selectedFishId');

  // Validate fish exists
  if (runState.selectedFishId && !CREATURES[runState.selectedFishId]) {
    errors.push(`RunState references non-existent fish: ${runState.selectedFishId}`);
  }

  // Validate level format
  if (!/^\d+-\d+$/.test(runState.currentLevel)) {
    warnings.push(`RunState has invalid level format: ${runState.currentLevel} (expected: 1-1)`);
  }

  // Validate stats
  if (runState.fishState.size <= 0) errors.push('Fish size must be > 0');
  if (runState.fishState.health < 0) errors.push('Fish health must be >= 0');
  if (runState.hunger < 0 || runState.hunger > 100) {
    errors.push('Hunger must be between 0 and 100');
  }

  // Validate essence
  for (const [essenceType, amount] of Object.entries(runState.collectedEssence)) {
    if (!ESSENCE_TYPES[essenceType]) {
      errors.push(`RunState has invalid essence type: ${essenceType}`);
    }
    if (amount < 0) {
      errors.push(`RunState has negative essence amount for ${essenceType}`);
    }
  }

  // Validate rerolls
  if (runState.rerollsRemaining < 0) {
    errors.push('Rerolls remaining cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate player state
 */
export function validatePlayerState(playerState: PlayerState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Evo Points
  if (playerState.evoPoints < 0) {
    errors.push('Evo Points cannot be negative');
  }

  // Validate essence
  for (const [essenceType, amount] of Object.entries(playerState.essence)) {
    if (!ESSENCE_TYPES[essenceType]) {
      errors.push(`PlayerState has invalid essence type: ${essenceType}`);
    }
    if (amount < 0) {
      errors.push(`PlayerState has negative essence amount for ${essenceType}`);
    }
  }

  // Validate unlocked fish
  for (const fishId of playerState.unlockedFish) {
    if (!CREATURES[fishId]) {
      warnings.push(`PlayerState has unlocked non-existent fish: ${fishId}`);
    }
  }

  // Validate unlocked biomes
  for (const biomeId of playerState.unlockedBiomes) {
    if (!BIOMES[biomeId]) {
      warnings.push(`PlayerState has unlocked non-existent biome: ${biomeId}`);
    }
  }

  // Validate stats
  if (playerState.highScore < 0) {
    errors.push('High score cannot be negative');
  }
  if (playerState.totalRuns < 0) {
    errors.push('Total runs cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all game data
 */
export function validateAllGameData(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate all creatures
  for (const creature of Object.values(CREATURES)) {
    const result = validateCreature(creature);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  // Validate all biomes
  for (const biome of Object.values(BIOMES)) {
    const result = validateBiome(biome);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  // Validate all upgrades
  for (const tree of Object.values(UPGRADE_TREES)) {
    for (const upgrade of tree) {
      const result = validateUpgrade(upgrade);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation results
 */
export function logValidationResults(label: string, result: ValidationResult): void {
  if (result.valid) {
    console.log(`✅ ${label}: Valid`);
  } else {
    console.error(`❌ ${label}: Invalid`);
  }

  if (result.errors.length > 0) {
    console.error('Errors:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
}

/**
 * Run all validations and log results
 */
export function validateAndLog(): boolean {
  console.log('🔍 Validating game data...');
  const result = validateAllGameData();
  logValidationResults('Game Data', result);
  return result.valid;
}
