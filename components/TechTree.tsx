/**
 * Tech Tree component for upgrades
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { GameStorage } from '@/lib/meta/storage';
import { EssenceManager } from '@/lib/meta/essence';
import { UpgradeManager, UPGRADE_DEFINITIONS } from '@/lib/meta/upgrades';

// Map upgrade definitions to display format
const getUpgradeEffect = (id: string): string => {
  const effects: Record<string, string> = {
    starting_size: '+2 size per level',
    growth_speed: '+10% growth rate per level',
    starting_speed: '+0.5 speed per level',
    mutation_frequency: '+5% mutation chance per level',
    mutation_duration: '+20% duration per level',
    space_unlock: 'Access space phase',
    space_efficiency: '+25% essence in space per level',
    essence_multiplier: '+50% essence per level',
    infinite_growth: 'No size limit',
  };
  return effects[id] || 'Upgrade effect';
};

interface UpgradeState {
  level: number;
  cost: number;
  canPurchase: boolean;
}

export default function TechTree() {
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});
  const [essence, setEssence] = useState(0);
  const [upgradeStates, setUpgradeStates] = useState<Record<string, UpgradeState>>({});
  const storage = GameStorage.getInstance();
  const essenceManager = new EssenceManager();
  
  // Create upgrade manager instance
  const upgradeManagerRef = useRef(new UpgradeManager());
  const upgradeManager = upgradeManagerRef.current;

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const currentUpgrades = await storage.getUpgrades();
      const currentEssence = await essenceManager.getAmount();
      setUpgrades(currentUpgrades);
      setEssence(currentEssence);
      
      // Calculate upgrade states
      await updateUpgradeStates(currentEssence);
    };
    
    loadData();
  }, []);

  // Update upgrade states when essence changes
  useEffect(() => {
    updateUpgradeStates(essence);
  }, [essence, upgrades]);

  const updateUpgradeStates = async (currentEssence: number) => {
    const states: Record<string, UpgradeState> = {};
    
    for (const upgrade of UPGRADE_DEFINITIONS) {
      const level = await upgradeManager.getLevel(upgrade.id);
      const cost = await upgradeManager.getCost(upgrade.id);
      const canPurchase = await upgradeManager.canPurchase(upgrade.id, currentEssence);
      
      states[upgrade.id] = {
        level,
        cost,
        canPurchase,
      };
    }
    
    setUpgradeStates(states);
  };

  const purchaseUpgrade = async (upgradeId: string) => {
    const state = upgradeStates[upgradeId];
    if (!state || !state.canPurchase) return;
    
    const purchased = await upgradeManager.purchase(upgradeId, essence);
    if (purchased) {
      await essenceManager.spend(state.cost);
      const currentUpgrades = await storage.getUpgrades();
      const currentEssence = await essenceManager.getAmount();
      setUpgrades(currentUpgrades);
      setEssence(currentEssence);
    }
  };

  const categories = ['ocean', 'mutagen', 'space', 'meta'] as const;
  const categoryNames = {
    ocean: 'Ocean Mastery',
    mutagen: 'Mutagen Perks',
    space: 'Space Unlocks',
    meta: 'Meta Upgrades',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Tech Tree</h1>
          <div className="text-2xl text-yellow-400 font-bold">
            Essence: {essence.toLocaleString()}
          </div>
        </div>

        <div className="space-y-8">
          {categories.map(category => {
            const categoryUpgrades = UPGRADE_DEFINITIONS.filter(u => u.category === category);
            if (categoryUpgrades.length === 0) return null;

            return (
              <div key={category} className="bg-indigo-800/50 backdrop-blur rounded-lg p-6 border border-indigo-600">
                <h2 className="text-2xl font-bold text-white mb-4">{categoryNames[category]}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryUpgrades.map(upgrade => {
                    const state = upgradeStates[upgrade.id];
                    if (!state) return null; // Still loading

                    const { level, cost, canPurchase: canBuy } = state;

                    return (
                      <div
                        key={upgrade.id}
                        className={`bg-indigo-900/50 rounded-lg p-4 border-2 ${
                          canBuy
                            ? 'border-green-500 hover:border-green-400 cursor-pointer'
                            : level >= upgrade.maxLevel
                            ? 'border-gray-600 opacity-60'
                            : 'border-gray-700 opacity-80'
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
                        <p className="text-xs text-yellow-300 mb-2">{getUpgradeEffect(upgrade.id)}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-yellow-400 font-bold">{cost} Essence</span>
                          {level >= upgrade.maxLevel && (
                            <span className="text-green-400 text-sm">MAXED</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Menu
          </a>
        </div>
      </div>
    </div>
  );
}
