#!/usr/bin/env tsx
/**
 * Batch generate resolution variants for existing fish sprites.
 *
 * This script:
 * 1. Lists all existing fish sprites in blob storage
 * 2. For each sprite missing @256 or @128 variants:
 *    - Downloads the original
 *    - Generates 256x256 and 128x128 variants using Sharp
 *    - Uploads the variants to blob storage
 *
 * Env vars:
 *   FISH_PWA_BASE_URL    - base URL for API calls (default: http://localhost:3000)
 *   BATCH_DRY_RUN        - if "1", only log what would be done (default: 0)
 *   BATCH_LIMIT          - process only first N sprites (default: all)
 *   BATCH_DELAY_MS       - delay between processing sprites (default: 500)
 *
 * Usage:
 *   npx tsx scripts/generate-resolution-variants.ts
 *   BATCH_DRY_RUN=1 npx tsx scripts/generate-resolution-variants.ts  # dry run
 */

import sharp from 'sharp';

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';
const DRY_RUN = process.env.BATCH_DRY_RUN === '1';
const LIMIT = process.env.BATCH_LIMIT ? parseInt(process.env.BATCH_LIMIT, 10) : Infinity;
const DELAY_MS = parseInt(process.env.BATCH_DELAY_MS || '500', 10);

interface BlobAsset {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

/** Resolution sizes matching the image-processor module */
const RESOLUTION_SIZES = {
  high: 512,
  medium: 256,
  low: 128,
} as const;

/**
 * List all sprites from blob storage (both fish/ and creatures/ directories)
 */
async function listSprites(prefix: string): Promise<BlobAsset[]> {
  const response = await fetch(`${BASE_URL}/api/list-assets?prefix=${encodeURIComponent(prefix)}`);
  if (!response.ok) {
    throw new Error(`Failed to list assets: ${response.statusText}`);
  }
  const data = await response.json();
  return data.assets || [];
}

/**
 * List all fish sprites from blob storage (legacy fish/ directory)
 */
async function listFishSprites(): Promise<BlobAsset[]> {
  return listSprites('fish/');
}

/**
 * List all creature sprites from blob storage (creatures/ directory)
 */
async function listCreatureSprites(): Promise<BlobAsset[]> {
  return listSprites('creatures/');
}

/**
 * Download a sprite from its URL
 */
async function downloadSprite(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download sprite: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Resize an image to a target size
 */
async function resizeImage(buffer: Buffer, targetSize: number): Promise<Buffer> {
  return sharp(buffer)
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 255, g: 0, b: 255, alpha: 1 }, // Magenta background
      kernel: 'lanczos3',
    })
    .png({
      compressionLevel: 6,
      adaptiveFiltering: true,
    })
    .toBuffer();
}

/**
 * Upload a sprite variant to blob storage
 */
async function uploadVariant(
  filename: string,
  buffer: Buffer,
  directory: 'fish' | 'creatures' = 'fish'
): Promise<string> {
  const type = directory === 'creatures' ? 'creature' : 'fish';

  const response = await fetch(`${BASE_URL}/api/save-sprite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: `data:image/png;base64,${buffer.toString('base64')}`,
      filename,
      type,
      generateVariants: false, // Don't recursively generate variants
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload variant: ${response.statusText}`);
  }

  const data = await response.json();
  return data.localPath;
}

/**
 * Get the base filename (without @256 or @128 suffix)
 */
function getBaseFilename(pathname: string): string {
  // Remove assets/fish/ or assets/creatures/ prefix and any variant suffix
  const filename = pathname.replace(/^assets\/(fish|creatures)\//, '');
  return filename.replace(/@(256|128)\.png$/, '.png');
}

/**
 * Get the directory from a pathname
 */
function getDirectory(pathname: string): 'fish' | 'creatures' {
  if (pathname.includes('/creatures/')) return 'creatures';
  return 'fish';
}

/**
 * Check if a pathname is a variant (has @256 or @128)
 */
function isVariant(pathname: string): boolean {
  return /@(256|128)\.png$/.test(pathname);
}

/**
 * Get variant filename for a base filename
 */
function getVariantFilename(baseFilename: string, size: number): string {
  const extIndex = baseFilename.lastIndexOf('.');
  if (extIndex === -1) {
    return `${baseFilename}@${size}`;
  }
  const name = baseFilename.substring(0, extIndex);
  const ext = baseFilename.substring(extIndex);
  return `${name}@${size}${ext}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Multi-Resolution Sprite Variant Generator');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Limit: ${LIMIT === Infinity ? 'all' : LIMIT}`);
  console.log('');

  // 1. List all sprites from both directories
  console.log('Listing sprites from blob storage...');
  const [fishAssets, creatureAssets] = await Promise.all([
    listFishSprites(),
    listCreatureSprites(),
  ]);
  console.log(`Found ${fishAssets.length} assets in fish/`);
  console.log(`Found ${creatureAssets.length} assets in creatures/`);

  // Combine and tag with directory for upload path
  const allAssets = [
    ...fishAssets.map(a => ({ ...a, directory: 'fish' as const })),
    ...creatureAssets.map(a => ({ ...a, directory: 'creatures' as const })),
  ];
  console.log(`Total: ${allAssets.length} assets`);

  // 2. Filter to only original sprites (not variants)
  const originals = allAssets.filter(asset => !isVariant(asset.pathname));
  console.log(`Found ${originals.length} original sprites (excluding variants)`);

  // 3. Build a set of existing variants for quick lookup
  const existingVariants = new Set(
    allAssets
      .filter(asset => isVariant(asset.pathname))
      .map(asset => asset.pathname.replace(/^assets\//, ''))
  );

  // 4. Find sprites missing variants
  type AssetWithDir = BlobAsset & { directory: 'fish' | 'creatures' };
  const spritesNeedingVariants: Array<{ asset: AssetWithDir; baseFilename: string; missingVariants: number[]; directory: 'fish' | 'creatures' }> = [];

  for (const asset of originals as AssetWithDir[]) {
    const baseFilename = getBaseFilename(asset.pathname);
    const directory = asset.directory || getDirectory(asset.pathname);
    const missingVariants: number[] = [];

    // Check for @256 and @128 variants in the correct directory
    for (const size of [RESOLUTION_SIZES.medium, RESOLUTION_SIZES.low]) {
      const variantFilename = getVariantFilename(baseFilename, size);
      const variantPath = `${directory}/${variantFilename}`;
      if (!existingVariants.has(variantPath)) {
        missingVariants.push(size);
      }
    }

    if (missingVariants.length > 0) {
      spritesNeedingVariants.push({ asset, baseFilename, missingVariants, directory });
    }
  }

  console.log(`Found ${spritesNeedingVariants.length} sprites needing variants`);
  console.log('');

  if (spritesNeedingVariants.length === 0) {
    console.log('All sprites already have resolution variants. Nothing to do!');
    return;
  }

  // 5. Process sprites
  const toProcess = spritesNeedingVariants.slice(0, LIMIT);
  console.log(`Processing ${toProcess.length} sprites...`);
  console.log('');

  let processed = 0;
  let failed = 0;

  for (const { asset, baseFilename, missingVariants, directory } of toProcess) {
    console.log(`[${processed + 1}/${toProcess.length}] ${directory}/${baseFilename}`);
    console.log(`  Missing variants: ${missingVariants.map(s => `@${s}`).join(', ')}`);

    if (DRY_RUN) {
      console.log('  [DRY RUN] Would generate variants');
      processed++;
      continue;
    }

    try {
      // Download original sprite
      console.log('  Downloading original...');
      const originalBuffer = await downloadSprite(asset.url);

      // Generate and upload each missing variant
      for (const size of missingVariants) {
        const variantFilename = getVariantFilename(baseFilename, size);
        console.log(`  Generating @${size} variant...`);

        const variantBuffer = await resizeImage(originalBuffer, size);
        console.log(`  Uploading ${directory}/${variantFilename} (${Math.round(variantBuffer.length / 1024)}KB)...`);

        const url = await uploadVariant(variantFilename, variantBuffer, directory);
        console.log(`  Uploaded: ${url}`);
      }

      processed++;
      console.log('  Done!');
    } catch (error) {
      failed++;
      console.error(`  ERROR: ${error instanceof Error ? error.message : error}`);
    }

    // Delay between sprites to avoid overwhelming the server
    if (processed < toProcess.length) {
      await delay(DELAY_MS);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already had variants): ${originals.length - spritesNeedingVariants.length}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
