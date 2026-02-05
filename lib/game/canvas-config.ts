/**
 * Canvas Configuration Helper
 * Merges user GameConfig with default constants
 */

import { PHYSICS, AI, CAMERA, SPAWN, PARTICLES } from './canvas-constants';
import type { GameConfig } from '@/lib/meta/storage';

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
 * Get canvas configuration merged with user settings
 */
export function getCanvasConfig(userConfig?: GameConfig): CanvasConfig {
  return {
    physics: {
      maxSpeed: userConfig?.maxSpeed ?? PHYSICS.MAX_SPEED,
      acceleration: userConfig?.acceleration ?? PHYSICS.ACCELERATION,
      friction: userConfig?.friction ?? PHYSICS.FRICTION,
      dashSpeedMultiplier: PHYSICS.DASH_SPEED_MULTIPLIER,
      dashAccelMultiplier: PHYSICS.DASH_ACCEL_MULTIPLIER,
      maxTilt: PHYSICS.MAX_TILT,
      tiltSensitivity: PHYSICS.TILT_SENSITIVITY,
      tiltSmoothing: PHYSICS.TILT_SMOOTHING,
    },
    ai: {
      baseSpeed: userConfig?.aiBaseSpeed ?? AI.BASE_SPEED,
      predatorChaseSpeed: userConfig?.predatorChaseSpeed ?? AI.PREDATOR_CHASE_SPEED,
      preyFleeSpeed: userConfig?.preyFleeSpeed ?? AI.PREY_FLEE_SPEED,
      detectionRange: userConfig?.aiDetectionRange ?? AI.DETECTION_RANGE,
      chaseTimeoutMs: AI.CHASE_TIMEOUT_MS,
      staminaRegen: AI.STAMINA_REGEN,
      speedScale: AI.SPEED_SCALE,
    },
    camera: {
      minZoom: userConfig?.minZoom ?? CAMERA.MIN_ZOOM,
      maxZoom: userConfig?.maxZoom ?? CAMERA.MAX_ZOOM,
      zoomDelta: CAMERA.ZOOM_DELTA,
      lerpSpeed: CAMERA.LERP_SPEED,
      animationThreshold: CAMERA.ANIMATION_THRESHOLD,
    },
    spawn: {
      fadeDuration: userConfig?.spawnFadeDuration ?? SPAWN.FADE_DURATION,
      minDistance: userConfig?.minSpawnDistance ?? SPAWN.MIN_DISTANCE,
      maxDistanceOffset: SPAWN.MAX_DISTANCE_OFFSET,
      staggerDelayMin: SPAWN.STAGGER_DELAY_MIN,
      staggerDelayMax: SPAWN.STAGGER_DELAY_MAX,
      defaultMaxFish: SPAWN.DEFAULT_MAX_FISH,
      respawnIntervalMs: userConfig?.respawnIntervalMs ?? SPAWN.RESPAWN_INTERVAL_MS,
    },
    particles: PARTICLES,
  };
}
