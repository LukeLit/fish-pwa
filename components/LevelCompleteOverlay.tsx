/**
 * Level Complete Overlay
 * Shows "Level Name Complete!" in same spot/style as intro during slowdown ramp.
 * Reuses LevelSplashPanel - same position, treatments, and animation.
 */
'use client';

import LevelSplashPanel from './LevelSplashPanel';

interface LevelCompleteOverlayProps {
  levelName: string;
  stepIndex: number;
  totalSteps: number;
}

export default function LevelCompleteOverlay({
  levelName,
  stepIndex,
  totalSteps,
}: LevelCompleteOverlayProps) {
  return (
    <LevelSplashPanel
      title={`${levelName} Complete!`}
      subtitle={`${stepIndex}/${totalSteps}`}
    />
  );
}
