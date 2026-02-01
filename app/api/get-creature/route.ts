/**
 * Get creature sprite and metadata from Vercel Blob Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatureId = searchParams.get('id');

    if (!creatureId) {
      return NextResponse.json(
        { error: 'creatureId is required' },
        { status: 400 }
      );
    }

    // Fetch metadata
    const metadataPath = `assets/creatures/${creatureId}.json`;
    const { blobs: metadataBlobs } = await list({
      prefix: metadataPath,
      limit: 1,
    });

    if (metadataBlobs.length === 0) {
      return NextResponse.json(
        { error: 'Creature not found' },
        { status: 404 }
      );
    }

    const metadataResponse = await fetch(metadataBlobs[0].url, {
      cache: 'no-store', // Bypass fetch cache
    });
    const metadata = await metadataResponse.json();

    // Fetch sprite URL
    const spritePath = `assets/creatures/${creatureId}.png`;
    const { blobs: spriteBlobs } = await list({
      prefix: spritePath,
      limit: 1,
    });

    const spriteUrl = spriteBlobs.length > 0 ? spriteBlobs[0].url : null;
    
    // Add cache-busting timestamp to sprite URLs using updatedAt or current time
    const timestamp = metadata.updatedAt || Date.now();
    const addCacheBuster = (url: string | null | undefined) => {
      if (!url) return url;
      // Don't add if already has query params (might already have cache buster)
      if (url.includes('?')) return url;
      return `${url}?t=${timestamp}`;
    };

    // Build creature with cache-busted URLs
    const creature = {
      ...metadata,
      sprite: addCacheBuster(spriteUrl || metadata.sprite),
    };
    
    // Also cache-bust growth sprite URLs if present
    if (creature.growthSprites) {
      for (const stage of ['juvenile', 'adult', 'elder'] as const) {
        if (creature.growthSprites[stage]?.sprite) {
          creature.growthSprites[stage].sprite = addCacheBuster(creature.growthSprites[stage].sprite);
        }
        if (creature.growthSprites[stage]?.spriteResolutions) {
          const res = creature.growthSprites[stage].spriteResolutions;
          if (res.high) res.high = addCacheBuster(res.high)!;
          if (res.medium) res.medium = addCacheBuster(res.medium)!;
          if (res.low) res.low = addCacheBuster(res.low)!;
        }
      }
    }
    
    // Cache-bust main sprite resolutions too
    if (creature.spriteResolutions) {
      if (creature.spriteResolutions.high) creature.spriteResolutions.high = addCacheBuster(creature.spriteResolutions.high)!;
      if (creature.spriteResolutions.medium) creature.spriteResolutions.medium = addCacheBuster(creature.spriteResolutions.medium)!;
      if (creature.spriteResolutions.low) creature.spriteResolutions.low = addCacheBuster(creature.spriteResolutions.low)!;
    }

    return NextResponse.json({
      success: true,
      creature,
      spriteUrl: addCacheBuster(spriteUrl),
      metadata,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[GetCreature] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get creature',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
