#!/usr/bin/env tsx
/**
 * Update creature metadata with spriteResolutions field.
 *
 * This script:
 * 1. Lists all creature metadata JSON files in blob storage
 * 2. Downloads each metadata file
 * 3. Generates spriteResolutions URLs from the sprite URL
 * 4. Uploads the updated metadata back via API
 *
 * Env vars:
 *   FISH_PWA_BASE_URL    - base URL for API calls (default: http://localhost:3000)
 *   BATCH_DRY_RUN        - if "1", only log what would be done (default: 0)
 *   BATCH_LIMIT          - process only first N creatures (default: all)
 *   BATCH_DELAY_MS       - delay between processing (default: 200)
 *
 * Usage:
 *   npx tsx scripts/update-creature-resolutions.ts
 *   BATCH_DRY_RUN=1 npx tsx scripts/update-creature-resolutions.ts  # dry run
 */

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';
const DRY_RUN = process.env.BATCH_DRY_RUN === '1';
const LIMIT = process.env.BATCH_LIMIT ? parseInt(process.env.BATCH_LIMIT, 10) : Infinity;
const DELAY_MS = parseInt(process.env.BATCH_DELAY_MS || '200', 10);

interface BlobAsset {
  url: string;
  pathname: string;
  filename?: string;
  size: number;
  uploadedAt: string;
}

interface SpriteResolutions {
  high: string;
  medium: string;
  low: string;
}

interface CreatureMetadata {
  id: string;
  sprite: string;
  spriteResolutions?: SpriteResolutions;
  [key: string]: unknown;
}

/**
 * List all creature metadata JSON files from blob storage
 */
async function listCreatureMetadata(): Promise<BlobAsset[]> {
  const response = await fetch(`${BASE_URL}/api/list-assets?prefix=creatures/&includeJson=true`);
  if (!response.ok) {
    throw new Error(`Failed to list assets: ${response.statusText}`);
  }
  const data = await response.json();
  const assets = (data.assets || []) as BlobAsset[];

  // Filter to only JSON files
  return assets.filter(a => a.pathname?.endsWith('.json'));
}

/**
 * Download creature metadata from URL
 */
async function downloadMetadata(url: string): Promise<CreatureMetadata> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download metadata: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Generate spriteResolutions from a sprite URL
 * e.g., "https://...foo.png" -> { high: "https://...foo.png", medium: "https://...foo@256.png", low: "https://...foo@128.png" }
 */
function generateSpriteResolutions(spriteUrl: string): SpriteResolutions | null {
  if (!spriteUrl || !spriteUrl.includes('.png')) {
    return null;
  }

  // Find the .png extension and insert @256 or @128 before it
  const pngIndex = spriteUrl.lastIndexOf('.png');
  if (pngIndex === -1) return null;

  const basePart = spriteUrl.substring(0, pngIndex);
  const extPart = spriteUrl.substring(pngIndex); // ".png" or ".png?..."

  return {
    high: spriteUrl,
    medium: `${basePart}@256${extPart}`,
    low: `${basePart}@128${extPart}`,
  };
}

/**
 * Upload updated metadata via save-creature API
 */
async function uploadMetadata(creatureId: string, metadata: CreatureMetadata): Promise<string> {
  // Create form data for the save-creature API
  const formData = new FormData();
  formData.append('creatureId', creatureId);
  formData.append('metadata', JSON.stringify(metadata));
  // Don't include sprite file - we're only updating metadata

  const response = await fetch(`${BASE_URL}/api/save-creature`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to save: ${response.statusText}`);
  }

  const result = await response.json();
  return result.metadataUrl;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Creature Metadata spriteResolutions Updater');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Limit: ${LIMIT === Infinity ? 'all' : LIMIT}`);
  console.log('');

  // 1. List all creature metadata files
  console.log('Listing creature metadata files...');
  const metadataFiles = await listCreatureMetadata();
  console.log(`Found ${metadataFiles.length} creature metadata files`);
  console.log('');

  if (metadataFiles.length === 0) {
    console.log('No creature metadata files found. Nothing to do!');
    return;
  }

  // 2. Process each metadata file
  const toProcess = metadataFiles.slice(0, LIMIT);
  console.log(`Processing ${toProcess.length} creatures...`);
  console.log('');

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of toProcess) {
    const creatureId = asset.filename?.replace('.json', '') || asset.pathname.split('/').pop()?.replace('.json', '') || 'unknown';
    console.log(`[${processed + 1}/${toProcess.length}] ${creatureId}`);

    try {
      // Download current metadata
      console.log('  Downloading metadata...');
      const metadata = await downloadMetadata(asset.url);

      // Check if already has spriteResolutions
      if (metadata.spriteResolutions) {
        console.log('  Already has spriteResolutions, skipping');
        skipped++;
        processed++;
        continue;
      }

      // Check if has a sprite URL
      if (!metadata.sprite) {
        console.log('  No sprite URL found, skipping');
        skipped++;
        processed++;
        continue;
      }

      // Generate spriteResolutions
      const resolutions = generateSpriteResolutions(metadata.sprite);
      if (!resolutions) {
        console.log('  Could not generate resolutions from sprite URL, skipping');
        skipped++;
        processed++;
        continue;
      }

      console.log(`  Generated resolutions:`);
      console.log(`    high:   ${resolutions.high.substring(0, 60)}...`);
      console.log(`    medium: ${resolutions.medium.substring(0, 60)}...`);
      console.log(`    low:    ${resolutions.low.substring(0, 60)}...`);

      if (DRY_RUN) {
        console.log('  [DRY RUN] Would update metadata');
        updated++;
        processed++;
        continue;
      }

      // Update metadata
      metadata.spriteResolutions = resolutions;

      // Upload updated metadata via API
      console.log('  Uploading updated metadata...');
      const newUrl = await uploadMetadata(creatureId, metadata);
      console.log(`  Uploaded: ${newUrl}`);

      updated++;
      processed++;
      console.log('  Done!');
    } catch (error) {
      failed++;
      processed++;
      console.error(`  ERROR: ${error instanceof Error ? error.message : error}`);
    }

    // Delay between creatures
    if (processed < toProcess.length) {
      await delay(DELAY_MS);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already had resolutions or no sprite): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
