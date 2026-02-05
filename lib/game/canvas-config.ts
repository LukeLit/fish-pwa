/**
 * Canvas Configuration Helper
 * Returns base constants for game systems
 */

import { PHYSICS, AI, CAMERA, SPAWN, PARTICLES } from './canvas-constants';

export interface CanvasConfig {
  physics: {
    maxSpeed: number;
    acceleration: number;
    friction: number;
    dashSpeedMultiplier: number;
    dashAccelMultiplier: number;
    maxTilt: number;
    tiltSensitivity: number;
    tiltSmoothing: number;
  };
  ai: {
    baseSpeed: number;
    predatorChaseSpeed: number;
    preyFleeSpeed: number;
    detectionRange: number;
    chaseTimeoutMs: number;
    staminaRegen: number;
    speedScale: number;
  };
  camera: {
    minZoom: number;
    maxZoom: number;
    zoomDelta: number;
    lerpSpeed: number;
    animationThreshold: number;
  };
  spawn: {
    fadeDuration: number;
    minDistance: number;
    maxDistanceOffset: number;
    staggerDelayMin: number;
    staggerDelayMax: number;
    defaultMaxFish: number;
    respawnIntervalMs: number;
  };
  particles: typeof PARTICLES;
}

/**
 * Get canvas configuration (base constants)
 */
export function getCanvasConfig(): CanvasConfig {
  return {
    physics: {
      maxSpeed: PHYSICS.MAX_SPEED,
      acceleration: PHYSICS.ACCELERATION,
      friction: PHYSICS.FRICTION,
      dashSpeedMultiplier: PHYSICS.DASH_SPEED_MULTIPLIER,
      dashAccelMultiplier: PHYSICS.DASH_ACCEL_MULTIPLIER,
      maxTilt: PHYSICS.MAX_TILT,
      tiltSensitivity: PHYSICS.TILT_SENSITIVITY,
      tiltSmoothing: PHYSICS.TILT_SMOOTHING,
    },
    ai: {
      baseSpeed: AI.BASE_SPEED,
      predatorChaseSpeed: AI.PREDATOR_CHASE_SPEED,
      preyFleeSpeed: AI.PREY_FLEE_SPEED,
      detectionRange: AI.DETECTION_RANGE,
      chaseTimeoutMs: AI.CHASE_TIMEOUT_MS,
      staminaRegen: AI.STAMINA_REGEN,
      speedScale: AI.SPEED_SCALE,
    },
    camera: {
      minZoom: CAMERA.MIN_ZOOM,
      maxZoom: CAMERA.MAX_ZOOM,
      zoomDelta: CAMERA.ZOOM_DELTA,
      lerpSpeed: CAMERA.LERP_SPEED,
      animationThreshold: CAMERA.ANIMATION_THRESHOLD,
    },
    spawn: {
      fadeDuration: SPAWN.FADE_DURATION,
      minDistance: SPAWN.MIN_DISTANCE,
      maxDistanceOffset: SPAWN.MAX_DISTANCE_OFFSET,
      staggerDelayMin: SPAWN.STAGGER_DELAY_MIN,
      staggerDelayMax: SPAWN.STAGGER_DELAY_MAX,
      defaultMaxFish: SPAWN.DEFAULT_MAX_FISH,
      respawnIntervalMs: SPAWN.RESPAWN_INTERVAL_MS,
    },
    particles: PARTICLES,
  };
}
