/**
 * Level config loader – rules only, no fish IDs.
 * Config is procedural: depth bands only (no biomes block). Acts reference depth bands by id (e.g. "1-1", "1-2", "1-3").
 */

import levelConfigJson from './level-config.json';
import type { LevelObjective } from '@/lib/game/types';

/** Depth range in meters (for sorting biomes / matching fish to depth). */
export interface DepthRangeMeters {
  min: number;
  max: number;
}

/** Per-level rules: fish counts, meter size range, phases. */
export interface LevelRules {
  level_id: number;
  phases: number;
  min_meters: number;
  max_meters: number;
  fish_count: number;
  apex_count: number;
  /** Extra predators (beyond apex) to add challenge; default 0. */
  predator_count?: number;
  sub_depths: string[];
  /** Optional sub-tags (biome IDs) for fish pool; when set, pool = union of creatures from these tags. */
  level_tags?: string[];
  /** When true, first apex spawn uses boss-tier size as the level target. */
  main_apex?: boolean;
  /** Completion objectives for this level. */
  objectives?: LevelObjective[];
}

/** Stored depth band entry (no level_id; id is the band key e.g. "1-1"). */
interface DepthBandEntry {
  phases?: number;
  min_meters?: number;
  max_meters?: number;
  fish_count?: number;
  apex_count?: number;
  predator_count?: number;
  main_apex?: boolean;
  sub_depths?: string[];
  objectives?: LevelObjective[];
}

/** Biome entry in config (legacy; config may have no biomes). */
export interface BiomeConfig {
  id: string;
  depth_range_meters: DepthRangeMeters;
  levels: LevelRules[];
}

/** One level in an act: which biome + which level_id (1-based step index). */
export interface ActLevelRef {
  biome: string;
  level_id: number;
}

/** An act (chapter): steps are depth band ids; levels derived for backward compat. */
export interface ActConfig {
  id: string;
  name: string;
  levels: ActLevelRef[];
  steps?: string[];
}

type LevelConfig = {
  level_tags?: string[];
  biomes?: Record<string, { id: string; depth_range_meters: DepthRangeMeters; levels: LevelRules[] }>;
  depth_bands?: Record<string, DepthBandEntry>;
  acts?: Record<string, { id: string; name: string; primary_biome?: string; steps?: string[]; levels?: ActLevelRef[] }>;
};

const config = levelConfigJson as LevelConfig;

/** Safe default when a band is missing from config */
const DEFAULT_LEVEL_RULES: LevelRules = {
  level_id: 1,
  phases: 3,
  min_meters: 0.2,
  max_meters: 0.8,
  fish_count: 24,
  apex_count: 1,
  sub_depths: [],
};

/** Maps levelId to depth band: 1–3→1-x, 4–6→2-x, 7–9→3-x, 10–12→4-x. */
function levelIdToDepthBandId(levelId: number): string {
  const levelIndex = Math.ceil(levelId / 3);
  const phase = ((levelId - 1) % 3) + 1;
  return `${levelIndex}-${phase}`;
}

function parseDepthBandEntry(bandId: string, entry: DepthBandEntry, levelId: number): LevelRules {
  const levelTags =
    Array.isArray((config as LevelConfig).level_tags) && (config as LevelConfig).level_tags!.length > 0
      ? (config as LevelConfig).level_tags
      : undefined;
  const objectives = Array.isArray(entry.objectives) ? entry.objectives.filter((o): o is LevelObjective => o && typeof o === 'object' && typeof (o as LevelObjective).type === 'string') : undefined;
  return {
    level_id: levelId,
    phases: typeof entry.phases === 'number' ? entry.phases : DEFAULT_LEVEL_RULES.phases,
    min_meters: typeof entry.min_meters === 'number' ? entry.min_meters : DEFAULT_LEVEL_RULES.min_meters,
    max_meters: typeof entry.max_meters === 'number' ? entry.max_meters : DEFAULT_LEVEL_RULES.max_meters,
    fish_count: typeof entry.fish_count === 'number' ? entry.fish_count : DEFAULT_LEVEL_RULES.fish_count,
    apex_count: typeof entry.apex_count === 'number' ? entry.apex_count : DEFAULT_LEVEL_RULES.apex_count,
    predator_count: typeof entry.predator_count === 'number' ? entry.predator_count : 0,
    main_apex: 'main_apex' in entry && typeof entry.main_apex === 'boolean' ? entry.main_apex : false,
    sub_depths: Array.isArray(entry.sub_depths) ? entry.sub_depths.filter((s) => typeof s === 'string') : [],
    level_tags: levelTags,
    objectives,
  };
}

/**
 * Returns level rules for a depth band id (e.g. "1-1", "1-2", "2-1").
 * Use when you have the band id from a run's steps.
 */
export function getDepthBandRules(depthBandId: string, levelId: number = 1): LevelRules {
  const bands = config.depth_bands;
  if (bands?.[depthBandId]) {
    return parseDepthBandEntry(depthBandId, bands[depthBandId], levelId);
  }
  return { ...DEFAULT_LEVEL_RULES, level_id: levelId };
}

/**
 * Returns level rules for the given biome and level (1-based).
 * Maps levelId to depth band: 1–3→1-1,1-2,1-3; 4–6→2-x; 7–9→3-x; 10–12→4-x.
 * Fallback: if band is missing, returns a safe default so createLevel still runs.
 */
export function getLevelConfig(biomeId: string, levelId: number): LevelRules {
  const bands = config.depth_bands;
  if (bands) {
    const bandId = levelIdToDepthBandId(levelId);
    const entry = bands[bandId];
    if (entry) {
      return parseDepthBandEntry(bandId, entry, levelId);
    }
  }
  const biome = config.biomes?.[biomeId];
  const levels = biome?.levels;
  if (levels?.length) {
    const rules = levels.find((l) => l.level_id === levelId);
    if (rules) {
      const levelTags =
        Array.isArray((config as LevelConfig).level_tags) && (config as LevelConfig).level_tags!.length > 0
          ? (config as LevelConfig).level_tags
          : undefined;
      return {
        level_id: rules.level_id,
        phases: typeof rules.phases === 'number' ? rules.phases : DEFAULT_LEVEL_RULES.phases,
        min_meters: typeof rules.min_meters === 'number' ? rules.min_meters : DEFAULT_LEVEL_RULES.min_meters,
        max_meters: typeof rules.max_meters === 'number' ? rules.max_meters : DEFAULT_LEVEL_RULES.max_meters,
        fish_count: typeof rules.fish_count === 'number' ? rules.fish_count : DEFAULT_LEVEL_RULES.fish_count,
        apex_count: typeof rules.apex_count === 'number' ? rules.apex_count : DEFAULT_LEVEL_RULES.apex_count,
        sub_depths: Array.isArray(rules.sub_depths) ? rules.sub_depths.filter((s) => typeof s === 'string') : [],
        level_tags: levelTags,
      };
    }
  }
  return { ...DEFAULT_LEVEL_RULES, level_id: levelId };
}

/**
 * Returns biome config (depth range in meters) for sorting / matching.
 * When config is depth-bands only (no biomes block), returns null.
 */
export function getBiomeConfig(biomeId: string): BiomeConfig | null {
  if (config.depth_bands && !config.biomes) return null;
  const biome = config.biomes?.[biomeId];
  if (!biome?.depth_range_meters) return null;
  return {
    id: biome.id ?? biomeId,
    depth_range_meters: biome.depth_range_meters,
    levels: biome.levels ?? [],
  };
}

/** Act order when advancing past last step of an act. */
export const ACT_ORDER: string[] = ['shallow_act', 'level_2_act', 'deep_act', 'apex_act'];

/**
 * Infer act config id from depth band (e.g. "2-1" -> "level_2_act").
 */
export function inferActConfigIdFromDepthBand(depthBandId: string): string {
  const parts = depthBandId.split('-');
  if (parts.length !== 2) return ACT_ORDER[0];
  const area = parseInt(parts[0], 10) || 1;
  const idx = Math.min(area - 1, ACT_ORDER.length - 1);
  return ACT_ORDER[idx];
}

/**
 * Converts depth band id (e.g. "2-1") to levelId for getLevelConfig.
 * levelId 1–3→1-x, 4–6→2-x, 7–9→3-x, 10–12→4-x.
 */
export function getLevelIdFromDepthBandId(depthBandId: string): number {
  const parts = depthBandId.split('-');
  if (parts.length !== 2) return 1;
  const area = parseInt(parts[0], 10) || 1;
  const phase = parseInt(parts[1], 10) || 1;
  return (area - 1) * 3 + phase;
}

/**
 * Returns next step and act config id. Uses act steps; when last step of act, advances to next act.
 */
export function getNextStep(
  actConfigId: string,
  currentLevel: string
): { nextLevel: string; actConfigId: string } | null {
  const act = getActConfig(actConfigId);
  if (!act?.steps?.length) return null;

  const idx = act.steps.indexOf(currentLevel);
  if (idx >= 0 && idx < act.steps.length - 1) {
    return { nextLevel: act.steps[idx + 1], actConfigId };
  }
  if (idx === act.steps.length - 1) {
    const nextActIdx = ACT_ORDER.indexOf(actConfigId) + 1;
    if (nextActIdx < ACT_ORDER.length) {
      const nextAct = getActConfig(ACT_ORDER[nextActIdx]);
      if (nextAct?.steps?.length) {
        return { nextLevel: nextAct.steps[0], actConfigId: nextAct.id };
      }
    }
  }
  return null;
}

/**
 * Returns the full act definition. When act has steps (depth band ids), levels are derived for backward compat.
 */
export function getActConfig(actId: string): ActConfig | null {
  const act = config.acts?.[actId];
  if (!act) return null;
  const primaryBiome = act.primary_biome ?? 'shallow';
  if (act.steps?.length) {
    const levels: ActLevelRef[] = act.steps.map((_, i) => ({
      biome: primaryBiome,
      level_id: i + 1,
    }));
    return {
      id: act.id ?? actId,
      name: act.name ?? actId,
      levels,
      steps: act.steps,
    };
  }
  if (act.levels?.length) {
    return {
      id: act.id ?? actId,
      name: act.name ?? actId,
      levels: act.levels,
    };
  }
  return null;
}
