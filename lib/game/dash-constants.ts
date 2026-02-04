/**
 * Dash Mechanic Constants
 * Configuration values for the dash combat system
 */

// Dash mechanics
export const DASH_SPEED_MULTIPLIER = 2;
export const DASH_STAMINA_DRAIN_RATE = 16; // per second (2x for challenge)
/** Each second of holding dash adds this to the drain multiplier (1 + holdSeconds * this). Capped at DASH_STAMINA_RAMP_CAP. */
export const DASH_STAMINA_RAMP_PER_SECOND = 0.5;
/** Max drain multiplier from holding dash (e.g. 2.5 = 2.5x base rate after ~3s hold) */
export const DASH_STAMINA_RAMP_CAP = 2.5;
export const DASH_ATTACK_STAMINA_COST = 15;

// Size thresholds
export const SWALLOW_SIZE_RATIO = 2.0;  // Can swallow if ≥2x target size
export const ATTACK_SIZE_RATIO = 1.2;   // Can damage if ≥1.2x target size
export const BATTLE_SIZE_THRESHOLD = 0.2; // Within 20% = stamina battle

// Knocked out state
export const KO_STAMINA_REGEN_MULTIPLIER = 0.5; // 50% normal regen
export const KO_WAKE_THRESHOLD = 0.4; // Wake at 40% stamina
export const KO_DRIFT_SPEED = 0.5; // Slow drift while KO

// Prey fleeing penalty - prey drains stamina faster when escaping (player/predators get upper hand)
export const PREY_FLEE_STAMINA_MULTIPLIER = 1.5;

// Size-based attack penalty - attacking larger target costs more stamina (small predator can't endlessly harass)
export const ATTACK_LARGER_STAMINA_MULTIPLIER = 1.8;

// Carcass system
export const CARCASS_DECAY_TIME = 45000; // 45 seconds
export const MEAT_ORB_LIFETIME = 20000; // 20 seconds
export const CHUNKS_PER_ESSENCE = 1; // 1 chunk per essence point
