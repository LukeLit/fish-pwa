/**
 * Canvas Game Constants
 * Centralized constants for FishEditorCanvas game systems
 */

import { DASH_SPEED_MULTIPLIER } from './dash-constants';

// Physics constants
export const PHYSICS = {
  MAX_SPEED: 1.5,
  ACCELERATION: 0.15,
  FRICTION: 0.92,
  DASH_SPEED_MULTIPLIER: DASH_SPEED_MULTIPLIER,
  DASH_ACCEL_MULTIPLIER: 1.3, // Snappier acceleration when dashing
  MAX_TILT: Math.PI / 6, // Maximum vertical tilt angle
  TILT_SENSITIVITY: 0.3, // How much velocity affects tilt
  TILT_SMOOTHING: 0.1, // Smoothing factor for tilt transitions
} as const;

// AI constants
export const AI = {
  BASE_SPEED: 0.7,
  PREDATOR_CHASE_SPEED: 1.15, // Predators faster to catch prey
  PREY_FLEE_SPEED: 0.85, // Prey slightly slower when fleeing
  DETECTION_RANGE: 400,
  CHASE_TIMEOUT_MS: 4500, // Give up chase after 4.5s
  STAMINA_REGEN: 100, // per second
  SPEED_SCALE: 0.1, // Scale down for canvas movement
  PREDATOR_TARGET_SIZE_RATIO: 0.8, // Only chase if target smaller than fish.size * this
  DASH_DISTANCE_MULTIPLIER: 6, // Predator starts dash when dist < fish.size * this
  DASH_STAMINA_MIN: 15, // Min stamina to allow AI dash
  PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this
  WANDER_JITTER: 0.05, // Random velocity nudge when no target
  RANDOM_DIRECTION_CHANCE: 0.01, // Chance per frame to pick new wander direction
  WANDER_SPEED: 2, // Max random velocity when wandering
  FISH_ANIM_SPEED_DIVISOR: 1.5, // Fish animTime += 0.04 + min(0.04, (speed / this) * 0.04)
} as const;

// Camera/Zoom constants
export const CAMERA = {
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 5.0,
  ZOOM_DELTA: 0.1, // 10% per scroll tick (0.9 or 1.1 multiplier)
  LERP_SPEED: 0.12, // Smooth zoom animation speed
  ANIMATION_THRESHOLD: 0.01, // Minimum zoom diff to animate
} as const;

// Spawn constants
export const SPAWN = {
  FADE_DURATION: 1500, // ms to fully fade in (collision enables when fully opaque)
  MIN_DISTANCE: 400, // Spawn off-screen distance
  MAX_DISTANCE_OFFSET: 300, // Additional random distance
  STAGGER_DELAY_MIN: 100, // Minimum delay between spawns (ms)
  STAGGER_DELAY_MAX: 200, // Maximum delay between spawns (ms)
  DEFAULT_MAX_FISH: 45, // Base max fish count
  RESPAWN_INTERVAL_MS: 2000, // Default respawn interval
  FISH_SIZE_MIN: 0.5, // Min size multiplier for spawned AI fish
  FISH_SIZE_MAX: 2, // Max size multiplier for spawned AI fish
  SMALL_PREY_SIZE_THRESHOLD: 50, // Respawn pool: size < this = small prey (extra copies)
  PREY_SIZE_THRESHOLD: 80, // Respawn pool: size < this = prey (extra copies)
  DEFAULT_CREATURE_SIZE: 60, // Fallback when stats.size unknown
  PREY_DEFAULT_SIZE: 30,
  PREDATOR_DEFAULT_SIZE: 100,
} as const;

// UI constants
export const UI = {
  EDIT_BUTTON_SIZE: 24,
  EDIT_BUTTON_OFFSET: 5, // Offset above fish
  HUNGER_BAR_HEIGHT: 24,
  HUNGER_BAR_WIDTH: 300, // Base width (responsive)
  HUNGER_BAR_MIN_WIDTH: 200, // Minimum width for responsive layout
  HUNGER_BAR_Y: 16, // Position from top
  HUNGER_BAR_PADDING: 3, // Inner padding
  STAMINA_BAR_HEIGHT: 24,
  STAMINA_BAR_SPACING: 8, // Space between bars
  BAR_SPACING: 8,
  TIMER_SPACING: 12, // Space below stamina bar
  STATS_Y_OFFSET: 90, // Stats panel Y offset from bottom
  STAMINA_LOW_THRESHOLD: 0.3, // 30% - color changes below this
} as const;

// Game mode (score, stats throttle)
export const GAME = {
  SCORE_PER_SIZE_UNIT: 10, // score = (player.size - baseSize) * this
  STATS_UPDATE_CHANCE: 0.07, // Throttle onStatsUpdate to ~4fps (Math.random() < this)
} as const;

// World bounds
export const WORLD_BOUNDS = {
  minX: -1500,
  maxX: 1500,
  minY: -1200,
  maxY: 1200,
} as const;

// Depth band visual: global depth range in meters (shallow 0 → deep 6) for meters→world Y mapping
export const DEPTH_METERS_MAX = 6;

// Particle system configs
export const PARTICLES = {
  PLAYER_DASH_FLOW_CAP: 200,
  PLAYER_DASH_SPAWN_PER_FRAME: 1,
  MULTI_ENTITY_FLOW_CAP: 120,
  MULTI_ENTITY_SPAWN_PER_FRAME: 1,
  CHOMP_LIFE_DECAY: 0.01, // Per frame
  CHOMP_PUNCH_DECAY: 0.08, // Punch scale decay per frame
  BLOOD_LIFE_DECAY: 0.007, // Per frame
  BLOOD_COUNT_LARGE: 22, // When sizeScale > BLOOD_SIZE_THRESHOLD
  BLOOD_COUNT_SMALL: 10,
  BLOOD_SIZE_THRESHOLD: 25,
  BLOOD_RADIUS_MAX_LARGE: 10, // 4 + random * this
  BLOOD_RADIUS_MAX_SMALL: 6,
} as const;

// Collision constants
export const COLLISION = {
  HEAD_OFFSET_RATIO: 0.35, // Head position offset from center (35% of size)
  HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)
  IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
  STATIONARY_DRAIN_FRACTION: 0.1, // 10% of full hunger drain when not moving
  FACING_SPEED_THRESHOLD: 0.1, // Min horizontal speed to update facing direction
  // Eating / size gain (shared by game loop and collision)
  SIZE_GAIN_RATIO: 0.15, // Eater gains 15% of eaten size (before efficiency)
  EFFICIENCY_RATIO: 0.4, // Diminishing returns: 1 / (1 + sizeRatio * this)
  MIN_EFFICIENCY: 0.05, // Minimum size gain multiplier
  STAMINA_BATTLE_SIZE_GAIN: 0.08, // Winner gains 8% of loser size in stamina battle
  KO_VELOCITY_DAMP: 0.3, // Velocity multiplier when knocked out (drift)
} as const;

// Animation constants
export const ANIMATION = {
  ANIM_TIME_BASE: 0.05, // Base animation time increment
  ANIM_TIME_SPEED_MULT: 0.06, // Speed-based animation time multiplier
  CHOMP_DECAY_TIME: 280, // ms for chomp phase decay
  FISH_ANIM_BASE: 0.04, // Base animTime increment for AI fish
  FISH_ANIM_SPEED_CAP: 0.04, // Cap for speed-based increment
} as const;

// Rendering constants
export const RENDERING = {
  BACKGROUND_PARALLAX_FACTOR: 0.15,
  BACKGROUND_SCALE: 1.3, // Scale up to provide buffer for parallax
  WATER_DISTORTION_WAVE_SCALE: 0.01, // Wave frequency
  WATER_DISTORTION_TIME_SCALE: 2, // Time multiplier for waves
  WATER_DISTORTION_AMPLITUDE: 5, // Wave amplitude
  SUNRAY_COUNT: 5, // Number of sunray gradients
  SUNRAY_OFFSET: 50, // Sunray movement offset
  BLOOD_PARTICLE_ALPHA: 0.55,
  BLOOD_PARTICLE_MIN_RADIUS: 3,
  KO_OPACITY_MULTIPLIER: 0.85, // KO fish are slightly transparent
} as const;

// Stamina constants
export const STAMINA = {
  PLAYER_REGEN_RATE: 100, // per second
  AI_REGEN_RATE: 100, // per second
  DEFAULT_MAX: 100, // Initial stamina/maxStamina for player and AI fish
} as const;

// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
export const ART = {
  // Art size bounds - used by editor slider and growth stage logic
  SIZE_MIN: 20,
  SIZE_MAX: 300,

  // Growth stage size thresholds (juvenile/adult/elder)
  GROWTH_RANGES: {
    JUVENILE_MIN: 20,
    JUVENILE_MAX: 99,   // 20-99: small / young
    ADULT_MIN: 100,
    ADULT_MAX: 199,     // 100-199: mature (adult starts at 100)
    ELDER_MIN: 200,
    ELDER_MAX: 300,     // 200-300: large / elder (elder starts at 200)
  },

  // LOD (Level of Detail) thresholds - screen-space size in pixels
  LOD_THRESHOLDS: {
    VIDEO_DETAIL: 120,  // >= 120px: use video clips if available
    FULL_DETAIL: 80,    // >= 80px: max segments
    MEDIUM_DETAIL: 40,  // 40-79px: medium segments
    LOW_DETAIL: 20,     // 20-39px: low segments
    STATIC: 12,         // < 12px: static sprite (no animation)
  },

  // Segment count range for smooth interpolation
  SEGMENT_RANGE: {
    MAX: 12,   // Maximum segments at full detail
    MIN: 3,    // Minimum segments before going static
  },

  // Player gets more segments than AI fish
  PLAYER_SEGMENT_MULTIPLIER: 1.34, // 12 * 1.34 ≈ 16 for player

  // Sprite resolution thresholds (mipmap-like behavior)
  // When to swap sprite resolutions based on screen size
  SPRITE_RESOLUTION_THRESHOLDS: {
    HIGH: 100,    // >= 100px screen size: use 512px sprite
    MEDIUM: 40,   // >= 40px screen size: use 256px sprite
    // < 40px: use 128px sprite
  },
} as const;
