/**
 * Unlock a fish for the player
 * Updates PlayerState.unlockedFish in blob storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { downloadGameData, uploadGameData } from '@/lib/storage/blob-storage';
import type { PlayerState } from '@/lib/game/types';

export async function POST(request: NextRequest) {
  try {
    const { fishId } = await request.json();

    if (!fishId) {
      return NextResponse.json(
        { error: 'fishId is required' },
        { status: 400 }
      );
    }

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

    // Check if already unlocked
    if (playerState.unlockedFish.includes(fishId)) {
      return NextResponse.json({
        success: true,
        message: 'Fish already unlocked',
        unlockedFish: playerState.unlockedFish,
      });
    }

    // Add fish to unlocked list
    playerState.unlockedFish.push(fishId);

    // Save updated player state
    await uploadGameData('player/state', playerState);

    return NextResponse.json({
      success: true,
      message: 'Fish unlocked successfully',
      unlockedFish: playerState.unlockedFish,
    });
  } catch (error) {
    console.error('[UnlockFish] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to unlock fish',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
