/**
 * List creatures from Vercel Blob Storage with optional filters
 * Tries centralized store first, falls back to individual blob files
 */

import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { downloadGameData, uploadGameData } from '@/lib/storage/blob-storage';
import type { Creature } from '@/lib/game/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const biome = searchParams.get('biome');
    const rarity = searchParams.get('rarity');
    const playableOnly = searchParams.get('playable') === 'true';

    // Try centralized creatures data store first
    let creaturesMap = await downloadGameData<Record<string, Creature>>('creatures', {});
    
    // If centralized store is empty, fall back to individual blob files and migrate
    if (Object.keys(creaturesMap).length === 0) {
      console.log('[ListCreatures] Centralized store empty, loading from individual blob files...');
      creaturesMap = await loadFromIndividualBlobs();
      
      // If we loaded creatures, save them to centralized store for future
      if (Object.keys(creaturesMap).length > 0) {
        console.log(`[ListCreatures] Migrating ${Object.keys(creaturesMap).length} creatures to centralized store`);
        await uploadGameData('creatures', creaturesMap);
      }
    }
    
    // Convert map to array
    let filteredCreatures = Object.values(creaturesMap);

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

/**
 * Load creatures from individual blob files (legacy approach)
 */
async function loadFromIndividualBlobs(): Promise<Record<string, Creature>> {
  const creaturesMap: Record<string, Creature> = {};
  
  try {
    // List all creature metadata files
    const { blobs } = await list({
      prefix: 'assets/creatures/',
    });

    // Filter for JSON files only
    const metadataBlobs = blobs.filter(blob => blob.pathname.endsWith('.json'));
    console.log(`[ListCreatures] Found ${metadataBlobs.length} creature blob files`);

    // Fetch and parse all metadata (with error handling for each)
    const results = await Promise.allSettled(
      metadataBlobs.map(async (blob) => {
        const response = await fetch(blob.url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Try to parse as JSON
        const text = await response.text();
        if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
          throw new Error('Not JSON');
        }
        
        return JSON.parse(text) as Creature;
      })
    );

    // Collect successful results
    let successCount = 0;
    let failCount = 0;
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.id) {
        creaturesMap[result.value.id] = result.value;
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`[ListCreatures] Loaded ${successCount} creatures, ${failCount} failed`);
  } catch (error) {
    console.error('[ListCreatures] Error loading from individual blobs:', error);
  }
  
  return creaturesMap;
}
