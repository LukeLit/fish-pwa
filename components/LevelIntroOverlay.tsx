/**
 * Level Intro Overlay - Sonic-style level name splash
 * Shows level name and step (e.g. "Coral Shallows 1-1") for ~1.5s
 * Uses shared LevelSplashPanel for layout, styling, and animation.
 */
'use client';

import { useEffect, useState } from 'react';
import LevelSplashPanel from './LevelSplashPanel';
import { CAMERA } from '@/lib/game/canvas-constants';
import type { LevelObjective } from '@/lib/game/types';

const FADE_OUT_MS = 350;

interface LevelIntroOverlayProps {
  levelName: string;
  levelLabel: string;
  stepIndex: number;
  totalSteps: number;
  onComplete: () => void;
  /** Objectives to show below subtitle; animate in sequence. */
  objectives?: LevelObjective[];
  /** When true, show "VV NEW DEPTH UNLOCKED VV" to encourage going deeper. */
  showDepthPrompt?: boolean;
}

export default function LevelIntroOverlay({
  levelName,
  levelLabel,
  onComplete,
  objectives = [],
  showDepthPrompt = false,
}: LevelIntroOverlayProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, CAMERA.INTRO_DURATION_MS);
    return () => clearTimeout(exitTimer);
  }, []);

  useEffect(() => {
    if (!isExiting) return;
    const completeTimer = setTimeout(onComplete, FADE_OUT_MS);
    return () => clearTimeout(completeTimer);
  }, [isExiting, onComplete]);

  return (
    <LevelSplashPanel
      title={levelName}
      subtitle={levelLabel}
      isExiting={isExiting}
      objectives={objectives}
      showDepthPrompt={showDepthPrompt}
    />
  );
}
