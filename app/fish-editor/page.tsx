/**
 * Fish Editor - Live testing environment for AI-generated assets
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FishEditorCanvas from '@/components/FishEditorCanvas';
import { type FishData } from '@/components/FishEditOverlay';
import PauseMenu from '@/components/PauseMenu';
import ArtSelectorPanel from '@/components/ArtSelectorPanel';
import SettingsDrawer from '@/components/SettingsDrawer';
import { Z_LAYERS } from '@/lib/ui/z-layers';
import {
  setMipmapDebug,
  SPRITE_RESOLUTION_THRESHOLDS,
  getGrowthStage,
  setGrowthDebug,
} from '@/lib/rendering/fish-renderer';
import type { GrowthStage, GrowthSprites } from '@/lib/game/types';

// Constants
const DEFAULT_ZOOM = 1.0;
const MAX_EDIT_ZOOM = 3.0;

export default function FishEditorPage() {
  const router = useRouter();
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerCreatureId, setPlayerCreatureId] = useState<string | null>(null); // ID of creature being controlled as player
  const [spawnedFish, setSpawnedFish] = useState<Array<{ id: string; sprite: string; type: string; creatureId?: string }>>([]);
  const [fishData, setFishData] = useState<Map<string, FishData>>(new Map());
  const [chromaTolerance, setChromaTolerance] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [enableWaterDistortion, setEnableWaterDistortion] = useState<boolean>(false);
  const [deformationIntensity, setDeformationIntensity] = useState<number>(1);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedFishId, setSelectedFishId] = useState<string | null>(null);
  const [paused, setPaused] = useState<boolean>(false);
  const [selectedBackgroundData, setSelectedBackgroundData] = useState<any>(null);
  const [showArtSelector, setShowArtSelector] = useState(false);
  const [artSelectorType, setArtSelectorType] = useState<'fish' | 'background'>('fish');
  const [artSelectorCallback, setArtSelectorCallback] = useState<((url: string, filename: string) => void) | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [sizeOverride, setSizeOverride] = useState<number | null>(null);
  const [mipmapDebug, setMipmapDebugState] = useState(false);
  const [growthDebug, setGrowthDebugState] = useState(false);
  const [isGeneratingGrowth, setIsGeneratingGrowth] = useState(false);
  const [growthGenerationStatus, setGrowthGenerationStatus] = useState<string | null>(null);

  // Helper to get resolution tier from size
  const getResolutionTier = useCallback((size: number, currentZoom: number): 'high' | 'medium' | 'low' => {
    const screenSize = size * currentZoom;
    if (screenSize >= SPRITE_RESOLUTION_THRESHOLDS.HIGH) return 'high';
    if (screenSize >= SPRITE_RESOLUTION_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }, []);

  // Handle Escape key for pause toggle - uses callback form to access current state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // When unpausing, reset edit mode too
        setPaused(prev => {
          if (prev) {
            // Was paused, now unpausing - reset edit state and zoom
            setEditMode(false);
            setSelectedFishId(null);
            setZoom(DEFAULT_ZOOM);
          }
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load random background, player fish, and spawn default prey on mount
  useEffect(() => {
    function createDefaultPreyDataUrl(): string {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 40;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(35, 20, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(10, 20);
      ctx.lineTo(0, 8);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fill();
      return c.toDataURL('image/png');
    }

    const loadRandomAssets = async () => {
      try {
        // Backgrounds still use the generic asset listing
        const bgResponse = await fetch('/api/list-assets?type=background');
        const bgData = await bgResponse.json();
        if (bgData.success && bgData.assets.length > 0) {
          const randomBg = bgData.assets[Math.floor(Math.random() * bgData.assets.length)];
          setSelectedBackground(randomBg.url);
        }
        // NOTE: We no longer load fish sprites directly from /api/list-assets.
        // All fish now come from blob-stored creature metadata via /api/list-creatures.
      } catch (error) {
        console.error('Failed to load random assets:', error);
      }
    };

    loadRandomAssets();

    // Load all creatures from blob storage
    const loadCreaturesFromBlob = async () => {
      try {
        const response = await fetch('/api/list-creatures');
        const result = await response.json();

        if (result.success && result.creatures && result.creatures.length > 0) {
          console.log(`[FishEditor] Loaded ${result.creatures.length} creatures from blob storage`);

          // Seed fishData from blob creatures only (no legacy raw sprites)
          const newFishData = new Map<string, FishData>();
          (result.creatures as FishData[]).forEach((creature) => {
            newFishData.set(creature.id, creature);
          });
          setFishData(newFishData);

          // Set player creature from real data - prefer a playable creature
          if (!playerCreatureId) {
            const creatures: FishData[] = result.creatures;
            const playable = creatures.find((c) => c.playable && c.sprite);
            const firstWithSprite = creatures.find((c) => c.sprite);
            const chosen = playable || firstWithSprite;
            if (chosen) {
              setPlayerCreatureId(chosen.id);
            }
          }

          // If nothing is spawned yet, spawn a few prey from the creature list for convenience
          if (spawnedFish.length === 0) {
            const creatures: FishData[] = result.creatures;
            const preyCandidates = creatures.filter((c) => c.type === 'prey' && c.sprite);
            const pool = preyCandidates.length > 0 ? preyCandidates : creatures.filter((c) => c.sprite);
            const defaults: { id: string; sprite: string; type: string; creatureId?: string }[] = [];

            for (let i = 0; i < Math.min(4, pool.length); i++) {
              const c = pool[i];
              // Use unique instance ID so multiple fish of same species can be edited independently
              const instanceId = `${c.id}_inst_${Date.now()}_${i}`;
              defaults.push({
                id: instanceId,
                sprite: c.sprite!,
                type: c.type,
                creatureId: c.id, // Track original creature ID for data lookup
              });
            }

            if (defaults.length > 0) {
              setSpawnedFish(defaults);
            }
          }
        } else {
          // No blob creatures yet: fall back to simple green placeholder prey so the editor isn't empty
          const fallbackSprite = createDefaultPreyDataUrl();
          const defaults: Array<{ id: string; sprite: string; type: 'prey' }> = [];
          const newFishData = new Map<string, FishData>();

          for (let i = 0; i < 4; i++) {
            const newId = `default_prey_${Date.now()}_${i}`;
            defaults.push({
              id: newId,
              sprite: fallbackSprite,
              type: 'prey',
            });

            newFishData.set(newId, {
              id: newId,
              name: `Prey Fish ${i + 1}`,
              description: 'A small, swift prey fish.',
              type: 'prey',
              stats: {
                size: 60,
                speed: 5,
                health: 20,
                damage: 5,
              },
              sprite: fallbackSprite,
            });
          }

          setSpawnedFish(defaults);
          setFishData(newFishData);
        }
      } catch (error) {
        console.error('[FishEditor] Failed to load creatures from blob storage:', error);
      }
    };

    loadCreaturesFromBlob();
  }, []);

  const handleSpawnFish = (sprite: string, type: string) => {
    const newId = `fish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newFish = {
      id: newId,
      sprite,
      type,
    };
    setSpawnedFish((prev) => [...prev, newFish]);

    // Initialize fish data
    const defaultName = type.charAt(0).toUpperCase() + type.slice(1) + ' Fish';
    const defaultData: FishData = {
      id: newId,
      name: defaultName,
      description: `A ${type} fish with unique characteristics.`,
      type: type as 'prey' | 'predator' | 'mutant',
      stats: {
        size: type === 'prey' ? 60 : type === 'predator' ? 120 : 90,
        speed: type === 'prey' ? 5 : type === 'predator' ? 3 : 4,
        health: type === 'prey' ? 20 : type === 'predator' ? 50 : 35,
        damage: type === 'prey' ? 5 : type === 'predator' ? 20 : 12,
      },
      sprite,
    };
    setFishData((prev) => {
      const newMap = new Map(prev);
      newMap.set(newId, defaultData);
      return newMap;
    });
  };

  const handleClearFish = () => {
    setSpawnedFish([]);
    setFishData(new Map());
    setEditMode(false);
    setSelectedFishId(null);
    setZoom(DEFAULT_ZOOM);
  };

  const handleBackToMenu = () => {
    router.push('/');
  };

  const handleEditFish = (fishId: string) => {
    setSelectedFishId(fishId);
    setEditMode(true);
    setPaused(true); // Open pause menu to show edit UI
    setZoom(MAX_EDIT_ZOOM); // Zoom in to max when entering fish edit mode
  };

  // Fish editor doesn't create a synthetic player - we work with real creature data only

  const handleExitEditMode = () => {
    setEditMode(false);
    setSelectedFishId(null);
    setZoom(DEFAULT_ZOOM); // Reset zoom when exiting edit mode
  };

  // Close pause menu AND reset all edit state
  const handleClosePauseMenu = () => {
    setPaused(false);
    setEditMode(false);
    setSelectedFishId(null);
    setZoom(DEFAULT_ZOOM); // Reset zoom when closing pause menu
  };

  const handleSelectFishFromLibrary = (fish: FishData) => {
    // Add the fish to our local state if not already there
    setFishData((prev) => {
      const newMap = new Map(prev);
      newMap.set(fish.id, fish);
      return newMap;
    });

    // Create unique instance ID for this spawn
    const instanceId = `${fish.id}_inst_${Date.now()}`;

    // Spawn the fish to canvas with unique instance ID
    setSpawnedFish((prev) => {
      return [...prev, {
        id: instanceId,
        sprite: fish.sprite,
        type: fish.type,
        creatureId: fish.id // Track original creature ID for metadata lookup
      }];
    });

    // Enter edit mode for this fish instance
    setSelectedFishId(instanceId);
    setSizeOverride(null); // Reset size override when selecting new fish
    setEditMode(true);
    setZoom(MAX_EDIT_ZOOM); // Zoom in to max when entering fish edit mode
  };

  const handleSetPlayerFish = (fish: FishData) => {
    // Set this creature as the player-controlled fish (uses real creature data)
    setPlayerCreatureId(fish.id);
  };

  const handleAddNewCreature = () => {
    // Create a new empty creature
    const newId = `creature_${Date.now()}`;

    // Create a simple placeholder sprite
    const placeholderSprite = (() => {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 40;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#808080'; // Gray placeholder
      ctx.beginPath();
      ctx.ellipse(35, 20, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      return c.toDataURL('image/png');
    })();

    const newFish: FishData = {
      id: newId,
      name: 'New Creature',
      description: 'A newly created creature',
      type: 'prey',
      stats: {
        size: 60,
        speed: 5,
        health: 20,
        damage: 5,
      },
      sprite: placeholderSprite,
      rarity: 'common',
      playable: false,
      biomeId: 'shallow',
      essenceTypes: [{ type: 'shallow', baseYield: 10 }],
      spawnRules: {
        canAppearIn: ['shallow'],
        spawnWeight: 50,
      },
    };

    setFishData((prev) => {
      const newMap = new Map(prev);
      newMap.set(newId, newFish);
      return newMap;
    });

    // Spawn the fish to the canvas so it's visible
    setSpawnedFish((prev) => [
      ...prev,
      { id: newId, sprite: placeholderSprite, type: 'prey' }
    ]);

    setSelectedFishId(newId);
    setEditMode(true);
    setZoom(MAX_EDIT_ZOOM); // Zoom in to max when entering fish edit mode
  };

  const handleAddNewBackground = () => {
    setSelectedBackgroundData(null);
  };

  const handleSelectBackground = (background: any) => {
    setSelectedBackgroundData(background);
    setSelectedBackground(background.url);
  };

  const handleOpenArtSelector = (type: 'fish' | 'background', callback: (url: string, filename: string) => void) => {
    setArtSelectorType(type);
    setArtSelectorCallback(() => callback);
    setShowArtSelector(true);
  };

  const handleArtSelect = (url: string, filename: string) => {
    if (artSelectorCallback) {
      artSelectorCallback(url, filename);
    }
    setShowArtSelector(false);
    setArtSelectorCallback(null);
  };

  const handleArtSelectorCancel = () => {
    setShowArtSelector(false);
    setArtSelectorCallback(null);
  };

  const handleSaveFish = (fish: FishData) => {
    setFishData((prev) => {
      const newMap = new Map(prev);
      newMap.set(fish.id, fish);
      return newMap;
    });
    // Update spawned fish sprite and type if changed - match by creatureId OR id
    setSpawnedFish((prev) =>
      prev.map((f) => {
        const matchesCreature = f.creatureId === fish.id || f.id === fish.id;
        return matchesCreature ? { ...f, sprite: fish.sprite, type: fish.type } : f;
      })
    );
  };

  // Generate growth sprites for the selected fish
  const handleGenerateGrowthSprites = useCallback(async () => {
    const selectedFish = selectedFishId ? getCreatureData(selectedFishId) : null;
    if (!selectedFish) {
      console.error('[GrowthSprites] No fish selected');
      return;
    }

    if (!selectedFish.sprite) {
      console.error('[GrowthSprites] Selected fish has no sprite:', selectedFish.id);
      alert('This fish has no sprite image. Cannot generate growth sprites.');
      return;
    }

    console.log('[GrowthSprites] Starting generation for:', selectedFish.id, 'sprite:', selectedFish.sprite);
    setIsGeneratingGrowth(true);
    setGrowthGenerationStatus('Starting generation...');

    try {
      const response = await fetch('/api/generate-growth-sprites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatureId: selectedFish.id,
          spriteUrl: selectedFish.sprite,
          creatureName: selectedFish.name,
          descriptionChunks: selectedFish.descriptionChunks,
          biomeId: selectedFish.biomeId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Generation failed: ${error}`);
      }

      const result = await response.json();

      if (result.success && result.growthSprites) {
        // Update the fish data with new growth sprites
        const updatedFish: FishData = {
          ...selectedFish,
          growthSprites: result.growthSprites,
        };

        // Update local state
        setFishData((prev) => {
          const newMap = new Map(prev);
          newMap.set(selectedFish.id, updatedFish);
          return newMap;
        });

        // Persist to server - keep the sprite URL intact
        const formData = new FormData();
        formData.append('creatureId', selectedFish.id);
        formData.append('metadata', JSON.stringify(updatedFish));

        await fetch('/api/save-creature', {
          method: 'POST',
          body: formData,
        });

        setGrowthGenerationStatus('Growth sprites generated!');
      } else {
        setGrowthGenerationStatus('Generation completed but no sprites returned');
      }
    } catch (error) {
      console.error('[FishEditor] Growth sprite generation error:', error);
      setGrowthGenerationStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingGrowth(false);
      // Clear status after a delay
      setTimeout(() => setGrowthGenerationStatus(null), 3000);
    }
  }, [selectedFishId, fishData]);

  const handlePreviousFish = () => {
    if (!selectedFishId) return;
    // Navigate through player + spawned fish
    const ids = spawnedFish.map(f => f.id);
    // Include player creature at the start if it exists
    if (playerCreatureId && !ids.includes(playerCreatureId)) {
      ids.unshift(playerCreatureId);
    }
    const currentIndex = ids.indexOf(selectedFishId);
    if (currentIndex > 0) {
      setSelectedFishId(ids[currentIndex - 1]);
      setSizeOverride(null);
    }
  };

  const handleNextFish = () => {
    if (!selectedFishId) return;
    // Navigate through player + spawned fish
    const ids = spawnedFish.map(f => f.id);
    // Include player creature at the start if it exists
    if (playerCreatureId && !ids.includes(playerCreatureId)) {
      ids.unshift(playerCreatureId);
    }
    const currentIndex = ids.indexOf(selectedFishId);
    if (currentIndex < ids.length - 1) {
      setSelectedFishId(ids[currentIndex + 1]);
      setSizeOverride(null);
    }
  };

  // Note: We keep all fish data loaded - no cleanup needed
  // Fish data is the source of truth for all creatures
  // For instance IDs (spawned fish), look up the original creature data via creatureId
  const getCreatureData = (instanceId: string): FishData | null => {
    // First try direct lookup (for creature IDs)
    const direct = fishData.get(instanceId);
    if (direct) return direct;

    // Then check if it's an instance ID with a creatureId reference
    const spawnedEntry = spawnedFish.find(f => f.id === instanceId);
    if (spawnedEntry?.creatureId) {
      return fishData.get(spawnedEntry.creatureId) || null;
    }

    return null;
  };

  const selectedFish = selectedFishId ? getCreatureData(selectedFishId) : null;

  // Get player creature data from real creature data
  const playerCreature = playerCreatureId ? fishData.get(playerCreatureId) : null;
  const playerFishSprite = playerCreature?.sprite || null;

  // Navigation is through SPAWNED fish only (fish in the scene), plus player
  const spawnedIds = spawnedFish.map(f => f.id);
  // Include player in navigation
  const navIds = playerCreatureId && !spawnedIds.includes(playerCreatureId)
    ? [playerCreatureId, ...spawnedIds]
    : spawnedIds;
  const selectedIndex = selectedFishId ? navIds.indexOf(selectedFishId) : -1;
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < navIds.length - 1;

  // Callback wrappers for PauseMenu
  const handlePauseMenuSelectFish = useCallback((fish: FishData) => {
    handleSelectFishFromLibrary(fish);
    setEditMode(true);
  }, [handleSelectFishFromLibrary]);

  const handlePauseMenuBack = useCallback(() => {
    handleExitEditMode();
  }, []);

  return (
    <div className="relative w-full h-screen bg-black flex flex-col overflow-hidden">
      {/* Top Right Icon Buttons - offset right to make room for menu button */}
      <div className="absolute top-4 right-16 flex gap-2" style={{ zIndex: Z_LAYERS.CONTROLS }}>
        {/* Refresh Textures Icon */}
        <button
          onClick={() => {
            console.log('[FishEditor] Dispatching refreshFishSprites event');
            window.dispatchEvent(new CustomEvent('refreshFishSprites'));
          }}
          className="bg-gray-800 hover:bg-gray-700 text-white w-10 h-10 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center transition-colors"
          title="Refresh Textures (clear cache)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
        {/* Pause Icon */}
        <button
          onClick={() => paused ? handleClosePauseMenu() : setPaused(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white w-10 h-10 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center transition-colors"
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Settings Drawer - Rendered at page level to avoid stacking context issues */}
      <SettingsDrawer mode="editor" />

      {/* Fish Name Bar with Prev/Next - Docked above the Pause Menu on mobile, above canvas on desktop */}
      {paused && selectedFish && (
        <div
          className="absolute left-0 right-0 flex items-center justify-between px-4 py-2
            bottom-[65vh] lg:bottom-4 lg:left-[420px]"
          style={{ zIndex: Z_LAYERS.CONTROLS }}
        >
          {/* Previous Arrow */}
          <button
            onClick={handlePreviousFish}
            disabled={!hasPrevious}
            className={`p-2 rounded-full transition-all ${hasPrevious
              ? 'bg-gray-800/80 hover:bg-gray-700 text-white cursor-pointer'
              : 'bg-gray-800/40 text-gray-600 cursor-not-allowed'
              }`}
            title="Previous Fish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Fish Name - Center */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (tempName.trim() && selectedFishId) {
                      const updatedFish = { ...selectedFish, name: tempName.trim() };
                      handleSaveFish(updatedFish);
                    }
                    setEditingName(false);
                  } else if (e.key === 'Escape') {
                    setEditingName(false);
                  }
                }}
                className="bg-gray-800 text-white px-3 py-1 rounded text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => {
                  if (tempName.trim() && selectedFishId) {
                    const updatedFish = { ...selectedFish, name: tempName.trim() };
                    handleSaveFish(updatedFish);
                  }
                  setEditingName(false);
                }}
                className="p-1 bg-green-600 hover:bg-green-500 rounded text-white"
                title="Save Name"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
                title="Cancel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white drop-shadow-lg">
                {selectedFish.name}
              </span>
              <button
                onClick={() => {
                  setTempName(selectedFish.name);
                  setEditingName(true);
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Edit Name"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          )}

          {/* Next Arrow */}
          <button
            onClick={handleNextFish}
            disabled={!hasNext}
            className={`p-2 rounded-full transition-all ${hasNext
              ? 'bg-gray-800/80 hover:bg-gray-700 text-white cursor-pointer'
              : 'bg-gray-800/40 text-gray-600 cursor-not-allowed'
              }`}
            title="Next Fish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}

      {/* Canvas - Full screen, but fish will be positioned in top area during edit mode */}
      {/* Mobile: explicit height above panel, Desktop: left margin for side drawer */}
      <div className={`relative transition-all duration-200 ${paused
        ? 'h-[35vh] lg:h-auto lg:flex-1 lg:ml-[420px]'
        : 'flex-1'
        }`}>
        <FishEditorCanvas
          background={selectedBackground}
          playerFishSprite={playerFishSprite}
          playerCreature={playerCreature as any}
          spawnedFish={spawnedFish}
          chromaTolerance={chromaTolerance}
          zoom={zoom}
          enableWaterDistortion={enableWaterDistortion}
          deformationIntensity={deformationIntensity}
          editMode={editMode}
          selectedFishId={selectedFishId}
          onEditFish={handleEditFish}
          showEditButtons={paused}
          fishData={fishData}
          paused={paused}
          onCacheRefreshed={() => console.log('[FishEditor] Cache refreshed!')}
        />
      </div>

      {/* Pause Menu - All editor functionality is now in the pause menu */}
      <PauseMenu
        isOpen={paused}
        onClose={handleClosePauseMenu}
        mode="editor"
        creatures={fishData}
        selectedFish={selectedFish}
        onSelectFish={handlePauseMenuSelectFish}
        onSaveFish={handleSaveFish}
        onAddNewCreature={handleAddNewCreature}
        onSetPlayer={handleSetPlayerFish}
        onSpawnFish={(sprite, type) => handleSpawnFish(sprite, type)}
        spawnedFishIds={spawnedFish.map(f => f.id)}
        onPreviousFish={handlePreviousFish}
        onNextFish={handleNextFish}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onOpenArtSelector={(callback) => handleOpenArtSelector('fish', callback)}
        onExitFishEdit={handleExitEditMode}
        // Background props
        currentBackground={selectedBackground}
        onBackgroundChange={(url) => setSelectedBackground(url)}
        onSelectBackground={handleSelectBackground}
        onAddNewBackground={handleAddNewBackground}
        // Scene settings props
        sceneSettings={{
          zoom,
          chromaTolerance,
          enableWaterDistortion,
          deformationIntensity,
          spawnedFishCount: spawnedFish.length,
        }}
        onZoomChange={setZoom}
        onChromaToleranceChange={setChromaTolerance}
        onWaterDistortionChange={setEnableWaterDistortion}
        onDeformationIntensityChange={setDeformationIntensity}
        onClearFish={handleClearFish}
        onBackToMenu={handleBackToMenu}
      />

      {/* Bottom Right Edit Button - Hidden when pause menu is open */}
      {!paused && (
        <div className="absolute bottom-20 right-4" style={{ zIndex: Z_LAYERS.CONTROLS }}>
          <button
            onClick={() => setPaused(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-cyan-400/50 font-bold uppercase tracking-wider transition-all hover:scale-105 flex items-center gap-2"
            title="Open Editor"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Edit
          </button>
        </div>
      )}

      {/* Size Slider Panel - Right side when editing a fish */}
      {paused && selectedFish && (
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm rounded-lg p-3 border border-gray-700 shadow-xl w-16 flex flex-col items-center gap-3"
          style={{ zIndex: Z_LAYERS.CONTROLS }}
        >
          {/* Size Label */}
          <div className="text-xs text-gray-400 font-medium">SIZE</div>

          {/* Vertical Slider */}
          <div className="relative h-48 w-6 flex items-center justify-center">
            <input
              type="range"
              min="20"
              max="300"
              value={sizeOverride ?? selectedFish.stats?.size ?? 60}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                const oldSize = sizeOverride ?? selectedFish.stats?.size ?? 60;

                // Check if we're crossing a resolution threshold
                const oldTier = getResolutionTier(oldSize, zoom);
                const newTier = getResolutionTier(newSize, zoom);

                // Check if we're crossing a growth stage threshold
                const oldGrowthStage = getGrowthStage(oldSize, selectedFish.growthSprites);
                const newGrowthStage = getGrowthStage(newSize, selectedFish.growthSprites);

                setSizeOverride(newSize);

                // Dispatch event to update ONLY the selected fish's size in canvas
                // Use selectedFishId (instance ID) not selectedFish.id (creature ID)
                if (selectedFishId) {
                  window.dispatchEvent(new CustomEvent('updateFishSize', {
                    detail: { fishId: selectedFishId, size: newSize }
                  }));
                }

                // Log growth stage changes (sprite swap is handled by updateFishSize event)
                if (oldGrowthStage !== newGrowthStage) {
                  console.log(`[Growth] Size slider crossed growth stage: ${oldGrowthStage} -> ${newGrowthStage} (size: ${oldSize} -> ${newSize})`);
                } else if (oldTier !== newTier) {
                  console.log(`[Mipmap] Size slider crossed threshold: ${oldTier} -> ${newTier} (size: ${oldSize} -> ${newSize}, screen: ${Math.round(newSize * zoom)}px)`);
                }
              }}
              className="absolute h-48 w-6 cursor-pointer appearance-none bg-transparent
                [writing-mode:vertical-lr] [direction:rtl]
                [&::-webkit-slider-runnable-track]:w-2 [&::-webkit-slider-runnable-track]:h-full 
                [&::-webkit-slider-runnable-track]:bg-gray-700 [&::-webkit-slider-runnable-track]:rounded-full
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                [&::-moz-range-track]:w-2 [&::-moz-range-track]:h-full 
                [&::-moz-range-track]:bg-gray-700 [&::-moz-range-track]:rounded-full
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
                [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 
                [&::-moz-range-thumb]:border-white"
              title={`Fish size: ${sizeOverride ?? selectedFish.stats?.size ?? 60}px`}
            />
          </div>

          {/* Size Value */}
          <div className="text-sm text-white font-mono">
            {sizeOverride ?? selectedFish.stats?.size ?? 60}
          </div>

          {/* Screen Size (calculated) */}
          <div className="text-xs text-gray-500 text-center">
            <div>screen:</div>
            <div className="text-cyan-400 font-mono">
              {Math.round((sizeOverride ?? selectedFish.stats?.size ?? 60) * zoom)}px
            </div>
          </div>

          {/* Resolution indicator */}
          <div className="text-xs text-center">
            <div className="text-gray-500">mipmap:</div>
            <div className={`font-bold ${(sizeOverride ?? selectedFish.stats?.size ?? 60) * zoom >= SPRITE_RESOLUTION_THRESHOLDS.HIGH
              ? 'text-green-400'
              : (sizeOverride ?? selectedFish.stats?.size ?? 60) * zoom >= SPRITE_RESOLUTION_THRESHOLDS.MEDIUM
                ? 'text-yellow-400'
                : 'text-red-400'
              }`}>
              {(sizeOverride ?? selectedFish.stats?.size ?? 60) * zoom >= SPRITE_RESOLUTION_THRESHOLDS.HIGH
                ? 'HIGH'
                : (sizeOverride ?? selectedFish.stats?.size ?? 60) * zoom >= SPRITE_RESOLUTION_THRESHOLDS.MEDIUM
                  ? 'MED'
                  : 'LOW'}
            </div>
          </div>

          {/* Mipmap Debug Toggle */}
          <button
            onClick={() => {
              const newState = !mipmapDebug;
              setMipmapDebugState(newState);
              setMipmapDebug(newState);
            }}
            className={`text-xs px-2 py-1 rounded transition-colors ${mipmapDebug
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            title="Toggle mipmap debug logging in console"
          >
            {mipmapDebug ? 'DEBUG' : 'debug'}
          </button>

          {/* Divider */}
          <div className="w-full border-t border-gray-600 my-1"></div>

          {/* Growth Stage Section */}
          <div className="text-xs text-gray-400 font-medium">GROWTH</div>

          {/* Current Growth Stage */}
          <div className="text-xs text-center">
            <div className="text-gray-500">stage:</div>
            <div className={`font-bold ${getGrowthStage(sizeOverride ?? selectedFish.stats?.size ?? 60, selectedFish.growthSprites) === 'juvenile'
              ? 'text-blue-400'
              : getGrowthStage(sizeOverride ?? selectedFish.stats?.size ?? 60, selectedFish.growthSprites) === 'elder'
                ? 'text-purple-400'
                : 'text-green-400'
              }`}>
              {getGrowthStage(sizeOverride ?? selectedFish.stats?.size ?? 60, selectedFish.growthSprites).toUpperCase()}
            </div>
          </div>

          {/* Growth Sprite Status */}
          <div className="text-xs text-center space-y-1">
            <div className={`${selectedFish.growthSprites?.juvenile ? 'text-green-400' : 'text-gray-600'}`}>
              {selectedFish.growthSprites?.juvenile ? '✓' : '○'} juvenile
            </div>
            <div className="text-green-400">✓ adult</div>
            <div className={`${selectedFish.growthSprites?.elder ? 'text-green-400' : 'text-gray-600'}`}>
              {selectedFish.growthSprites?.elder ? '✓' : '○'} elder
            </div>
          </div>

          {/* Generate Growth Sprites Button */}
          <button
            onClick={handleGenerateGrowthSprites}
            disabled={isGeneratingGrowth}
            className={`text-xs px-2 py-1 rounded transition-colors ${isGeneratingGrowth
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-500'
              }`}
            title="Generate juvenile and elder sprite variants"
          >
            {isGeneratingGrowth ? '...' : 'GEN'}
          </button>

          {/* Growth Generation Status */}
          {growthGenerationStatus && (
            <div className="text-xs text-center text-yellow-400 max-w-full break-words">
              {growthGenerationStatus}
            </div>
          )}

          {/* Growth Debug Toggle */}
          <button
            onClick={() => {
              const newState = !growthDebug;
              setGrowthDebugState(newState);
              setGrowthDebug(newState);
            }}
            className={`text-xs px-2 py-1 rounded transition-colors ${growthDebug
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            title="Toggle growth stage debug logging in console"
          >
            {growthDebug ? 'DEBUG' : 'debug'}
          </button>
        </div>
      )}

      {/* Art Selector Modal - Rendered at page level */}
      {showArtSelector && (
        <ArtSelectorPanel
          type={artSelectorType}
          onSelect={handleArtSelect}
          onCancel={handleArtSelectorCancel}
        />
      )}
    </div>
  );
}
