/**
 * POST /api/player/add-evo-points
 * Adds Evo Points to player's permanent balance
 * 
 * Request body:
 * {
 *   amount: number
 * }
 * 
 * Response:
 * {
 *   evoPoints: number
 * }
 */
import { NextResponse } from 'next/server'
import { loadPlayerState, savePlayerState, addEvoPoints } from '@/lib/game/player-state'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount } = body

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    let playerState = loadPlayerState()
    playerState = addEvoPoints(playerState, amount)
    savePlayerState(playerState)

    return NextResponse.json({ evoPoints: playerState.evoPoints })
  } catch (error) {
    console.error('Error adding evo points:', error)
    return NextResponse.json({ error: 'Failed to add evo points' }, { status: 500 })
  }
}
