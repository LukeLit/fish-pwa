/**
 * Fish Library Panel - Shows all saved fish in a scrollable list
 */
'use client';

import { useState, useEffect } from 'react';
import type { FishData } from './FishEditOverlay';

interface FishLibraryPanelProps {
  onSelectFish: (fish: FishData) => void;
}

export default function FishLibraryPanel({ onSelectFish }: FishLibraryPanelProps) {
  const [creatures, setCreatures] = useState<FishData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreatures();
  }, []);

  const loadCreatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/list-creatures');
      const result = await response.json();
      
      if (result.success) {
        setCreatures(result.creatures || []);
      } else {
        setError(result.error || 'Failed to load creatures');
      }
    } catch (err) {
      console.error('Failed to load creatures:', err);
      setError('Failed to load creatures');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading fish library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-red-400">{error}</div>
        <button
          onClick={loadCreatures}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (creatures.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">No fish saved yet. Create and save fish to see them here.</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="space-y-2">
        {creatures.map((creature) => (
          <button
            key={creature.id}
            onClick={() => onSelectFish(creature)}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition-colors text-left"
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              <div className="w-16 h-16 bg-gray-900 rounded flex-shrink-0 overflow-hidden">
                {creature.sprite && (
                  <img
                    src={creature.sprite}
                    alt={creature.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name and Type */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white truncate">{creature.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    creature.type === 'prey' ? 'bg-green-600/20 text-green-400' :
                    creature.type === 'predator' ? 'bg-red-600/20 text-red-400' :
                    'bg-purple-600/20 text-purple-400'
                  }`}>
                    {creature.type}
                  </span>
                  {creature.playable && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">
                      Playable
                    </span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {/* Rarity */}
                  {creature.rarity && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      creature.rarity === 'legendary' ? 'bg-yellow-600/20 text-yellow-400' :
                      creature.rarity === 'epic' ? 'bg-purple-600/20 text-purple-400' :
                      creature.rarity === 'rare' ? 'bg-blue-600/20 text-blue-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {creature.rarity}
                    </span>
                  )}

                  {/* Biome */}
                  {creature.biomeId && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-teal-600/20 text-teal-400">
                      {creature.biomeId}
                    </span>
                  )}

                  {/* Essences */}
                  {creature.essenceTypes?.map((essence, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400"
                    >
                      {essence.type}:{essence.baseYield}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
