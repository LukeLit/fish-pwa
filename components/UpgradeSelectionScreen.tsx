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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 rounded-lg p-8 max-w-4xl w-full mx-4 border-4 shadow-2xl"
        style={{ borderColor: getEssenceColor(essenceType) }}
      >
        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-2 text-center tracking-wider">
          {getEssenceName(essenceType).toUpperCase()} ESSENCE LEVEL UP!
        </h1>
        <p className="text-cyan-300 text-center mb-6 text-lg">
          Choose an Upgrade
        </p>

        {/* Upgrade Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {selectedUpgrades.map((upgrade) => (
            <button
              key={upgrade.id}
              onClick={() => onUpgradeSelected(upgrade.id)}
              onMouseEnter={() => setHoveredUpgrade(upgrade.id)}
              onMouseLeave={() => setHoveredUpgrade(null)}
              className={`bg-black/60 rounded-lg p-4 border-2 transition-all transform hover:scale-105 hover:shadow-xl text-left ${
                hoveredUpgrade === upgrade.id ? 'border-yellow-400' : 'border-cyan-600'
              }`}
            >
              {/* Impact level indicator */}
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">{getImpactIcon(upgrade.impactLevel)}</span>
                <span className="text-xs text-gray-400 uppercase">{upgrade.impactLevel}</span>
              </div>

              {/* Upgrade name */}
              <h3 className="text-xl font-bold text-white mb-2">{upgrade.name}</h3>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-3">{upgrade.description}</p>

              {/* Effect preview */}
              <div className="bg-black/40 rounded px-3 py-2 mb-2">
                <p className="text-yellow-300 text-sm font-mono">
                  {formatEffectDescription(upgrade)}
                </p>
              </div>

              {/* Max level info */}
              {upgrade.maxLevel > 1 && (
                <p className="text-gray-400 text-xs">
                  Max Level: {upgrade.maxLevel}
                </p>
              )}

              {/* Select prompt on hover */}
              {hoveredUpgrade === upgrade.id && (
                <div className="mt-3 text-center">
                  <span className="text-yellow-400 font-bold animate-pulse">
                    ▶ SELECT ◀
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Reroll Button */}
        <div className="flex justify-center">
          {rerollsRemaining > 0 ? (
            <button
              onClick={handleReroll}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 border-2 border-purple-400"
            >
              🎲 REROLL ({rerollsRemaining} remaining)
            </button>
          ) : (
            <p className="text-gray-400 text-sm">No rerolls remaining</p>
          )}
        </div>

        {/* Instructions */}
        <p className="text-center text-cyan-300 text-sm mt-4">
          Click an upgrade card to select it
        </p>
      </div>
    </div>
  );
}
