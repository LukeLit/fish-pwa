/**
 * List creatures from Vercel Blob Storage with optional filters
 * Uses individual blob files to support concurrent creature creation by multiple users
 */

import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import type { Creature } from '@/lib/game/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const biome = searchParams.get('biome');
    const rarity = searchParams.get('rarity');
    const playableOnly = searchParams.get('playable') === 'true';

    // Load creatures from individual blob files
    // This approach supports concurrent creation by multiple users
    const creatures = await loadCreaturesFromBlobs();

    // Apply filters
    let filteredCreatures = creatures;

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
    }, {
      headers: {
        // Prevent caching to ensure fresh data
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
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

/**
 * Load creatures from individual blob files
 * Handles errors gracefully and logs issues for debugging
 */
async function loadCreaturesFromBlobs(): Promise<Creature[]> {
  const creatures: Creature[] = [];

  try {
    // List all creature metadata files
    const { blobs } = await list({
      prefix: 'assets/creatures/',
    });

    // Filter for JSON files only
    const metadataBlobs = blobs.filter(blob => blob.pathname.endsWith('.json'));

    if (metadataBlobs.length === 0) {
      console.log('[ListCreatures] No creature files found in blob storage');
      return [];
    }

    // Fetch all metadata in parallel with individual error handling
    const results = await Promise.allSettled(
      metadataBlobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url, {
            // Add cache control to avoid stale responses
            cache: 'no-store',
          });

          if (!response.ok) {
            console.warn(`[ListCreatures] HTTP ${response.status} for ${blob.pathname}`);
            return null;
          }

          const text = await response.text();

          // Validate it looks like JSON before parsing
          const trimmed = text.trim();
          if (!trimmed.startsWith('{')) {
            console.warn(`[ListCreatures] Non-JSON content for ${blob.pathname}: ${trimmed.substring(0, 50)}`);
            return null;
          }

          const creature = JSON.parse(text) as Creature;

          // Validate the creature has required fields
          if (!creature.id) {
            console.warn(`[ListCreatures] Creature missing id: ${blob.pathname}`);
            return null;
          }

          return creature;
        } catch (error) {
          console.warn(`[ListCreatures] Error loading ${blob.pathname}:`, error);
          return null;
        }
      })
    );

    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        creatures.push(result.value);
      }
    }

    console.log(`[ListCreatures] Loaded ${creatures.length}/${metadataBlobs.length} creatures`);
  } catch (error) {
    console.error('[ListCreatures] Error listing blobs:', error);
  }

  return creatures;
}
