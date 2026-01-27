/**
 * API endpoint for run state management
 * GET: Get current run state
 * POST: Save run state
 * DELETE: Clear run state
 * 
 * NOTE: This uses in-memory storage which is NOT suitable for production
 * in serverless environments. For production, use:
 * - Vercel Blob Storage
 * - Database (PostgreSQL, MongoDB, etc.)
 * - Client-side localStorage only (already implemented in lib/game/run-state.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import type { RunState } from '@/lib/game/types'

// WARNING: In-memory storage for demo purposes only
// This will be reset between serverless function invocations
// For production, use persistent storage (Vercel Blob, database, etc.)
let runStateStorage: Record<string, RunState> = {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId') || 'default'

    const runState = runStateStorage[playerId]

    return NextResponse.json({
      runState: runState || null,
    })
  } catch (error) {
    console.error('Failed to get run state:', error)
    return NextResponse.json(
      { error: 'Failed to get run state' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { runState, playerId = 'default' } = body

    if (!runState || !runState.runId) {
      return NextResponse.json(
        { error: 'Invalid run state' },
        { status: 400 }
      )
    }

    runStateStorage[playerId] = runState

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Failed to save run state:', error)
    return NextResponse.json(
      { error: 'Failed to save run state' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId') || 'default'

    delete runStateStorage[playerId]

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Failed to clear run state:', error)
    return NextResponse.json(
      { error: 'Failed to clear run state' },
      { status: 500 }
    )
  }
}
