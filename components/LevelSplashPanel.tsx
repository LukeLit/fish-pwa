/**
 * LevelSplashPanel - Shared level splash UI (intro + complete)
 * Single source of truth for position, styling, and animation.
 * Used by LevelIntroOverlay and LevelCompleteOverlay.
 */
'use client';

import { UIPanel } from './ui';
import type { LevelObjective } from '@/lib/game/types';

/** Layout and styling config - shared by intro and complete overlays */
const LAYOUT = {
  position: 'absolute top-20 left-4 z-50 pointer-events-none',
  panel: 'max-w-md w-full bg-black/85 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.4)] px-8 py-6 overflow-hidden',
  title: 'dv-title text-white font-black tracking-wider w-full break-words leading-tight',
  titleFontSize: 'clamp(1.25rem, 4.5vw, 2.25rem)' as const,
  divider: 'h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 mt-3 mb-3',
  subtitle: 'text-xl sm:text-2xl dv-subtitle text-cyan-200 font-bold',
} as const;

/** Animation classes - same slide-in/out for intro and complete */
const ANIMATION = {
  enter: 'animate-level-intro-in',
  exit: 'animate-level-intro-out',
} as const;

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

export interface LevelSplashPanelProps {
  title: string;
  subtitle: string;
  /** When true, plays exit animation (slide-out). Otherwise plays enter (slide-in). */
  isExiting?: boolean;
  /** Objectives to show below subtitle (intro only); animate in sequence when present. */
  objectives?: LevelObjective[];
}

export default function LevelSplashPanel({
  title,
  subtitle,
  isExiting = false,
  objectives = [],
}: LevelSplashPanelProps) {
  const animationClass = isExiting ? ANIMATION.exit : ANIMATION.enter;

  return (
    <div className={`${LAYOUT.position} ${animationClass}`}>
      <UIPanel variant="cyan" className={LAYOUT.panel}>
        <h1
          className={LAYOUT.title}
          style={{ fontSize: LAYOUT.titleFontSize }}
        >
          {title}
        </h1>
        <div className={LAYOUT.divider} />
        <p className={LAYOUT.subtitle}>{subtitle}</p>
        {objectives.length > 0 && (
          <div className="mt-4 space-y-2">
            {objectives.map((obj, i) => (
              <div
                key={i}
                className="text-cyan-200 text-sm"
                style={{ animation: `fade-in 0.2s ease-out ${i * 0.15}s both` }}
              >
                ○ {formatObjectiveText(obj)}
              </div>
            ))}
          </div>
        )}
      </UIPanel>
    </div>
  );
}
