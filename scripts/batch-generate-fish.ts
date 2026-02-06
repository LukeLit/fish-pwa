#!/usr/bin/env tsx
/**
 * Batch-generate fish sprites and creature metadata for all biome-documented fish.
 *
 * High-level flow:
 *  1. Use scripts/parse-biome-fish.ts to read docs/biomes/*.md
 *  2. Convert parsed fish into Creature structures
 *  3. For each creature:
 *     - Compose modular prompt via FishSpriteService (client-side) or prompt-builder (server-side analogue)
 *     - Call /api/generate-fish-image to generate a sprite
 *     - Call /api/save-creature to upload sprite + metadata to blob storage
 *
 * NOTE: This script assumes a dev server is running at FISH_PWA_BASE_URL
 * (default http://localhost:3000).
 *
 * Env vars for timeouts and retries:
 *   BATCH_GENERATE_TIMEOUT_MS  - timeout for generate-fish-image (default 120000)
 *   BATCH_SAVE_TIMEOUT_MS      - timeout for save-creature (default 60000)
 *   BATCH_DELAY_MS             - delay between fish (default 3000)
 *   BATCH_MAX_RETRIES          - retries per request (default 3)
 *   BATCH_LIMIT                - process only first N fish (default: all)
 *   BATCH_SKIP_EXISTING        - skip fish that already exist in blob (default: 1)
 *   BATCH_NEW_IDS              - comma-separated ids to process (only these; overrides skip when set)
 */

import { ParsedFish, parseBiomeFile } from './parse-biome-fish';
import { convertParsedFishToCreature } from './convert-fish-to-creature';
import { join, extname } from 'path';
import { readdir } from 'fs/promises';

const BIOME_DIR = 'docs/biomes';
const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

/** Timeout for image generation (AI can be slow). */
const GENERATE_TIMEOUT_MS = Number(process.env.BATCH_GENERATE_TIMEOUT_MS) || 120_000;
/** Timeout for save-creature. */
const SAVE_TIMEOUT_MS = Number(process.env.BATCH_SAVE_TIMEOUT_MS) || 60_000;
/** Delay between fish to avoid overwhelming server. */
const DELAY_BETWEEN_FISH_MS = Number(process.env.BATCH_DELAY_MS) || 3_000;
/** Max retries per request. */
const MAX_RETRIES = Number(process.env.BATCH_MAX_RETRIES) || 3;

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      // eslint-disable-next-line no-console
      // Retry attempt failed silently
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.min(5_000 * attempt, 15_000);
        // eslint-disable-next-line no-console
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastErr;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch set of creature IDs that already exist in blob storage (for resume/skip). */
async function getExistingCreatureIds(): Promise<{ ids: Set<string>; ok: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/api/list-creatures`);
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`list-creatures returned ${res.status}; will process all fish (skip disabled).`);
      return { ids: new Set(), ok: false };
    }
    const data = (await res.json()) as { success?: boolean; creatures?: { id: string }[] };
    const list = data?.creatures ?? [];
    return { ids: new Set(list.map((c) => c.id)), ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`list-creatures failed: ${err instanceof Error ? err.message : String(err)}. Will process all fish (skip disabled).`);
    return { ids: new Set(), ok: false };
  }
}

async function listBiomeFiles(): Promise<string[]> {
  const files = await readdir(BIOME_DIR);
  return files.filter((f) => extname(f) === '.md').map((f) => join(BIOME_DIR, f));
}

async function generateForFish(
  fish: ParsedFish
): Promise<{ success: boolean; id: string; error?: string }> {
  const creature = convertParsedFishToCreature(fish);

  // Compose prompt text on the server by mimicking the client composition:
  const { composeFishPrompt } = await import('../lib/ai/prompt-builder');
  const baseMeters = creature.metrics?.base_meters ?? (creature.stats.size / 100);
  const { prompt, cacheKey } = composeFishPrompt({
    id: creature.id,
    name: creature.name,
    biomeId: creature.biomeId,
    rarity: creature.rarity,
    sizeTier: fish.sizeTier,
    essence: fish.essence,
    descriptionChunks: creature.descriptionChunks,
    visualMotif: creature.visualMotif,
    speciesArchetype: creature.speciesArchetype,
    primaryColorHex: creature.primaryColorHex,
    essenceColorDetails: creature.essenceColorDetails,
    grantedAbilities: creature.grantedAbilities,
    metrics: { base_meters: baseMeters },
  });

  // 1) Generate image (with timeout and retry)
  const genRes = await withRetry(
    () =>
      fetchWithTimeout(
        `${BASE_URL}/api/generate-fish-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: 'google/imagen-4.0-fast-generate-001',
            cacheKey,
          }),
        },
        GENERATE_TIMEOUT_MS
      ),
    'generate-fish-image'
  );

  if (!genRes.ok) {
    const err = await safeJson(genRes);
    return {
      success: false,
      id: creature.id,
      error: `generate-fish-image failed: ${JSON.stringify(err)}`,
    };
  }

  const genJson: any = await genRes.json();
  if (!genJson.success || !genJson.imageBase64) {
    return {
      success: false,
      id: creature.id,
      error: 'generate-fish-image returned no imageBase64',
    };
  }

  // Turn base64 into Blob via fetch for FormData
  const dataUrl = `data:image/png;base64,${genJson.imageBase64}`;
  const imgRes = await fetch(dataUrl);
  const spriteBlob = await imgRes.blob();

  // 2) Save creature (metadata + sprite) via existing API
  const metadata = {
    ...creature,
    sprite: '', // server will fill in blob URL
  };

  const formData = new FormData();
  formData.append('creatureId', creature.id);
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('sprite', spriteBlob, `${creature.id}.png`);

  const saveRes = await withRetry(
    () =>
      fetchWithTimeout(
        `${BASE_URL}/api/save-creature`,
        { method: 'POST', body: formData },
        SAVE_TIMEOUT_MS
      ),
    'save-creature'
  );

  if (!saveRes.ok) {
    const err = await safeJson(saveRes);
    return {
      success: false,
      id: creature.id,
      error: `save-creature failed: ${JSON.stringify(err)}`,
    };
  }

  const saveJson: any = await saveRes.json();
  if (!saveJson.success) {
    return {
      success: false,
      id: creature.id,
      error: `save-creature returned error: ${saveJson.error || 'unknown error'}`,
    };
  }

  return { success: true, id: creature.id };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { status: res.status, statusText: res.statusText };
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Parsing biome docs...');
  const biomeFiles = await listBiomeFiles();

  const allParsed: ParsedFish[] = [];
  for (const file of biomeFiles) {
    const parsed = await parseBiomeFile(file);
    allParsed.push(...parsed);
  }
  // eslint-disable-next-line no-console
  console.log(`Found ${allParsed.length} fish in docs. Checking blob for existing...\n`);

  const newIdsEnv = process.env.BATCH_NEW_IDS?.trim();
  const onlyNewIds = newIdsEnv
    ? new Set(newIdsEnv.split(',').map((id) => id.trim()).filter(Boolean))
    : null;

  const skipExisting = process.env.BATCH_SKIP_EXISTING !== '0';
  let toProcess: ParsedFish[] = allParsed;

  if (onlyNewIds?.size) {
    toProcess = allParsed.filter((fish) => onlyNewIds.has(fish.id));
    // eslint-disable-next-line no-console
    console.log(`BATCH_NEW_IDS set: processing only ${toProcess.length} fish: ${[...onlyNewIds].join(', ')}\n`);
  } else if (skipExisting) {
    const { ids: existingIds, ok } = await getExistingCreatureIds();
    // eslint-disable-next-line no-console
    console.log(`Existing in blob: ${existingIds.size}${ok ? '' : ' (list-creatures failed or empty)'}`);
    toProcess = allParsed.filter((fish) => !existingIds.has(fish.id));
    const skipped = allParsed.length - toProcess.length;
    if (skipped > 0) {
      // eslint-disable-next-line no-console
      console.log(`Skipping ${skipped} existing. To process (new only): ${toProcess.length}\n`);
    }
    if (existingIds.size === 0 && allParsed.length > 10) {
      // eslint-disable-next-line no-console
      console.warn('WARNING: No existing creatures found. Is the dev server running? Processing all fish.\n');
    }
  }

  const limit = process.env.BATCH_LIMIT
    ? parseInt(process.env.BATCH_LIMIT, 10)
    : toProcess.length;
  toProcess = toProcess.slice(0, limit);
  if (limit < toProcess.length) {
    // eslint-disable-next-line no-console
    console.log(`BATCH_LIMIT=${limit}: processing first ${limit} of ${toProcess.length}.\n`);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const fish = toProcess[i];
    // eslint-disable-next-line no-console
    console.log(`🧬 [${i + 1}/${toProcess.length}] Generating: ${fish.id} (${fish.name}) [${fish.biome}]`);
    try {
      const result = await generateForFish(fish);
      if (result.success) {
        successCount++;
        // eslint-disable-next-line no-console
        console.log(`  ✅ Uploaded ${fish.id}`);
      } else {
        failCount++;
        // eslint-disable-next-line no-console
        console.warn(`  ❌ ${fish.id}: ${result.error}`);
      }
    } catch (err) {
      failCount++;
      // eslint-disable-next-line no-console
      console.warn(`  ❌ ${fish.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (i < toProcess.length - 1 && DELAY_BETWEEN_FISH_MS > 0) {
      await delay(DELAY_BETWEEN_FISH_MS);
    }
  }

  // eslint-disable-next-line no-console
  // eslint-disable-next-line no-console
  console.log(`✅ Success: ${successCount}`);
  // eslint-disable-next-line no-console
  console.log(`❌ Failed: ${failCount}`);
  // eslint-disable-next-line no-console
  console.log(`Total processed: ${toProcess.length}${limit < allParsed.length ? ` (${allParsed.length} in docs)` : ''}`);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((err) => {
    // eslint-disable-next-line no-console
    // Batch generation failed silently
    process.exit(1);
  });
}

