#!/usr/bin/env tsx
/**
 * Patch existing blob-stored creatures with new fields (sizeTier, spawnRules)
 * without regenerating sprites. Run this after adding tier/ecosystem support
 * so existing fish get sizeTier and correct spawnRules.
 *
 * Flow:
 *  1. Fetch all creatures from /api/list-creatures
 *  2. Parse docs/biomes/*.md for canonical sizeTier + biome per id
 *  3. For each existing creature: merge sizeTier (and spawnRules.canAppearIn from docs)
 *     or infer sizeTier from stats when not in docs; POST /api/save-creature metadata-only
 *
 * Requires dev server at FISH_PWA_BASE_URL (default http://localhost:3000).
 */

import { ParsedFish, parseBiomeFile } from './parse-biome-fish';
import { join, extname } from 'path';
import { readdir } from 'fs/promises';

const BIOME_DIR = 'docs/biomes';
const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

type CreatureMetadata = {
  id: string;
  biomeId?: string;
  stats?: { size?: number };
  type?: string;
  playable?: boolean;
  spawnRules?: { canAppearIn?: string[]; spawnWeight?: number };
  [key: string]: unknown;
};

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

function inferMetrics(creature: CreatureMetadata): { base_meters: number; base_art_scale: number; sub_depth: 'upper' | 'mid' | 'lower' } {
  const size = creature.stats?.size ?? 60;
  return {
    base_meters: size / 100,
    base_art_scale: size,
    sub_depth: inferSubDepthFromSize(size),
  };
}

async function listBiomeFiles(): Promise<string[]> {
  const files = await readdir(BIOME_DIR);
  return files.filter((f) => extname(f) === '.md').map((f) => join(BIOME_DIR, f));
}

async function main() {
  const biomeFiles = await listBiomeFiles();
  const allParsed: ParsedFish[] = [];
  for (const file of biomeFiles) {
    const parsed = await parseBiomeFile(file);
    allParsed.push(...parsed);
  }
  const docMap = new Map<string, ParsedFish>(allParsed.map((p) => [p.id, p]));

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
    console.log(`  ✅ ${id} → sizeTier=${sizeTier}, metrics.base_meters=${metrics.base_meters.toFixed(2)}`);
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
