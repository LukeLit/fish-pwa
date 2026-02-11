/**
 * Gamepad poller for Web Gamepad API
 * Polls navigator.getGamepads() and returns normalized input state for the first connected gamepad.
 * Works with PS5, Backbone, Xbox, and other standard-mapped controllers.
 */

const DEADZONE = 0.15;

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0;
  const sign = value < 0 ? -1 : 1;
  return sign * (Math.abs(value) - deadzone) / (1 - deadzone);
}

export interface GamepadState {
  joystick: { x: number; y: number; active: boolean };
  wantsDash: boolean;
  /** Right stick Y (axis 3) for zoom - only used when virtual cursor is disabled (during gameplay) */
  zoomAxis: number;
}

/**
 * Poll the first connected gamepad and return normalized state.
 * Returns null when no gamepad is connected.
 */
export function pollGamepadState(): GamepadState | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) {
    return null;
  }

  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp?.connected) continue;

    // Left stick: axes 0 (x), 1 (y)
    const rawX = gp.axes[0] ?? 0;
    const rawY = gp.axes[1] ?? 0;
    const lx = applyDeadzone(rawX, DEADZONE);
    const ly = applyDeadzone(rawY, DEADZONE);
    const active = lx !== 0 || ly !== 0;

    // Dash: A (0), X (2), R1 (5), R2 (7)
    const wantsDash =
      (gp.buttons[0]?.pressed ?? false) ||
      (gp.buttons[2]?.pressed ?? false) ||
      (gp.buttons[5]?.pressed ?? false) ||
      (gp.buttons[7]?.pressed ?? false);

    // Right stick Y (axis 3) for zoom - used during gameplay when virtual cursor is disabled
    const zoomAxis = applyDeadzone(gp.axes[3] ?? 0, DEADZONE);

    return {
      joystick: { x: lx, y: ly, active },
      wantsDash,
      zoomAxis,
    };
  }

  return null;
}

export interface GamepadCursorState {
  /** Right stick axes 2 (x), 3 (y) - for virtual cursor movement */
  rightStick: { x: number; y: number };
  /** A/Cross button (0) - for click */
  aPressed: boolean;
}

const CURSOR_DEADZONE = 0.2;

/**
 * Poll gamepad for virtual cursor input (right stick + A button).
 * Returns null when no gamepad is connected.
 */
export function pollGamepadCursorState(): GamepadCursorState | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) {
    return null;
  }

  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp?.connected) continue;

    const rx = applyDeadzone(gp.axes[2] ?? 0, CURSOR_DEADZONE);
    const ry = applyDeadzone(gp.axes[3] ?? 0, CURSOR_DEADZONE);
    const aPressed = gp.buttons[0]?.pressed ?? false;

    return {
      rightStick: { x: rx, y: ry },
      aPressed,
    };
  }

  return null;
}
