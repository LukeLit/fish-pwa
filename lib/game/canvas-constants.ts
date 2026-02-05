/**
 * Canvas Game Constants
 * Centralized constants for FishEditorCanvas game systems
 * These can be overridden via GameConfig settings
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

// World bounds
export const WORLD_BOUNDS = {
  minX: -1500,
  maxX: 1500,
  minY: -1200,
  maxY: 1200,
} as const;

// Particle system configs
export const PARTICLES = {
  PLAYER_DASH_FLOW_CAP: 200,
  PLAYER_DASH_SPAWN_PER_FRAME: 1,
  MULTI_ENTITY_FLOW_CAP: 120,
  MULTI_ENTITY_SPAWN_PER_FRAME: 1,
} as const;

// Collision constants
export const COLLISION = {
  HEAD_OFFSET_RATIO: 0.35, // Head position offset from center (35% of size)
  HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)
  IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
  STATIONARY_DRAIN_FRACTION: 0.1, // 10% of full hunger drain when not moving
} as const;

// Animation constants
export const ANIMATION = {
  ANIM_TIME_BASE: 0.05, // Base animation time increment
  ANIM_TIME_SPEED_MULT: 0.06, // Speed-based animation time multiplier
  CHOMP_DECAY_TIME: 280, // ms for chomp phase decay
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
} as const;
