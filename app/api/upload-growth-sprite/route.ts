/**
 * Upload Growth Sprite API
 * 
 * Uploads a single growth stage sprite to Vercel Blob Storage.
 * Creates multi-resolution variants (512, 256, 128px).
 * Used by SpriteLab for uploading locally-generated sprites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import sharp from 'sharp';
import type { SpriteResolutions, GrowthStage } from '@/lib/game/types';

/** Resolution variant sizes in pixels */
const RESOLUTION_SIZES = {
  high: 512,
  medium: 256,
  low: 128,
} as const;

/**
 * Generate multi-resolution variants of a sprite
 */
async function generateResolutionVariants(buffer: Buffer): Promise<{
  high: Buffer;
  medium: Buffer;
  low: Buffer;
}> {
  const [high, medium, low] = await Promise.all([
    sharp(buffer)
      .resize(RESOLUTION_SIZES.high, RESOLUTION_SIZES.high, {
        fit: 'contain',
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer(),
    sharp(buffer)
      .resize(RESOLUTION_SIZES.medium, RESOLUTION_SIZES.medium, {
        fit: 'contain',
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer(),
    sharp(buffer)
      .resize(RESOLUTION_SIZES.low, RESOLUTION_SIZES.low, {
        fit: 'contain',
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer(),
  ]);

  return { high, medium, low };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const creatureId = formData.get('creatureId') as string;
    const stage = formData.get('stage') as GrowthStage;
    const spriteFile = formData.get('sprite') as File | null;

    if (!creatureId || !stage || !spriteFile) {
      return NextResponse.json(
        { error: 'creatureId, stage, and sprite file are required' },
        { status: 400 }
      );
    }

    // Validate stage
    if (!['juvenile', 'adult', 'elder'].includes(stage)) {
      return NextResponse.json(
        { error: 'Invalid stage. Must be juvenile, adult, or elder' },
        { status: 400 }
      );
    }

    console.log(`[UploadGrowthSprite] Uploading ${stage} sprite for ${creatureId}`);

    // Read the sprite file
    const buffer = Buffer.from(await spriteFile.arrayBuffer());

    // Generate resolution variants
    const variants = await generateResolutionVariants(buffer);

    // Build filenames
    const baseFilename = `${creatureId}_${stage}`;
    const filenames = {
      high: `assets/creatures/${baseFilename}.png`,
      medium: `assets/creatures/${baseFilename}@256.png`,
      low: `assets/creatures/${baseFilename}@128.png`,
    };

    // Delete existing variants to invalidate CDN cache
    try {
      for (const filename of Object.values(filenames)) {
        const existing = await list({ prefix: filename });
        for (const blob of existing.blobs) {
          console.log(`[UploadGrowthSprite] Deleting existing: ${blob.url}`);
          await del(blob.url);
        }
      }
    } catch (deleteErr) {
      // Non-fatal - file might not exist
      console.log('[UploadGrowthSprite] Delete step (non-fatal):', deleteErr);
    }

    // Upload all variants in parallel
    const [highResult, mediumResult, lowResult] = await Promise.all([
      put(filenames.high, variants.high, {
        access: 'public',
        contentType: 'image/png',
        allowOverwrite: true,
      }),
      put(filenames.medium, variants.medium, {
        access: 'public',
        contentType: 'image/png',
        allowOverwrite: true,
      }),
      put(filenames.low, variants.low, {
        access: 'public',
        contentType: 'image/png',
        allowOverwrite: true,
      }),
    ]);

    // Add cache-busting timestamp to URLs
    const timestamp = Date.now();
    const addCacheBuster = (url: string) => `${url}?t=${timestamp}`;

    const spriteResolutions: SpriteResolutions = {
      high: addCacheBuster(highResult.url),
      medium: addCacheBuster(mediumResult.url),
      low: addCacheBuster(lowResult.url),
    };

    console.log(`[UploadGrowthSprite] Uploaded ${stage} sprite for ${creatureId}:`, highResult.url);

    return NextResponse.json({
      success: true,
      creatureId,
      stage,
      spriteUrl: addCacheBuster(highResult.url),
      spriteResolutions,
      // Include raw URLs without cache buster for reference
      _rawUrls: {
        high: highResult.url,
        medium: mediumResult.url,
        low: lowResult.url,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[UploadGrowthSprite] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isBlobTokenError = errorMessage.includes('No token found') || errorMessage.includes('BLOB_READ_WRITE_TOKEN');

    return NextResponse.json(
      {
        error: 'Failed to upload growth sprite',
        message: isBlobTokenError
          ? 'Blob storage token not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.'
          : errorMessage,
        requiresToken: isBlobTokenError,
      },
      { status: 500 }
    );
  }
}
