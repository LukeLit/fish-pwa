/**
 * Level config loader – rules only, no fish IDs.
 * "Bones" for procedural level loading: biomes with depth (meters), levels with
 * min/max meter size for fish, and runs that map level 1–3 with phases and biome(s).
 */

import levelConfigJson from './level-config.json';

/** Depth range in meters (for sorting biomes / matching fish to depth). */
export interface DepthRangeMeters {
  min: number;
  max: number;
}

/** Per-level rules: fish counts, meter size range for this level, phases. */
export interface LevelRules {
  level_id: number;
  /** Number of phases in this level (e.g. 3). */
  phases: number;
  /** Min fish size in meters for this level – match fish to depth by size. */
  min_meters: number;
  /** Max fish size in meters for this level. */
  max_meters: number;
  fish_count: number;
  apex_count: number;
  sub_depths: string[];
}

/** Biome entry in config: depth range in meters + levels. */
export interface BiomeConfig {
  id: string;
  depth_range_meters: DepthRangeMeters;
  levels: LevelRules[];
}

/** One level in a run: which biome + which level_id. */
export interface RunLevelRef {
  biome: string;
  level_id: number;
}

/** A full run: level 1–3 (or more) with biome(s) assigned per level. */
export interface RunConfig {
  id: string;
  name: string;
  levels: RunLevelRef[];
}

type LevelConfig = {
  biomes?: Record<string, BiomeConfig>;
  runs?: Record<string, RunConfig>;
};

const config = levelConfigJson as LevelConfig;

/** Safe default when a level is missing from config */
const DEFAULT_LEVEL_RULES: LevelRules = {
  level_id: 1,
  phases: 3,
  min_meters: 0.2,
  max_meters: 0.8,
  fish_count: 24,
  apex_count: 1,
  sub_depths: [],
};

/**
 * Returns level rules for the given biome and level (1-based).
 * Includes min_meters / max_meters for matching fish to depth by size (used when creatures have metrics).
 * Fallback: if biome or level is missing, returns a safe default so createLevel still runs.
 */
export function getLevelConfig(biomeId: string, levelId: number): LevelRules {
  const biome = config.biomes?.[biomeId];
  const levels = biome?.levels;
  if (!levels?.length) return { ...DEFAULT_LEVEL_RULES, level_id: levelId };

  const rules = levels.find((l) => l.level_id === levelId);
  if (rules) {
    return {
      level_id: rules.level_id,
      phases: typeof rules.phases === 'number' ? rules.phases : DEFAULT_LEVEL_RULES.phases,
      min_meters: typeof rules.min_meters === 'number' ? rules.min_meters : DEFAULT_LEVEL_RULES.min_meters,
      max_meters: typeof rules.max_meters === 'number' ? rules.max_meters : DEFAULT_LEVEL_RULES.max_meters,
      fish_count: typeof rules.fish_count === 'number' ? rules.fish_count : DEFAULT_LEVEL_RULES.fish_count,
      apex_count: typeof rules.apex_count === 'number' ? rules.apex_count : DEFAULT_LEVEL_RULES.apex_count,
      sub_depths: Array.isArray(rules.sub_depths) ? rules.sub_depths.filter((s) => typeof s === 'string') : [],
    };
  }

  return { ...DEFAULT_LEVEL_RULES, level_id: levelId };
}

/**
 * Returns biome config (depth range in meters) for sorting / matching.
 * Use when matching fish to depth level by size.
 */
export function getBiomeConfig(biomeId: string): BiomeConfig | null {
  const biome = config.biomes?.[biomeId];
  if (!biome?.depth_range_meters) return null;
  return {
    id: biome.id ?? biomeId,
    depth_range_meters: biome.depth_range_meters,
    levels: biome.levels ?? [],
  };
}

/**
 * Returns the full run definition (level 1–3 with 3 phases each, biome(s) per level).
 * Use to map out an entire run for procedural loading.
 */
export function getRunConfig(runId: string): RunConfig | null {
  const run = config.runs?.[runId];
  if (!run?.levels?.length) return null;
  return {
    id: run.id ?? runId,
    name: run.name ?? runId,
    levels: run.levels,
  };
}
