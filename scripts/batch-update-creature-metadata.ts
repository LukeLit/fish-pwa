#!/usr/bin/env tsx
/**
 * Patch existing blob-stored creatures with new fields (sizeTier, spawnRules,
 * prompt chunks) without regenerating sprites.
 *
 * Flow:
 *  1. Fetch all creatures from /api/list-creatures
 *  2. Parse docs/biomes/*.md for canonical sizeTier + biome + prompt chunks per id
 *  3. Optionally load scripts/creature-prompt-patches.json (or --patches <path>)
 *     to override/supplement descriptionChunks, primaryColorHex, essenceColorDetails,
 *     speciesArchetype, visualMotif with hex-specific, more specific chunks
 *  4. For each creature: merge sizeTier, spawnRules, metrics, prompt fields from docs
 *     then apply patch file overrides; POST /api/save-creature metadata-only
 *
 * Requires dev server at FISH_PWA_BASE_URL (default http://localhost:3000).
 */

import { ParsedFish, parseBiomeFile } from './parse-biome-fish';
import { join, extname } from 'path';
import { readdir, readFile } from 'fs/promises';

const BIOME_DIR = 'docs/biomes';
const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

/** Per-creature prompt overrides: hex-specific description chunks, primary color, etc. */
type PromptPatch = {
  primaryColorHex?: string;
  descriptionChunks?: string[];
  visualMotif?: string;
  speciesArchetype?: string;
  essenceColorDetails?: Array<{ essenceTypeId: string; description: string }>;
};

type CreatureMetadata = {
  id: string;
  name?: string;
  biomeId?: string;
  stats?: { size?: number };
  type?: string;
  playable?: boolean;
  spawnRules?: { canAppearIn?: string[]; spawnWeight?: number };
  growthSprites?: { elder?: { sizeRange?: { max?: number } } };
  [key: string]: unknown;
};

// Real-world size reference (meters): min = near end of juvenile, max = full grown.
// Duplicated from analyze-fish-size-depth.ts for batch patch (no snapshot dependency).
const REAL_WORLD_SIZES: Record<string, { min: number; max: number }> = {
  goldfish: { min: 0.08, max: 0.35 },
  guppy: { min: 0.03, max: 0.06 },
  minnow: { min: 0.05, max: 0.12 },
  clownfish: { min: 0.06, max: 0.11 },
  butterflyfish: { min: 0.08, max: 0.2 },
  blue_tang: { min: 0.08, max: 0.3 },
  pumpkinseed: { min: 0.05, max: 0.25 },
  fathead_minnow: { min: 0.04, max: 0.08 },
  mosquitofish: { min: 0.02, max: 0.07 },
  yellow_perch: { min: 0.05, max: 0.4 },
  sardine: { min: 0.1, max: 0.25 },
  perch: { min: 0.12, max: 0.5 },
  common_carp: { min: 0.15, max: 1.0 },
  channel_catfish: { min: 0.2, max: 1.2 },
  bass: { min: 0.2, max: 0.75 },
  pike: { min: 0.3, max: 1.2 },
  barracuda: { min: 0.4, max: 1.8 },
  lionfish: { min: 0.15, max: 0.45 },
  moray_eel: { min: 0.3, max: 1.5 },
  parrotfish: { min: 0.2, max: 1.2 },
  mackerel: { min: 0.25, max: 0.6 },
  ocean_sunfish: { min: 0.5, max: 3.0 },
  thresher_shark: { min: 0.8, max: 5.5 },
  anglerfish: { min: 0.2, max: 1.0 },
  gulper_eel: { min: 0.3, max: 1.8 },
  vampire_squid: { min: 0.15, max: 0.3 },
  giant_isopod: { min: 0.08, max: 0.5 },
  bristlemouth: { min: 0.02, max: 0.1 },
  glass_squid: { min: 0.05, max: 0.15 },
  juvenile_squid: { min: 0.05, max: 0.3 },
  lanternfish: { min: 0.02, max: 0.15 },
  dragonfish: { min: 0.05, max: 0.4 },
  fangtooth: { min: 0.03, max: 0.18 },
  hatchetfish: { min: 0.02, max: 0.12 },
  viperfish: { min: 0.1, max: 0.35 },
  barreleye: { min: 0.05, max: 0.15 },
  black_swallower: { min: 0.1, max: 0.25 },
  cusk_eel: { min: 0.05, max: 0.6 },
  snailfish: { min: 0.03, max: 0.3 },
  tripod_fish: { min: 0.05, max: 0.35 },
  grenadier: { min: 0.2, max: 1.2 },
  oarfish: { min: 0.5, max: 8.0 },
  great_white: { min: 1.0, max: 6.0 },
  hammerhead_shark: { min: 1.0, max: 4.0 },
  tiger_shark: { min: 1.5, max: 5.0 },
  reef_shark: { min: 1.5, max: 3.0 },
  toxic_behemoth: { min: 1.5, max: 3.0 },
  mutant: { min: 0.15, max: 1.0 },
  sludge: { min: 0.15, max: 0.8 },
  toxic: { min: 0.2, max: 1.5 },
  leviathan: { min: 1.0, max: 5.0 },
  waste_leviathan: { min: 1.0, max: 4.0 },
  abyssal_horror: { min: 0.5, max: 3.0 },
};

function inferRealWorldSize(name: string, id: string): { min: number; max: number } | null {
  const lower = (name || id).toLowerCase();
  if (lower.includes('great white') || (lower.includes('shark') && !lower.includes('bass'))) return { min: 1.0, max: 6.0 };
  if (lower.includes('elder lanternfish') || lower.includes('leviathan lantern')) return { min: 0.8, max: 3.0 };
  for (const [key, sizes] of Object.entries(REAL_WORLD_SIZES)) {
    if (lower.includes(key.replace(/_/g, ' ')) || lower.includes(key)) return sizes;
  }
  if (lower.includes('shark')) return { min: 1.0, max: 6.0 };
  if (lower.includes('carp') || lower.includes('catfish')) return { min: 0.15, max: 1.2 };
  if (lower.includes('eel')) return { min: 0.2, max: 1.5 };
  if (lower.includes('squid')) return { min: 0.1, max: 0.4 };
  if (lower.includes('mutant') || lower.includes('zombie')) return { min: 0.15, max: 1.0 };
  if (lower.includes('leviathan')) return { min: 1.0, max: 5.0 };
  return null;
}

function inferSizeTierFromStats(creature: CreatureMetadata): 'prey' | 'mid' | 'predator' | 'boss' {
  const s = creature.stats?.size ?? 60;
  if (s <= 70) return 'prey';
  if (s <= 90) return 'mid';
  if (s <= 120) return 'predator';
  return 'boss';
}

function inferSubDepthFromSize(size: number): 'upper' | 'mid' | 'lower' {
  if (size < 50) return 'upper';
  if (size <= 100) return 'mid';
  return 'lower';
}

const JUVENILE_FLOOR_M = 0.05;

function inferMetrics(creature: CreatureMetadata): {
  base_meters: number;
  base_art_scale: number;
  sub_depth: 'upper' | 'mid' | 'lower';
  min_meters?: number;
  max_meters?: number;
} {
  const size = creature.stats?.size ?? 60;
  const base_meters = size / 100;
  const sub_depth = inferSubDepthFromSize(size);
  const rw = inferRealWorldSize(creature.name ?? '', creature.id);

  if (rw) {
    const min_meters = Math.max(JUVENILE_FLOOR_M, rw.min);
    return {
      base_meters,
      base_art_scale: size,
      sub_depth,
      min_meters,
      max_meters: rw.max,
    };
  }

  const elderMax = creature.growthSprites?.elder?.sizeRange?.max;
  const max_meters = elderMax != null ? elderMax / 100 : 3.0;
  return {
    base_meters,
    base_art_scale: size,
    sub_depth,
    min_meters: base_meters,
    max_meters,
  };
}

async function listBiomeFiles(): Promise<string[]> {
  const files = await readdir(BIOME_DIR);
  return files.filter((f) => extname(f) === '.md').map((f) => join(BIOME_DIR, f));
}

function getPatchesPath(): string {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--patches');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  const j = argv.indexOf('-p');
  if (j !== -1 && argv[j + 1]) return argv[j + 1];
  return join(process.cwd(), 'scripts', 'creature-prompt-patches.json');
}

async function loadPromptPatches(path: string): Promise<Map<string, PromptPatch>> {
  const raw = await readFile(path, 'utf-8');
  const obj = JSON.parse(raw) as Record<string, PromptPatch | string>;
  const map = new Map<string, PromptPatch>();
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_') || typeof value !== 'object' || value === null) continue;
    map.set(key, value as PromptPatch);
  }
  return map;
}

async function main() {
  const biomeFiles = await listBiomeFiles();
  const allParsed: ParsedFish[] = [];
  for (const file of biomeFiles) {
    const parsed = await parseBiomeFile(file);
    allParsed.push(...parsed);
  }
  const docMap = new Map<string, ParsedFish>(allParsed.map((p) => [p.id, p]));

  let patchMap = new Map<string, PromptPatch>();
  const patchesPath = getPatchesPath();
  if (patchesPath) {
    try {
      patchMap = await loadPromptPatches(patchesPath);
      // eslint-disable-next-line no-console
      console.log(`Patches: ${patchMap.size} entries from ${patchesPath}\n`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Could not load prompt patches (skipping):', (err as Error).message);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Docs: ${allParsed.length} fish; fetching existing creatures from blob...\n`);

  const listRes = await fetch(`${BASE_URL}/api/list-creatures`);
  if (!listRes.ok) {
    // eslint-disable-next-line no-console
    console.error('Failed to list creatures:', listRes.status, await listRes.text());
    process.exit(1);
  }
  const listData = (await listRes.json()) as { success?: boolean; creatures?: CreatureMetadata[] };
  const existing = listData?.creatures ?? [];

  let updated = 0;
  let failed = 0;

  for (const creature of existing) {
    const id = creature.id;
    if (!id) continue;

    const parsed = docMap.get(id);
    const sizeTier = parsed
      ? (parsed.sizeTier as 'prey' | 'mid' | 'predator' | 'boss')
      : inferSizeTierFromStats(creature);
    const canAppearIn: string[] = parsed
      ? [parsed.biome]
      : (creature.spawnRules?.canAppearIn ?? [creature.biomeId].filter((b): b is string => Boolean(b)));
    const spawnRules = {
      ...creature.spawnRules,
      canAppearIn,
      spawnWeight: creature.spawnRules?.spawnWeight ?? 10,
    };

    const metrics = inferMetrics(creature);

    const merged: CreatureMetadata = {
      ...creature,
      sizeTier,
      spawnRules,
      metrics,
      playable: true, // All fish playable for preview; lock conditions per issue #90
    };

    // Merge prompt-related fields from docs so blob gets updated descriptionChunks, colors, archetype
    if (parsed) {
      if (parsed.descriptionChunks?.length) merged.descriptionChunks = parsed.descriptionChunks;
      if (parsed.visualMotif) merged.visualMotif = parsed.visualMotif;
      if (parsed.speciesArchetype) merged.speciesArchetype = parsed.speciesArchetype;
      if (parsed.primaryColorHex) merged.primaryColorHex = parsed.primaryColorHex;
      if (parsed.essenceColorDetails?.length) merged.essenceColorDetails = parsed.essenceColorDetails;
    }

    // Apply prompt-patches file overrides (hex-specific chunks, primary color, etc.)
    const patch = patchMap.get(id);
    if (patch) {
      if (patch.descriptionChunks?.length) merged.descriptionChunks = patch.descriptionChunks;
      if (patch.visualMotif !== undefined) merged.visualMotif = patch.visualMotif;
      if (patch.speciesArchetype !== undefined) merged.speciesArchetype = patch.speciesArchetype;
      if (patch.primaryColorHex !== undefined) merged.primaryColorHex = patch.primaryColorHex;
      if (patch.essenceColorDetails?.length) merged.essenceColorDetails = patch.essenceColorDetails;
    }

    const formData = new FormData();
    formData.append('creatureId', id);
    formData.append('metadata', JSON.stringify(merged));

    const saveRes = await fetch(`${BASE_URL}/api/save-creature`, {
      method: 'POST',
      body: formData,
    });

    if (!saveRes.ok) {
      failed++;
      // eslint-disable-next-line no-console
      console.warn(`  ❌ ${id}: ${saveRes.status} ${await saveRes.text()}`);
      continue;
    }

    const saveJson = (await saveRes.json()) as { success?: boolean; error?: string };
    if (!saveJson.success) {
      failed++;
      // eslint-disable-next-line no-console
      console.warn(`  ❌ ${id}: ${saveJson.error ?? 'unknown'}`);
      continue;
    }

    updated++;
    // eslint-disable-next-line no-console
    const minMax = metrics.min_meters != null && metrics.max_meters != null
  ? ` min=${metrics.min_meters.toFixed(2)} max=${metrics.max_meters.toFixed(2)}`
  : '';
console.log(`  ✅ ${id} → sizeTier=${sizeTier}, metrics.base_meters=${metrics.base_meters.toFixed(2)}${minMax}`);
  }

  // eslint-disable-next-line no-console
  console.log('\n' + '='.repeat(40));
  // eslint-disable-next-line no-console
  console.log(`Updated: ${updated}`);
  // eslint-disable-next-line no-console
  console.log(`Failed: ${failed}`);
  // eslint-disable-next-line no-console
  console.log(`Total: ${existing.length}`);
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Batch update metadata failed:', err);
    process.exit(1);
  });
}
