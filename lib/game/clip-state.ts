/**
 * Clip State Machine
 * 
 * Manages animation state transitions for creatures with video clips.
 * Handles transitions based on game events (eating, taking damage, speed changes).
 */

import type { ClipAction } from './types';

/** Speed thresholds for swim state transitions */
export const SPEED_THRESHOLDS = {
  IDLE: 0.2,      // Below this = idle
  NORMAL: 0.5,    // 0.2-0.5 = normal swim
  FAST: 0.8,      // 0.5-0.8 = fast swim
  DASH: 1.0,      // Above 0.8 = dash
};

/** State transition events */
export type ClipEvent =
  | { type: 'speed_change'; speed: number }
  | { type: 'bite' }
  | { type: 'take_damage' }
  | { type: 'death' }
  | { type: 'special' }
  | { type: 'action_complete'; action: ClipAction }
  | { type: 'force'; action: ClipAction };

/** State machine state */
export interface ClipState {
  currentAction: ClipAction;
  previousAction: ClipAction | null;
  isTransitioning: boolean;
  transitionStartTime: number;
  speed: number;
  queuedAction: ClipAction | null;
}

/**
 * ClipStateMachine - Manages clip transitions for a single creature
 */
export class ClipStateMachine {
  private state: ClipState;
  private availableActions: Set<ClipAction>;
  private defaultAction: ClipAction = 'swimIdle';

  constructor(availableActions: ClipAction[]) {
    this.availableActions = new Set(availableActions);

    // Determine initial state based on available actions
    const hasSwimIdle = this.availableActions.has('swimIdle');
    const initialAction = hasSwimIdle ? 'swimIdle' : (availableActions[0] || 'swimIdle');

    this.state = {
      currentAction: initialAction,
      previousAction: null,
      isTransitioning: false,
      transitionStartTime: 0,
      speed: 0,
      queuedAction: null,
    };

    // Set default action to first available looping action
    if (hasSwimIdle) {
      this.defaultAction = 'swimIdle';
    } else if (this.availableActions.has('swimFast')) {
      this.defaultAction = 'swimFast';
    }
  }

  /**
   * Get current state
   */
  getState(): Readonly<ClipState> {
    return { ...this.state };
  }

  /**
   * Get current action
   */
  getCurrentAction(): ClipAction {
    return this.state.currentAction;
  }

  /**
   * Check if an action is available
   */
  hasAction(action: ClipAction): boolean {
    return this.availableActions.has(action);
  }

  /**
   * Process an event and potentially transition state
   * Returns the new action if changed, null if no change
   */
  processEvent(event: ClipEvent): ClipAction | null {
    const previousAction = this.state.currentAction;

    switch (event.type) {
      case 'speed_change':
        return this.handleSpeedChange(event.speed);

      case 'bite':
        return this.handleBite();

      case 'take_damage':
        return this.handleTakeDamage();

      case 'death':
        return this.handleDeath();

      case 'special':
        return this.handleSpecial();

      case 'action_complete':
        return this.handleActionComplete(event.action);

      case 'force':
        return this.forceAction(event.action);
    }

    return this.state.currentAction !== previousAction ? this.state.currentAction : null;
  }

  /**
   * Handle speed changes - determines swim state
   */
  private handleSpeedChange(speed: number): ClipAction | null {
    this.state.speed = speed;

    // Don't interrupt non-looping actions
    if (this.isOneShot(this.state.currentAction)) {
      return null;
    }

    let targetAction: ClipAction;

    if (speed < SPEED_THRESHOLDS.IDLE) {
      targetAction = 'swimIdle';
    } else if (speed < SPEED_THRESHOLDS.FAST) {
      targetAction = 'swimFast';
    } else {
      targetAction = 'dash';
    }

    // Only switch if action is available and different
    if (this.availableActions.has(targetAction) && targetAction !== this.state.currentAction) {
      return this.transitionTo(targetAction);
    }

    // Fall back to available swim action
    if (!this.availableActions.has(targetAction)) {
      if (this.availableActions.has('swimIdle') && this.state.currentAction !== 'swimIdle') {
        return this.transitionTo('swimIdle');
      }
      if (this.availableActions.has('swimFast') && this.state.currentAction !== 'swimFast') {
        return this.transitionTo('swimFast');
      }
    }

    return null;
  }

  /**
   * Handle bite event
   */
  private handleBite(): ClipAction | null {
    if (this.availableActions.has('bite')) {
      return this.transitionTo('bite');
    }
    return null;
  }

  /**
   * Handle take damage event
   */
  private handleTakeDamage(): ClipAction | null {
    if (this.availableActions.has('takeDamage')) {
      return this.transitionTo('takeDamage');
    }
    return null;
  }

  /**
   * Handle death event
   */
  private handleDeath(): ClipAction | null {
    if (this.availableActions.has('death')) {
      return this.transitionTo('death');
    }
    return null;
  }

  /**
   * Handle special ability event
   */
  private handleSpecial(): ClipAction | null {
    if (this.availableActions.has('special')) {
      return this.transitionTo('special');
    }
    return null;
  }

  /**
   * Handle action completion - return to appropriate state
   */
  private handleActionComplete(completedAction: ClipAction): ClipAction | null {
    if (completedAction !== this.state.currentAction) {
      return null; // Action already changed
    }

    // If it was a one-shot, return to swim state based on current speed
    if (this.isOneShot(completedAction)) {
      const swimAction = this.getSwimActionForSpeed(this.state.speed);
      return this.transitionTo(swimAction);
    }

    return null;
  }

  /**
   * Force a specific action (for external control)
   */
  private forceAction(action: ClipAction): ClipAction | null {
    if (this.availableActions.has(action)) {
      return this.transitionTo(action);
    }
    return null;
  }

  /**
   * Transition to a new action
   */
  private transitionTo(action: ClipAction): ClipAction {
    this.state.previousAction = this.state.currentAction;
    this.state.currentAction = action;
    this.state.isTransitioning = true;
    this.state.transitionStartTime = performance.now();
    return action;
  }

  /**
   * Check if an action is a one-shot (non-looping)
   */
  private isOneShot(action: ClipAction): boolean {
    return action === 'bite' || action === 'takeDamage' || action === 'death' || action === 'special' || action === 'dash';
  }

  /**
   * Get appropriate swim action for current speed
   */
  private getSwimActionForSpeed(speed: number): ClipAction {
    if (speed < SPEED_THRESHOLDS.IDLE && this.availableActions.has('swimIdle')) {
      return 'swimIdle';
    }
    if (this.availableActions.has('swimFast')) {
      return 'swimFast';
    }
    if (this.availableActions.has('swimIdle')) {
      return 'swimIdle';
    }
    return this.defaultAction;
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.state = {
      currentAction: this.defaultAction,
      previousAction: null,
      isTransitioning: false,
      transitionStartTime: 0,
      speed: 0,
      queuedAction: null,
    };
  }
}

/**
 * ClipStateManager - Manages state machines for multiple creatures
 */
export class ClipStateManager {
  private stateMachines: Map<string, ClipStateMachine> = new Map();

  /**
   * Get or create state machine for a creature
   */
  getStateMachine(creatureId: string, availableActions: ClipAction[]): ClipStateMachine {
    let machine = this.stateMachines.get(creatureId);
    if (!machine) {
      machine = new ClipStateMachine(availableActions);
      this.stateMachines.set(creatureId, machine);
    }
    return machine;
  }

  /**
   * Check if a creature has a state machine
   */
  hasStateMachine(creatureId: string): boolean {
    return this.stateMachines.has(creatureId);
  }

  /**
   * Remove state machine for a creature
   */
  removeStateMachine(creatureId: string): void {
    this.stateMachines.delete(creatureId);
  }

  /**
   * Process event for a specific creature
   */
  processEvent(creatureId: string, event: ClipEvent): ClipAction | null {
    const machine = this.stateMachines.get(creatureId);
    return machine?.processEvent(event) ?? null;
  }

  /**
   * Get current action for a creature
   */
  getCurrentAction(creatureId: string): ClipAction | null {
    return this.stateMachines.get(creatureId)?.getCurrentAction() ?? null;
  }

  /**
   * Clear all state machines
   */
  clear(): void {
    this.stateMachines.clear();
  }
}

// Singleton manager instance
let sharedStateManager: ClipStateManager | null = null;

/**
 * Get shared ClipStateManager instance
 */
export function getClipStateManager(): ClipStateManager {
  if (!sharedStateManager) {
    sharedStateManager = new ClipStateManager();
  }
  return sharedStateManager;
}
