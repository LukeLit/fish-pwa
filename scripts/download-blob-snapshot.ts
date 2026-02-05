#!/usr/bin/env tsx
/**
 * Download all creature data from blob and biome metadata from code into a single
 * JSON snapshot for inspection and level planning.
 *
 * Requires dev server at FISH_PWA_BASE_URL (default http://localhost:3000).
 * Output: docs/plans/LEVEL-REFACTOR/blob-snapshot.json
 *
 * Run: npx tsx scripts/download-blob-snapshot.ts
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getAllBiomes } from '../lib/game/data/biomes';

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = join(process.cwd(), 'docs', 'plans', 'LEVEL-REFACTOR');
const OUTPUT_PATH = join(OUTPUT_DIR, 'blob-snapshot.json');

type CreatureFromApi = {
  id: string;
  name?: string;
  biomeId?: string;
  type?: string;
  rarity?: string;
  stats?: { size?: number; speed?: number; health?: number; damage?: number };
  spawnRules?: { canAppearIn?: string[] };
  sizeTier?: string;
  playable?: boolean;
  [key: string]: unknown;
};

async function main() {
  const res = await fetch(`${BASE_URL}/api/list-creatures`);
  if (!res.ok) {
    console.error('Failed to list creatures:', res.status, await res.text());
    process.exit(1);
  }
  const data = (await res.json()) as { success?: boolean; creatures?: CreatureFromApi[] };
  const creatures = data?.creatures ?? [];

  const biomes = getAllBiomes().map((b) => ({
    id: b.id,
    name: b.name,
    depthRange: b.depthRange,
  }));

  const creaturesWithInferred = creatures.map((c) => {
    const out = { ...c } as CreatureFromApi & { _inferred_base_meters?: number; _inferred_base_art_scale?: number };
    if (typeof c.stats?.size === 'number') {
      out._inferred_base_meters = c.stats.size / 100;
      out._inferred_base_art_scale = c.stats.size;
    }
    return out;
  });

  const snapshot = {
    creatures: creaturesWithInferred,
    biomes,
    exportedAt: new Date().toISOString(),
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Creatures: ${creatures.length}`);
  console.log(`Biomes: ${biomes.length}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Download failed:', err);
    process.exit(1);
  });
}
