/**
 * Death Screen Component - DICE VADERS Aesthetic
 * Shows death cause, stats, score calculation, and Evo Points
 */
'use client';

import { useEffect, useState } from 'react';
import { loadPlayerState, savePlayerState, addEvoPoints, updateHighScore } from '@/lib/game/player-state';

export interface DeathStats {
  cause: 'starved' | 'eaten';
  size: number;
  fishEaten: number;
  essenceCollected: number;
  timeSurvived: number; // in seconds
}

interface DeathScreenProps {
  stats: DeathStats;
  onReturnToMenu: () => void;
}

export default function DeathScreen({ stats, onReturnToMenu }: DeathScreenProps) {
  const [evoPointsAwarded, setEvoPointsAwarded] = useState(0);
  const [totalEvoPoints, setTotalEvoPoints] = useState(0);
  const [score, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Calculate score and award Evo Points
    const calculateAndAward = () => {
      // Score formula: (Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)
      const calculatedScore = 
        (stats.size * 10) +
        (stats.fishEaten * 5) +
        (stats.timeSurvived * 2) +
        (stats.essenceCollected * 3);
      
      setScore(Math.floor(calculatedScore));
      
      // Evo Points = Score / 10 (rounded down, minimum 1)
      const earnedEvoPoints = Math.max(1, Math.floor(calculatedScore / 10));
      setEvoPointsAwarded(earnedEvoPoints);
      
      // Load player state and award Evo Points
      let playerState = loadPlayerState();
      playerState = addEvoPoints(playerState, earnedEvoPoints);
      playerState = updateHighScore(playerState, Math.floor(calculatedScore));
      savePlayerState(playerState);
      
      setTotalEvoPoints(playerState.evoPoints);
      setIsProcessing(false);
    };

    calculateAndAward();
  }, [stats]);

  const deathMessage = stats.cause === 'starved' 
    ? 'YOU STARVED' 
    : 'YOU WERE EATEN';
  
  const deathColor = stats.cause === 'starved' 
    ? 'border-yellow-500' 
    : 'border-red-500';
  
  const glowColor = stats.cause === 'starved'
    ? 'shadow-yellow-500/50'
    : 'shadow-red-500/50';

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center z-50 animate-in fade-in duration-500">
      {/* Death Message */}
      <div className="max-w-2xl w-full mx-4 space-y-6">
        <div className={`border-4 ${deathColor} bg-black/80 p-8 shadow-2xl ${glowColor} shadow-lg`}>
          <h1 className="text-5xl font-bold text-white text-center mb-2 uppercase tracking-wider">
            {deathMessage}
          </h1>
          <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 mb-8"></div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-950/50 border-2 border-cyan-500/50 p-4">
              <div className="text-cyan-300 text-sm uppercase tracking-wide mb-1">Size Reached</div>
              <div className="text-white text-3xl font-bold">{Math.floor(stats.size)}</div>
            </div>
            <div className="bg-blue-950/50 border-2 border-cyan-500/50 p-4">
              <div className="text-cyan-300 text-sm uppercase tracking-wide mb-1">Fish Eaten</div>
              <div className="text-white text-3xl font-bold">{stats.fishEaten}</div>
            </div>
            <div className="bg-blue-950/50 border-2 border-cyan-500/50 p-4">
              <div className="text-cyan-300 text-sm uppercase tracking-wide mb-1">Essence Collected</div>
              <div className="text-white text-3xl font-bold">{stats.essenceCollected}</div>
            </div>
            <div className="bg-blue-950/50 border-2 border-cyan-500/50 p-4">
              <div className="text-cyan-300 text-sm uppercase tracking-wide mb-1">Time Survived</div>
              <div className="text-white text-3xl font-bold">{stats.timeSurvived}s</div>
            </div>
          </div>

          {/* Score Calculation Breakdown */}
          <div className="bg-indigo-950/50 border-2 border-purple-500/50 p-4 mb-6">
            <div className="text-purple-300 text-sm uppercase tracking-wide mb-3">Score Breakdown</div>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between text-white/80">
                <span>Size × 10:</span>
                <span>{Math.floor(stats.size)} × 10 = {Math.floor(stats.size * 10)}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Fish Eaten × 5:</span>
                <span>{stats.fishEaten} × 5 = {stats.fishEaten * 5}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Time × 2:</span>
                <span>{stats.timeSurvived}s × 2 = {stats.timeSurvived * 2}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Essence × 3:</span>
                <span>{stats.essenceCollected} × 3 = {stats.essenceCollected * 3}</span>
              </div>
              <div className="h-px bg-white/30 my-2"></div>
              <div className="flex justify-between text-white text-lg font-bold">
                <span>TOTAL SCORE:</span>
                <span>{score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Evo Points Conversion */}
          <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border-4 border-yellow-400 p-6 shadow-lg shadow-yellow-400/30">
            <div className="text-yellow-200 text-sm uppercase tracking-wide mb-2">Evo Points Earned</div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-yellow-400 text-5xl font-bold">+{evoPointsAwarded}</span>
              <span className="text-yellow-200 text-sm">({score} ÷ 10)</span>
            </div>
            <div className="h-px bg-yellow-400/30 my-3"></div>
            <div className="flex justify-between items-center">
              <span className="text-yellow-200 uppercase tracking-wide">Total Evo Points:</span>
              <span className="text-yellow-400 text-2xl font-bold">{totalEvoPoints.toLocaleString()}</span>
            </div>
            
            {/* CTA to spend Evo Points */}
            <div className="mt-4 pt-4 border-t border-yellow-400/30">
              <a
                href="/tech-tree"
                className="block text-center bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg uppercase tracking-wide transition-colors shadow-lg"
              >
                🔧 Spend Evo Points
              </a>
              <p className="text-yellow-200 text-xs text-center mt-2">
                Purchase permanent upgrades for future runs
              </p>
            </div>
          </div>
        </div>

        {/* Return Button */}
        <button
          onClick={onReturnToMenu}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-8 text-xl uppercase tracking-wider border-4 border-cyan-400 shadow-lg shadow-cyan-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          Return to Main Menu
        </button>
      </div>
    </div>
  );
}
