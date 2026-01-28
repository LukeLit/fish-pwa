import { FishData } from '@/components/FishEditOverlay'

export interface SpawnFishOptions {
  isPlayer?: boolean
  position?: { x: number; y: number }
  overrides?: Partial<FishData>
}

/**
 * Shared utility to spawn a fish entity (player or AI) with full data.
 * Used by both the editor and main game for consistent spawning.
 */
export function spawnFishFromData(
  fishData: FishData,
  options: SpawnFishOptions = {}
) {
  const {
    isPlayer = false,
    position = { x: 400, y: 300 },
    overrides = {},
  } = options

  // Merge overrides
  const data: FishData = { ...fishData, ...overrides }

  // Core entity structure (add more as needed for game/physics)
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    stats: { ...data.stats },
    sprite: data.sprite,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    size: data.stats.size,
    health: data.stats.health,
    damage: data.stats.damage,
    facingRight: true,
    verticalTilt: 0,
    animTime: 0,
    chompPhase: 0,
    chompEndTime: 0,
    hunger: 100,
    hungerDrainRate: 0.1,
    abilities: data.grantedAbilities || [],
    isPlayer,
    // Add more fields as needed for the game/editor
  }
}
