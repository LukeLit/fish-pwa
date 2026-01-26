/**
 * Get player's unlocked fish
 * Returns PlayerState.unlockedFish from blob storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { downloadGameData } from '@/lib/storage/blob-storage';
import type { PlayerState } from '@/lib/game/types';

export async function GET(request: NextRequest) {
  try {
    // Load player state
    const defaultPlayerState: PlayerState = {
      evoPoints: 0,
      essence: {},
      metaUpgrades: {},
      unlockedFish: ['goldfish_starter'],
      unlockedBiomes: ['shallow'],
      bestiary: {},
      highScore: 0,
      totalRuns: 0,
    };

    const playerState = await downloadGameData<PlayerState>('player/state', defaultPlayerState);

    return NextResponse.json({
      success: true,
      unlockedFish: playerState.unlockedFish,
    });
  } catch (error) {
    console.error('[GetUnlockedFish] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get unlocked fish',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
