/**
 * PauseMenu - Shared pause menu component for both fish-editor and game modes
 * Embeds existing FishEditOverlay, FishLibraryPanel, and editor components
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import FishEditOverlay, { type FishData } from './FishEditOverlay';
import FishLibraryPanel from './FishLibraryPanel';
import BackgroundLibraryPanel from './BackgroundLibraryPanel';
import BackgroundEditor from './BackgroundEditor';

interface PlayerStats {
  size: number;
  hunger: number;
  score: number;
  fishEaten: number;
  timeSurvived?: number;
}

interface SceneSettings {
  zoom: number;
  chromaTolerance: number;
  enableWaterDistortion: boolean;
  deformationIntensity: number;
  spawnedFishCount: number;
}

interface PauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'editor' | 'game';
  // Player fish data (for stats display in game mode)
  playerFish?: FishData | null;
  playerStats?: PlayerStats;
  // Fish library/editing
  creatures: Map<string, FishData>;
  selectedFish: FishData | null;
  onSelectFish: (fish: FishData) => void;
  onSaveFish: (fish: FishData) => void;
  onAddNewCreature: () => void;
  // Canvas interaction
  onSetPlayer?: (fish: FishData) => void;
  onSpawnFish?: (sprite: string, type: string) => void;
  /** IDs of fish currently spawned in the scene */
  spawnedFishIds?: string[];
  // Navigation for edit overlay
  onPreviousFish?: () => void;
  onNextFish?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  // Editor-specific props
  onOpenArtSelector?: (callback: (url: string, filename: string) => void) => void;
  // Callback when exiting fish edit (to reset canvas zoom)
  onExitFishEdit?: () => void;
  // Background props (editor mode)
  currentBackground?: string | null;
  onBackgroundChange?: (url: string) => void;
  onSelectBackground?: (background: { url: string }) => void;
  onAddNewBackground?: () => void;
  // Scene settings props (editor mode)
  sceneSettings?: SceneSettings;
  onZoomChange?: (zoom: number) => void;
  onChromaToleranceChange?: (tolerance: number) => void;
  onWaterDistortionChange?: (enabled: boolean) => void;
  onDeformationIntensityChange?: (intensity: number) => void;
  onClearFish?: () => void;
  onBackToMenu?: () => void;
}

type TabId = 'stats' | 'library' | 'backgrounds' | 'scene';

export default function PauseMenu({
  isOpen,
  onClose,
  mode,
  playerFish,
  playerStats,
  creatures,
  selectedFish,
  onSelectFish,
  onSaveFish,
  onAddNewCreature,
  onSetPlayer,
  onSpawnFish,
  spawnedFishIds = [],
  onPreviousFish,
  onNextFish,
  hasPrevious = false,
  hasNext = false,
  onOpenArtSelector,
  currentBackground,
  onBackgroundChange,
  onSelectBackground,
  onAddNewBackground,
  sceneSettings,
  onZoomChange,
  onChromaToleranceChange,
  onWaterDistortionChange,
  onDeformationIntensityChange,
  onClearFish,
  onBackToMenu,
  onExitFishEdit,
}: PauseMenuProps) {
  // Default to stats tab in game mode, library tab in editor mode
  const [activeTab, setActiveTab] = useState<TabId>(mode === 'game' ? 'stats' : 'library');
  // Fish editing state - inline within library tab
  const [editingFish, setEditingFish] = useState(false);
  // Background editing state
  const [editingBackground, setEditingBackground] = useState(false);
  const [selectedBackgroundData, setSelectedBackgroundData] = useState<{ url: string } | null>(null);

  // Reset editing states when menu closes
  useEffect(() => {
    if (!isOpen) {
      setEditingFish(false);
      setEditingBackground(false);
      setSelectedBackgroundData(null);
    }
  }, [isOpen]);

  // When menu opens with a fish already selected (e.g., clicked edit in scene), show edit form
  useEffect(() => {
    if (isOpen && selectedFish && !editingFish) {
      setEditingFish(true);
      setActiveTab('library'); // Make sure we're on the library tab where edit form is shown
    }
  }, [isOpen, selectedFish, editingFish]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // When a fish is selected from library, show inline editor
  const handleSelectFishFromLibrary = useCallback((fish: FishData) => {
    onSelectFish(fish);
    setEditingFish(true);
  }, [onSelectFish]);

  // When exiting fish edit mode, go back to library list
  const handleBackFromFishEdit = useCallback(() => {
    setEditingFish(false);
    // Notify parent to reset canvas zoom
    if (onExitFishEdit) {
      onExitFishEdit();
    }
  }, [onExitFishEdit]);

  // Handle background selection
  const handleSelectBackgroundFromLibrary = useCallback((background: { url: string }) => {
    setSelectedBackgroundData(background);
    setEditingBackground(true);
    if (onSelectBackground) {
      onSelectBackground(background);
    }
  }, [onSelectBackground]);

  const handleBackFromBackgroundEdit = useCallback(() => {
    setEditingBackground(false);
    setSelectedBackgroundData(null);
  }, []);

  const handleAddNewBackgroundClick = useCallback(() => {
    setEditingBackground(true);
    setSelectedBackgroundData(null);
    if (onAddNewBackground) {
      onAddNewBackground();
    }
  }, [onAddNewBackground]);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'stats', label: 'Stats', show: mode === 'game' },
    { id: 'library', label: 'Fish', show: true },
    { id: 'backgrounds', label: 'Backgrounds', show: mode === 'editor' },
    { id: 'scene', label: 'Scene', show: mode === 'editor' },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md z-50 flex flex-col border-t border-gray-700"
      style={{ height: '50%', maxHeight: '600px' }}
    >
      {/* Header with tabs and resume button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/90 border-b border-gray-700">
        {/* Tabs */}
        <div className="flex gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Resume button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          Resume
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Stats Tab (Game Mode Only) */}
        {activeTab === 'stats' && mode === 'game' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Current Run Stats</h2>

              {/* Player Fish Info */}
              {playerFish && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-4">
                    {playerFish.sprite && (
                      <div className="w-20 h-20 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={playerFish.sprite.startsWith('data:') ? playerFish.sprite : playerFish.sprite.split('?')[0]}
                          alt={playerFish.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">{playerFish.name}</h3>
                      <p className="text-sm text-gray-400">{playerFish.type}</p>
                      {playerFish.rarity && (
                        <span className={`text-xs px-2 py-0.5 rounded ${playerFish.rarity === 'legendary' ? 'bg-yellow-600/20 text-yellow-400' :
                          playerFish.rarity === 'epic' ? 'bg-purple-600/20 text-purple-400' :
                            playerFish.rarity === 'rare' ? 'bg-blue-600/20 text-blue-400' :
                              'bg-gray-600/20 text-gray-400'
                          }`}>
                          {playerFish.rarity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              {playerStats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-cyan-400">{Math.floor(playerStats.size)}</div>
                    <div className="text-sm text-gray-400">Current Size</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className={`text-2xl font-bold ${playerStats.hunger > 50 ? 'text-green-400' :
                      playerStats.hunger > 25 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                      {Math.ceil(playerStats.hunger)}%
                    </div>
                    <div className="text-sm text-gray-400">Hunger</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">{playerStats.score}</div>
                    <div className="text-sm text-gray-400">Score</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">{playerStats.fishEaten}</div>
                    <div className="text-sm text-gray-400">Fish Eaten</div>
                  </div>
                </div>
              )}

              {/* Quick Edit Player Fish */}
              {playerFish && (
                <button
                  onClick={() => {
                    onSelectFish(playerFish);
                    setEditingFish(true);
                    setActiveTab('library');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Edit Player Fish
                </button>
              )}
            </div>
          </div>
        )}

        {/* Library Tab - Shows fish list or inline editor */}
        {activeTab === 'library' && (
          <div className="h-full overflow-y-auto">
            {!editingFish ? (
              <FishLibraryPanel
                onSelectFish={handleSelectFishFromLibrary}
                onAddNew={onAddNewCreature}
                onSetPlayer={onSetPlayer}
                onSpawnFish={onSpawnFish}
                spawnedFishIds={spawnedFishIds}
              />
            ) : selectedFish ? (
              <div className="h-full flex flex-col">
                {/* Back button header */}
                <div className="px-4 py-2 border-b border-gray-700 flex-shrink-0">
                  <button
                    onClick={handleBackFromFishEdit}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    ← Back to Library
                  </button>
                </div>
                {/* Fish editor */}
                <div className="flex-1 overflow-hidden">
                  <FishEditOverlay
                    fish={selectedFish}
                    onSave={onSaveFish}
                    onBack={handleBackFromFishEdit}
                    onPrevious={onPreviousFish || (() => { })}
                    onNext={onNextFish || (() => { })}
                    hasPrevious={hasPrevious}
                    hasNext={hasNext}
                    onOpenArtSelector={onOpenArtSelector}
                    embedded={true}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Backgrounds Tab (Editor Mode Only) */}
        {activeTab === 'backgrounds' && mode === 'editor' && (
          <div className="h-full overflow-y-auto">
            {!editingBackground ? (
              <BackgroundLibraryPanel
                onSelectBackground={handleSelectBackgroundFromLibrary}
                onAddNew={handleAddNewBackgroundClick}
              />
            ) : (
              <div className="p-4">
                <div className="mb-4">
                  <button
                    onClick={handleBackFromBackgroundEdit}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    ← Back to Library
                  </button>
                </div>
                <BackgroundEditor
                  currentBackground={selectedBackgroundData?.url || currentBackground || null}
                  onBackgroundChange={(url) => {
                    if (onBackgroundChange) {
                      onBackgroundChange(url);
                    }
                  }}
                  onOpenArtSelector={onOpenArtSelector}
                />
              </div>
            )}
          </div>
        )}

        {/* Scene Tab (Editor Mode Only) */}
        {activeTab === 'scene' && mode === 'editor' && sceneSettings && (
          <div className="h-full overflow-y-auto px-4 pb-4 pt-2">
            <div className="space-y-4">
              {/* Scene controls header */}
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Scene Controls</h2>
                <p className="text-xs text-gray-400">Adjust canvas display settings</p>
              </div>

              {/* Zoom */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Zoom: {sceneSettings.zoom.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={sceneSettings.zoom}
                  onChange={(e) => onZoomChange?.(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Chroma Tolerance */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Background Removal: {sceneSettings.chromaTolerance}
                </label>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={sceneSettings.chromaTolerance}
                  onChange={(e) => onChromaToleranceChange?.(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Less</span>
                  <span>More</span>
                </div>
              </div>

              {/* Water Distortion */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sceneSettings.enableWaterDistortion}
                    onChange={(e) => onWaterDistortionChange?.(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-white">Enable Water Distortion</span>
                </label>
              </div>

              {/* Deformation Intensity */}
              {sceneSettings.enableWaterDistortion && (
                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    Distortion Intensity: {sceneSettings.deformationIntensity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={sceneSettings.deformationIntensity}
                    onChange={(e) => onDeformationIntensityChange?.(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Clear fish */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={onClearFish}
                  className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Clear All Fish ({sceneSettings.spawnedFishCount})
                </button>
              </div>

              {/* Back to menu */}
              <div>
                <button
                  onClick={onBackToMenu}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  ← Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
