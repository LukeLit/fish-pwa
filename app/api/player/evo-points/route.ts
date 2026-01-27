/**
 * GET /api/player/evo-points
 * Returns current Evo Points balance
 */
import { NextResponse } from 'next/server'
import { loadPlayerState } from '@/lib/game/player-state'

export async function GET() {
  try {
    const playerState = loadPlayerState()
    return NextResponse.json({ evoPoints: playerState.evoPoints })
  } catch (error) {
    console.error('Error getting evo points:', error)
    return NextResponse.json({ error: 'Failed to get evo points' }, { status: 500 })
  }
}
