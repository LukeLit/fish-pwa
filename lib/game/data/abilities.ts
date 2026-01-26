/**
 * Ability Definitions
 * Based on DATA_STRUCTURE.md specification
 */
import type { Ability } from '../types';

/**
 * Sample abilities for the vertical slice
 */
export const ABILITIES: Record<string, Ability> = {
  essence_magnet: {
    id: 'essence_magnet',
    name: 'Essence Magnet',
    description: 'Attract essence orbs from further away.',
    type: 'passive',
    category: 'meta',
    activationType: 'always_active',
    stacking: true,
    maxLevel: 5,
    effect: {
      type: 'attraction',
      target: 'essence_orbs',
      value: 25, // +25% range per level
      range: 100,
    },
  },
  swift_current: {
    id: 'swift_current',
    name: 'Swift Current',
    description: 'Periodic speed bursts when swimming.',
    type: 'passive',
    category: 'shallow',
    activationType: 'periodic',
    cooldown: 15,
    duration: 5,
    effect: {
      type: 'buff',
      target: 'self',
      value: 30, // +30% speed during burst
    },
  },
  shield: {
    id: 'shield',
    name: 'Recharging Shield',
    description: 'Blocks the next hit of damage, then recharges.',
    type: 'passive',
    category: 'deep_sea',
    unlockRequirement: {
      upgradeId: 'pressure_adaptation',
      upgradeLevel: 2,
    },
    activationType: 'periodic',
    cooldown: 30,
    duration: 10,
    effect: {
      type: 'protection',
      target: 'self',
      value: 1, // Blocks 1 hit
    },
  },
  bioluminescence: {
    id: 'bioluminescence',
    name: 'Bioluminescence',
    description: 'Glow in the dark, attracting prey.',
    type: 'passive',
    category: 'deep_sea',
    activationType: 'always_active',
    effect: {
      type: 'attraction',
      target: 'enemy',
      value: 50,
      range: 150,
    },
  },
  regeneration: {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Slowly regenerate health over time.',
    type: 'passive',
    category: 'shallow',
    activationType: 'periodic',
    cooldown: 10,
    effect: {
      type: 'heal',
      target: 'self',
      value: 5, // 5 HP per tick
    },
  },
};

/**
 * Get all abilities as an array
 */
export function getAllAbilities(): Ability[] {
  return Object.values(ABILITIES);
}

/**
 * Get ability by ID
 */
export function getAbility(id: string): Ability | undefined {
  return ABILITIES[id];
}

/**
 * Get abilities by category
 */
export function getAbilitiesByCategory(category: string): Ability[] {
  return getAllAbilities().filter((ability) => ability.category === category);
}

/**
 * Get abilities by type
 */
export function getAbilitiesByType(type: 'passive'): Ability[] {
  return getAllAbilities().filter((ability) => ability.type === type);
}

/**
 * Check if ability unlock requirement is met
 */
export function isAbilityUnlocked(
  ability: Ability,
  unlockedUpgrades: Record<string, number>
): boolean {
  if (!ability.unlockRequirement) {
    return true;
  }

  const { upgradeId, upgradeLevel = 1 } = ability.unlockRequirement;
  return (unlockedUpgrades[upgradeId] || 0) >= upgradeLevel;
}
