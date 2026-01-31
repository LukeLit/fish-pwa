/**
 * Save creature sprite and metadata to Vercel Blob Storage
 * Saves both the sprite image and complete creature metadata together
 * 
 * CACHE FIX: Deletes existing files before uploading to force CDN cache invalidation
 * 
 * Multi-resolution support: Generates 512, 256, and 128px variants for optimal
 * rendering at different screen sizes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, deleteAsset, listAssets } from '@/lib/storage/blob-storage';
import { put, del, list } from '@vercel/blob';
import {
  generateResolutionVariants,
  getVariantFilename,
  type ResolutionUrls
} from '@/lib/assets/image-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const creatureId = formData.get('creatureId') as string;
    const spriteFile = formData.get('sprite') as File | null;
    const metadataJson = formData.get('metadata') as string;

    if (!creatureId || !metadataJson) {
      return NextResponse.json(
        { error: 'creatureId and metadata are required' },
        { status: 400 }
      );
    }

    const metadata = JSON.parse(metadataJson);

    let spriteUrl: string | undefined;

    // CACHE FIX: Delete existing sprite and metadata files first to invalidate CDN cache
    try {
      // Find and delete existing sprite
      const existingSprites = await list({ prefix: `assets/creatures/${creatureId}.png` });
      for (const blob of existingSprites.blobs) {
        console.log('[SaveCreature] Deleting existing sprite:', blob.url);
        await del(blob.url);
      }

      // Find and delete existing metadata
      const existingMetadata = await list({ prefix: `assets/creatures/${creatureId}.json` });
      for (const blob of existingMetadata.blobs) {
        console.log('[SaveCreature] Deleting existing metadata:', blob.url);
        await del(blob.url);
      }
    } catch (deleteErr) {
      // Continue even if delete fails - file might not exist
      console.log('[SaveCreature] Delete step (non-fatal):', deleteErr);
    }

    // Upload sprite if provided
    // Note: uploadAsset automatically adds 'assets/' prefix, so we just pass 'creatures/...'
    let spriteResolutions: ResolutionUrls | undefined;

    if (spriteFile) {
      const buffer = Buffer.from(await spriteFile.arrayBuffer());
      const baseFilename = `${creatureId}.png`;

      // Generate multi-resolution variants
      console.log('[SaveCreature] Generating resolution variants for:', creatureId);
      const variants = await generateResolutionVariants(buffer);

      // Delete existing resolution variants before uploading new ones
      try {
        const variantFilenames = [
          baseFilename,
          getVariantFilename(baseFilename, 'medium'),
          getVariantFilename(baseFilename, 'low'),
        ];
        for (const filename of variantFilenames) {
          const existing = await list({ prefix: `assets/creatures/${filename}` });
          for (const blob of existing.blobs) {
            console.log('[SaveCreature] Deleting existing variant:', blob.url);
            await del(blob.url);
          }
        }
      } catch (deleteErr) {
        console.log('[SaveCreature] Variant delete step (non-fatal):', deleteErr);
      }

      // Upload all 3 variants in parallel
      const [highResult, mediumResult, lowResult] = await Promise.all([
        uploadAsset(`creatures/${baseFilename}`, variants.high, 'image/png'),
        uploadAsset(`creatures/${getVariantFilename(baseFilename, 'medium')}`, variants.medium, 'image/png'),
        uploadAsset(`creatures/${getVariantFilename(baseFilename, 'low')}`, variants.low, 'image/png'),
      ]);

      spriteUrl = highResult.url;
      spriteResolutions = {
        high: highResult.url,
        medium: mediumResult.url,
        low: lowResult.url,
      };

      console.log('[SaveCreature] Saved all resolution variants:', spriteResolutions);

      // Update metadata with sprite URL and resolutions BEFORE saving metadata
      metadata.sprite = spriteUrl;
      metadata.spriteResolutions = spriteResolutions;
    } else {
      // No sprite file provided - keep existing sprite URL from metadata if present
      spriteUrl = metadata.sprite;
      spriteResolutions = metadata.spriteResolutions;
    }

    // Upload metadata - ensure sprite URL is set
    const metadataPath = `assets/creatures/${creatureId}.json`;

    // Double-check sprite URL is in metadata
    if (spriteUrl && metadata.sprite !== spriteUrl) {
      console.warn('[SaveCreature] WARNING: metadata.sprite does not match spriteUrl, fixing...');
      metadata.sprite = spriteUrl;
    }

    const metadataJsonString = JSON.stringify(metadata);

    const metadataBlob = await put(metadataPath, metadataJsonString, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });

    // Verify what was actually saved by fetching it back
    const verifyResponse = await fetch(metadataBlob.url);
    const savedMetadata = await verifyResponse.json();

    if (savedMetadata.sprite !== spriteUrl) {
      console.error('[SaveCreature] ERROR: Saved metadata sprite does not match uploaded sprite URL!', {
        expected: spriteUrl,
        got: savedMetadata.sprite,
      });
      // Still return success but include warning
      return NextResponse.json({
        success: true,
        creatureId,
        spriteUrl,
        spriteResolutions,
        metadataUrl: metadataBlob.url,
        metadata: savedMetadata, // Return what was actually saved
        warning: 'Metadata sprite URL mismatch detected',
      });
    }

    return NextResponse.json({
      success: true,
      creatureId,
      spriteUrl,
      spriteResolutions,
      metadataUrl: metadataBlob.url,
      metadata: savedMetadata, // Return verified saved metadata
    });
  } catch (error) {
    console.error('[SaveCreature] Error:', error);

    // Check if error is due to missing BLOB_READ_WRITE_TOKEN
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isBlobTokenError = errorMessage.includes('No token found') || errorMessage.includes('BLOB_READ_WRITE_TOKEN');

    return NextResponse.json(
      {
        error: 'Failed to save creature',
        message: isBlobTokenError
          ? 'Blob storage token not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.'
          : errorMessage,
        requiresToken: isBlobTokenError,
      },
      { status: 500 }
    );
  }
}
