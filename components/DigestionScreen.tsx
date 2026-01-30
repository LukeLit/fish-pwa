/**
 * Digestion Screen Component
 * Converts collected essence into level-ups with gamified animation
 * Based on VERTICAL_SLICE.md Step 6
 */
'use client';

import { useState, useEffect } from 'react';
import FeedbackButton from './FeedbackButton';

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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 rounded-lg p-8 max-w-2xl w-full mx-4 border-4 border-cyan-400 shadow-2xl">
        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-6 text-center tracking-wider">
          DIGESTION SEQUENCE
        </h1>

        {/* Essence Display */}
        <div className="mb-6 space-y-3">
          <h2 className="text-xl font-bold text-cyan-300 mb-3">Essence Collected:</h2>
          {Object.entries(collectedEssence).map(([type, amount]) => (
            <div
              key={type}
              className="flex justify-between items-center bg-black/40 rounded-lg px-4 py-2 border border-cyan-600"
            >
              <span 
                className="font-bold text-lg"
                style={{ color: getEssenceColor(type) }}
              >
                {getEssenceName(type)}
              </span>
              <span className="text-white font-bold">{amount}</span>
            </div>
          ))}
        </div>

        {/* Level-up calculations */}
        {levelUps.length > 0 && (
          <div className="mb-6 space-y-4">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">Level-Ups Available:</h2>
            {levelUps.map((levelUp) => (
              <div 
                key={levelUp.essenceType}
                className="bg-black/40 rounded-lg p-4 border-2 border-yellow-500"
              >
                <div className="mb-2">
                  <p className="text-white text-sm">
                    {collectedEssence[levelUp.essenceType]} {getEssenceName(levelUp.essenceType)} ÷ {LEVEL_UP_THRESHOLD} = 
                    <span className="text-yellow-300 font-bold ml-2">
                      {levelUp.count} Level-Up{levelUp.count !== 1 ? 's' : ''}
                    </span>
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    ({levelUp.remaining} essence remaining)
                  </p>
                </div>

                {/* Individual level-up buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {Array.from({ length: levelUp.count }, (_, i) => {
                    const key = `${levelUp.essenceType}_${i}`;
                    const collected = collectedLevelUps.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => handleCollectLevelUp(levelUp.essenceType, i)}
                        disabled={collected}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all transform ${
                          collected
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-500 hover:bg-yellow-400 text-black hover:scale-105 animate-pulse'
                        }`}
                        style={{
                          borderColor: collected ? '#666' : getEssenceColor(levelUp.essenceType),
                          borderWidth: '2px',
                        }}
                      >
                        {collected ? '✓ Collected' : `🎁 Level-Up +1`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No level-ups message */}
        {levelUps.length === 0 && (
          <div className="mb-6 bg-black/40 rounded-lg p-6 border-2 border-gray-600 text-center">
            <p className="text-gray-300 text-lg">
              Not enough essence for any level-ups.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Collect {LEVEL_UP_THRESHOLD} essence to earn a level-up!
            </p>
          </div>
        )}

        {/* Continue Button */}
        {showContinue && (
          <button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all transform hover:scale-105 border-2 border-white shadow-lg"
          >
            CONTINUE
          </button>
        )}

        {/* Instructions */}
        {!showContinue && levelUps.length > 0 && (
          <p className="text-center text-cyan-300 text-sm mt-4 animate-pulse">
            Click each level-up to collect it!
          </p>
        )}

        {/* Feedback Button */}
        <div className="flex justify-center mt-4">
          <FeedbackButton variant="icon" />
        </div>
      </div>
    </div>
  );
}
