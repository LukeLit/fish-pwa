/**
 * Input Manager for Canvas Game
 * Handles keyboard, joystick, touch, and zoom input
 */

import type { AnalogJoystickOutput } from '@/components/AnalogJoystick';
import { CAMERA } from './canvas-constants';

export interface InputState {
  keys: Set<string>;
  joystick: { x: number; y: number; active: boolean };
  wantsDash: boolean;
}

export interface ZoomState {
  targetZoom: number;
  currentZoom: number;
  animatedZoom: number;
}

export interface PinchState {
  startDistance: number;
  startZoom: number;
}

/**
 * Input Manager handles all input sources
 */
export class InputManager {
  private keys = new Set<string>();
  private joystick = { x: 0, y: 0, active: false };
  private dashFromControls = false;

  // Zoom state
  private targetZoom = 1;
  private animatedZoom = 1;
  private pinchState: PinchState | null = null;

  // Camera pan state (for paused/edit mode)
  private dragStart: { x: number; y: number; camX: number; camY: number } | null = null;
  private isDragging = false;

  /**
   * Handle keyboard key down
   */
  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  /**
   * Handle keyboard key up
   */
  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  /**
   * Check if a key is currently pressed
   */
  hasKey(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /**
   * Handle joystick input
   */
  handleJoystick(output: AnalogJoystickOutput): void {
    this.joystick = {
      x: output.velocity.x,
      y: output.velocity.y,
      active: output.isActive,
    };
  }

  /**
   * Set dash state from external controls (mobile button)
   */
  setDashFromControls(dashing: boolean): void {
    this.dashFromControls = dashing;
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    return {
      keys: new Set(this.keys),
      joystick: { ...this.joystick },
      wantsDash: this.hasKey('shift') || this.hasKey(' ') || this.dashFromControls,
    };
  }

  /**
   * Handle wheel zoom
   */
  handleWheel(deltaY: number, minZoom: number = CAMERA.MIN_ZOOM, maxZoom: number = CAMERA.MAX_ZOOM): void {
    const zoomDelta = deltaY > 0 ? 1 - CAMERA.ZOOM_DELTA : 1 + CAMERA.ZOOM_DELTA;
    this.targetZoom = Math.max(minZoom, Math.min(maxZoom, this.targetZoom * zoomDelta));
  }

  /**
   * Handle touch start for pinch zoom
   */
  handleTouchStart(touches: TouchList, currentZoom: number): void {
    if (touches.length === 2) {
      const dist = this.getTouchDistance(touches[0], touches[1]);
      this.pinchState = {
        startDistance: dist,
        startZoom: currentZoom,
      };
    }
  }

  /**
   * Handle touch move for pinch zoom
   */
  handleTouchMove(touches: TouchList, minZoom: number = CAMERA.MIN_ZOOM, maxZoom: number = CAMERA.MAX_ZOOM): boolean {
    if (touches.length === 2 && this.pinchState) {
      const dist = this.getTouchDistance(touches[0], touches[1]);
      const scale = dist / this.pinchState.startDistance;
      this.targetZoom = Math.max(minZoom, Math.min(maxZoom, this.pinchState.startZoom * scale));
      return true; // Prevent default
    }
    return false;
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(touches: TouchList): void {
    if (touches.length < 2) {
      this.pinchState = null;
    }
  }

  /**
   * Calculate distance between two touches
   */
  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Start camera pan drag
   */
  startDrag(clientX: number, clientY: number, cameraX: number, cameraY: number): void {
    this.dragStart = {
      x: clientX,
      y: clientY,
      camX: cameraX,
      camY: cameraY,
    };
    this.isDragging = true;
  }

  /**
   * Update camera pan during drag
   */
  updateDrag(clientX: number, clientY: number, currentZoom: number): { x: number; y: number } | null {
    if (!this.isDragging || !this.dragStart) return null;

    const dx = clientX - this.dragStart.x;
    const dy = clientY - this.dragStart.y;

    return {
      x: this.dragStart.camX - dx / currentZoom,
      y: this.dragStart.camY - dy / currentZoom,
    };
  }

  /**
   * End camera pan drag
   */
  endDrag(): void {
    this.isDragging = false;
    this.dragStart = null;
  }

  /**
   * Get zoom state
   */
  getZoomState(): ZoomState {
    return {
      targetZoom: this.targetZoom,
      currentZoom: this.animatedZoom,
      animatedZoom: this.animatedZoom,
    };
  }

  /**
   * Set target zoom
   */
  setTargetZoom(zoom: number, minZoom: number = CAMERA.MIN_ZOOM, maxZoom: number = CAMERA.MAX_ZOOM): void {
    this.targetZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
  }

  /**
   * Update animated zoom (smooth interpolation)
   */
  updateAnimatedZoom(lerpSpeed: number = CAMERA.LERP_SPEED): void {
    const diff = this.targetZoom - this.animatedZoom;
    if (Math.abs(diff) > CAMERA.ANIMATION_THRESHOLD) {
      this.animatedZoom += diff * lerpSpeed;
    } else {
      this.animatedZoom = this.targetZoom;
    }
  }

  /**
   * Set animated zoom directly (for initialization)
   */
  setAnimatedZoom(zoom: number): void {
    this.animatedZoom = zoom;
    this.targetZoom = zoom;
  }

  /**
   * Check if dragging
   */
  isDraggingCamera(): boolean {
    return this.isDragging;
  }

  /**
   * Clear all input state
   */
  clear(): void {
    this.keys.clear();
    this.joystick = { x: 0, y: 0, active: false };
    this.dashFromControls = false;
    this.isDragging = false;
    this.dragStart = null;
    this.pinchState = null;
  }
}
