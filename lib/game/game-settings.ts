// Centralized game settings config for art size and auto-action toggles
// This will be loaded/saved via blob storage and used throughout the game/editor

export interface GameSettings {
  artSize: number
  autoDash: boolean
  autoAttack: boolean
  autoEat: boolean
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  artSize: 128, // Default art size in px (can be adjusted)
  autoDash: false,
  autoAttack: false,
  autoEat: false,
}
