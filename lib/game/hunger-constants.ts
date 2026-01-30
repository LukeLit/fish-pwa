/**
 * Hunger system constants
 * Shared across Player, GameEngine, and FishEditorCanvas
 * 
 * Balance targets:
 * - ~2 min to starve from full if not eating
 * - Need to eat roughly every 15-20 seconds to stay healthy
 * - Small prey (25-30) restores ~9-10 hunger
 * - Normal prey (30-38) restores ~11-13 hunger
 */

export const HUNGER_MAX = 100; // Maximum hunger value
export const HUNGER_DRAIN_RATE = 0.8; // % per second (~2 min to starve from full)
export const HUNGER_RESTORE_MULTIPLIER = 0.35; // Hunger restored per fish size
export const HUNGER_LOW_THRESHOLD = 30; // % for warning effects (raised for earlier warning)
export const HUNGER_WARNING_PULSE_FREQUENCY = 0.008;
export const HUNGER_WARNING_PULSE_BASE = 0.5;
export const HUNGER_WARNING_INTENSITY = 0.3;
export const HUNGER_FRAME_RATE = 60; // Expected frame rate for hunger drain calculation

