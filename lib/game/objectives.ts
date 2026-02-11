/**
 * Level completion objectives – single source for objective logic.
 */
import type { LevelObjective } from './types';
import { getDepthBandRules } from './data/level-loader';

export type { LevelObjective, ObjectiveType } from './types';

/** Progress state for evaluating objectives. */
export interface ObjectiveProgressState {
  playerSize: number; // art units
  fishEaten: number;
  preyEaten: number;
  predatorsEaten: number;
  essenceCollected: Record<string, number>;
}

const METERS_TO_ART = 100;

/**
 * Returns objectives for a depth band. Fallback when none defined: reach_size with target = max_meters * 1.15.
 */
export function getObjectivesForBand(depthBandId: string): LevelObjective[] {
  const rules = getDepthBandRules(depthBandId, 1);
  if (Array.isArray(rules.objectives) && rules.objectives.length > 0) {
    return rules.objectives;
  }
  const targetMeters = (rules.max_meters ?? 0.8) * 1.15;
  return [{ type: 'reach_size', targetMeters }];
}

/** Check if a single objective is complete. */
function isObjectiveComplete(objective: LevelObjective, state: ObjectiveProgressState): boolean {
  switch (objective.type) {
    case 'reach_size': {
      const targetArt = (objective.targetMeters ?? 0) * METERS_TO_ART;
      return state.playerSize >= targetArt;
    }
    case 'eat_prey':
      return (objective.count ?? 0) <= state.preyEaten;
    case 'eat_predators':
      return (objective.count ?? 0) <= state.predatorsEaten;
    case 'collect_essence': {
      const id = objective.essenceId ?? '';
      const current = state.essenceCollected[id] ?? 0;
      return (objective.count ?? 0) <= current;
    }
    default:
      return false;
  }
}

/** Returns true when all objectives are complete. */
export function areObjectivesComplete(
  objectives: LevelObjective[],
  state: ObjectiveProgressState
): boolean {
  if (objectives.length === 0) return false;
  return objectives.every((o) => isObjectiveComplete(o, state));
}

/** Get progress for a single objective (for UI). */
export function getObjectiveProgress(
  objective: LevelObjective,
  state: ObjectiveProgressState
): { done: boolean; current?: number; target?: number } {
  const done = isObjectiveComplete(objective, state);
  switch (objective.type) {
    case 'reach_size': {
      const targetArt = (objective.targetMeters ?? 0) * METERS_TO_ART;
      return { done, current: state.playerSize, target: targetArt };
    }
    case 'eat_prey':
      return { done, current: state.preyEaten, target: objective.count };
    case 'eat_predators':
      return { done, current: state.predatorsEaten, target: objective.count };
    case 'collect_essence': {
      const id = objective.essenceId ?? '';
      const current = state.essenceCollected[id] ?? 0;
      return { done, current, target: objective.count };
    }
    default:
      return { done };
  }
}
