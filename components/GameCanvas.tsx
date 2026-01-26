/**
 * Game Canvas - Main game component using GameEngine
 */
'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import type p5 from 'p5';
import { GameEngine, type GamePhase } from '@/lib/game/engine';

interface GameCanvasProps {
  onLevelComplete?: (score: number, level: number) => void;
  onGameOver?: (score: number, essence: number) => void;
}

export interface GameCanvasHandle {
  nextLevel: () => void;
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ onLevelComplete, onGameOver }, ref) => {
  const [isClient, setIsClient] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const p5Ref = useRef<any>(null);
  const callbackFiredRef = useRef<{ levelComplete: boolean; gameOver: boolean }>({
    levelComplete: false,
    gameOver: false,
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    nextLevel: () => {
      if (engineRef.current) {
        engineRef.current.nextLevel();
        // Reset callback flags for next level
        callbackFiredRef.current = { levelComplete: false, gameOver: false };
      }
    }
  }));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current) return;

    let p5Instance: any = null;

    const loadP5 = async () => {
      const p5Module = await import('p5');
      const P5 = p5Module.default;

      const sketch = (p: p5) => {
        let engine: GameEngine;

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.parent(canvasRef.current!);
          
          // Create and initialize game engine
          engine = new GameEngine();
          engineRef.current = engine;
          engine.initialize(p);
        };

        p.draw = () => {
          if (!engine) return;

          // Update game
          engine.update();
          
          // Render game
          engine.render();

          // Check for game state changes (only fire callbacks once)
          const state = engine.getState();
          if (state.phase === 'levelComplete' && onLevelComplete && !callbackFiredRef.current.levelComplete) {
            callbackFiredRef.current.levelComplete = true;
            onLevelComplete(state.score, state.level);
          } else if (state.phase === 'gameOver' && onGameOver && !callbackFiredRef.current.gameOver) {
            callbackFiredRef.current.gameOver = true;
            // Call endGame to calculate rewards
            engine.endGame().then(() => {
              const finalState = engine.getState();
              onGameOver(finalState.score, finalState.cachedEssence ?? 0);
            }).catch(() => {
              // Failed to end game properly, still call callback with current state
              const finalState = engine.getState();
              onGameOver(finalState.score, finalState.cachedEssence ?? 0);
            });
          }
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        p.keyPressed = () => {
          if (engine) {
            engine.handleKeyDown(p.key);
          }
        };

        p.keyReleased = () => {
          if (engine) {
            engine.handleKeyUp(p.key);
          }
        };
      };

      p5Instance = new P5(sketch);
      p5Ref.current = p5Instance;
    };

    loadP5();

    return () => {
      if (p5Instance) {
        p5Instance.remove();
      }
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [isClient, onLevelComplete, onGameOver]);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black" style={{ minHeight: '600px' }}>
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="relative w-full h-full bg-black" />
  );
});

GameCanvas.displayName = 'GameCanvas';

export default GameCanvas;
