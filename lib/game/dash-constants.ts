/**
 * Dash Mechanic Constants
 * Configuration values for the dash combat system
 */

// Dash mechanics
export const DASH_SPEED_MULTIPLIER = 1.75;
export const DASH_STAMINA_DRAIN_RATE = 8; // per second
export const DASH_ATTACK_STAMINA_COST = 15;

// Size thresholds
export const SWALLOW_SIZE_RATIO = 2.0;  // Can swallow if ≥2x target size
export const ATTACK_SIZE_RATIO = 1.2;   // Can damage if ≥1.2x target size
export const BATTLE_SIZE_THRESHOLD = 0.2; // Within 20% = stamina battle

// Knocked out state
export const KO_STAMINA_REGEN_MULTIPLIER = 0.5; // 50% normal regen
export const KO_WAKE_THRESHOLD = 0.4; // Wake at 40% stamina
export const KO_DRIFT_SPEED = 0.5; // Slow drift while KO

// Carcass system
export const CARCASS_DECAY_TIME = 45000; // 45 seconds
export const MEAT_ORB_LIFETIME = 20000; // 20 seconds
export const CHUNKS_PER_ESSENCE = 1; // 1 chunk per essence point
