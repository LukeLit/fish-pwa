/**
 * Dash Mechanics Module
 * Handles dynamic dash speed ramping and stamina management
 */

/**
 * Dash state for an entity
 */
export interface DashState {
  isDashing: boolean;
  dashStartTime: number;
  dashHoldDuration: number; // How long dash has been held
}

/**
 * Dash configuration
 */
export const DASH_CONFIG = {
  // Speed ramping
  INITIAL_SPEED_MULTIPLIER: 2.5, // Start at 2.5x speed
  FINAL_SPEED_MULTIPLIER: 2.0,   // Ramp down to 2x speed
  RAMP_DURATION: 250,            // Ramp over 0.25 seconds (250ms)
  
  // Stamina costs
  BASE_STAMINA_DRAIN_RATE: 16,  // per second
  STAMINA_RAMP_PER_SECOND: 0.5, // Drain increases as dash is held
  STAMINA_RAMP_CAP: 2.5,         // Max drain multiplier
};

/**
 * Initialize dash state
 */
export function createDashState(): DashState {
  return {
    isDashing: false,
    dashStartTime: 0,
    dashHoldDuration: 0,
  };
}

/**
 * Start dashing
 */
export function startDash(currentTime: number): DashState {
  return {
    isDashing: true,
    dashStartTime: currentTime,
    dashHoldDuration: 0,
  };
}

/**
 * Stop dashing
 */
export function stopDash(): DashState {
  return {
    isDashing: false,
    dashStartTime: 0,
    dashHoldDuration: 0,
  };
}

/**
 * Update dash state and return current speed multiplier
 * Speed starts at 2.5x and ramps down to 2x over 0.25 seconds while held
 */
export function updateDashState(
  state: DashState,
  currentTime: number,
  deltaTime: number
): { state: DashState; speedMultiplier: number } {
  if (!state.isDashing) {
    return { state, speedMultiplier: 1.0 };
  }

  // Update hold duration
  const holdDuration = currentTime - state.dashStartTime;
  const updatedState: DashState = {
    ...state,
    dashHoldDuration: holdDuration,
  };

  // Calculate speed multiplier with ramping
  let speedMultiplier: number;
  
  if (holdDuration < DASH_CONFIG.RAMP_DURATION) {
    // Ramping phase - lerp from initial to final speed
    const t = holdDuration / DASH_CONFIG.RAMP_DURATION;
    speedMultiplier = DASH_CONFIG.INITIAL_SPEED_MULTIPLIER + 
      (DASH_CONFIG.FINAL_SPEED_MULTIPLIER - DASH_CONFIG.INITIAL_SPEED_MULTIPLIER) * t;
  } else {
    // After ramp, stay at final speed
    speedMultiplier = DASH_CONFIG.FINAL_SPEED_MULTIPLIER;
  }

  return { state: updatedState, speedMultiplier };
}

/**
 * Calculate stamina drain for current dash state
 * Returns stamina to drain this frame (not per second - already scaled by deltaTime)
 */
export function calculateDashStaminaDrain(
  state: DashState,
  deltaTime: number
): number {
  if (!state.isDashing) return 0;

  // Base drain
  let drainRate = DASH_CONFIG.BASE_STAMINA_DRAIN_RATE;

  // Increase drain the longer dash is held
  const holdSeconds = state.dashHoldDuration / 1000;
  const rampMultiplier = Math.min(
    1 + holdSeconds * DASH_CONFIG.STAMINA_RAMP_PER_SECOND,
    DASH_CONFIG.STAMINA_RAMP_CAP
  );

  drainRate *= rampMultiplier;

  // Convert to drain for this frame
  return drainRate * (deltaTime / 1000);
}
