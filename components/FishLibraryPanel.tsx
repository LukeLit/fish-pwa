/**
 * Fish Library Panel - Shows all saved fish in a scrollable list with biome sub-tabs
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FishData } from './FishEditOverlay';

// Biome color configuration
const BIOME_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  shallow: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500' },
  shallow_tropical: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-500' },
  medium: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500' },
  medium_polluted: { bg: 'bg-lime-600/20', text: 'text-lime-400', border: 'border-lime-500' },
  deep: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', border: 'border-indigo-500' },
  deep_sea: { bg: 'bg-violet-600/20', text: 'text-violet-400', border: 'border-violet-500' },
  abyssal: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-500' },
  polluted: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-500' },
};

// Get biome display name
const getBiomeDisplayName = (biomeId: string): string => {
  const names: Record<string, string> = {
    shallow: 'Shallow',
    shallow_tropical: 'Tropical',
    medium: 'Medium',
    medium_polluted: 'Polluted Med',
    deep: 'Deep',
    deep_sea: 'Deep Sea',
    abyssal: 'Abyssal',
    polluted: 'Polluted',
  };
  return names[biomeId] || biomeId;
};

// Get biome colors with fallback
const getBiomeColors = (biomeId: string) => {
  return BIOME_COLORS[biomeId] || { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500' };
};

/**
 * Format a timestamp as a relative time string (e.g., "2 min ago")
 */
function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface FishLibraryPanelProps {
  onSelectFish: (fish: FishData) => void;
  onAddNew: () => void;
  onSetPlayer?: (fish: FishData) => void;
  onSpawnFish?: (sprite: string, type: string) => void;
  /** IDs of fish currently spawned in the scene */
  spawnedFishIds?: string[];
}

type SubTab = 'all' | 'in_scene' | string; // string for biome IDs

export default function FishLibraryPanel({ onSelectFish, onAddNew, onSetPlayer, onSpawnFish, spawnedFishIds = [] }: FishLibraryPanelProps) {
  const [creatures, setCreatures] = useState<FishData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('all');
  // Cache buster version - increments when sprites are refreshed
  const [thumbnailVersion, setThumbnailVersion] = useState(0);

  useEffect(() => {
    loadCreatures();
  }, []);

  // Listen for sprite refresh events to update thumbnails and reload list
  useEffect(() => {
    const handleRefresh = async () => {
      console.log('[FishLibraryPanel] Refresh event received - reloading creatures and updating thumbnails');
      setThumbnailVersion(v => v + 1);
      // Also reload the creatures list to get fresh metadata/URLs
      try {
        const response = await fetch('/api/list-creatures', { cache: 'reload' });
        const result = await response.json();
        if (result.success) {
          setCreatures(result.creatures || []);
        }
      } catch (err) {
        console.error('[FishLibraryPanel] Failed to reload creatures:', err);
      }
    };
    window.addEventListener('refreshFishSprites', handleRefresh);
    return () => window.removeEventListener('refreshFishSprites', handleRefresh);
  }, []);

  // All hooks must be before any early returns!
  // Get unique biomes from creatures
  const availableBiomes = useMemo(() => {
    const biomes = new Set<string>();
    creatures.forEach(c => {
      if (c.biomeId) biomes.add(c.biomeId);
    });
    // Sort biomes in a logical order
    const order = ['shallow', 'shallow_tropical', 'medium', 'medium_polluted', 'deep', 'deep_sea', 'abyssal', 'polluted'];
    return Array.from(biomes).sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [creatures]);

  // Filter creatures based on active sub-tab
  const filteredCreatures = useMemo(() => {
    if (activeSubTab === 'all') return creatures;
    if (activeSubTab === 'in_scene') {
      return creatures.filter(c => spawnedFishIds.includes(c.id));
    }
    // Filter by biome
    return creatures.filter(c => c.biomeId === activeSubTab);
  }, [creatures, activeSubTab, spawnedFishIds]);

  // Count for each tab
  const inSceneCount = useMemo(() =>
    creatures.filter(c => spawnedFishIds.includes(c.id)).length,
    [creatures, spawnedFishIds]
  );

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

  // Early returns AFTER all hooks
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
    <div className="h-full flex flex-col">
      {/* Fish list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2">
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

          {filteredCreatures.length === 0 && activeSubTab !== 'all' && (
            <div className="text-center py-8 text-gray-400">
              No fish in this category
            </div>
          )}

          {filteredCreatures.map((creature) => (
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
                        key={`${creature.id}-${creature.sprite}-v${thumbnailVersion}`}
                        src={
                          creature.sprite.startsWith('data:')
                            ? creature.sprite
                            : `${creature.sprite.split('?')[0]}?v=${thumbnailVersion}`
                        }
                        alt={creature.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // On error, log and hide the broken image
                          console.warn('Failed to load sprite for:', creature.id);
                          e.currentTarget.style.display = 'none';
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
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getBiomeColors(creature.biomeId).bg} ${getBiomeColors(creature.biomeId).text}`}>
                          {getBiomeDisplayName(creature.biomeId)}
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

                    {/* Modified timestamp - helps track sync status */}
                    {creature.updatedAt && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        Modified {formatRelativeTime(creature.updatedAt)}
                      </div>
                    )}
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

      {/* Sub-tabs - Bottom of library panel */}
      <div className="flex-shrink-0 border-t border-gray-700 px-2 py-1.5 overflow-x-auto bg-gray-800/50">
        <div className="flex gap-1 min-w-max">
          {/* All tab */}
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${activeSubTab === 'all'
              ? 'bg-gray-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
          >
            All ({creatures.length})
          </button>

          {/* In Scene tab */}
          {spawnedFishIds.length > 0 && (
            <button
              onClick={() => setActiveSubTab('in_scene')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${activeSubTab === 'in_scene'
                ? 'bg-yellow-600 text-white'
                : 'text-yellow-400 hover:text-white hover:bg-yellow-600/30 border border-yellow-600/50'
                }`}
            >
              In Scene ({inSceneCount})
            </button>
          )}

          {/* Biome tabs */}
          {availableBiomes.map(biomeId => {
            const colors = getBiomeColors(biomeId);
            const count = creatures.filter(c => c.biomeId === biomeId).length;
            const isActive = activeSubTab === biomeId;
            return (
              <button
                key={biomeId}
                onClick={() => setActiveSubTab(biomeId)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${isActive
                  ? `${colors.bg.replace('/20', '')} text-white`
                  : `${colors.text} hover:text-white ${colors.bg} border ${colors.border}/50`
                  }`}
              >
                {getBiomeDisplayName(biomeId)} ({count})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
