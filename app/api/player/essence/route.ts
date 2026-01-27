/**
 * GET /api/player/essence
 * Returns current essence balances for all types
 * 
 * Response:
 * {
 *   essence: Record<string, number>
 * }
 */
import { NextResponse } from 'next/server'
import { loadPlayerState } from '@/lib/game/player-state'

export async function GET() {
  try {
    const playerState = loadPlayerState()
    return NextResponse.json({ essence: playerState.essence })
  } catch (error) {
    console.error('Error getting essence:', error)
    return NextResponse.json({ error: 'Failed to get essence' }, { status: 500 })
  }
}
