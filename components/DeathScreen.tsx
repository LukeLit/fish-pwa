/**
 * Death Screen Component - DICE VADERS Aesthetic
 * Shows death cause, stats, score calculation, and Evo Points
 */
'use client';

import { useEffect, useState } from 'react';
import { loadPlayerState, savePlayerState, addEvoPoints, updateHighScore } from '@/lib/game/player-state';
import FeedbackButton from './FeedbackButton';

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
    <div className="absolute inset-0 dv-bg-cosmic-alt flex items-center justify-center z-50 animate-in fade-in duration-500 p-4">
      {/* Death Message */}
      <div className="max-w-3xl w-full space-y-4 sm:space-y-6 animate-scale-in">
        <div className={`dv-card border-4 ${deathColor} bg-black/90 p-6 sm:p-8 ${glowColor}`}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl dv-title text-center mb-2 animate-glow-pulse">
            {deathMessage}
          </h1>
          <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 mb-6 sm:mb-8"></div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-black/80 border-4 border-cyan-500 p-3 sm:p-4 rounded-lg dv-glow-cyan">
              <div className="text-cyan-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Size Reached</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{Math.floor(stats.size)}</div>
            </div>
            <div className="bg-black/80 border-4 border-green-500 p-3 sm:p-4 rounded-lg dv-glow-cyan">
              <div className="text-green-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Fish Eaten</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{stats.fishEaten}</div>
            </div>
            <div className="bg-black/80 border-4 border-purple-500 p-3 sm:p-4 rounded-lg dv-glow-purple">
              <div className="text-purple-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Essence Collected</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{stats.essenceCollected}</div>
            </div>
            <div className="bg-black/80 border-4 border-yellow-500 p-3 sm:p-4 rounded-lg dv-glow-yellow">
              <div className="text-yellow-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Time Survived</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{stats.timeSurvived}s</div>
            </div>
          </div>

          {/* Score Calculation Breakdown */}
          <div className="dv-card bg-black/80 border-4 border-purple-500 p-4 sm:p-6 mb-6 sm:mb-8 dv-glow-purple rounded-lg">
            <div className="dv-subtitle text-sm sm:text-base uppercase mb-3">Score Breakdown</div>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm font-mono">
              <div className="flex justify-between text-white/90 font-semibold">
                <span>Size × 10:</span>
                <span>{Math.floor(stats.size)} × 10 = {Math.floor(stats.size * 10)}</span>
              </div>
              <div className="flex justify-between text-white/90 font-semibold">
                <span>Fish Eaten × 5:</span>
                <span>{stats.fishEaten} × 5 = {stats.fishEaten * 5}</span>
              </div>
              <div className="flex justify-between text-white/90 font-semibold">
                <span>Time × 2:</span>
                <span>{stats.timeSurvived}s × 2 = {stats.timeSurvived * 2}</span>
              </div>
              <div className="flex justify-between text-white/90 font-semibold">
                <span>Essence × 3:</span>
                <span>{stats.essenceCollected} × 3 = {stats.essenceCollected * 3}</span>
              </div>
              <div className="h-px bg-white/30 my-2 sm:my-3"></div>
              <div className="flex justify-between text-white text-base sm:text-lg font-bold">
                <span>TOTAL SCORE:</span>
                <span className="text-cyan-400">{score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Evo Points Conversion */}
          <div className="dv-card bg-gradient-to-r from-yellow-900/80 to-amber-900/80 border-4 border-yellow-400 p-4 sm:p-6 dv-glow-yellow rounded-lg animate-pulse">
            <div className="text-yellow-200 text-xs sm:text-sm uppercase tracking-wide font-bold mb-2">Evo Points Earned</div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-yellow-400 text-4xl sm:text-5xl font-bold">+{evoPointsAwarded}</span>
              <span className="text-yellow-200 text-xs sm:text-sm font-semibold">({score} ÷ 10)</span>
            </div>
            <div className="h-px bg-yellow-400/30 my-3"></div>
            <div className="flex justify-between items-center">
              <span className="text-yellow-200 uppercase tracking-wide text-sm sm:text-base font-semibold">Total Evo Points:</span>
              <span className="text-yellow-400 text-xl sm:text-2xl font-bold">{totalEvoPoints.toLocaleString()}</span>
            </div>
            
            {/* CTA to spend Evo Points */}
            <div className="mt-4 pt-4 border-t border-yellow-400/30">
              <a
                href="/tech-tree"
                className="dv-button block text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black border-yellow-300 text-sm sm:text-base py-3 px-6"
              >
                🔧 Spend Evo Points
              </a>
              <p className="text-yellow-200 text-xs text-center mt-2 font-semibold">
                Purchase permanent upgrades for future runs
              </p>
            </div>
          </div>
        </div>

        {/* Return Button */}
        <button
          onClick={onReturnToMenu}
          disabled={isProcessing}
          className="w-full dv-button bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400 text-lg sm:text-xl py-4 px-6 sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 0 25px rgba(34, 211, 238, 0.4)' }}
        >
          Return to Main Menu
        </button>

        {/* Feedback Button */}
        <div className="flex justify-center">
          <FeedbackButton variant="icon" />
        </div>
      </div>
    </div>
  );
}
