/**
 * Upgrade Selection Screen Component
 * Shows 3 random upgrades from specified category with reroll mechanic
 * Based on VERTICAL_SLICE.md Step 7
 */
'use client';

import { useState, useEffect } from 'react';
import type { UpgradeNode } from '@/lib/game/types';
import { getUpgradeTree } from '@/lib/game/data/upgrades';

interface UpgradeSelectionScreenProps {
  essenceType: string;
  rerollsRemaining: number;
  onUpgradeSelected: (upgradeId: string) => void;
  onReroll: () => void;
}

// Rarity weights for random selection
const RARITY_WEIGHTS = {
  low: 60,       // 60% chance
  medium: 30,    // 30% chance
  high: 10,      // 10% chance
  game_changing: 0, // 0% chance (for vertical slice)
};

export default function UpgradeSelectionScreen({
  essenceType,
  rerollsRemaining,
  onUpgradeSelected,
  onReroll,
}: UpgradeSelectionScreenProps) {
  const [selectedUpgrades, setSelectedUpgrades] = useState<UpgradeNode[]>([]);
  const [hoveredUpgrade, setHoveredUpgrade] = useState<string | null>(null);

  useEffect(() => {
    // Generate initial upgrade options
    generateUpgradeOptions();
  }, [essenceType]);

  const generateUpgradeOptions = () => {
    const upgradePool = getUpgradeTree(essenceType);
    
    if (upgradePool.length === 0) {
      console.warn(`No upgrades found for essence type: ${essenceType}`);
      return;
    }

    // Create weighted pool based on impact level
    const weightedPool: UpgradeNode[] = [];
    upgradePool.forEach((upgrade) => {
      const weight = RARITY_WEIGHTS[upgrade.impactLevel] || 30;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(upgrade);
      }
    });

    // Select 3 unique random upgrades
    const selected: UpgradeNode[] = [];
    const selectedIds = new Set<string>();

    while (selected.length < 3 && selected.length < upgradePool.length) {
      const randomIndex = Math.floor(Math.random() * weightedPool.length);
      const upgrade = weightedPool[randomIndex];
      
      if (!selectedIds.has(upgrade.id)) {
        selected.push(upgrade);
        selectedIds.add(upgrade.id);
      }
    }

    setSelectedUpgrades(selected);
  };

  const handleReroll = () => {
    if (rerollsRemaining > 0) {
      onReroll();
      generateUpgradeOptions();
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

  const getImpactIcon = (impactLevel: string): string => {
    const icons: Record<string, string> = {
      low: '⭐',
      medium: '⭐⭐',
      high: '⭐⭐⭐',
      game_changing: '🌟',
    };
    return icons[impactLevel] || '⭐';
  };

  const formatEffectDescription = (upgrade: UpgradeNode): string => {
    const effects = upgrade.effects.map((effect) => {
      if (effect.type === 'stat') {
        const value = effect.perLevel ? `+${effect.value}/level` : `+${effect.value}`;
        return `${value} ${effect.target}`;
      } else if (effect.type === 'ability') {
        return `Unlocks: ${effect.target}`;
      } else if (effect.type === 'unlock') {
        return `Unlocks: ${effect.value}`;
      }
      return 'Unknown effect';
    });
    return effects.join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="dv-card dv-card-purple p-6 sm:p-8 max-w-5xl w-full animate-scale-in"
        style={{ borderColor: getEssenceColor(essenceType), boxShadow: `0 0 30px ${getEssenceColor(essenceType)}80` }}
      >
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl dv-title mb-2 text-center animate-glow-pulse">
          {getEssenceName(essenceType).toUpperCase()} ESSENCE LEVEL UP!
        </h1>
        <p className="dv-subtitle text-center mb-6 sm:mb-8 text-base sm:text-lg">
          Choose an Upgrade
        </p>

        {/* Upgrade Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {selectedUpgrades.map((upgrade, index) => (
            <button
              key={upgrade.id}
              onClick={() => onUpgradeSelected(upgrade.id)}
              onMouseEnter={() => setHoveredUpgrade(upgrade.id)}
              onMouseLeave={() => setHoveredUpgrade(null)}
              className={`dv-card rounded-lg p-4 sm:p-5 border-4 transition-all transform text-left animate-slide-in ${
                hoveredUpgrade === upgrade.id 
                  ? 'border-yellow-400 scale-105 shadow-[0_0_30px_rgba(234,179,8,0.6)]' 
                  : 'border-cyan-600 hover:border-purple-400 hover:scale-102'
              }`}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                backgroundColor: 'rgba(0, 0, 0, 0.8)'
              }}
            >
              {/* Impact level indicator */}
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl sm:text-3xl animate-float" style={{ animationDelay: `${index * 0.2}s` }}>
                  {getImpactIcon(upgrade.impactLevel)}
                </span>
                <span className="text-xs sm:text-sm text-purple-300 uppercase font-bold px-2 py-1 bg-purple-900/50 rounded border border-purple-500/50">
                  {upgrade.impactLevel}
                </span>
              </div>

              {/* Upgrade name */}
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-wide">
                {upgrade.name}
              </h3>

              {/* Description */}
              <p className="text-gray-300 text-sm sm:text-base mb-3 leading-relaxed">
                {upgrade.description}
              </p>

              {/* Effect preview */}
              <div className="bg-gradient-to-r from-purple-900/60 to-blue-900/60 rounded-lg px-3 py-2 mb-3 border-2 border-yellow-500/30">
                <p className="text-yellow-300 text-sm sm:text-base font-mono font-bold">
                  {formatEffectDescription(upgrade)}
                </p>
              </div>

              {/* Max level info */}
              {upgrade.maxLevel > 1 && (
                <p className="text-cyan-400 text-xs sm:text-sm font-semibold">
                  Max Level: {upgrade.maxLevel}
                </p>
              )}

              {/* Select prompt on hover */}
              {hoveredUpgrade === upgrade.id && (
                <div className="mt-3 text-center bg-yellow-400/20 rounded-lg py-2 border-2 border-yellow-400/50">
                  <span className="text-yellow-400 font-bold text-base sm:text-lg animate-pulse">
                    ▶ CLICK TO SELECT ◀
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Reroll Button */}
        <div className="flex justify-center mb-4">
          {rerollsRemaining > 0 ? (
            <button
              onClick={handleReroll}
              className="dv-button dv-button-secondary text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-10"
            >
              🎲 REROLL ({rerollsRemaining} remaining)
            </button>
          ) : (
            <p className="text-gray-400 text-sm sm:text-base font-semibold px-6 py-3 bg-gray-800/50 rounded-lg border-2 border-gray-700">
              No rerolls remaining
            </p>
          )}
        </div>

        {/* Instructions */}
        <p className="text-center dv-subtitle text-xs sm:text-sm">
          Click an upgrade card to select it
        </p>
      </div>
    </div>
  );
}
