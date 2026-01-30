/**
 * List creatures from Vercel Blob Storage with optional filters
 * Uses the centralized creatures data store for reliability
 */

import { NextRequest, NextResponse } from 'next/server';
import { downloadGameData } from '@/lib/storage/blob-storage';
import type { Creature } from '@/lib/game/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const biome = searchParams.get('biome');
    const rarity = searchParams.get('rarity');
    const playableOnly = searchParams.get('playable') === 'true';

    // Load from centralized creatures data store (more reliable than individual blob files)
    const creaturesMap = await downloadGameData<Record<string, Creature>>('creatures', {});
    
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
