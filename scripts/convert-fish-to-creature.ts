#!/usr/bin/env tsx
/**
 * Convert parsed biome fish data into Creature-compatible structures.
 *
 * This does not write to blob storage by itself – it is a pure transformer
 * that can be reused by the batch generation script.
 */

import type { ParsedFish } from './parse-biome-fish';
import type { Creature, EssenceData } from '../lib/game/types';

/**
 * Basic heuristics for mapping sizeTier to Creature stats.
 * These are intentionally simple and can be tuned later.
 */
function statsFromSizeTier(sizeTier: string): Creature['stats'] {
  // Minimum size is 60 to ensure fish are visible and renderable
  switch (sizeTier) {
    case 'prey':
      return { size: 60, speed: 7, health: 15, damage: 3 };
    case 'mid':
      return { size: 70, speed: 5, health: 30, damage: 8 };
    case 'predator':
      return { size: 90, speed: 5, health: 50, damage: 20 };
    case 'boss':
      return { size: 120, speed: 4, health: 80, damage: 35 };
    default:
      return { size: 60, speed: 5, health: 25, damage: 5 };
  }
}

function typeFromSizeTier(sizeTier: string): Creature['type'] {
  if (sizeTier === 'predator' || sizeTier === 'boss') return 'predator';
  return 'prey';
}

function rarityFromString(r: string): Creature['rarity'] {
  const val = r.toLowerCase();
  if (val === 'epic') return 'epic';
  if (val === 'rare') return 'rare';
  if (val === 'uncommon') return 'uncommon';
  return 'common';
}

function essenceDataFromObject(
  essenceObj: Record<string, number>
): { essence: EssenceData; essenceTypes: Creature['essenceTypes'] } {
  const entries = Object.entries(essenceObj).filter(([, v]) => (v ?? 0) > 0);
  if (entries.length === 0) {
    const fallback: EssenceData = {
      primary: { type: 'shallow', baseYield: 1, visualChunks: [] },
    };
    return {
      essence: fallback,
      essenceTypes: [{ type: 'shallow', baseYield: 1 }],
    };
  }

  const [primaryEntry, ...secondaryEntries] = entries;
  const primary: EssenceData['primary'] = {
    type: primaryEntry[0],
    baseYield: primaryEntry[1],
    visualChunks: [],
  };

  const secondary: NonNullable<EssenceData['secondary']> = secondaryEntries.map(
    ([type, baseYield]) => ({
      type,
      baseYield,
      visualChunks: [],
    })
  );

  const essence: EssenceData = {
    primary,
    secondary: secondary.length > 0 ? secondary : undefined,
  };

  const essenceTypes: Creature['essenceTypes'] = entries.map(([type, baseYield]) => ({
    type,
    baseYield,
  }));

  return { essence, essenceTypes };
}

export function convertParsedFishToCreature(fish: ParsedFish): Creature {
  const stats = statsFromSizeTier(fish.sizeTier);
  const { essence, essenceTypes } = essenceDataFromObject(fish.essence);

  const creature: Creature = {
    id: fish.id,
    name: fish.name,
    description: fish.descriptionChunks.join(', '),
    type: typeFromSizeTier(fish.sizeTier),
    stats,
    sprite: '', // Filled in later by batch generation / save-creature API
    rarity: rarityFromString(fish.rarity),
    playable: false,
    biomeId: fish.biome,
    sizeTier: fish.sizeTier,
    descriptionChunks: fish.descriptionChunks,
    visualMotif: fish.visualMotif,
    essence,
    essenceTypes,
    fusionParentIds: undefined,
    fusionType: undefined,
    fusionGeneration: undefined,
    mutationSource: undefined,
    unlockRequirement: undefined,
    grantedAbilities: [],
    spawnRules: {
      canAppearIn: [fish.biome],
      spawnWeight: 10,
    },
  };

  return creature;
}

if (require.main === module) {
  // Small CLI for ad-hoc testing:
  // cat biomes JSON from parse-biome-fish and map to creatures.
  // eslint-disable-next-line no-console
  console.log(
    'convert-fish-to-creature is intended to be imported by batch scripts, not run directly.'
  );
}

