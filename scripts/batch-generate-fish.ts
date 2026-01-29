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
 */

import { ParsedFish, parseBiomeFile } from './parse-biome-fish';
import { convertParsedFishToCreature } from './convert-fish-to-creature';
import { join, extname } from 'path';
import { readdir } from 'fs/promises';

const BIOME_DIR = 'docs/biomes';
const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

async function listBiomeFiles(): Promise<string[]> {
  const files = await readdir(BIOME_DIR);
  return files.filter((f) => extname(f) === '.md').map((f) => join(BIOME_DIR, f));
}

async function generateForFish(
  fish: ParsedFish
): Promise<{ success: boolean; id: string; error?: string }> {
  const creature = convertParsedFishToCreature(fish);

  // Compose prompt text on the server by mimicking the client composition:
  // We reuse the same builder logic as FishSpriteService.
  // Use relative path since ts-node doesn't resolve @/ aliases
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

  // 1) Generate image
  const genRes = await fetch(`${BASE_URL}/api/generate-fish-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'google/imagen-4.0-fast-generate-001',
      cacheKey,
    }),
  });

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

  const saveRes = await fetch(`${BASE_URL}/api/save-creature`, {
    method: 'POST',
    body: formData,
  });

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

  // Simple progress logging
  let successCount = 0;
  let failCount = 0;

  for (const fish of allParsed) {
    // eslint-disable-next-line no-console
    console.log(`\n🧬 Generating creature: ${fish.id} (${fish.name}) [${fish.biome}]`);
    try {
      const result = await generateForFish(fish);
      if (result.success) {
        successCount++;
        // eslint-disable-next-line no-console
        console.log(`  ✅ Uploaded creature ${result.id}`);
      } else {
        failCount++;
        // eslint-disable-next-line no-console
        console.warn(`  ❌ Failed for ${result.id}: ${result.error}`);
      }
    } catch (err) {
      failCount++;
      // eslint-disable-next-line no-console
      console.error(`  ❌ Unexpected error for ${fish.id}:`, err);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n' + '='.repeat(40));
  // eslint-disable-next-line no-console
  console.log(`✅ Success: ${successCount}`);
  // eslint-disable-next-line no-console
  console.log(`❌ Failed: ${failCount}`);
  // eslint-disable-next-line no-console
  console.log(`Total: ${allParsed.length}`);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Batch generation failed:', err);
    process.exit(1);
  });
}

