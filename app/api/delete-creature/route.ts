/**
 * Delete creature sprite and metadata from Vercel Blob Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { del, list } from '@vercel/blob';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatureId = searchParams.get('id');

    if (!creatureId) {
      return NextResponse.json(
        { error: 'creatureId is required' },
        { status: 400 }
      );
    }

    const deleted: string[] = [];

    // Delete sprite
    const spritePath = `assets/creatures/${creatureId}.png`;
    const { blobs: spriteBlobs } = await list({
      prefix: spritePath,
      limit: 1,
    });

    if (spriteBlobs.length > 0) {
      await del(spriteBlobs[0].url);
      deleted.push(spriteBlobs[0].url);
    }

    // Delete metadata
    const metadataPath = `assets/creatures/${creatureId}.json`;
    const { blobs: metadataBlobs } = await list({
      prefix: metadataPath,
      limit: 1,
    });

    if (metadataBlobs.length > 0) {
      await del(metadataBlobs[0].url);
      deleted.push(metadataBlobs[0].url);
    }

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Creature not found' },
        { status: 404 }
      );
    }

    console.log('[DeleteCreature] Deleted creature:', creatureId, deleted);

    return NextResponse.json({
      success: true,
      deleted,
      creatureId,
    });
  } catch (error) {
    console.error('[DeleteCreature] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete creature',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
