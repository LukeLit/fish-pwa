/**
 * Physics System for Canvas Game
 * Handles player movement, facing direction, tilt, and animation timing
 */

import type { InputState } from './canvas-input';
import type { CanvasConfig } from './canvas-config';
import { PHYSICS, ANIMATION, COLLISION } from './canvas-constants';

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  facingRight: boolean;
  verticalTilt: number;
  animTime: number;
  chompPhase: number;
  chompEndTime: number;
}

export interface PhysicsResult {
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  facingRight: boolean;
  verticalTilt: number;
  animTime: number;
  normalizedSpeed: number;
  rawSpeed: number;
}

/**
 * Update player physics based on input
 */
export function updatePlayerPhysics(
  state: PhysicsState,
  deltaTime: number,
  input: InputState,
  isDashing: boolean,
  config: CanvasConfig['physics'],
  isEditMode: boolean,
  isPaused: boolean
): PhysicsResult {
  const effectiveMaxSpeed = isDashing ? config.maxSpeed * config.dashSpeedMultiplier : config.maxSpeed;

  // Lock movement in edit mode or when paused
  if (isEditMode || isPaused) {
    state.vx = 0;
    state.vy = 0;
  } else {
    // Use joystick if active, otherwise keyboard
    if (input.joystick.active) {
      // Analog joystick control - smooth velocity (dash applies speed boost)
      state.vx = input.joystick.x * effectiveMaxSpeed;
      state.vy = input.joystick.y * effectiveMaxSpeed;
    } else {
      // Keyboard control with acceleration and friction (delta-time adjusted)
      const accelMult = isDashing ? config.dashAccelMultiplier : 1;
      const accel = config.acceleration * deltaTime * accelMult;
      const friction = Math.pow(config.friction, deltaTime); // Correct friction for variable framerate

      if (input.keys.has('w') || input.keys.has('arrowup')) state.vy -= accel;
      if (input.keys.has('s') || input.keys.has('arrowdown')) state.vy += accel;
      if (input.keys.has('a') || input.keys.has('arrowleft')) state.vx -= accel;
      if (input.keys.has('d') || input.keys.has('arrowright')) state.vx += accel;
      state.vx *= friction;
      state.vy *= friction;
    }

    // Clamp speed to max
    let speed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
    if (speed > effectiveMaxSpeed) {
      state.vx = (state.vx / speed) * effectiveMaxSpeed;
      state.vy = (state.vy / speed) * effectiveMaxSpeed;
      speed = effectiveMaxSpeed;
    }

    // Delta-time adjusted position update
    state.x += state.vx * deltaTime;
    state.y += state.vy * deltaTime;
  }

  // Update facing direction based on horizontal velocity
  if (Math.abs(state.vx) > 0.1) {
    state.facingRight = state.vx > 0;
  }

  // Update vertical tilt
  const targetTilt = Math.max(-config.maxTilt, Math.min(config.maxTilt, state.vy * config.tiltSensitivity));
  state.verticalTilt += (targetTilt - state.verticalTilt) * config.tiltSmoothing;

  // Movement-based animation: faster tail cycle when swimming
  const rawSpeed = Math.sqrt(state.vx ** 2 + state.vy ** 2);
  const normalizedSpeed = Math.min(1, rawSpeed / config.maxSpeed);
  state.animTime += ANIMATION.ANIM_TIME_BASE + normalizedSpeed * ANIMATION.ANIM_TIME_SPEED_MULT;

  // Update chomp phase (decay over time)
  const now = performance.now();
  if (state.chompEndTime > now) {
    state.chompPhase = (state.chompEndTime - now) / ANIMATION.CHOMP_DECAY_TIME;
  } else {
    state.chompPhase = 0;
  }

  return {
    position: { x: state.x, y: state.y },
    velocity: { vx: state.vx, vy: state.vy },
    facingRight: state.facingRight,
    verticalTilt: state.verticalTilt,
    animTime: state.animTime,
    normalizedSpeed,
    rawSpeed,
  };
}

/**
 * Constrain position to world bounds
 */
export function constrainToBounds(
  position: { x: number; y: number },
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): { x: number; y: number } {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y)),
  };
}

/**
 * Get animation action based on movement state
 */
export function getAnimationAction(rawSpeed: number, isDashing: boolean): 'idle' | 'swim' | 'dash' {
  if (isDashing) return 'dash';
  if (rawSpeed < COLLISION.IDLE_SPEED_THRESHOLD) return 'idle';
  return 'swim';
}
