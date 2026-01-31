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
  console.log('=== Recovering Original Sprites ===\n');

  // Step 1: List all @256 variants in creatures/
  console.log('Fetching @256 variant files...');
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

  console.log(`Found ${variantFiles.length} @256 variant files to recover\n`);

  if (variantFiles.length === 0) {
    console.log('No @256 variants found. Nothing to recover.');
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

    console.log(`[${i + 1}/${variantFiles.length}] ${originalFilename}`);

    try {
      // Download the @256 variant
      console.log(`  Downloading ${pathname.split('/').pop()}...`);
      const imageResponse = await fetch(asset.url);

      if (!imageResponse.ok) {
        console.log(`  ✗ Failed to download: ${imageResponse.statusText}`);
        errorCount++;
        continue;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Upload as the original filename (without generating new variants)
      console.log(`  Uploading as ${originalFilename}...`);
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
        const errorText = await saveResponse.text();
        console.log(`  ✗ Failed to save: ${errorText}`);
        errorCount++;
        continue;
      }

      console.log(`  ✓ Recovered successfully`);
      successCount++;

    } catch (error) {
      console.log(`  ✗ Error: ${error}`);
      errorCount++;
    }
  }

  console.log('\n=== Recovery Complete ===');
  console.log(`Recovered: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

recoverSprites().catch(console.error);
