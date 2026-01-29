/**
 * Fish Library Panel - Shows all saved fish in a scrollable list
 */
'use client';

import { useState, useEffect } from 'react';
import type { FishData } from './FishEditOverlay';

interface FishLibraryPanelProps {
  onSelectFish: (fish: FishData) => void;
  onAddNew: () => void;
  onSetPlayer?: (fish: FishData) => void;
  onSpawnFish?: (sprite: string, type: string) => void;
}

export default function FishLibraryPanel({ onSelectFish, onAddNew, onSetPlayer, onSpawnFish }: FishLibraryPanelProps) {
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
        {/* Add New Creature Button */}
        <button
          onClick={onAddNew}
          className="w-full bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg p-4 transition-colors text-left flex items-center gap-3"
        >
          <div className="w-16 h-16 bg-blue-700 rounded flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Add Creature</h3>
            <p className="text-sm text-blue-200">Create new or use existing art</p>
          </div>
        </button>

        {creatures.map((creature) => (
          <div key={creature.id} className="relative group">
            <div
              onClick={() => onSelectFish(creature)}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition-colors cursor-pointer"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-gray-900 rounded flex-shrink-0 overflow-hidden">
                  {creature.sprite && (
                    <img
                      key={`${creature.id}-${creature.sprite}`}
                      src={
                        creature.sprite.startsWith('data:')
                          ? creature.sprite
                          : `${creature.sprite.split('?')[0]}?t=${Date.now()}`
                      }
                      alt={creature.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // For HTTP(S) sprites, force reload with new cache buster
                        if (!creature.sprite?.startsWith('data:')) {
                          const img = e.currentTarget;
                          const cleanUrl = img.src.split('?')[0];
                          img.src = `${cleanUrl}?t=${Date.now()}`;
                        }
                      }}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Name and Type */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white truncate">{creature.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${creature.type === 'prey' ? 'bg-green-600/20 text-green-400' :
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
                      <span className={`text-xs px-1.5 py-0.5 rounded ${creature.rarity === 'legendary' ? 'bg-yellow-600/20 text-yellow-400' :
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
            </div>
            {/* Action buttons - outside the clickable area */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {/* Set Player Button */}
              {creature.sprite && onSetPlayer && (
                <button
                  title="Set as Player Fish"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetPlayer(creature);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  type="button"
                >
                  Set Player
                </button>
              )}
              {/* Spawn Button */}
              {creature.sprite && onSpawnFish && (
                <button
                  title="Spawn as AI Fish"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpawnFish(creature.sprite!, creature.type);
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  type="button"
                >
                  Spawn
                </button>
              )}
              {/* Delete button */}
              <button
                title="Delete Creature"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Delete ${creature.name}? This cannot be undone.`)) return;
                  try {
                    const res = await fetch(`/api/delete-creature?id=${encodeURIComponent(creature.id)}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                      setCreatures((prev) => prev.filter((f) => f.id !== creature.id));
                    } else {
                      alert('Delete failed: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err) {
                    alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  }
                }}
                className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
