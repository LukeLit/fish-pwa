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
  const [selectedBackgroundData, setSelectedBackgroundData] = useState<any>(null);
  const [showArtSelector, setShowArtSelector] = useState(false);
  const [artSelectorType, setArtSelectorType] = useState<'fish' | 'background'>('fish');
  const [artSelectorCallback, setArtSelectorCallback] = useState<((url: string, filename: string) => void) | null>(null);

  // Handle Escape key for pause toggle - uses callback form to access current state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // When unpausing, reset edit mode too
        setPaused(prev => {
          if (prev) {
            // Was paused, now unpausing - reset edit state
            setEditMode(false);
            setSelectedFishId(null);
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
    setPaused(true); // Open pause menu to show edit UI
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

  // Close pause menu AND reset all edit state
  const handleClosePauseMenu = () => {
    setPaused(false);
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
      {/* Top Right Icon Buttons */}
      <div className="absolute top-4 right-4 z-40 flex gap-2">
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
