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

    const metadataResponse = await fetch(metadataBlobs[0].url);
    const metadata = await metadataResponse.json();

    // Fetch sprite URL
    const spritePath = `assets/creatures/${creatureId}.png`;
    const { blobs: spriteBlobs } = await list({
      prefix: spritePath,
      limit: 1,
    });

    const spriteUrl = spriteBlobs.length > 0 ? spriteBlobs[0].url : null;

    return NextResponse.json({
      success: true,
      creature: {
        ...metadata,
        sprite: spriteUrl || metadata.sprite,
      },
      spriteUrl,
      metadata,
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
