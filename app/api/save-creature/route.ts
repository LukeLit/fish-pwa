/**
 * Save creature sprite and metadata to Vercel Blob Storage
 * Saves both the sprite image and complete creature metadata together
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset } from '@/lib/storage/blob-storage';
import { put } from '@vercel/blob';

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

    // Upload sprite if provided
    if (spriteFile) {
      const buffer = Buffer.from(await spriteFile.arrayBuffer());
      const spritePath = `creatures/${creatureId}.png`;
      const result = await uploadAsset(spritePath, buffer, 'image/png');
      spriteUrl = result.url;
      
      // Update metadata with sprite URL
      metadata.sprite = spriteUrl;
    }

    // Upload metadata
    const metadataPath = `creatures/${creatureId}.json`;
    const metadataBlob = await put(metadataPath, JSON.stringify(metadata, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    console.log('[SaveCreature] Saved creature:', creatureId);

    return NextResponse.json({
      success: true,
      creatureId,
      spriteUrl,
      metadataUrl: metadataBlob.url,
      metadata,
    });
  } catch (error) {
    console.error('[SaveCreature] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save creature',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
