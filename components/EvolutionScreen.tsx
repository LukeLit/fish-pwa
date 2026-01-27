/**
 * Evolution Screen Component
 * Shows fish transformation after upgrade selection
 * Simple placeholder for vertical slice - no AI art generation
 * Based on VERTICAL_SLICE.md Step 8
 */
'use client';

import { useState, useEffect } from 'react';
import type { RunState } from '@/lib/game/types';

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
    <div className="fixed inset-0 bg-gradient-to-br from-black via-indigo-950 to-purple-950 flex items-center justify-center z-50">
      {/* Simple cosmic background pattern */}
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
      <div className="bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-blue-900/80 backdrop-blur-sm rounded-lg p-8 max-w-3xl w-full mx-4 border-4 border-cyan-400 shadow-2xl relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-cyan-400 mb-2 tracking-wider animate-pulse">
            {animationPhase === 'transform' ? 'TRANSFORMING...' : 'EVOLUTION COMPLETE!'}
          </h1>
          <div className="text-2xl text-purple-300">
            Evolution Level {runState.evolutionLevel}
          </div>
        </div>

        {/* Fish Display */}
        <div className="flex justify-center items-center mb-8 min-h-[300px]">
          <div className="relative">
            {/* Fish sprite with transformation animation */}
            <div
              className={`relative transition-all duration-500 ${
                animationPhase === 'transform'
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
                alt="Evolved Fish"
                className="w-64 h-64 object-contain"
              />
            </div>

            {/* Particle effects */}
            {animationPhase === 'transform' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-cyan-400 rounded-full animate-ping"
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
              className={`absolute inset-0 rounded-full transition-all duration-500 ${
                animationPhase === 'transform' ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
                transform: 'scale(1.5)',
              }}
            />
          </div>
        </div>

        {/* Stats Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/40 rounded-lg p-4 border-2 border-cyan-400/50">
            <div className="text-cyan-300 text-sm mb-1">Size</div>
            <div className="text-2xl font-bold text-white">{runState.fishState.size.toFixed(1)}</div>
          </div>
          <div className="bg-black/40 rounded-lg p-4 border-2 border-cyan-400/50">
            <div className="text-cyan-300 text-sm mb-1">Speed</div>
            <div className="text-2xl font-bold text-white">{runState.fishState.speed.toFixed(1)}</div>
          </div>
          <div className="bg-black/40 rounded-lg p-4 border-2 border-cyan-400/50">
            <div className="text-cyan-300 text-sm mb-1">Health</div>
            <div className="text-2xl font-bold text-white">{runState.fishState.health}</div>
          </div>
          <div className="bg-black/40 rounded-lg p-4 border-2 border-cyan-400/50">
            <div className="text-cyan-300 text-sm mb-1">Damage</div>
            <div className="text-2xl font-bold text-white">{runState.fishState.damage}</div>
          </div>
        </div>

        {/* Selected Upgrades */}
        <div className="bg-black/40 rounded-lg p-4 border-2 border-purple-400/50 mb-6">
          <h3 className="text-xl font-bold text-purple-300 mb-3">New Abilities</h3>
          <div className="space-y-2">
            {selectedUpgrades.slice(-3).map((upgradeId, index) => (
              <div
                key={upgradeId}
                className="flex items-center gap-2 text-white animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span>{getUpgradeName(upgradeId)}</span>
              </div>
            ))}
            {selectedUpgrades.length === 0 && (
              <div className="text-gray-400 text-center">No upgrades selected yet</div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className={`w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 border-2 border-cyan-400 shadow-lg ${
            animationPhase === 'complete' ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
          }`}
          style={{
            boxShadow: animationPhase === 'complete'
              ? '0 0 20px rgba(34, 211, 238, 0.5)'
              : 'none',
          }}
        >
          <span className="text-2xl tracking-wider">CONTINUE TO NEXT LEVEL</span>
        </button>

        {/* Level indicator */}
        <div className="text-center mt-4 text-purple-300 text-sm">
          Current Run: {runState.currentLevel}
        </div>
      </div>
    </div>
  );
}
