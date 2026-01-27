/**
 * Hunger system constants
 * Shared across Player, GameEngine, and FishEditorCanvas
 */

export const HUNGER_MAX = 100; // Maximum hunger value
export const HUNGER_DRAIN_RATE = 1.5; // % per second
export const HUNGER_RESTORE_MULTIPLIER = 0.3; // 30% of fish size
export const HUNGER_LOW_THRESHOLD = 25; // % for warning effects
export const HUNGER_WARNING_PULSE_FREQUENCY = 0.008;
export const HUNGER_WARNING_PULSE_BASE = 0.5;
export const HUNGER_WARNING_INTENSITY = 0.3;
export const HUNGER_FRAME_RATE = 60; // Expected frame rate for hunger drain calculation

