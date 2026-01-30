/**
 * Background Library Panel - Shows all saved backgrounds in a scrollable list
 * Supports biome filtering tabs like FishLibraryPanel
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { BackgroundAsset } from '@/lib/game/types';

// Legacy interface for backwards compatibility
interface LegacyBackground {
  filename: string;
  url: string;
  timestamp: string;
}

// Union type for both formats
type Background = BackgroundAsset | LegacyBackground;

// Type guard to check if it's a BackgroundAsset
function isBackgroundAsset(bg: Background): bg is BackgroundAsset {
  return 'biomeId' in bg;
}

interface BackgroundLibraryPanelProps {
  onSelectBackground: (background: Background) => void;
  onAddNew: () => void;
  /** Callback to set a background as active (optional, for editor mode) */
  onSetAsActive?: (background: Background) => void;
}

// Biome color scheme (matches FishLibraryPanel)
const getBiomeColors = (biomeId: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    shallow: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-600' },
    shallow_tropical: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600' },
    tropical: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600' },
    medium: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600' },
    medium_polluted: { bg: 'bg-lime-600/20', text: 'text-lime-400', border: 'border-lime-600' },
    deep: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', border: 'border-indigo-600' },
    deep_sea: { bg: 'bg-violet-600/20', text: 'text-violet-400', border: 'border-violet-600' },
    polluted: { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-600' },
    abyssal: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-600' },
  };
  return colors[biomeId] || { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-600' };
};

const getBiomeDisplayName = (biomeId: string): string => {
  const names: Record<string, string> = {
    shallow: 'Shallow',
    shallow_tropical: 'Tropical',
    tropical: 'Tropical',
    medium: 'Medium',
    medium_polluted: 'Polluted Med',
    deep: 'Deep',
    deep_sea: 'Deep Sea',
    polluted: 'Polluted',
    abyssal: 'Abyssal',
  };
  return names[biomeId] || biomeId;
};

export default function BackgroundLibraryPanel({ onSelectBackground, onAddNew, onSetAsActive }: BackgroundLibraryPanelProps) {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('all');

  useEffect(() => {
    loadBackgrounds();

    // Listen for refresh events
    const handleRefresh = () => loadBackgrounds();
    window.addEventListener('refreshBackgrounds', handleRefresh);
    return () => window.removeEventListener('refreshBackgrounds', handleRefresh);
  }, []);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch with metadata first
      let response = await fetch('/api/list-assets?type=background&includeMetadata=true');
      let result = await response.json();

      if (result.success && result.backgrounds) {
        // New format with full metadata
        setBackgrounds(result.backgrounds);
      } else if (result.success && result.assets) {
        // Legacy format
        setBackgrounds(result.assets);
      } else {
        setError(result.error || 'Failed to load backgrounds');
      }
    } catch (err) {
      console.error('Failed to load backgrounds:', err);
      setError('Failed to load backgrounds');
    } finally {
      setLoading(false);
    }
  };

  // Get available biomes from backgrounds
  const availableBiomes = useMemo(() => {
    const biomes = new Set<string>();
    backgrounds.forEach(bg => {
      if (isBackgroundAsset(bg) && bg.biomeId) {
        biomes.add(bg.biomeId);
      }
    });
    // Sort by depth order
    const depthOrder = ['shallow', 'shallow_tropical', 'tropical', 'medium', 'medium_polluted', 'deep', 'deep_sea', 'abyssal', 'polluted'];
    return Array.from(biomes).sort((a, b) => depthOrder.indexOf(a) - depthOrder.indexOf(b));
  }, [backgrounds]);

  // Filter backgrounds by active sub-tab
  const filteredBackgrounds = useMemo(() => {
    if (activeSubTab === 'all') return backgrounds;
    return backgrounds.filter(bg => {
      if (isBackgroundAsset(bg)) {
        return bg.biomeId === activeSubTab;
      }
      // For legacy backgrounds, try to extract biome from filename
      const filename = bg.filename.toLowerCase();
      return filename.includes(activeSubTab);
    });
  }, [backgrounds, activeSubTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading backgrounds...</div>
      </div>
    );
  }

  const handleDelete = async (background: Background, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm(`Delete background "${background.filename}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(background.url);
    try {
      const response = await fetch(`/api/delete-asset?url=${encodeURIComponent(background.url)}&type=background`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setBackgrounds(prev => prev.filter(b => b.url !== background.url));
      } else {
        alert('Failed to delete: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetActive = (background: Background, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSetAsActive) {
      onSetAsActive(background);
    }
  };

  // Helper to get display info for a background
  const getBackgroundInfo = (bg: Background) => {
    if (isBackgroundAsset(bg)) {
      return {
        name: bg.name,
        url: bg.url,
        isVideo: bg.type === 'video',
        biomeId: bg.biomeId,
        date: bg.createdAt ? new Date(bg.createdAt).toLocaleDateString() : 'Unknown',
      };
    }
    // Legacy format
    return {
      name: bg.filename,
      url: bg.url,
      isVideo: bg.filename.toLowerCase().endsWith('.mp4'),
      biomeId: undefined,
      date: new Date(parseInt(bg.timestamp)).toLocaleDateString(),
    };
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-red-400">{error}</div>
        <button
          onClick={loadBackgrounds}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Background List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-2">
          {/* Add New Background Button */}
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
              <h3 className="font-bold text-white text-lg">Add Background</h3>
              <p className="text-sm text-blue-200">Upload image/video or generate with AI</p>
            </div>
          </button>

          {/* Background List */}
          {filteredBackgrounds.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {activeSubTab === 'all'
                ? 'No backgrounds saved yet. Click "Add Background" to get started.'
                : `No backgrounds for ${getBiomeDisplayName(activeSubTab)} biome.`}
            </div>
          ) : (
            filteredBackgrounds.map((background) => {
              const info = getBackgroundInfo(background);
              const isDeleting = deletingId === info.url;
              const biomeColors = info.biomeId ? getBiomeColors(info.biomeId) : null;

              return (
                <div
                  key={info.url}
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail - clickable to edit */}
                    <button
                      onClick={() => onSelectBackground(background)}
                      className="w-24 h-16 bg-gray-900 rounded flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                      title="Edit background"
                    >
                      {info.isVideo ? (
                        <video
                          src={info.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={info.url}
                          alt={info.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>

                    {/* Info + Actions */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-white truncate text-sm">{info.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${info.isVideo ? 'bg-purple-600/20 text-purple-400' : 'bg-green-600/20 text-green-400'
                            }`}>
                            {info.isVideo ? 'Video' : 'Image'}
                          </span>
                          {biomeColors && info.biomeId && (
                            <span className={`text-xs px-2 py-0.5 rounded ${biomeColors.bg} ${biomeColors.text}`}>
                              {getBiomeDisplayName(info.biomeId)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{info.date}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        {onSetAsActive && (
                          <button
                            onClick={(e) => handleSetActive(background, e)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            title="Set as current background"
                          >
                            Set BG
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(background, e)}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                          title="Delete background"
                        >
                          {isDeleting ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sub-tabs - Bottom of panel (matching FishLibraryPanel pattern) */}
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
            All ({backgrounds.length})
          </button>

          {/* Biome tabs */}
          {availableBiomes.map(biomeId => {
            const colors = getBiomeColors(biomeId);
            const count = backgrounds.filter(bg =>
              isBackgroundAsset(bg) ? bg.biomeId === biomeId : false
            ).length;
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
