/**
 * POST /api/player/purchase-meta-upgrade
 * Purchases a meta upgrade using Evo Points
 * 
 * Request body:
 * {
 *   upgradeId: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   evoPoints: number,
 *   metaUpgrades: Record<string, number>
 * }
 */
import { NextResponse } from 'next/server'
import { loadPlayerState, savePlayerState, spendEvoPoints, upgradeMetaUpgrade, getMetaUpgradeLevel } from '@/lib/game/player-state'
import { getUpgrade, calculateUpgradeCost } from '@/lib/game/data/upgrades'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { upgradeId } = body

    if (typeof upgradeId !== 'string') {
      return NextResponse.json({ error: 'Invalid upgrade ID' }, { status: 400 })
    }

    // Get upgrade definition
    const upgrade = getUpgrade(upgradeId)
    if (!upgrade) {
      return NextResponse.json({ error: 'Upgrade not found' }, { status: 404 })
    }

    // Meta upgrades must be in the 'meta' category
    if (upgrade.category !== 'meta') {
      return NextResponse.json({ error: 'Not a meta upgrade' }, { status: 400 })
    }

    // Load player state
    let playerState = loadPlayerState()
    const currentLevel = getMetaUpgradeLevel(playerState, upgradeId)

    // Check if already at max level
    if (currentLevel >= upgrade.maxLevel) {
      return NextResponse.json({ error: 'Upgrade already at max level' }, { status: 400 })
    }

    // Calculate cost for next level
    const cost = calculateUpgradeCost(upgrade, currentLevel)

    // Check if player has enough Evo Points
    if (playerState.evoPoints < cost) {
      return NextResponse.json({ error: 'Not enough Evo Points' }, { status: 400 })
    }

    // Spend Evo Points and upgrade
    const afterSpend = spendEvoPoints(playerState, cost)
    if (!afterSpend) {
      return NextResponse.json({ error: 'Failed to spend Evo Points' }, { status: 500 })
    }

    playerState = upgradeMetaUpgrade(afterSpend, upgradeId)
    savePlayerState(playerState)

    return NextResponse.json({
      success: true,
      evoPoints: playerState.evoPoints,
      metaUpgrades: playerState.metaUpgrades,
    })
  } catch (error) {
    console.error('Error purchasing meta upgrade:', error)
    return NextResponse.json({ error: 'Failed to purchase upgrade' }, { status: 500 })
  }
}
