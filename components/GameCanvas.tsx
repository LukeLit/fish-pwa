/**
 * React component wrapper for p5.js game canvas
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/game/engine';
import { getAudioManager } from '@/lib/game/audio';
import GameControls from './GameControls';

interface GameCanvasProps {
  onGameEnd?: (score: number, essence: number) => void;
}

export default function GameCanvas({ onGameEnd }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [isClient, setIsClient] = useState(false);

  const handleControlMove = (direction: 'up' | 'down' | 'left' | 'right' | null) => {
    if (!gameEngineRef.current) return;

    // Release all keys first
    ['w', 'a', 's', 'd'].forEach(key => {
      gameEngineRef.current?.handleKeyUp(key);
    });

    // Press the appropriate key based on direction
    if (direction === 'up') {
      gameEngineRef.current.handleKeyDown('w');
    } else if (direction === 'down') {
      gameEngineRef.current.handleKeyDown('s');
    } else if (direction === 'left') {
      gameEngineRef.current.handleKeyDown('a');
    } else if (direction === 'right') {
      gameEngineRef.current.handleKeyDown('d');
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isClient) return;

    // Dynamically import p5 only on client
    import('p5').then((p5Module) => {
      const p5 = p5Module.default;

      // Initialize audio (load placeholder sounds - can be replaced with actual files)
      const audio = getAudioManager();
      // Note: In production, load actual sound files from public/sounds/
      // audio.loadSound('bite', '/sounds/bite.mp3');
      // audio.loadSound('mutation', '/sounds/mutation.mp3');
      // audio.loadSound('phase_transition', '/sounds/phase.mp3');
      // audio.loadSound('death', '/sounds/death.mp3');

      // Create game engine
      const gameEngine = new GameEngine();
      gameEngineRef.current = gameEngine;

      // Touch controls state
      let touchStartX = 0;
      let touchStartY = 0;
      let isTouching = false;

      // Create p5 instance
      const sketch = (p: typeof p5.prototype) => {
      p.setup = () => {
        // Responsive canvas sizing
        const width = Math.min(800, window.innerWidth);
        const height = Math.min(600, window.innerHeight - 100);
        const canvas = p.createCanvas(width, height);
        canvas.parent(containerRef.current!);
        gameEngine.initialize(p);
      };

      p.draw = () => {
        try {
          gameEngine.update();
          gameEngine.render();
        } catch (error) {
          console.error('Game error:', error);
          // Show error on canvas
          p.background(0);
          p.fill(255, 0, 0);
          p.textAlign(p.CENTER, p.CENTER);
          p.text('Game Error - Please refresh', p.width / 2, p.height / 2);
        }
      };

      p.keyPressed = () => {
        gameEngine.handleKeyDown(p.key);
      };

      p.keyReleased = () => {
        gameEngine.handleKeyUp(p.key);
      };

      // Touch controls
      p.touchStarted = (e: any) => {
        if (e.touches && e.touches.length > 0) {
          touchStartX = e.touches[0].x;
          touchStartY = e.touches[0].y;
          isTouching = true;
        }
        return false; // Prevent default
      };

      p.touchMoved = (e: any) => {
        if (e.touches && e.touches.length > 0 && isTouching) {
          const dx = e.touches[0].x - touchStartX;
          const dy = e.touches[0].y - touchStartY;
          const threshold = 10;

          // Convert touch movement to key presses
          if (Math.abs(dx) > threshold) {
            if (dx > 0) {
              gameEngine.handleKeyDown('d');
            } else {
              gameEngine.handleKeyDown('a');
            }
          }
          if (Math.abs(dy) > threshold) {
            if (dy > 0) {
              gameEngine.handleKeyDown('s');
            } else {
              gameEngine.handleKeyDown('w');
            }
          }
        }
        return false;
      };

      p.touchEnded = () => {
        isTouching = false;
        // Release all movement keys
        ['w', 'a', 's', 'd'].forEach(key => {
          gameEngine.handleKeyUp(key);
        });
        return false;
      };

      // Handle window resize
      p.windowResized = () => {
        const width = Math.min(800, window.innerWidth);
        const height = Math.min(600, window.innerHeight - 100);
        p.resizeCanvas(width, height);
      };
    };

      let p5Instance: typeof p5.prototype | null = null;
      try {
        p5Instance = new p5(sketch);
        p5InstanceRef.current = p5Instance as any;
      } catch (error) {
        console.error('Failed to initialize p5:', error);
      }
    });

    // Cleanup
    return () => {
      if (p5InstanceRef.current) {
        try {
          (p5InstanceRef.current as any).remove();
        } catch (e) {
          console.error('Error cleaning up p5:', e);
        }
      }
      if (gameEngineRef.current) {
        try {
          gameEngineRef.current.destroy();
        } catch (e) {
          console.error('Error destroying game engine:', e);
        }
      }
    };
  }, [onGameEnd, isClient]);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black" style={{ minHeight: '600px' }}>
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black" style={{ minHeight: '600px' }}>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ touchAction: 'none' }}
      />
      {isClient && (
        <GameControls onMove={handleControlMove} />
      )}
    </div>
  );
}
