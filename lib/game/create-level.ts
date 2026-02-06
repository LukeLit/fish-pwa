/**
 * Shared "Create Level X-X" API – procedural spawn list for a given biome + level.
 * Used by /game and /fish-editor so both use the same pipeline and fish intros work the same.
 * Level config is rules-based (counts, type mix); creatures come from blob via loadCreaturesByBiome.
 */

import type { Creature } from './types';
import { getLevelConfig } from './data/level-loader';
import { loadCreaturesByBiome } from './data/creature-loader';
import { computeEncounterSize } from './spawn-fish';

export type SpawnedCreatureForLevel = Creature & { id: string; creatureId?: string };

export interface CreateLevelResult {
  spawnList: SpawnedCreatureForLevel[];
}

/**
 * Procedurally builds the spawn list for a level. No fish IDs in config – we load
 * creatures by biome and fill slots by rules (fish_count, apex_count, type).
 * Empty pool → returns { spawnList: [] } without throwing.
 */
export async function createLevel(biomeId: string, levelId: number): Promise<CreateLevelResult> {
  const rules = getLevelConfig(biomeId, levelId);
  let pool = await loadCreaturesByBiome(biomeId);

  // Filter by depth band: band-fit rule (creature range overlaps band range)
  const minM = rules.min_meters;
  const maxM = rules.max_meters;
  if (typeof minM === 'number' && typeof maxM === 'number') {
    pool = pool.filter((c) => {
      const minMeters = c.metrics?.min_meters ?? c.metrics?.base_meters ?? (c.stats.size / 100);
      const maxMeters = c.metrics?.max_meters ?? c.metrics?.base_meters ?? (c.stats.size / 100);
      return minMeters <= maxM && maxMeters >= minM;
    });
  }

  if (pool.length === 0) {
    return { spawnList: [] };
  }

  const preyCreatures = pool.filter((c) => c.type === 'prey');
  const predatorCreatures = pool.filter((c) => c.type === 'predator');
  const apexPool = predatorCreatures.length > 0 ? predatorCreatures : [];
  const preyPool = preyCreatures.length > 0 ? preyCreatures : pool;

  const spawnList: SpawnedCreatureForLevel[] = [];
  let spawnIndex = 0;

  const apexCount = Math.min(rules.apex_count, apexPool.length);
  for (let i = 0; i < apexCount; i++) {
    const creature = apexPool[i % apexPool.length];
    const encounterSize = computeEncounterSize({
      creature,
      biomeId: creature.biomeId,
      levelNumber: levelId,
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
