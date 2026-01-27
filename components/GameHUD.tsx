/**
 * Game HUD - Displays game state information during gameplay
 */
'use client';

import { useEffect, useState } from 'react';
import { loadRunState } from '@/lib/game/run-state';

interface GameHUDProps {
  score: number;
  playerSize: number;
  levelDuration?: number; // in milliseconds
  startTime: number;
  hunger?: number; // 0-100
  showTimer?: boolean;
}

export default function GameHUD({
  score,
  playerSize,
  levelDuration = 60000,
  startTime,
  hunger = 100,
  showTimer = true,
}: GameHUDProps) {
  const [essence, setEssence] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(levelDuration);

  // Update essence from run state (poll less frequently)
  useEffect(() => {
    const interval = setInterval(() => {
      const runState = loadRunState();
      if (runState) {
        setEssence(runState.collectedEssence);
      }
    }, 500); // Reduced from 100ms to 500ms

    return () => clearInterval(interval);
  }, []);

  // Update timer
  useEffect(() => {
    if (!showTimer || startTime === 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, levelDuration - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, levelDuration, showTimer]);

  // Calculate hunger bar color
  const getHungerColor = (hungerValue: number) => {
    if (hungerValue > 60) return 'bg-green-500';
    if (hungerValue > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
        {/* Left Side - Score & Size */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/20 pointer-events-auto">
          <div className="text-white text-sm font-bold mb-1">Score</div>
          <div className="text-yellow-400 text-2xl font-bold">{score.toLocaleString()}</div>
          <div className="text-white text-sm mt-2">Size: {playerSize.toFixed(1)}</div>
        </div>

        {/* Center - Timer */}
        {showTimer && (
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/20 pointer-events-auto">
            <div className="text-white text-sm font-bold mb-1 text-center">Time</div>
            <div className={`text-2xl font-bold text-center ${
              timeRemaining < 10000 ? 'text-red-400 animate-pulse' : 'text-blue-400'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}

        {/* Right Side - Essence Counter */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/20 pointer-events-auto min-w-[120px]">
          <div className="text-white text-sm font-bold mb-2">Essence</div>
          <div className="space-y-1">
            {Object.entries(essence).length > 0 ? (
              Object.entries(essence).map(([type, amount]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-xs text-gray-300 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <span className="text-yellow-400 font-bold ml-2">{amount}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400">No essence yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom - Hunger Bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/20 pointer-events-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white text-xs font-bold">Hunger</span>
            <span className="text-white text-xs">{Math.round(hunger)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getHungerColor(hunger)} ${
                hunger < 25 ? 'animate-pulse' : ''
              }`}
              style={{ width: `${Math.max(0, Math.min(100, hunger))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
