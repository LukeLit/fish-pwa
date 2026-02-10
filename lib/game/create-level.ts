/**
 * Shared "Create Level X-X" API – procedural spawn list for a given biome + level.
 * Used by /game and /fish-editor so both use the same pipeline and fish intros work the same.
 * Level config is rules-based (counts, type mix); creatures come from blob via loadCreaturesByBiome.
 */

import type { Creature } from './types';
import { getLevelConfig } from './data/level-loader';
import { loadCreaturesByBiome, loadCreaturesByBiomes } from './data/creature-loader';
import { computeEncounterSize } from './spawn-fish';

export type SpawnedCreatureForLevel = Creature & { id: string; creatureId?: string; depthBandId?: string };

export interface CreateLevelResult {
  spawnList: SpawnedCreatureForLevel[];
}

/**
 * Creates a combined spawn list for all bands in a run (for continuous progression).
 * Each fish has depthBandId so spawn sync can place them in the correct band.
 */
export async function createLevelForRun(
  biomeId: string,
  runConfigId: string,
  bandIds: string[]
): Promise<CreateLevelResult> {
  const spawnList: SpawnedCreatureForLevel[] = [];
  let spawnIndex = 0;

  for (const depthBandId of bandIds) {
    const levelId = (await import('./data/level-loader')).getLevelIdFromDepthBandId(depthBandId);
    const result = await createLevel(biomeId, levelId);
    for (const fish of result.spawnList) {
      spawnList.push({
        ...fish,
        id: `${fish.id}_${depthBandId}`,
        depthBandId,
      });
    }
  }

  return { spawnList };
}

/**
 * Procedurally builds the spawn list for a level. No fish IDs in config – we load
 * creatures by biome and fill slots by rules (fish_count, apex_count, type).
 * Empty pool → returns { spawnList: [] } without throwing.
 */
export async function createLevel(biomeId: string, levelId: number): Promise<CreateLevelResult> {
  const rules = getLevelConfig(biomeId, levelId);
  const pool = rules.level_tags?.length
    ? await loadCreaturesByBiomes(rules.level_tags)
    : await loadCreaturesByBiome(biomeId);
  let filteredPool = pool;

  // Filter by depth band: band-fit rule (creature range overlaps band range)
  const minM = rules.min_meters;
  const maxM = rules.max_meters;
  if (typeof minM === 'number' && typeof maxM === 'number') {
    filteredPool = pool.filter((c) => {
      const minMeters = c.metrics?.min_meters ?? c.metrics?.base_meters ?? (c.stats.size / 100);
      const maxMeters = c.metrics?.max_meters ?? c.metrics?.base_meters ?? (c.stats.size / 100);
      return minMeters <= maxM && maxMeters >= minM;
    });
  }

  if (filteredPool.length === 0) {
    return { spawnList: [] };
  }

  const preyCreatures = filteredPool.filter((c) => c.type === 'prey');
  const predatorCreatures = filteredPool.filter((c) => c.type === 'predator');
  const apexPool = predatorCreatures.length > 0 ? predatorCreatures : [];
  const preyPool = preyCreatures.length > 0 ? preyCreatures : filteredPool;

  const spawnList: SpawnedCreatureForLevel[] = [];
  let spawnIndex = 0;

  const apexCount = Math.min(rules.apex_count, apexPool.length);
  const mainApexFirst = rules.main_apex && apexPool.length > 0;

  for (let i = 0; i < apexCount; i++) {
    const creature = apexPool[i % apexPool.length];
    const isMainApex = mainApexFirst && i === 0;
    const encounterSize = computeEncounterSize({
      creature,
      biomeId: creature.biomeId,
      levelNumber: levelId,
      forceTier: isMainApex ? 'boss' : undefined,
    });
    spawnList.push({
      ...creature,
      id: `${creature.id}_inst_${spawnIndex++}`,
      creatureId: creature.id,
      stats: { ...creature.stats, size: encounterSize },
    });
  }

  const remainingSlots = Math.max(0, rules.fish_count - spawnList.length);
  for (let i = 0; i < remainingSlots; i++) {
    const creature = preyPool[i % preyPool.length];
    const isSmallPrey = i % 3 === 0;
    const encounterSize = computeEncounterSize({
      creature,
      biomeId: creature.biomeId,
      levelNumber: levelId,
      forceSmall: isSmallPrey,
    });
    spawnList.push({
      ...creature,
      id: `${creature.id}_inst_${spawnIndex++}`,
      creatureId: creature.id,
      stats: { ...creature.stats, size: encounterSize },
    });
  }

  return { spawnList };
}
