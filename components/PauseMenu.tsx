/**
 * PauseMenu - Shared pause menu component for both fish-editor and game modes
 * Embeds existing FishEditOverlay, FishLibraryPanel, and editor components
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import FishEditOverlay, { type FishData } from './FishEditOverlay';
import FishLibraryPanel from './FishLibraryPanel';
import BackgroundLibraryPanel from './BackgroundLibraryPanel';
import BackgroundEditOverlay from './BackgroundEditOverlay';
import GenerationSettingsPanel from './GenerationSettingsPanel';
import JobsPanel from './JobsPanel';
import { Accordion } from './ui';
import type { BackgroundAsset } from '@/lib/game/types';
import { Z_LAYERS } from '@/lib/ui/z-layers';

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
  /** Called when a biome tab is selected - for setting scene to biome */
  onBiomeSelect?: (biomeId: string, biomeFish: FishData[]) => void;
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

type TabId = 'stats' | 'library' | 'backgrounds' | 'settings' | 'jobs';

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
  onBiomeSelect,
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
  const [selectedBackgroundData, setSelectedBackgroundData] = useState<BackgroundAsset | null>(null);

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

  // Handle background selection - supports both legacy and BackgroundAsset formats
  const handleSelectBackgroundFromLibrary = useCallback((background: BackgroundAsset | { url: string; filename?: string; timestamp?: string }) => {
    // Convert to BackgroundAsset if needed
    let bgAsset: BackgroundAsset;
    if ('biomeId' in background) {
      bgAsset = background;
    } else {
      // Legacy format - create a minimal BackgroundAsset
      const filename = 'filename' in background ? background.filename : 'Unknown';
      const id = filename?.replace(/\.(png|jpg|jpeg|mp4|webm)$/i, '') || `bg_${Date.now()}`;
      bgAsset = {
        id,
        name: filename || 'Background',
        biomeId: 'shallow', // Default biome
        type: filename?.toLowerCase().endsWith('.mp4') ? 'video' : 'image',
        url: background.url,
        createdAt: 'timestamp' in background ? new Date(parseInt(background.timestamp || '0')).toISOString() : new Date().toISOString(),
      };
    }
    setSelectedBackgroundData(bgAsset);
    setEditingBackground(true);
    if (onSelectBackground) {
      onSelectBackground(bgAsset);
    }
  }, [onSelectBackground]);

  const handleBackFromBackgroundEdit = useCallback(() => {
    setEditingBackground(false);
    setSelectedBackgroundData(null);
  }, []);

  // Handle saving background from edit overlay
  const handleSaveBackground = useCallback((background: BackgroundAsset) => {
    setSelectedBackgroundData(background);
    // Update the canvas background if callback provided
    if (onBackgroundChange) {
      onBackgroundChange(background.url);
    }
  }, [onBackgroundChange]);

  const handleAddNewBackgroundClick = useCallback(() => {
    // Create a new empty BackgroundAsset
    const newBackground: BackgroundAsset = {
      id: `bg_${Date.now()}`,
      name: 'New Background',
      biomeId: 'shallow',
      type: 'image',
      url: '',
      createdAt: new Date().toISOString(),
      descriptionChunks: [],
      visualMotif: '',
    };
    setSelectedBackgroundData(newBackground);
    setEditingBackground(true);
    if (onAddNewBackground) {
      onAddNewBackground();
    }
  }, [onAddNewBackground]);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'stats', label: 'Stats', show: mode === 'game' },
    { id: 'library', label: 'Fish', show: true },
    { id: 'backgrounds', label: 'Backgrounds', show: mode === 'editor' },
    { id: 'settings', label: 'Settings', show: mode === 'editor' },
    { id: 'jobs', label: 'Jobs', show: mode === 'editor' },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-[65vh] max-h-[700px]
        lg:top-0 lg:right-auto lg:w-[420px] lg:h-full lg:max-h-none lg:border-t-0 lg:border-r
        bg-gray-900/95 backdrop-blur-md flex flex-col border-t border-gray-700`}
      style={{ zIndex: Z_LAYERS.PANEL }}
    >
      {/* Action Bar - Only shown when editing a fish (TOP position) */}
      {editingFish && selectedFish && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/90 border-b border-gray-700 flex-shrink-0">
          {/* Left side: Sprite actions */}
          <div className="flex items-center gap-2">
            {/* Back button */}
            <button
              onClick={handleBackFromFishEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
              title="Back to Library"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </button>

            <div className="w-px h-6 bg-gray-600" />

            {/* Upload */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('fishEditAction', { detail: { action: 'upload' } }))}
              className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              title="Upload Image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </button>

            {/* Regenerate - with text */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('fishEditAction', { detail: { action: 'regenerate' } }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
              title="Regenerate Sprite with AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              Generate
            </button>

            {/* Flip */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('fishEditAction', { detail: { action: 'flip' } }))}
              className="p-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
              title="Flip Sprite Horizontally"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>
          </div>

          {/* Right side: Save and Delete */}
          <div className="flex items-center gap-2">
            {/* Save - with floppy disk icon */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('fishEditAction', { detail: { action: 'save' } }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm"
              title="Save Creature"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              Save
            </button>

            {/* Delete */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('fishEditAction', { detail: { action: 'delete' } }))}
              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              title="Delete Creature"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Action Bar - Only shown when editing a background (TOP position) */}
      {editingBackground && selectedBackgroundData && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/90 border-b border-gray-700 flex-shrink-0">
          {/* Left side: Actions */}
          <div className="flex items-center gap-2">
            {/* Back button */}
            <button
              onClick={handleBackFromBackgroundEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
              title="Back to Library"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </button>

            <div className="w-px h-6 bg-gray-600" />

            {/* Upload */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('backgroundEditAction', { detail: { action: 'upload' } }))}
              className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              title="Upload Image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </button>

            {/* Regenerate - with text */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('backgroundEditAction', { detail: { action: 'regenerate' } }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
              title="Generate Background with AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              Generate
            </button>
          </div>

          {/* Right side: Save and Delete */}
          <div className="flex items-center gap-2">
            {/* Save */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('backgroundEditAction', { detail: { action: 'save' } }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm"
              title="Save Background"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              Save
            </button>

            {/* Delete */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('backgroundEditAction', { detail: { action: 'delete' } }))}
              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              title="Delete Background"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Stats Tab (Game Mode Only) */}
        {activeTab === 'stats' && mode === 'game' && (
          <div className="h-full overflow-y-auto scrollbar-hide p-4">
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
          <div className="h-full overflow-y-auto scrollbar-hide">
            {!editingFish ? (
              <FishLibraryPanel
                onSelectFish={handleSelectFishFromLibrary}
                onAddNew={onAddNewCreature}
                onSetPlayer={onSetPlayer}
                onSpawnFish={onSpawnFish}
                spawnedFishIds={spawnedFishIds}
                onBiomeSelect={onBiomeSelect}
              />
            ) : selectedFish ? (
              <div className="h-full flex flex-col">
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
          <div className="h-full overflow-y-auto scrollbar-hide">
            {!editingBackground ? (
              <BackgroundLibraryPanel
                onSelectBackground={handleSelectBackgroundFromLibrary}
                onAddNew={handleAddNewBackgroundClick}
                onSetAsActive={onBackgroundChange ? (bg) => onBackgroundChange(bg.url) : undefined}
              />
            ) : (
              <div className="h-full flex flex-col">
                <BackgroundEditOverlay
                  background={selectedBackgroundData}
                  onSave={handleSaveBackground}
                  onBack={handleBackFromBackgroundEdit}
                  embedded={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Settings Tab (Editor Mode Only) - Merged with Scene Controls */}
        {activeTab === 'settings' && mode === 'editor' && (
          <div className="h-full overflow-y-auto scrollbar-hide px-4 pb-4 pt-2 space-y-2">
            {/* Scene Controls Accordion */}
            {sceneSettings && (
              <Accordion title="Scene Controls" defaultOpen={true} showBorder={false}>
                <div className="space-y-4">
                  {/* Zoom */}
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">
                      Zoom: {sceneSettings.zoom.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
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
                  <div className="pt-2">
                    <button
                      onClick={onClearFish}
                      className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Clear All Fish ({sceneSettings.spawnedFishCount})
                    </button>
                  </div>
                </div>
              </Accordion>
            )}

            {/* Generation Settings Accordion */}
            <Accordion title="Generation Settings" defaultOpen={false}>
              <GenerationSettingsPanel />
            </Accordion>

            {/* Navigation */}
            <div className="pt-4">
              <button
                onClick={onBackToMenu}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        )}

        {/* Jobs Tab (Editor Mode Only) */}
        {activeTab === 'jobs' && mode === 'editor' && (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <JobsPanel />
          </div>
        )}
      </div>

      {/* Bottom Bar: Tabs */}
      <div className="flex items-center px-4 py-2 bg-gray-800/90 border-t border-gray-700">
        {/* Tabs */}
        <div className="flex gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
