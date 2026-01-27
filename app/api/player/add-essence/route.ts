/**
 * POST /api/player/add-essence
 * Adds essence to player's permanent collection
 * 
 * Request body:
 * {
 *   essenceType: string,
 *   amount: number
 * }
 * 
 * Response:
 * {
 *   essence: Record<string, number>
 * }
 */
import { NextResponse } from 'next/server'
import { loadPlayerState, savePlayerState, addEssence } from '@/lib/game/player-state'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { essenceType, amount } = body

    if (typeof essenceType !== 'string' || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    let playerState = loadPlayerState()
    playerState = addEssence(playerState, essenceType, amount)
    savePlayerState(playerState)

    return NextResponse.json({ essence: playerState.essence })
  } catch (error) {
    console.error('Error adding essence:', error)
    return NextResponse.json({ error: 'Failed to add essence' }, { status: 500 })
  }
}
