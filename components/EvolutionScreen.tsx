/**
 * Evolution Screen Component
 * Shows fish transformation after upgrade selection
 * Simple placeholder for vertical slice - no AI art generation
 * Based on VERTICAL_SLICE.md Step 8
 */
'use client';

import { useState, useEffect } from 'react';
import type { RunState } from '@/lib/game/types';
import { getNextStep } from '@/lib/game/data/level-loader';
import { UIButton, UIPanel, UICard } from './ui';

interface EvolutionScreenProps {
  runState: RunState;
  selectedUpgrades: string[];
  onContinue: () => void;
}

export default function EvolutionScreen({
  runState,
  selectedUpgrades,
  onContinue,
}: EvolutionScreenProps) {
  const [animationPhase, setAnimationPhase] = useState<'transform' | 'complete'>('transform');

  // Calculate next level from run steps
  const runConfigId = runState.runConfigId ?? 'shallow_run';
  const nextInfo = getNextStep(runConfigId, runState.currentLevel);
  const nextLevel = nextInfo?.nextLevel ?? '1-2';

  useEffect(() => {
    // Auto-advance to complete phase after transformation animation
    const timer = setTimeout(() => {
      setAnimationPhase('complete');
    }, 2500); // 2.5 seconds for transformation

    return () => clearTimeout(timer);
  }, []);

  const getUpgradeName = (upgradeId: string): string => {
    // Extract human-readable name from upgrade ID
    return upgradeId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fixed inset-0 dv-bg-cosmic-alt flex items-center justify-center z-50 p-4">
      {/* Animated starfield background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20% 30%, white, transparent),
            radial-gradient(2px 2px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(2px 2px at 90% 60%, white, transparent),
            radial-gradient(1px 1px at 33% 80%, white, transparent)
          `,
          backgroundSize: '200px 200px, 300px 300px, 250px 250px, 150px 150px, 280px 280px, 220px 220px',
          animation: 'twinkle 4s ease-in-out infinite',
        }}
      />

      {/* Main content */}
      <UIPanel variant="purple" size="lg" className="max-w-4xl w-full relative animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl dv-title mb-2 sm:mb-3 animate-glow-pulse">
            {animationPhase === 'transform' ? 'TRANSFORMING...' : 'EVOLUTION COMPLETE!'}
          </h1>
          <div className="text-2xl sm:text-3xl dv-subtitle">
            Evolution Level {runState.evolutionLevel}
          </div>
        </div>

        {/* Fish Display */}
        <div className="flex justify-center items-center mb-6 sm:mb-8 min-h-[250px] sm:min-h-[300px]">
          <div className="relative">
            {/* Fish sprite with transformation animation */}
            <div
              className={`relative transition-all duration-500 ${animationPhase === 'transform'
                  ? 'scale-110 animate-pulse'
                  : 'scale-100'
                }`}
              style={{
                filter: animationPhase === 'transform'
                  ? 'drop-shadow(0 0 40px rgba(34, 211, 238, 0.8)) drop-shadow(0 0 80px rgba(168, 85, 247, 0.6))'
                  : 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.5))',
              }}
            >
              <img
                src={runState.fishState.sprite}
                alt={`Evolved ${runState.selectedFishId} fish`}
                className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
              />
            </div>

            {/* Particle effects */}
            {animationPhase === 'transform' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 sm:w-3 sm:h-3 bg-cyan-400 rounded-full animate-ping"
                    style={{
                      left: `${50 + Math.cos(i * 30 * Math.PI / 180) * 100}%`,
                      top: `${50 + Math.sin(i * 30 * Math.PI / 180) * 100}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '1.5s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Glow ring */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-500 ${animationPhase === 'transform' ? 'opacity-100' : 'opacity-0'
                }`}
              style={{
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
                transform: 'scale(1.5)',
              }}
            />
          </div>
        </div>

        {/* Stats Display */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <UICard variant="cyan" glow>
            <div className="text-cyan-300 text-xs sm:text-sm font-bold uppercase mb-1">Size</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{runState.fishState.size.toFixed(1)}</div>
          </UICard>
          <UICard variant="green" glow>
            <div className="text-green-300 text-xs sm:text-sm font-bold uppercase mb-1">Speed</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{runState.fishState.speed.toFixed(1)}</div>
          </UICard>
          <UICard variant="red" glow>
            <div className="text-red-300 text-xs sm:text-sm font-bold uppercase mb-1">Health</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{runState.fishState.health}</div>
          </UICard>
          <UICard variant="yellow" glow>
            <div className="text-yellow-300 text-xs sm:text-sm font-bold uppercase mb-1">Damage</div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{runState.fishState.damage}</div>
          </UICard>
        </div>

        {/* Selected Upgrades */}
        <UIPanel variant="purple" className="mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl dv-subtitle mb-3 sm:mb-4 uppercase">New Abilities</h3>
          <div className="space-y-2 sm:space-y-3">
            {selectedUpgrades.slice(-3).map((upgradeId, index) => (
              <div
                key={upgradeId}
                className="flex items-center gap-3 text-white text-sm sm:text-base font-semibold animate-slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-cyan-400 rounded-full animate-pulse" />
                <span>{getUpgradeName(upgradeId)}</span>
              </div>
            ))}
            {selectedUpgrades.length === 0 && (
              <div className="text-gray-400 text-center text-sm sm:text-base">No upgrades selected yet</div>
            )}
          </div>
        </UIPanel>

        {/* Continue Button */}
        <UIButton
          variant="primary"
          size="xl"
          fullWidth
          onClick={onContinue}
          className={`transition-all duration-300 ${animationPhase === 'complete' ? 'scale-100 opacity-100 animate-glow-pulse' : 'scale-95 opacity-70'
            }`}
        >
          <span className="tracking-wider">ENTER LEVEL {nextLevel}</span>
        </UIButton>

        {/* Level indicator */}
        <div className="text-center mt-4 sm:mt-6 dv-subtitle text-xs sm:text-sm">
          Completed: Level {runState.currentLevel}
        </div>
      </UIPanel>
    </div>
  );
}
