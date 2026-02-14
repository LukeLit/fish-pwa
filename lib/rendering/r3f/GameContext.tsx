/**
 * Game Context - Provides game state refs to R3F scene components
 * Used by R3FGameScene and its children to read current game state each frame
 */
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { CanvasGameState } from '@/lib/game/canvas-state';

export interface GameContextValue {
  gameStateRef: React.MutableRefObject<CanvasGameState | null>;
  zoomRef: React.MutableRefObject<number>;
  animatedZoomRef: React.MutableRefObject<number>;
  waterTimeRef: React.MutableRefObject<number>;
  gameMode: boolean;
  isEditMode: boolean;
  isPaused: boolean;
  backgroundImageRef: React.MutableRefObject<HTMLImageElement | null>;
  enableWaterDistortion: boolean;
  deformationIntensity: number;
  showVignette: boolean;
  showParticles: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  value,
  children,
}: {
  value: GameContextValue;
  children: ReactNode;
}) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
