/**
 * Fish Editor - Live testing environment for AI-generated assets
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FishEditorCanvas from '@/components/FishEditorCanvas';
import FishEditorControls from '@/components/FishEditorControls';
import FishEditOverlay, { type FishData } from '@/components/FishEditOverlay';
import FishLibraryPanel from '@/components/FishLibraryPanel';
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
  const [activeTab, setActiveTab] = useState<'controls' | 'library'>('controls');

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
        const bgResponse = await fetch('/api/list-assets?type=background');
        const bgData = await bgResponse.json();
        if (bgData.success && bgData.assets.length > 0) {
          const randomBg = bgData.assets[Math.floor(Math.random() * bgData.assets.length)];
          setSelectedBackground(randomBg.url);
        }

        const fishResponse = await fetch('/api/list-assets?type=fish');
        const fishData = await fishResponse.json();
        if (fishData.success && fishData.assets.length > 0) {
          const assets = fishData.assets as Array<{ filename: string; url: string }>;
          const randomFish = assets[Math.floor(Math.random() * assets.length)];
          setPlayerFishSprite(randomFish.url);

          const preyCandidates = assets.filter((a) =>
            a.filename.toLowerCase().includes('prey')
          );
          const pool = preyCandidates.length >= 4 ? preyCandidates : assets;
          const defaults = [];
          const newFishData = new Map<string, FishData>();
          for (let i = 0; i < 4; i++) {
            const pick = pool[i % pool.length];
            const newId = `default_prey_${Date.now()}_${i}`;
            defaults.push({
              id: newId,
              sprite: pick.url,
              type: 'prey' as const,
            });
            
            // Initialize fish data
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
              sprite: pick.url,
            });
          }
          setSpawnedFish(defaults);
          setFishData(newFishData);
        } else {
          // No saved fish: spawn 4 default prey (simple green oval) for testing
          const fallbackSprite = createDefaultPreyDataUrl();
          const defaults = [];
          const newFishData = new Map<string, FishData>();
          for (let i = 0; i < 4; i++) {
            const newId = `default_prey_${Date.now()}_${i}`;
            defaults.push({
              id: newId,
              sprite: fallbackSprite,
              type: 'prey' as const,
            });
            
            // Initialize fish data
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
          const newFishData = new Map<string, FishData>(fishData);
          
          // Add all creatures to fishData map
          result.creatures.forEach((creature: FishData) => {
            newFishData.set(creature.id, creature);
          });
          
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
    
    // Enter edit mode for this fish
    setSelectedFishId(fish.id);
    setEditMode(true);
  };

  const handleSaveFish = (fish: FishData) => {
    setFishData((prev) => {
      const newMap = new Map(prev);
      newMap.set(fish.id, fish);
      return newMap;
    });
    // Update spawned fish type if changed
    setSpawnedFish((prev) =>
      prev.map((f) => (f.id === fish.id ? { ...f, type: fish.type } : f))
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
        />
      )}

      {/* Bottom Sheet - Controls and Library (hidden in edit mode) */}
      {!editMode && (
        <BottomSheet defaultHeight={30} minHeight={10} maxHeight={90}>
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-700 px-4">
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'controls'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Controls
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'library'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Fish Library
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'controls' && (
                <div className="px-4 pb-4 pt-2">
                  <FishEditorControls
                    onBackToMenu={handleBackToMenu}
                    onSpawnFish={handleSpawnFish}
                    onClearFish={handleClearFish}
                    onSetBackground={setSelectedBackground}
                    onSetPlayerFish={setPlayerFishSprite}
                    spawnedFishCount={spawnedFish.length}
                    chromaTolerance={chromaTolerance}
                    onChromaToleranceChange={setChromaTolerance}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    enableWaterDistortion={enableWaterDistortion}
                    onWaterDistortionChange={setEnableWaterDistortion}
                    deformationIntensity={deformationIntensity}
                    onDeformationChange={setDeformationIntensity}
                  />
                </div>
              )}
              {activeTab === 'library' && (
                <FishLibraryPanel onSelectFish={handleSelectFishFromLibrary} />
              )}
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
