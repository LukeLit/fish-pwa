/**
 * Animation State Machine
 * 
 * Manages animation state transitions for creatures with frame-based animations.
 * Handles transitions based on game events (eating, taking damage, speed changes).
 */

import type { AnimationAction } from './types';

/** Speed thresholds for swim state transitions */
export const SPEED_THRESHOLDS = {
  IDLE: 0.2,      // Below this = idle
  NORMAL: 0.5,    // 0.2-0.5 = normal swim
  FAST: 0.8,      // 0.5-0.8 = fast swim
  DASH: 1.0,      // Above 0.8 = dash
};

/** State transition events */
export type AnimationEvent =
  | { type: 'speed_change'; speed: number }
  | { type: 'bite' }
  | { type: 'hurt' }
  | { type: 'death' }
  | { type: 'action_complete'; action: AnimationAction }
  | { type: 'force'; action: AnimationAction };

/** State machine state */
export interface AnimationState {
  currentAction: AnimationAction;
  previousAction: AnimationAction | null;
  isTransitioning: boolean;
  transitionStartTime: number;
  speed: number;
  queuedAction: AnimationAction | null;
}

/**
 * AnimationStateMachine - Manages clip transitions for a single creature
 */
export class AnimationStateMachine {
  private state: AnimationState;
  private availableActions: Set<AnimationAction>;
  private defaultAction: AnimationAction = 'idle';

  constructor(availableActions: AnimationAction[]) {
    this.availableActions = new Set(availableActions);

    // Determine initial state based on available actions
    const hasSwimIdle = this.availableActions.has('idle');
    const initialAction = hasSwimIdle ? 'idle' : (availableActions[0] || 'idle');

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
      this.defaultAction = 'idle';
    } else if (this.availableActions.has('swim')) {
      this.defaultAction = 'swim';
    }
  }

  /**
   * Get current state
   */
  getState(): Readonly<AnimationState> {
    return { ...this.state };
  }

  /**
   * Get current action
   */
  getCurrentAction(): AnimationAction {
    return this.state.currentAction;
  }

  /**
   * Check if an action is available
   */
  hasAction(action: AnimationAction): boolean {
    return this.availableActions.has(action);
  }

  /**
   * Process an event and potentially transition state
   * Returns the new action if changed, null if no change
   */
  processEvent(event: AnimationEvent): AnimationAction | null {
    const previousAction = this.state.currentAction;

    switch (event.type) {
      case 'speed_change':
        return this.handleSpeedChange(event.speed);

      case 'bite':
        return this.handleBite();

      case 'hurt':
        return this.handleHurt();

      case 'death':
        return this.handleDeath();

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
  private handleSpeedChange(speed: number): AnimationAction | null {
    this.state.speed = speed;

    // Don't interrupt non-looping actions
    if (this.isOneShot(this.state.currentAction)) {
      return null;
    }

    let targetAction: AnimationAction;

    if (speed < SPEED_THRESHOLDS.IDLE) {
      targetAction = 'idle';
    } else if (speed < SPEED_THRESHOLDS.FAST) {
      targetAction = 'swim';
    } else {
      targetAction = 'dash';
    }

    // Only switch if action is available and different
    if (this.availableActions.has(targetAction) && targetAction !== this.state.currentAction) {
      return this.transitionTo(targetAction);
    }

    // Fall back to available swim action
    if (!this.availableActions.has(targetAction)) {
      if (this.availableActions.has('idle') && this.state.currentAction !== 'idle') {
        return this.transitionTo('idle');
      }
      if (this.availableActions.has('swim') && this.state.currentAction !== 'swim') {
        return this.transitionTo('swim');
      }
    }

    return null;
  }

  /**
   * Handle bite event
   */
  private handleBite(): AnimationAction | null {
    if (this.availableActions.has('bite')) {
      return this.transitionTo('bite');
    }
    return null;
  }

  /**
   * Handle hurt/damage event
   */
  private handleHurt(): AnimationAction | null {
    if (this.availableActions.has('hurt')) {
      return this.transitionTo('hurt');
    }
    return null;
  }

  /**
   * Handle death event
   */
  private handleDeath(): AnimationAction | null {
    if (this.availableActions.has('death')) {
      return this.transitionTo('death');
    }
    return null;
  }

  /**
   * Handle action completion - return to appropriate state
   */
  private handleActionComplete(completedAction: AnimationAction): AnimationAction | null {
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
  private forceAction(action: AnimationAction): AnimationAction | null {
    if (this.availableActions.has(action)) {
      return this.transitionTo(action);
    }
    return null;
  }

  /**
   * Transition to a new action
   */
  private transitionTo(action: AnimationAction): AnimationAction {
    this.state.previousAction = this.state.currentAction;
    this.state.currentAction = action;
    this.state.isTransitioning = true;
    this.state.transitionStartTime = performance.now();
    return action;
  }

  /**
   * Check if an action is a one-shot (non-looping)
   */
  private isOneShot(action: AnimationAction): boolean {
    return action === 'bite' || action === 'hurt' || action === 'death' || action === 'dash';
  }

  /**
   * Get appropriate swim action for current speed
   */
  private getSwimActionForSpeed(speed: number): AnimationAction {
    if (speed < SPEED_THRESHOLDS.IDLE && this.availableActions.has('idle')) {
      return 'idle';
    }
    if (this.availableActions.has('swim')) {
      return 'swim';
    }
    if (this.availableActions.has('idle')) {
      return 'idle';
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
 * AnimationStateManager - Manages state machines for multiple creatures
 */
export class AnimationStateManager {
  private stateMachines: Map<string, AnimationStateMachine> = new Map();

  /**
   * Get or create state machine for a creature
   */
  getStateMachine(creatureId: string, availableActions: AnimationAction[]): AnimationStateMachine {
    let machine = this.stateMachines.get(creatureId);
    if (!machine) {
      machine = new AnimationStateMachine(availableActions);
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
  processEvent(creatureId: string, event: AnimationEvent): AnimationAction | null {
    const machine = this.stateMachines.get(creatureId);
    return machine?.processEvent(event) ?? null;
  }

  /**
   * Get current action for a creature
   */
  getCurrentAction(creatureId: string): AnimationAction | null {
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
let sharedStateManager: AnimationStateManager | null = null;

/**
 * Get shared AnimationStateManager instance
 */
export function getAnimationStateManager(): AnimationStateManager {
  if (!sharedStateManager) {
    sharedStateManager = new AnimationStateManager();
  }
  return sharedStateManager;
}
