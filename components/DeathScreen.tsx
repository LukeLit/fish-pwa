/**
 * Death Screen Component - DICE VADERS Aesthetic
 * Shows death cause, stats, score calculation, and Evo Points
 */
'use client';

import { useEffect, useState } from 'react';
import { loadPlayerState, savePlayerState, addEvoPoints, updateHighScore } from '@/lib/game/player-state';
import FeedbackButton from './FeedbackButton';
import { UIButton, UIPanel, UICard } from './ui';

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
        <UIPanel 
          variant={stats.cause === 'starved' ? 'yellow' : 'red'} 
          className="bg-black/90"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl dv-title text-center mb-2 animate-glow-pulse">
            {deathMessage}
          </h1>
          <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 mb-6 sm:mb-8"></div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <UICard variant="cyan" glow>
              <div className="text-cyan-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Size Reached</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{Math.floor(stats.size)}</div>
            </UICard>
            <UICard variant="green" glow>
              <div className="text-green-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Fish Eaten</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{stats.fishEaten}</div>
            </UICard>
            <UICard variant="purple" glow>
              <div className="text-purple-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Essence Collected</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{stats.essenceCollected}</div>
            </UICard>
            <UICard variant="yellow" glow>
              <div className="text-yellow-300 text-xs sm:text-sm uppercase tracking-wide font-bold mb-1">Time Survived</div>
              <div className="text-white text-2xl sm:text-3xl font-bold">{stats.timeSurvived}s</div>
            </UICard>
          </div>

          {/* Score Calculation Breakdown */}
          <UIPanel variant="purple" className="bg-black/80 mb-6 sm:mb-8">
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
          </UIPanel>

          {/* Evo Points Conversion */}
          <UIPanel variant="yellow" className="bg-gradient-to-r from-yellow-900/80 to-amber-900/80 animate-pulse">
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
              <UIButton 
                variant="warning"
                fullWidth
                href="/tech-tree"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black border-yellow-300"
              >
                🔧 Spend Evo Points
              </UIButton>
              <p className="text-yellow-200 text-xs text-center mt-2 font-semibold">
                Purchase permanent upgrades for future runs
              </p>
            </div>
          </UIPanel>
        </UIPanel>

        {/* Return Button */}
        <UIButton
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onReturnToMenu}
          disabled={isProcessing}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-cyan-400"
        >
          Return to Main Menu
        </UIButton>

        {/* Feedback Button */}
        <div className="flex justify-center">
          <FeedbackButton variant="icon" />
        </div>
      </div>
    </div>
  );
}
