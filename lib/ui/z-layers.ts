/**
 * Z-Index Layer System
 * 
 * Centralized z-index management to prevent layering conflicts.
 * Each category has a reserved range to allow for sub-layering within categories.
 * 
 * Usage:
 *   import { Z_LAYERS } from '@/lib/ui/z-layers';
 *   <div style={{ zIndex: Z_LAYERS.MENU_PANEL }}>
 *   // or with Tailwind:
 *   <div className={`z-[${Z_LAYERS.MENU_PANEL}]`}>
 */

export const Z_LAYERS = {
  // === BACKGROUND (0-10) ===
  // Canvas, background images, decorative elements
  BACKGROUND: 0,
  BACKGROUND_OVERLAY: 5,

  // === GAME ELEMENTS (11-30) ===
  // Fish, interactive game objects, particles
  GAME_ENTITY: 15,
  GAME_ENTITY_SELECTED: 20,
  GAME_PARTICLE: 25,

  // === HUD (31-50) ===
  // In-game UI that doesn't block interaction
  HUD_BACKGROUND: 35,
  HUD: 40,
  HUD_FOREGROUND: 45,

  // === CONTROLS (51-70) ===
  // Buttons, joysticks, interactive controls
  CONTROLS: 55,
  CONTROLS_ACTIVE: 60,

  // === PANELS (71-100) ===
  // Bottom sheets, side panels (PauseMenu, editor panels)
  PANEL_BACKDROP: 75,
  PANEL: 80,
  PANEL_HEADER: 85,

  // === DRAWERS (101-130) ===
  // Slide-out navigation drawers (SettingsDrawer)
  DRAWER_BACKDROP: 105,
  DRAWER: 110,
  DRAWER_CONTENT: 115,

  // === MODALS (131-160) ===
  // Dialogs, confirmations, important prompts
  MODAL_BACKDROP: 135,
  MODAL: 140,
  MODAL_CONTENT: 145,

  // === SELECTORS (161-180) ===
  // Art selectors, pickers, dropdowns
  SELECTOR_BACKDROP: 165,
  SELECTOR: 170,
  SELECTOR_ITEM: 175,

  // === TOOLTIPS (181-200) ===
  // Floating tips, popovers
  TOOLTIP: 185,
  POPOVER: 190,

  // === TOASTS (201-220) ===
  // Notifications, alerts, feedback
  TOAST: 205,
  NOTIFICATION: 210,

  // === CRITICAL (221+) ===
  // Error boundaries, loading screens, blocking UI
  LOADING: 225,
  ERROR_BOUNDARY: 230,
  SYSTEM_CRITICAL: 250,
} as const;

// Type for z-layer values
export type ZLayer = typeof Z_LAYERS[keyof typeof Z_LAYERS];

/**
 * Helper to get Tailwind z-index class
 * @example zClass(Z_LAYERS.MODAL) // returns "z-[140]"
 */
export function zClass(layer: ZLayer): string {
  return `z-[${layer}]`;
}

/**
 * Helper to get inline style object
 * @example zStyle(Z_LAYERS.MODAL) // returns { zIndex: 140 }
 */
export function zStyle(layer: ZLayer): { zIndex: number } {
  return { zIndex: layer };
}
