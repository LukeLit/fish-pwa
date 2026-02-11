/**
 * LevelObjectivesPanel - Unified level + objectives + timer display
 * Used in HUD (top-left) and intro overlay.
 */
'use client';

import type { LevelObjective } from '@/lib/game/types';
import type { ObjectiveProgressState } from '@/lib/game/objectives';
import { getObjectiveProgress } from '@/lib/game/objectives';

const METERS_TO_ART = 100;

function formatElapsedTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatObjectiveText(objective: LevelObjective): string {
  switch (objective.type) {
    case 'reach_size':
      return `Reach ${(objective.targetMeters ?? 0).toFixed(1)} m`;
    case 'eat_prey':
      return `Eat ${objective.count ?? 0} prey`;
    case 'eat_predators':
      return `Eat ${objective.count ?? 0} predators`;
    case 'collect_essence':
      return `Collect ${objective.count ?? 0} ${objective.essenceId ?? 'essence'}`;
    default:
      return 'Objective';
  }
}

export interface LevelObjectivesPanelProps {
  levelLabel: string;
  objectives: LevelObjective[];
  progress?: ObjectiveProgressState;
  elapsedSeconds?: number;
  actName?: string;
  /** When true, show checkmarks and progress (HUD). When false, show objective text only (intro). */
  showProgress?: boolean;
  /** When true, animate objectives in with stagger (intro). */
  animateObjectives?: boolean;
}

export default function LevelObjectivesPanel({
  levelLabel,
  objectives,
  progress,
  elapsedSeconds = 0,
  actName,
  showProgress = true,
  animateObjectives = false,
}: LevelObjectivesPanelProps) {
  return (
    <div className="absolute top-4 left-4 z-40 bg-black/70 px-4 py-2 rounded-lg border border-cyan-400 min-w-[180px]">
      <div className="text-cyan-400 font-bold text-lg">Level {levelLabel}</div>
      {actName && (
        <div className="text-cyan-300/80 text-xs mt-0.5">{actName}</div>
      )}
      {objectives.length > 0 && (
        <div className="mt-2 space-y-1">
          {objectives.map((obj, i) => {
            const prog = progress ? getObjectiveProgress(obj, progress) : { done: false };
            const text = formatObjectiveText(obj);
            const progressStr = showProgress && prog.target != null && prog.current != null
              ? obj.type === 'reach_size'
                ? ` (${(prog.current! / METERS_TO_ART).toFixed(1)} / ${(prog.target! / METERS_TO_ART).toFixed(1)} m)`
                : ` (${prog.current} / ${prog.target})`
              : '';
            return (
              <div
                key={i}
                className={`text-sm flex items-center gap-2 ${prog.done ? 'text-green-400' : 'text-cyan-200'}`}
                style={animateObjectives ? { animation: `fade-in 0.2s ease-out ${i * 0.15}s both` } : undefined}
              >
                <span className="w-4">{prog.done ? '✓' : '○'}</span>
                <span>{text}{progressStr}</span>
              </div>
            );
          })}
        </div>
      )}
      {elapsedSeconds >= 0 && (
        <div className="mt-2 text-cyan-300 font-mono text-sm">
          {formatElapsedTime(elapsedSeconds)}
        </div>
      )}
    </div>
  );
}
