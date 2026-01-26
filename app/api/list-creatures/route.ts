/**
 * List creatures from Vercel Blob Storage with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const biome = searchParams.get('biome');
    const rarity = searchParams.get('rarity');
    const playableOnly = searchParams.get('playable') === 'true';

    // List all creature metadata files
    const { blobs } = await list({
      prefix: 'assets/creatures/',
    });

    // Filter for JSON files only
    const metadataBlobs = blobs.filter(blob => blob.pathname.endsWith('.json'));

    // Fetch and parse all metadata
    const creatures = await Promise.all(
      metadataBlobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          const metadata = await response.json();
          return metadata;
        } catch (error) {
          console.error(`Failed to fetch metadata for ${blob.pathname}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and apply filters
    let filteredCreatures = creatures.filter(c => c !== null);

    if (biome) {
      filteredCreatures = filteredCreatures.filter(c => 
        c.biomeId === biome || 
        (c.spawnRules?.canAppearIn || []).includes(biome)
      );
    }

    if (rarity) {
      filteredCreatures = filteredCreatures.filter(c => c.rarity === rarity);
    }

    if (playableOnly) {
      filteredCreatures = filteredCreatures.filter(c => c.playable === true);
    }

    return NextResponse.json({
      success: true,
      creatures: filteredCreatures,
      total: filteredCreatures.length,
    });
  } catch (error) {
    console.error('[ListCreatures] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list creatures',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
