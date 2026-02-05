/**
 * Recovery script: Copy @256 variants back to original filenames
 * This restores the original sprite files that were accidentally deleted
 */

const BASE_URL = 'http://localhost:3000';

interface BlobAsset {
  url: string;
  pathname?: string;
  filename?: string;
}

async function recoverSprites() {
  // Step 1: List all @256 variants in creatures/
  const listResponse = await fetch(`${BASE_URL}/api/list-assets?prefix=creatures&includeJson=false`);

  if (!listResponse.ok) {
    throw new Error(`Failed to list assets: ${listResponse.statusText}`);
  }

  const { assets } = await listResponse.json() as { assets: BlobAsset[] };

  // Filter for @256 variants only
  const variantFiles = assets.filter(asset => {
    const pathname = asset.pathname || asset.filename || '';
    return pathname.includes('@256.png');
  });

  if (variantFiles.length === 0) {
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < variantFiles.length; i++) {
    const asset = variantFiles[i];
    const pathname = asset.pathname || asset.filename || '';

    // Extract the base filename (remove @256)
    const originalFilename = pathname
      .replace('assets/creatures/', '')
      .replace('@256.png', '.png');

    try {
      // Download the @256 variant
      const imageResponse = await fetch(asset.url);

      if (!imageResponse.ok) {
        errorCount++;
        continue;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Upload as the original filename (without generating new variants)
      const saveResponse = await fetch(`${BASE_URL}/api/save-sprite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'creature',
          filename: originalFilename,
          imageBase64: `data:image/png;base64,${base64Image}`,
          generateVariants: false, // Don't generate new variants, just save the file
        }),
      });

      if (!saveResponse.ok) {
        errorCount++;
        continue;
      }

      successCount++;

    } catch (error) {
      errorCount++;
    }
  }
}

recoverSprites().catch(() => {});
