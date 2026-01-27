/**
 * Tech Tree component for meta upgrades (uses Evo Points)
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { loadPlayerState } from '@/lib/game/player-state';
import { META_UPGRADES, calculateUpgradeCost } from '@/lib/game/data/upgrades';

// Map upgrade definitions to display format
const getUpgradeEffect = (id: string): string => {
  const upgrade = META_UPGRADES.find(u => u.id === id);
  if (!upgrade) return 'Upgrade effect';
  
  const effect = upgrade.effects[0];
  if (effect.type === 'stat') {
    return `${effect.value > 0 ? '+' : ''}${effect.value}${effect.perLevel ? ' per level' : ''}`;
  }
  return 'Upgrade effect';
};

interface UpgradeState {
  level: number;
  cost: number;
  canPurchase: boolean;
}

export default function TechTree() {
  const [evoPoints, setEvoPoints] = useState(0);
  const [upgradeStates, setUpgradeStates] = useState<Record<string, UpgradeState>>({});

  const loadData = useCallback(() => {
    const playerState = loadPlayerState();
    setEvoPoints(playerState.evoPoints);
    
    // Calculate upgrade states
    const states: Record<string, UpgradeState> = {};
    for (const upgrade of META_UPGRADES) {
      const level = playerState.metaUpgrades[upgrade.id] || 0;
      const cost = calculateUpgradeCost(upgrade, level);
      const canPurchase = level < upgrade.maxLevel && playerState.evoPoints >= cost;
      
      states[upgrade.id] = { level, cost, canPurchase };
    }
    setUpgradeStates(states);
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  const purchaseUpgrade = async (upgradeId: string) => {
    const state = upgradeStates[upgradeId];
    if (!state || !state.canPurchase) return;
    
    try {
      const response = await fetch('/api/player/purchase-meta-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgradeId }),
      });
      
      if (response.ok) {
        loadData(); // Reload all data
      } else {
        const error = await response.json();
        console.error('Failed to purchase upgrade:', error);
        alert(error.error || 'Failed to purchase upgrade');
      }
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
      alert('Failed to purchase upgrade');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 uppercase tracking-wider">Meta Upgrades</h1>
          <p className="text-indigo-200 mb-4">Permanent upgrades that affect all future runs</p>
          <div className="text-3xl text-yellow-400 font-bold">
            Evo Points: {evoPoints.toLocaleString()}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-800/50 backdrop-blur rounded-lg p-6 border border-indigo-600">
            <h2 className="text-2xl font-bold text-white mb-4">Permanent Upgrades</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {META_UPGRADES.map(upgrade => {
                const state = upgradeStates[upgrade.id];
                if (!state) return null; // Still loading

                const { level, cost, canPurchase: canBuy } = state;

                return (
                  <div
                    key={upgrade.id}
                    className={`bg-indigo-900/50 rounded-lg p-4 border-2 ${
                      canBuy
                        ? 'border-green-500 hover:border-green-400 cursor-pointer hover:shadow-lg hover:shadow-green-500/50'
                        : level >= upgrade.maxLevel
                        ? 'border-purple-600 opacity-90'
                        : 'border-gray-700 opacity-60'
                    } transition-all`}
                    onClick={() => canBuy && purchaseUpgrade(upgrade.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white">{upgrade.name}</h3>
                      <span className="text-sm text-gray-400">
                        {level}/{upgrade.maxLevel}
                      </span>
                    </div>
                    <p className="text-sm text-indigo-200 mb-2">{upgrade.description}</p>
                    <p className="text-xs text-yellow-300 mb-3">{getUpgradeEffect(upgrade.id)}</p>
                    <div className="flex justify-between items-center">
                      {level >= upgrade.maxLevel ? (
                        <span className="text-purple-400 text-sm font-bold">MAXED OUT</span>
                      ) : (
                        <>
                          <span className="text-yellow-400 font-bold">{cost} Evo Points</span>
                          {canBuy && (
                            <span className="text-green-400 text-sm">AVAILABLE</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wide"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
