#!/usr/bin/env tsx
/**
 * Find and remove duplicate creatures in blob storage.
 *
 * Duplicates occur when the same fish exists under two ids (e.g. canonical
 * "mutant_minnow_medium_polluted" vs old "mutant_minnow_mutant_minnow_medium_polluted_medium_polluted"
 * with name "Mutant Minnow (mutant_minnow_medium_polluted)").
 *
 * Logic:
 *  1. Load all creatures from GET /api/list-creatures
 *  2. Load canonical ids from docs/biomes/*.md (parse-biome-fish)
 *  3. Group blob creatures by (normalizedName, biomeId); normalizedName = name with trailing " (id)" stripped
 *  4. In each group with >1: keep the one whose id is in canonical docs (or has clean name); delete the rest
 *
 * Usage:
 *   npx tsx scripts/dedupe-creatures.ts           # dry run: print what would be deleted
 *   npx tsx scripts/dedupe-creatures.ts --execute  # actually delete duplicates
 *
 * Requires dev server at FISH_PWA_BASE_URL (default http://localhost:3000).
 */

import { ParsedFish, parseBiomeFile } from './parse-biome-fish';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

type CreatureStub = { id: string; name: string; biomeId: string };

/** Strip trailing " (id)" from display name for grouping. */
function normalizedName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
}

async function getBlobCreatures(): Promise<CreatureStub[]> {
  const res = await fetch(`${BASE_URL}/api/list-creatures`);
  if (!res.ok) throw new Error(`list-creatures failed: ${res.status}`);
  const data = (await res.json()) as { creatures?: CreatureStub[] };
  return data?.creatures ?? [];
}

async function getCanonicalIds(): Promise<Set<string>> {
  const biomeDir = join(process.cwd(), 'docs', 'biomes');
  const files = await readdir(biomeDir);
  const mdFiles = files.filter((f) => extname(f) === '.md');
  const all: ParsedFish[] = [];
  for (const file of mdFiles) {
    const fullPath = join(biomeDir, file);
    const entries = await parseBiomeFile(fullPath);
    all.push(...entries);
  }
  return new Set(all.map((p) => p.id));
}

function groupByNormalized(creatures: CreatureStub[]): Map<string, CreatureStub[]> {
  const map = new Map<string, CreatureStub[]>();
  for (const c of creatures) {
    const key = `${normalizedName(c.name).toLowerCase()}::${c.biomeId}`;
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  return map;
}

/** Choose which creature to keep in a duplicate group. Prefer canonical id, then clean name. */
function chooseToKeep(group: CreatureStub[], canonicalIds: Set<string>): CreatureStub {
  const inDocs = group.filter((c) => canonicalIds.has(c.id));
  if (inDocs.length > 0) return inDocs[0];
  const cleanName = group.find((c) => !/\(\s*[^)]+\s*\)/.test(c.name));
  return cleanName ?? group[0];
}

async function deleteCreature(creatureId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/delete-creature?id=${encodeURIComponent(creatureId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  DELETE ${creatureId} failed: ${res.status} ${err}`);
    return false;
  }
  return true;
}

async function main() {
  const execute = process.argv.includes('--execute');

  console.log('Fetching creatures from blob...');
  const creatures = await getBlobCreatures();
  console.log(`Loaded ${creatures.length} creatures.\n`);

  console.log('Loading canonical ids from docs/biomes/*.md...');
  const canonicalIds = await getCanonicalIds();
  console.log(`Canonical ids: ${canonicalIds.size}\n`);

  const groups = groupByNormalized(creatures);
  const duplicates: { keep: CreatureStub; remove: CreatureStub[] }[] = [];

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    const keep = chooseToKeep(group, canonicalIds);
    const remove = group.filter((c) => c.id !== keep.id);
    duplicates.push({ keep, remove });
  }

  if (duplicates.length === 0) {
    console.log('No duplicate groups found.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate group(s):\n`);
  const toDelete: CreatureStub[] = [];
  for (const { keep, remove } of duplicates) {
    console.log(`  Keep: ${keep.id} ("${keep.name}") [${keep.biomeId}]`);
    for (const r of remove) {
      console.log(`    Remove: ${r.id} ("${r.name}")`);
      toDelete.push(r);
    }
    console.log('');
  }

  console.log(`Total to delete: ${toDelete.length} creature(s).`);
  if (!execute) {
    console.log('\nDry run. Run with --execute to delete these from blob.');
    return;
  }

  console.log('\nDeleting...');
  let ok = 0;
  let fail = 0;
  for (const c of toDelete) {
    const success = await deleteCreature(c.id);
    if (success) {
      ok++;
      console.log(`  Deleted: ${c.id}`);
    } else fail++;
  }
  console.log(`\nDeleted: ${ok}, Failed: ${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
