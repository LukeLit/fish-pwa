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
async function getExistingCreatureIds(): Promise<Set<string>> {
  try {
    const res = await fetch(`${BASE_URL}/api/list-creatures`);
    if (!res.ok) return new Set();
    const data = (await res.json()) as { success?: boolean; creatures?: { id: string }[] };
    const list = data?.creatures ?? [];
    return new Set(list.map((c) => c.id));
  } catch {
    return new Set();
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
  const { prompt, cacheKey } = composeFishPrompt({
    id: creature.id,
    name: creature.name,
    biomeId: creature.biomeId,
    rarity: creature.rarity,
    sizeTier: fish.sizeTier,
    essence: fish.essence,
    descriptionChunks: creature.descriptionChunks,
    visualMotif: creature.visualMotif,
    grantedAbilities: creature.grantedAbilities,
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
  const biomeFiles = await listBiomeFiles();

  const allParsed: ParsedFish[] = [];
  for (const file of biomeFiles) {
    const parsed = await parseBiomeFile(file);
    allParsed.push(...parsed);
  }

  const skipExisting = process.env.BATCH_SKIP_EXISTING !== '0';
  let toProcess: ParsedFish[] = allParsed;
  if (skipExisting) {
    const existingIds = await getExistingCreatureIds();
    toProcess = allParsed.filter((fish) => !existingIds.has(fish.id));
    const skipped = allParsed.length - toProcess.length;
    if (skipped > 0) {
      // eslint-disable-next-line no-console
    }
  }

  const limit = process.env.BATCH_LIMIT
    ? parseInt(process.env.BATCH_LIMIT, 10)
    : toProcess.length;
  toProcess = toProcess.slice(0, limit);
  if (limit < allParsed.length || (skipExisting && toProcess.length < allParsed.length)) {
    // eslint-disable-next-line no-console
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const fish = toProcess[i];
    // eslint-disable-next-line no-console
    try {
      const result = await generateForFish(fish);
      if (result.success) {
        successCount++;
        // eslint-disable-next-line no-console
      } else {
        failCount++;
        // eslint-disable-next-line no-console
        // Creature upload failed silently
      }
    } catch (err) {
      failCount++;
      // eslint-disable-next-line no-console
      // Unexpected error occurred silently
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

