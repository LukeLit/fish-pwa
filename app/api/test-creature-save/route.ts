/**
 * Test endpoint to verify creature save/load cycle
 * GET /api/test-creature-save?id=<creatureId>
 */

import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatureId = searchParams.get('id');

    if (!creatureId) {
      return NextResponse.json({ error: 'creatureId required' }, { status: 400 });
    }

    // Get metadata
    const metadataPath = `assets/creatures/${creatureId}.json`;
    const { blobs: metadataBlobs } = await list({
      prefix: metadataPath,
      limit: 1,
    });

    if (metadataBlobs.length === 0) {
      return NextResponse.json({ error: 'Creature not found' }, { status: 404 });
    }

    const metadataResponse = await fetch(metadataBlobs[0].url);
    const metadata = await metadataResponse.json();

    // Get sprite (uploadAsset adds assets/ prefix, so sprite is at assets/creatures/)
    const spritePath = `assets/creatures/${creatureId}.png`;
    const { blobs: spriteBlobs } = await list({
      prefix: spritePath,
      limit: 1,
    });

    return NextResponse.json({
      success: true,
      creatureId,
      metadataUrl: metadataBlobs[0].url,
      spriteUrl: spriteBlobs[0]?.url || null,
      metadataSprite: metadata.sprite,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        sprite: metadata.sprite,
      },
      spriteExists: spriteBlobs.length > 0,
    });
  } catch (error) {
    console.error('[TestCreatureSave] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test creature',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
