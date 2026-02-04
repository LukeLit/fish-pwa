/**
 * Game Canvas - Uses the same rendering as Fish Editor for consistency
 * Now integrated with Run State Management System
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import FishEditorCanvas, { type PlayerGameStats } from './FishEditorCanvas';
import GameControls from './GameControls';
import PauseMenu from './PauseMenu';
import SettingsDrawer from './SettingsDrawer';
import { type FishData } from './FishEditOverlay';
import type { RunState, Creature } from '@/lib/game/types';
import {
  loadRunState,
  saveRunState,
  createNewRunState,
  clearRunState,
  updateFishState,
  updateRunStats,
} from '@/lib/game/run-state';
import { DEFAULT_STARTER_FISH_ID } from '@/lib/game/data';
import { loadCreatureById, loadCreaturesByBiome } from '@/lib/game/data/creature-loader';
import { computeEncounterSize } from '@/lib/game/spawn-fish';
import { getSpriteUrlForSize } from '@/lib/rendering/fish-renderer';

interface GameCanvasProps {
  onGameEnd?: (score: number, essence: number) => void;
  onGameOver?: (stats: { score: number; cause: 'starved' | 'eaten'; size: number; fishEaten: number; essenceCollected: number; timeSurvived: number }) => void;
  onLevelComplete?: () => void;
}

export default function GameCanvas({ onGameEnd, onGameOver, onLevelComplete }: GameCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  const [runState, setRunState] = useState<RunState | null>(null);

  // Game state - using simplified state for now
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [playerCreature, setPlayerCreature] = useState<Creature | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Array<Creature & { creatureId?: string }>>([]);
  const [levelDuration, setLevelDuration] = useState<number>(60000);
  const [currentLevel, setCurrentLevel] = useState<string>('1-1');

  // Pause menu state
  const [paused, setPaused] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerGameStats | null>(null);
  const [playerFishData, setPlayerFishData] = useState<FishData | null>(null);
  const [fishData, setFishData] = useState<Map<string, FishData>>(new Map());
  const [selectedFish, setSelectedFish] = useState<FishData | null>(null);

  // Dash state from mobile GameControls (passed to FishEditorCanvas)
  const dashFromControlsRef = useRef(false);
  const [autoDashEnabled, setAutoDashEnabled] = useState(false);

  // Close pause menu and reset state
  const handleClosePauseMenu = useCallback(() => {
    setPaused(false);
    setSelectedFish(null);
  }, []);

  // Handle Escape key for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaused(prev => {
          if (prev) {
            // Was paused, now unpausing - reset selection
            setSelectedFish(null);
          }
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle stats update from canvas - persist size, sprite (growth-stage), and stats to run state
  const handleStatsUpdate = useCallback((stats: PlayerGameStats) => {
    setPlayerStats(stats);
    const rs = loadRunState();
    if (!rs) return;
    const spriteUrl = playerCreature ? getSpriteUrlForSize(playerCreature, stats.size) : rs.fishState.sprite;
    let updated = updateFishState(rs, { size: stats.size, sprite: spriteUrl });
    updated = updateRunStats(updated, { fishEaten: stats.fishEaten, timeSurvived: stats.timeSurvived });
    saveRunState(updated);
    setRunState(updated);
  }, [playerCreature]);

  // Load fish library for pause menu
  useEffect(() => {
    const loadFishLibrary = async () => {
      try {
        const response = await fetch('/api/list-creatures');
        const result = await response.json();
        if (result.success && result.creatures) {
          const newFishData = new Map<string, FishData>();
          (result.creatures as FishData[]).forEach((creature) => {
            newFishData.set(creature.id, creature);
          });
          setFishData(newFishData);
        }
      } catch (err) {
        console.error('Failed to load fish library:', err);
      }
    };
    loadFishLibrary();
  }, []);

  useEffect(() => {
    setIsClient(true);

    // Initialize or load run state
    const initializeRunState = () => {
      let currentRunState = loadRunState();

      if (!currentRunState) {
        // No existing run, create new one with default starter fish
        currentRunState = createNewRunState(DEFAULT_STARTER_FISH_ID);
        if (!currentRunState) {
          console.error(`Failed to create new run state with fish ID: ${DEFAULT_STARTER_FISH_ID}`);
          return null;
        }
        saveRunState(currentRunState);
      }

      setRunState(currentRunState);
      return currentRunState;
    };

    // Load assets based on run state
    const loadGameAssets = async (currentRunState: RunState) => {
      try {
        // Parse level to get difficulty scaling
        const level = parseLevelString(currentRunState.currentLevel);
        setCurrentLevel(currentRunState.currentLevel);

        // Calculate level-based difficulty
        const duration = 60000 + (level.levelNum - 1) * 15000; // 60s, 75s, 90s
        const fishCount = 24 + (level.levelNum - 1) * 5; // 24, 29, 34 more fish for larger world
        setLevelDuration(duration);

        // Load background
        const bgResponse = await fetch('/api/list-assets?type=background');
        const bgData = await bgResponse.json();
        if (bgData.success && bgData.assets.length > 0) {
          const randomBg = bgData.assets[Math.floor(Math.random() * bgData.assets.length)];
          setSelectedBackground(randomBg.url);
        }

        // Determine which fish ID to use for the player:
        // - Prefer the fish selected in FishSelectionScreen (sessionStorage)
        // - Fall back to the run state's selectedFishId
        let selectedFishId = currentRunState.selectedFishId;
        if (typeof window !== 'undefined') {
          const sessionSelected = sessionStorage.getItem('selected_fish_id');
          if (sessionSelected) {
            selectedFishId = sessionSelected;
          }
        }

        // Load the player creature via the shared creature loader
        let playerSprite: string | null = null;
        const requestedCreature = await loadCreatureById(selectedFishId);
        const fallbackCreature =
          requestedCreature || (selectedFishId !== DEFAULT_STARTER_FISH_ID
            ? await loadCreatureById(DEFAULT_STARTER_FISH_ID)
            : null);
        const playerCreatureData = requestedCreature || fallbackCreature;

        if (playerCreatureData?.sprite) {
          playerSprite = playerCreatureData.sprite;

          // Debug: Check if growthSprites exist
          console.log(
            `[GameCanvas] Loaded player creature: ${playerCreatureData.id}, hasGrowthSprites:`,
            !!playerCreatureData.growthSprites,
            playerCreatureData.growthSprites ? Object.keys(playerCreatureData.growthSprites) : 'none'
          );

          // Store full creature for clip state machine
          setPlayerCreature(playerCreatureData);

          // Set player fish data for pause menu
          setPlayerFishData({
            id: playerCreatureData.id,
            name: playerCreatureData.name,
            description: playerCreatureData.description || '',
            type: playerCreatureData.type,
            stats: playerCreatureData.stats,
            sprite: playerCreatureData.sprite,
            rarity: playerCreatureData.rarity,
            playable: playerCreatureData.playable,
            biomeId: playerCreatureData.biomeId,
          });

          // Preserve existing fishState (e.g. size from previous level); only update creature-derived fields
          // Sprite must match current size (growth-stage) so EvolutionScreen and others show correct stage
          const spriteUrl = getSpriteUrlForSize(playerCreatureData, currentRunState.fishState.size);
          const updatedRunState: RunState = {
            ...currentRunState,
            selectedFishId,
            fishState: {
              ...currentRunState.fishState,
              speed: playerCreatureData.stats.speed,
              health: playerCreatureData.stats.health,
              damage: playerCreatureData.stats.damage,
              sprite: spriteUrl,
            },
          };
          setRunState(updatedRunState);
          saveRunState(updatedRunState);
        }

        // Last resort: use whatever sprite is already in run state
        if (!playerSprite) {
          playerSprite = currentRunState.fishState.sprite;
        }

        setPlayerFishSprite(playerSprite);

        // Spawn fish based on current level using blob-backed creature definitions
        // TODO: Dynamically determine biome based on current level/run state
        // For now, using 'shallow' as the default starter biome
        const biomeCreatures = await loadCreaturesByBiome('shallow');
        if (biomeCreatures.length > 0) {
          // Separate creatures by type
          const preyCreatures = biomeCreatures.filter(c => c.type === 'prey');
          const predatorCreatures = biomeCreatures.filter(c => c.type === 'predator');

          const spawned: Creature[] = [];
          let spawnIndex = 0;

          // Always spawn 1-2 apex predators (scales with level)
          const apexCount = Math.min(1 + Math.floor((level.levelNum - 1) / 2), 3);
          const apexPool = predatorCreatures.length > 0 ? predatorCreatures : [];

          for (let i = 0; i < apexCount && i < apexPool.length; i++) {
            const creature = apexPool[i % apexPool.length];
            const encounterSize = computeEncounterSize({
              creature,
              biomeId: creature.biomeId,
              levelNumber: level.levelNum,
            });
            spawned.push({
              ...creature,
              id: `${creature.id}_inst_${spawnIndex++}`,
              creatureId: creature.id,
              stats: { ...creature.stats, size: encounterSize },
            } as Creature & { creatureId: string });
          }

          // Fill remaining slots with prey (varied sizes)
          const preyPool = preyCreatures.length > 0 ? preyCreatures : biomeCreatures;
          const remainingSlots = fishCount - spawned.length;

          for (let i = 0; i < remainingSlots; i++) {
            const creature = preyPool[i % preyPool.length];
            // Every 3rd prey is extra small (easy first targets)
            const isSmallPrey = i % 3 === 0;
            const encounterSize = computeEncounterSize({
              creature,
              biomeId: creature.biomeId,
              levelNumber: level.levelNum,
              forceSmall: isSmallPrey,
            });
            spawned.push({
              ...creature,
              id: `${creature.id}_inst_${spawnIndex++}`,
              creatureId: creature.id,
              stats: { ...creature.stats, size: encounterSize },
            } as Creature & { creatureId: string });
          }

          setSpawnedFish(spawned);
        }
      } catch (error) {
        console.error('Failed to load game assets:', error);
      }
    };

    // Helper to parse level string (e.g., "1-1" -> {biome: 1, levelNum: 1})
    const parseLevelString = (levelStr: string): { biome: number; levelNum: number } => {
      const parts = levelStr.split('-');
      if (parts.length !== 2) {
        return { biome: 1, levelNum: 1 };
      }
      return {
        biome: parseInt(parts[0], 10) || 1,
        levelNum: parseInt(parts[1], 10) || 1,
      };
    };

    const currentRunState = initializeRunState();
    if (currentRunState) {
      loadGameAssets(currentRunState);
    }
  }, []);

  // Handlers for pause menu - must be before early return to maintain hook order
  const handleSelectFish = useCallback((fish: FishData) => {
    setSelectedFish(fish);
    // Also update fishData if not already present
    if (fish && !fishData.has(fish.id)) {
      setFishData(prev => {
        const newMap = new Map(prev);
        newMap.set(fish.id, fish);
        return newMap;
      });
    }
  }, [fishData]);

  const handleSaveFish = useCallback((fish: FishData) => {
    setFishData(prev => {
      const newMap = new Map(prev);
      newMap.set(fish.id, fish);
      return newMap;
    });
    // If saving the player fish, update the sprite
    if (playerFishData && fish.id === playerFishData.id) {
      setPlayerFishSprite(fish.sprite);
      setPlayerFishData(fish);
    }
  }, [playerFishData]);

  const handleAddNewCreature = useCallback(() => {
    const newId = `creature_${Date.now()}`;
    const newFish: FishData = {
      id: newId,
      name: 'New Creature',
      description: 'A newly created creature',
      type: 'prey',
      stats: { size: 60, speed: 5, health: 20, damage: 5 },
      sprite: '',
      rarity: 'common',
      playable: false,
      biomeId: 'shallow',
    };
    setFishData(prev => {
      const newMap = new Map(prev);
      newMap.set(newId, newFish);
      return newMap;
    });
    setSelectedFish(newFish);
  }, []);

  const handleSetPlayer = useCallback((fish: FishData) => {
    if (fish.sprite) {
      setPlayerFishSprite(fish.sprite);
      setPlayerFishData(fish);
    }
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black" style={{ minHeight: '600px' }}>
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Level Display */}
      <div className="absolute top-4 left-4 z-40 bg-black/70 px-4 py-2 rounded-lg border border-cyan-400">
        <div className="text-cyan-400 font-bold text-lg">Level {currentLevel}</div>
      </div>

      {/* Pause Button - offset right to make room for settings menu button */}
      <div className="absolute top-4 right-16 z-40 flex gap-2">
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

      {/* Settings Menu - Rendered at page level to avoid stacking context issues */}
      <SettingsDrawer mode="game" />

      {/* Mobile controls: joystick + dash button */}
      {!paused && (
        <GameControls
          onMove={() => { }}
          onDash={(dashing) => {
            dashFromControlsRef.current = dashing;
          }}
          autoDashEnabled={autoDashEnabled}
          onAutoDashToggle={setAutoDashEnabled}
        />
      )}

      <FishEditorCanvas
        background={selectedBackground}
        playerFishSprite={playerFishSprite}
        playerCreature={playerCreature || undefined}
        spawnedFish={spawnedFish}
        fishData={fishData}
        chromaTolerance={50}
        zoom={1}
        enableWaterDistortion={false}
        deformationIntensity={1}
        gameMode={true}
        levelDuration={levelDuration}
        paused={paused}
        dashFromControlsRef={dashFromControlsRef}
        onStatsUpdate={handleStatsUpdate}
        onGameOver={(stats) => {
          clearRunState();
          if (onGameOver) {
            onGameOver(stats);
          }
        }}
        onLevelComplete={(score, finalStats) => {
          // Merge final stats and growth-stage sprite into run state
          let rs = loadRunState();
          if (rs && finalStats) {
            const spriteUrl = playerCreature ? getSpriteUrlForSize(playerCreature, finalStats.size) : rs.fishState.sprite;
            rs = updateFishState(rs, { size: finalStats.size, sprite: spriteUrl });
            rs = updateRunStats(rs, { fishEaten: finalStats.fishEaten, timeSurvived: finalStats.timeSurvived });
            saveRunState(rs);
            setRunState(rs);
          } else if (runState) {
            saveRunState(runState);
          }
          if (onLevelComplete) {
            onLevelComplete();
          } else if (onGameEnd) {
            onGameEnd(score, 0);
          }
        }}
      />

      {/* Pause Menu */}
      <PauseMenu
        isOpen={paused}
        onClose={handleClosePauseMenu}
        mode="game"
        playerFish={playerFishData}
        playerStats={playerStats || undefined}
        creatures={fishData}
        selectedFish={selectedFish}
        onSelectFish={handleSelectFish}
        onSaveFish={handleSaveFish}
        onAddNewCreature={handleAddNewCreature}
        onSetPlayer={handleSetPlayer}
        spawnedFishIds={spawnedFish.map(f => f.id)}
      />
    </div>
  );
}
