/**
 * Fish Editor - Live testing environment for AI-generated assets
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FishEditorCanvas from '@/components/FishEditorCanvas';
import FishEditOverlay, { type FishData } from '@/components/FishEditOverlay';
import FishLibraryPanel from '@/components/FishLibraryPanel';
import BackgroundEditor from '@/components/BackgroundEditor';
import BackgroundLibraryPanel from '@/components/BackgroundLibraryPanel';
import ArtSelectorPanel from '@/components/ArtSelectorPanel';
import BottomSheet from '@/components/BottomSheet';

export default function FishEditorPage() {
  const router = useRouter();
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Array<{ id: string; sprite: string; type: string }>>([]);
  const [fishData, setFishData] = useState<Map<string, FishData>>(new Map());
  const [chromaTolerance, setChromaTolerance] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(1);
  const [enableWaterDistortion, setEnableWaterDistortion] = useState<boolean>(false);
  const [deformationIntensity, setDeformationIntensity] = useState<number>(1);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedFishId, setSelectedFishId] = useState<string | null>(null);
  const [paused, setPaused] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'scene' | 'library' | 'backgrounds'>('library');
  const [editingBackground, setEditingBackground] = useState<boolean>(false);
  const [selectedBackgroundData, setSelectedBackgroundData] = useState<any>(null);
  const [showArtSelector, setShowArtSelector] = useState(false);
  const [artSelectorType, setArtSelectorType] = useState<'fish' | 'background'>('fish');
  const [artSelectorCallback, setArtSelectorCallback] = useState<((url: string, filename: string) => void) | null>(null);

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

          // If we don't yet have a player sprite, pick one from the loaded creatures
          if (!playerFishSprite) {
            // Prefer a playable creature if available
            const creatures: FishData[] = result.creatures;
            const playable = creatures.find((c) => c.playable && c.sprite);
            const firstWithSprite = creatures.find((c) => c.sprite);
            const chosen = playable || firstWithSprite;
            if (chosen?.sprite) {
              setPlayerFishSprite(chosen.sprite);
            }
          }

          // If nothing is spawned yet, spawn a few prey from the creature list for convenience
          if (spawnedFish.length === 0) {
            const creatures: FishData[] = result.creatures;
            const preyCandidates = creatures.filter((c) => c.type === 'prey' && c.sprite);
            const pool = preyCandidates.length > 0 ? preyCandidates : creatures.filter((c) => c.sprite);
            const defaults: { id: string; sprite: string; type: string }[] = [];

            for (let i = 0; i < Math.min(4, pool.length); i++) {
              const c = pool[i];
              defaults.push({
                id: c.id,
                sprite: c.sprite!,
                type: c.type,
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
  };

  const handleBackToMenu = () => {
    router.push('/');
  };

  const handleEditFish = (fishId: string) => {
    setSelectedFishId(fishId);
    setEditMode(true);
  };

  // Initialize player fish data when player sprite is set
  useEffect(() => {
    if (playerFishSprite && !fishData.has('player')) {
      const playerData: FishData = {
        id: 'player',
        name: 'Player Fish',
        description: 'The main player character.',
        type: 'prey',
        stats: {
          size: 80,
          speed: 5,
          health: 50,
          damage: 10,
        },
        sprite: playerFishSprite,
      };
      setFishData((prev) => {
        const newMap = new Map(prev);
        newMap.set('player', playerData);
        return newMap;
      });
    }
  }, [playerFishSprite, fishData]);

  const handleExitEditMode = () => {
    setEditMode(false);
    setSelectedFishId(null);
  };

  const handleSelectFishFromLibrary = (fish: FishData) => {
    // Add the fish to our local state if not already there
    setFishData((prev) => {
      const newMap = new Map(prev);
      newMap.set(fish.id, fish);
      return newMap;
    });

    // Spawn the fish to canvas if not already spawned
    setSpawnedFish((prev) => {
      const alreadySpawned = prev.some(f => f.id === fish.id);
      if (alreadySpawned) {
        // Update existing spawned fish with latest sprite
        return prev.map(f => f.id === fish.id ? { ...f, sprite: fish.sprite, type: fish.type } : f);
      } else {
        // Spawn new fish
        return [...prev, { id: fish.id, sprite: fish.sprite, type: fish.type }];
      }
    });

    // Enter edit mode for this fish
    setSelectedFishId(fish.id);
    setEditMode(true);
  };

  const handleSetPlayerFish = (fish: FishData) => {
    // Set the player fish sprite
    setPlayerFishSprite(fish.sprite);

    // Update or create player fish data
    setFishData((prev) => {
      const newMap = new Map(prev);
      const playerData: FishData = {
        ...fish,
        id: 'player',
        name: fish.name || 'Player Fish',
        playable: true,
      };
      newMap.set('player', playerData);
      return newMap;
    });
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
  };

  const handleAddNewBackground = () => {
    setEditingBackground(true);
    setSelectedBackgroundData(null);
  };

  const handleSelectBackground = (background: any) => {
    setSelectedBackgroundData(background);
    setEditingBackground(true);
  };

  const handleBackFromBackgroundEdit = () => {
    setEditingBackground(false);
    setSelectedBackgroundData(null);
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
      // If this is the player fish, update playerFishSprite to refresh preview
      if (fish.id === 'player') {
        setPlayerFishSprite(fish.sprite);
      } else {
        // Check if this fish is currently set as player
        const playerData = newMap.get('player');
        if (playerData && playerData.id === fish.id) {
          setPlayerFishSprite(fish.sprite);
        }
      }
      return newMap;
    });
    // Update spawned fish sprite and type if changed
    setSpawnedFish((prev) =>
      prev.map((f) => (f.id === fish.id ? { ...f, sprite: fish.sprite, type: fish.type } : f))
    );
  };

  const handlePreviousFish = () => {
    if (!selectedFishId) return;
    const fishIds = Array.from(fishData.keys()).sort(); // Sort for consistent ordering
    const currentIndex = fishIds.indexOf(selectedFishId);
    if (currentIndex > 0) {
      setSelectedFishId(fishIds[currentIndex - 1]);
    }
  };

  const handleNextFish = () => {
    if (!selectedFishId) return;
    const fishIds = Array.from(fishData.keys()).sort(); // Sort for consistent ordering
    const currentIndex = fishIds.indexOf(selectedFishId);
    if (currentIndex < fishIds.length - 1) {
      setSelectedFishId(fishIds[currentIndex + 1]);
    }
  };

  // Clean up fish data when fish are removed (but preserve player fish)
  useEffect(() => {
    const spawnedIds = new Set(spawnedFish.map((f) => f.id));
    setFishData((prev) => {
      const newMap = new Map();
      prev.forEach((data, id) => {
        // Keep player fish and spawned fish
        if (id === 'player' || spawnedIds.has(id)) {
          newMap.set(id, data);
        }
      });
      return newMap;
    });
  }, [spawnedFish]);

  const selectedFish = selectedFishId ? fishData.get(selectedFishId) || null : null;
  const fishIds = Array.from(fishData.keys()).sort(); // Sort for consistent ordering
  const selectedIndex = selectedFishId ? fishIds.indexOf(selectedFishId) : -1;
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < fishIds.length - 1;

  return (
    <div className="relative w-full h-screen bg-black flex flex-col overflow-hidden">
      {/* Top Right Icon Buttons */}
      <div className="absolute top-4 right-4 z-40 flex gap-2">
        {/* Pause Icon */}
        <button
          onClick={() => setPaused(!paused)}
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

      {/* Canvas - Full screen, but fish will be positioned in top area during edit mode */}
      <div className="flex-1 relative">
        <FishEditorCanvas
          background={selectedBackground}
          playerFishSprite={playerFishSprite}
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
        />
      </div>

      {/* Edit Mode Overlay - Bottom panel (doesn't cover top area) */}
      {editMode && selectedFish && (
        <FishEditOverlay
          fish={selectedFish}
          onSave={handleSaveFish}
          onBack={handleExitEditMode}
          onPrevious={handlePreviousFish}
          onNext={handleNextFish}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onOpenArtSelector={(callback) => handleOpenArtSelector('fish', callback)}
        />
      )}

      {/* Bottom Sheet - Controls and Library (hidden in edit mode) */}
      {!editMode && (
        <BottomSheet defaultHeight={30} minHeight={10} maxHeight={90}>
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-700 px-4">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'library'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Fish
              </button>
              <button
                onClick={() => setActiveTab('backgrounds')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'backgrounds'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Backgrounds
              </button>
              <button
                onClick={() => setActiveTab('scene')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'scene'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                Scene
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'library' && (
                <FishLibraryPanel
                  onSelectFish={handleSelectFishFromLibrary}
                  onAddNew={handleAddNewCreature}
                  onSetPlayer={handleSetPlayerFish}
                  onSpawnFish={(sprite, type) => handleSpawnFish(sprite, type)}
                />
              )}
              {activeTab === 'backgrounds' && !editingBackground && (
                <BackgroundLibraryPanel
                  onSelectBackground={handleSelectBackground}
                  onAddNew={handleAddNewBackground}
                />
              )}
              {activeTab === 'backgrounds' && editingBackground && (
                <div className="h-full overflow-y-auto p-4">
                  <div className="mb-4">
                    <button
                      onClick={handleBackFromBackgroundEdit}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                    >
                      ← Back to Library
                    </button>
                  </div>
                  <BackgroundEditor
                    currentBackground={selectedBackgroundData?.url || selectedBackground}
                    onBackgroundChange={(url, type) => {
                      setSelectedBackground(url);
                    }}
                    onOpenArtSelector={(callback) => handleOpenArtSelector('background', callback)}
                  />
                </div>
              )}
              {activeTab === 'scene' && (
                <div className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    {/* Scene controls header */}
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1">Scene Controls</h2>
                      <p className="text-xs text-gray-400">Adjust canvas display settings</p>
                    </div>

                    {/* Zoom */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Zoom: {zoom.toFixed(1)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Chroma Tolerance */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Background Removal: {chromaTolerance}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="150"
                        value={chromaTolerance}
                        onChange={(e) => setChromaTolerance(parseInt(e.target.value))}
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
                          checked={enableWaterDistortion}
                          onChange={(e) => setEnableWaterDistortion(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-white">Enable Water Distortion</span>
                      </label>
                    </div>

                    {/* Deformation Intensity */}
                    {enableWaterDistortion && (
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">
                          Distortion Intensity: {deformationIntensity.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={deformationIntensity}
                          onChange={(e) => setDeformationIntensity(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Clear fish */}
                    <div className="border-t border-gray-700 pt-4">
                      <button
                        onClick={handleClearFish}
                        className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Clear All Fish ({spawnedFish.length})
                      </button>
                    </div>

                    {/* Back to menu */}
                    <div>
                      <button
                        onClick={handleBackToMenu}
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
        </BottomSheet>
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
