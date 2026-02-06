/**
 * Ability Definitions
 * Based on DATA_STRUCTURE.md specification
 */
import type { Ability } from '../types';

/** Canonical ability categories (6 per category = 36 abilities total). */
export const ABILITY_CATEGORIES = [
  'shallow',
  'deep_sea',
  'tropical',
  'polluted',
  'hybrid',
  'meta',
] as const;

export type AbilityCategory = (typeof ABILITY_CATEGORIES)[number];

/**
 * Get the list of ability categories for iteration / validation.
 */
export function getAbilityCategories(): string[] {
  return [...ABILITY_CATEGORIES];
}

/**
 * Abilities keyed by id. Each category should have 6 abilities.
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

  // --- meta (5 new for 6 total) ---
  essence_range: {
    id: 'essence_range',
    name: 'Essence Range',
    description: 'Increase pickup range for essence orbs.',
    type: 'passive',
    category: 'meta',
    activationType: 'always_active',
    stacking: true,
    maxLevel: 3,
    effect: {
      type: 'utility',
      target: 'essence_orbs',
      value: 20,
      range: 80,
    },
  },
  run_start_bonus: {
    id: 'run_start_bonus',
    name: 'Run Start Bonus',
    description: 'Begin each run with a small size and speed bonus.',
    type: 'passive',
    category: 'meta',
    activationType: 'always_active',
    effect: {
      type: 'buff',
      target: 'self',
      value: 5,
    },
  },
  hunger_resistance: {
    id: 'hunger_resistance',
    name: 'Hunger Resistance',
    description: 'Hunger drains more slowly.',
    type: 'passive',
    category: 'meta',
    activationType: 'always_active',
    effect: {
      type: 'utility',
      target: 'self',
      value: 10,
    },
  },
  speed_bonus: {
    id: 'speed_bonus',
    name: 'Speed Bonus',
    description: 'Permanent slight speed increase.',
    type: 'passive',
    category: 'meta',
    activationType: 'always_active',
    effect: {
      type: 'buff',
      target: 'self',
      value: 8,
    },
  },
  extra_life: {
    id: 'extra_life',
    name: 'Extra Life',
    description: 'Survive one lethal hit per run.',
    type: 'passive',
    category: 'meta',
    activationType: 'periodic',
    cooldown: 9999,
    duration: 1,
    effect: {
      type: 'protection',
      target: 'self',
      value: 1,
    },
  },

  // --- shallow (4 new for 6 total) ---
  coral_armor: {
    id: 'coral_armor',
    name: 'Coral Armor',
    description: 'Reduce damage taken from predators.',
    type: 'passive',
    category: 'shallow',
    activationType: 'always_active',
    effect: {
      type: 'protection',
      target: 'self',
      value: 2,
    },
  },
  reef_dash: {
    id: 'reef_dash',
    name: 'Reef Dash',
    description: 'Brief speed burst when changing direction.',
    type: 'passive',
    category: 'shallow',
    activationType: 'periodic',
    cooldown: 12,
    duration: 2,
    effect: {
      type: 'buff',
      target: 'self',
      value: 40,
    },
  },
  kelp_heal: {
    id: 'kelp_heal',
    name: 'Kelp Heal',
    description: 'Heal a small amount when staying still.',
    type: 'passive',
    category: 'shallow',
    activationType: 'periodic',
    cooldown: 8,
    effect: {
      type: 'heal',
      target: 'self',
      value: 3,
    },
  },
  fin_slash: {
    id: 'fin_slash',
    name: 'Fin Slash',
    description: 'Deal extra damage on the next bite after dashing.',
    type: 'passive',
    category: 'shallow',
    activationType: 'periodic',
    cooldown: 6,
    duration: 3,
    effect: {
      type: 'damage',
      target: 'enemy',
      value: 5,
    },
  },

  // --- deep_sea (4 new for 6 total) ---
  pressure_shell: {
    id: 'pressure_shell',
    name: 'Pressure Shell',
    description: 'Resist pressure; take less damage in deep zones.',
    type: 'passive',
    category: 'deep_sea',
    activationType: 'always_active',
    effect: {
      type: 'protection',
      target: 'self',
      value: 3,
    },
  },
  lure: {
    id: 'lure',
    name: 'Lure',
    description: 'Attract smaller prey toward you.',
    type: 'passive',
    category: 'deep_sea',
    activationType: 'always_active',
    effect: {
      type: 'attraction',
      target: 'enemy',
      value: 40,
      range: 120,
    },
  },
  ink_cloud: {
    id: 'ink_cloud',
    name: 'Ink Cloud',
    description: 'Release a cloud that slows nearby enemies.',
    type: 'passive',
    category: 'deep_sea',
    activationType: 'periodic',
    cooldown: 25,
    duration: 4,
    effect: {
      type: 'debuff',
      target: 'area',
      value: 25,
      radius: 80,
    },
  },
  abyssal_siphon: {
    id: 'abyssal_siphon',
    name: 'Abyssal Siphon',
    description: 'Drain a small amount of health from nearby prey.',
    type: 'passive',
    category: 'deep_sea',
    activationType: 'periodic',
    cooldown: 20,
    effect: {
      type: 'heal',
      target: 'self',
      value: 4,
    },
  },

  // --- tropical (6) ---
  bright_scales: {
    id: 'bright_scales',
    name: 'Bright Scales',
    description: 'Reflect light; slightly harder for predators to target.',
    type: 'passive',
    category: 'tropical',
    activationType: 'always_active',
    effect: {
      type: 'utility',
      target: 'self',
      value: 10,
    },
  },
  warm_current: {
    id: 'warm_current',
    name: 'Warm Current',
    description: 'Swim faster in warm water.',
    type: 'passive',
    category: 'tropical',
    activationType: 'always_active',
    effect: {
      type: 'buff',
      target: 'self',
      value: 12,
    },
  },
  reef_blend: {
    id: 'reef_blend',
    name: 'Reef Blend',
    description: 'Blend with reef; reduced aggro range.',
    type: 'passive',
    category: 'tropical',
    activationType: 'always_active',
    effect: {
      type: 'utility',
      target: 'self',
      value: 15,
    },
  },
  tropical_heal: {
    id: 'tropical_heal',
    name: 'Tropical Heal',
    description: 'Regenerate health slowly in sunlight.',
    type: 'passive',
    category: 'tropical',
    activationType: 'periodic',
    cooldown: 12,
    effect: {
      type: 'heal',
      target: 'self',
      value: 4,
    },
  },
  sun_burst: {
    id: 'sun_burst',
    name: 'Sun Burst',
    description: 'Brief speed and damage boost after surfacing.',
    type: 'passive',
    category: 'tropical',
    activationType: 'periodic',
    cooldown: 18,
    duration: 4,
    effect: {
      type: 'buff',
      target: 'self',
      value: 20,
    },
  },
  current_rider: {
    id: 'current_rider',
    name: 'Current Rider',
    description: 'Gain speed when moving with the current.',
    type: 'passive',
    category: 'tropical',
    activationType: 'always_active',
    effect: {
      type: 'buff',
      target: 'self',
      value: 8,
    },
  },

  // --- polluted (6) ---
  toxin_resistance: {
    id: 'toxin_resistance',
    name: 'Toxin Resistance',
    description: 'Take less damage from toxic zones and creatures.',
    type: 'passive',
    category: 'polluted',
    activationType: 'always_active',
    effect: {
      type: 'protection',
      target: 'self',
      value: 2,
    },
  },
  sludge_trail: {
    id: 'sludge_trail',
    name: 'Sludge Trail',
    description: 'Leave a trail that slows pursuers.',
    type: 'passive',
    category: 'polluted',
    activationType: 'periodic',
    cooldown: 14,
    duration: 5,
    effect: {
      type: 'debuff',
      target: 'area',
      value: 20,
      radius: 60,
    },
  },
  filter_feed: {
    id: 'filter_feed',
    name: 'Filter Feed',
    description: 'Gain a small amount of health from polluted orbs.',
    type: 'passive',
    category: 'polluted',
    activationType: 'always_active',
    effect: {
      type: 'heal',
      target: 'self',
      value: 2,
    },
  },
  corrosive_touch: {
    id: 'corrosive_touch',
    name: 'Corrosive Touch',
    description: 'Deal extra damage over time to bitten prey.',
    type: 'passive',
    category: 'polluted',
    activationType: 'periodic',
    cooldown: 5,
    duration: 2,
    effect: {
      type: 'damage',
      target: 'enemy',
      value: 3,
    },
  },
  adaptive_scales: {
    id: 'adaptive_scales',
    name: 'Adaptive Scales',
    description: 'Adapt to pollution; slight all-around resistance.',
    type: 'passive',
    category: 'polluted',
    activationType: 'always_active',
    effect: {
      type: 'protection',
      target: 'self',
      value: 1,
    },
  },
  murk_vision: {
    id: 'murk_vision',
    name: 'Murk Vision',
    description: 'See through murky water; detect prey at longer range.',
    type: 'passive',
    category: 'polluted',
    activationType: 'always_active',
    effect: {
      type: 'utility',
      target: 'self',
      value: 25,
      range: 100,
    },
  },

  // --- hybrid (6) ---
  cross_essence: {
    id: 'cross_essence',
    name: 'Cross Essence',
    description: 'Collecting one essence type grants a small amount of another.',
    type: 'passive',
    category: 'hybrid',
    activationType: 'always_active',
    effect: {
      type: 'utility',
      target: 'essence_orbs',
      value: 10,
      range: 50,
    },
  },
  fused_traits: {
    id: 'fused_traits',
    name: 'Fused Traits',
    description: 'Combine two minor bonuses from different trees.',
    type: 'passive',
    category: 'hybrid',
    activationType: 'always_active',
    effect: {
      type: 'buff',
      target: 'self',
      value: 5,
    },
  },
  dual_resistance: {
    id: 'dual_resistance',
    name: 'Dual Resistance',
    description: 'Resist both physical and environmental damage.',
    type: 'passive',
    category: 'hybrid',
    activationType: 'always_active',
    effect: {
      type: 'protection',
      target: 'self',
      value: 2,
    },
  },
  hybrid_speed: {
    id: 'hybrid_speed',
    name: 'Hybrid Speed',
    description: 'Moderate speed boost from mixed lineage.',
    type: 'passive',
    category: 'hybrid',
    activationType: 'always_active',
    effect: {
      type: 'buff',
      target: 'self',
      value: 10,
    },
  },
  mixed_lure: {
    id: 'mixed_lure',
    name: 'Mixed Lure',
    description: 'Attract both prey and essence orbs from slightly further.',
    type: 'passive',
    category: 'hybrid',
    activationType: 'always_active',
    effect: {
      type: 'attraction',
      target: 'enemy',
      value: 20,
      range: 90,
    },
  },
  evolution_burst: {
    id: 'evolution_burst',
    name: 'Evolution Burst',
    description: 'After evolving, gain a short burst of speed and healing.',
    type: 'passive',
    category: 'hybrid',
    activationType: 'periodic',
    cooldown: 60,
    duration: 6,
    effect: {
      type: 'heal',
      target: 'self',
      value: 6,
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
 * Get count of abilities per category (for validation: each should be 6).
 */
export function getAbilitiesPerCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const cat of ABILITY_CATEGORIES) {
    counts[cat] = getAbilitiesByCategory(cat).length;
  }
  return counts;
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
