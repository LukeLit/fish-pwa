/**
 * Digestion Screen Component
 * Converts collected essence into level-ups with gamified animation
 * Based on VERTICAL_SLICE.md Step 6
 */
'use client';

import { useState, useEffect } from 'react';
import FeedbackButton from './FeedbackButton';
import { UIButton, UIPanel, UICard } from './ui';

interface DigestionScreenProps {
  collectedEssence: Record<string, number>;
  onLevelUpCollected: (essenceType: string) => void;
  onComplete: () => void;
}

interface LevelUpInfo {
  essenceType: string;
  count: number;
  remaining: number;
}

const LEVEL_UP_THRESHOLD = 30;

export default function DigestionScreen({
  collectedEssence,
  onLevelUpCollected,
  onComplete,
}: DigestionScreenProps) {
  const [levelUps, setLevelUps] = useState<LevelUpInfo[]>([]);
  const [collectedLevelUps, setCollectedLevelUps] = useState<Set<string>>(new Set());
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    // Calculate level-ups for each essence type
    const calculatedLevelUps: LevelUpInfo[] = [];
    
    Object.entries(collectedEssence).forEach(([type, amount]) => {
      if (amount >= LEVEL_UP_THRESHOLD) {
        const levelUpCount = Math.floor(amount / LEVEL_UP_THRESHOLD);
        const remaining = amount % LEVEL_UP_THRESHOLD;
        calculatedLevelUps.push({
          essenceType: type,
          count: levelUpCount,
          remaining,
        });
      }
    });

    setLevelUps(calculatedLevelUps);
    
    // If no level-ups, show continue immediately
    if (calculatedLevelUps.length === 0 || calculatedLevelUps.every(lu => lu.count === 0)) {
      setShowContinue(true);
    }
  }, [collectedEssence]);

  const handleCollectLevelUp = (essenceType: string, index: number) => {
    const key = `${essenceType}_${index}`;
    if (collectedLevelUps.has(key)) return;

    setCollectedLevelUps(new Set([...collectedLevelUps, key]));
    onLevelUpCollected(essenceType);

    // Check if all level-ups collected
    const totalLevelUps = levelUps.reduce((sum, lu) => sum + lu.count, 0);
    if (collectedLevelUps.size + 1 >= totalLevelUps) {
      setTimeout(() => setShowContinue(true), 500);
    }
  };

  const getEssenceColor = (type: string): string => {
    const colors: Record<string, string> = {
      shallow: '#4a9eff',
      deep_sea: '#1a237e',
      tropical: '#ff6b35',
      polluted: '#9e9e9e',
      cosmic: '#9c27b0',
      demonic: '#d32f2f',
      robotic: '#757575',
    };
    return colors[type] || '#4a9eff';
  };

  const getEssenceName = (type: string): string => {
    const names: Record<string, string> = {
      shallow: 'Shallow',
      deep_sea: 'Deep Sea',
      tropical: 'Tropical',
      polluted: 'Polluted',
      cosmic: 'Cosmic',
      demonic: 'Demonic',
      robotic: 'Robotic',
    };
    return names[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <UIPanel variant="cyan" size="lg" className="max-w-3xl w-full animate-scale-in">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl dv-title mb-6 sm:mb-8 text-center animate-glow-pulse">
          DIGESTION SEQUENCE
        </h1>

        {/* Essence Display */}
        <div className="mb-6 sm:mb-8 space-y-3 animate-slide-in">
          <h2 className="text-xl sm:text-2xl dv-subtitle mb-3 sm:mb-4">Essence Collected:</h2>
          {Object.entries(collectedEssence).map(([type, amount], index) => (
            <UICard
              key={type}
              variant="cyan"
              className="flex justify-between items-center animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span 
                className="font-bold text-lg sm:text-xl uppercase tracking-wider"
                style={{ color: getEssenceColor(type) }}
              >
                {getEssenceName(type)}
              </span>
              <span className="text-white font-bold text-xl sm:text-2xl">{amount}</span>
            </UICard>
          ))}
        </div>

        {/* Level-up calculations */}
        {levelUps.length > 0 && (
          <div className="mb-6 sm:mb-8 space-y-4 animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-xl sm:text-2xl font-bold text-yellow-300 mb-3 sm:mb-4 uppercase tracking-wide">
              Level-Ups Available:
            </h2>
            {levelUps.map((levelUp, index) => (
              <UICard 
                key={levelUp.essenceType}
                variant="yellow"
                className="animate-slide-in p-4 sm:p-6"
                style={{ animationDelay: `${(index + 0.4) * 0.1}s` }}
              >
                <div className="mb-4">
                  <p className="text-white text-sm sm:text-base font-semibold">
                    {collectedEssence[levelUp.essenceType]} {getEssenceName(levelUp.essenceType)} ÷ {LEVEL_UP_THRESHOLD} = 
                    <span className="text-yellow-300 font-bold ml-2 text-lg sm:text-xl">
                      {levelUp.count} Level-Up{levelUp.count !== 1 ? 's' : ''}
                    </span>
                  </p>
                  <p className="text-cyan-400 text-xs sm:text-sm mt-2 font-semibold">
                    ({levelUp.remaining} essence remaining)
                  </p>
                </div>

                {/* Individual level-up buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
                  {Array.from({ length: levelUp.count }, (_, i) => {
                    const key = `${levelUp.essenceType}_${i}`;
                    const collected = collectedLevelUps.has(key);
                    return (
                      <UIButton
                        key={key}
                        variant={collected ? "disabled" : "warning"}
                        size="sm"
                        onClick={() => handleCollectLevelUp(levelUp.essenceType, i)}
                        disabled={collected}
                        className={collected ? '' : 'animate-pulse'}
                      >
                        {collected ? '✓ Collected' : `🎁 Level-Up +1`}
                      </UIButton>
                    );
                  })}
                </div>
              </UICard>
            ))}
          </div>
        )}

        {/* No level-ups message */}
        {levelUps.length === 0 && (
          <UICard variant="default" className="mb-6 sm:mb-8 text-center animate-scale-in">
            <p className="text-gray-300 text-lg sm:text-xl font-semibold">
              Not enough essence for any level-ups.
            </p>
            <p className="text-cyan-400 text-sm sm:text-base mt-3 font-semibold">
              Collect {LEVEL_UP_THRESHOLD} essence to earn a level-up!
            </p>
          </UICard>
        )}

        {/* Continue Button */}
        {showContinue && (
          <UIButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onComplete}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-cyan-300 animate-scale-in"
            style={{ animationDelay: '0.5s' }}
          >
            CONTINUE
          </UIButton>
        )}

        {/* Instructions */}
        {!showContinue && levelUps.length > 0 && (
          <p className="text-center dv-subtitle text-xs sm:text-sm mt-4 animate-pulse">
            Click each level-up to collect it!
          </p>
        )}

        {/* Feedback Button */}
        <div className="flex justify-center mt-4">
          <FeedbackButton variant="icon" />
        </div>
      </UIPanel>
    </div>
  );
}
