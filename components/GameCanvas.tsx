/**
 * Game Canvas - Uses the same rendering as Fish Editor for consistency
 * Now integrated with Run State Management System
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import FishEditorCanvas, { type PlayerGameStats } from './FishEditorCanvas';
import { DashButton } from './GameControls';
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
import { loadCreatureById } from '@/lib/game/data/creature-loader';
import { createLevel } from '@/lib/game/create-level';
import { getLevelIdFromDepthBandId, inferActConfigIdFromDepthBand, getActConfig, isBandShallowerThan } from '@/lib/game/data/level-loader';
import { getObjectivesForBand } from '@/lib/game/objectives';
import LevelObjectivesPanel from './LevelObjectivesPanel';
import { getSpriteUrlForSize } from '@/lib/rendering/fish-renderer';
import { ART, CAMERA } from '@/lib/game/canvas-constants';
import type { CheatSizeStage } from './SettingsDrawer';
import LevelIntroOverlay from './LevelIntroOverlay';
import LevelCompleteOverlay from './LevelCompleteOverlay';

interface GameCanvasProps {
  onGameEnd?: (score: number, essence: number) => void;
  onGameOver?: (stats: { score: number; cause: 'starved' | 'eaten'; size: number; fishEaten: number; essenceCollected: number; timeSurvived: number }) => void;
  onLevelComplete?: () => void;
  /** Called when actively playing a level (not paused, no overlays). Used to disable gamepad virtual cursor. */
  onGameplayActiveChange?: (active: boolean) => void;
}

export default function GameCanvas({ onGameEnd, onGameOver, onLevelComplete, onGameplayActiveChange }: GameCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  const [runState, setRunState] = useState<RunState | null>(null);

  // Game state - using simplified state for now
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [playerCreature, setPlayerCreature] = useState<Creature | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Array<Creature & { creatureId?: string }>>([]);
  const [currentLevel, setCurrentLevel] = useState<string>('1-1');

  // Pause: game pauses when either settings drawer or pause menu is open
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const paused = settingsDrawerOpen || showPauseMenu;

  const [showDepthBandOverlay, setShowDepthBandOverlay] = useState(true);
  const [showHitboxDebug, setShowHitboxDebug] = useState(false);
  const [showVignette, setShowVignette] = useState(true);
  const [showParticles, setShowParticles] = useState(true);

  /** True until player + fish sprites are loaded; then canvas calls onReadyToPlay. */
  const [loading, setLoading] = useState(true);

  /** Level intro splash (Sonic-style); shown for 1.5s when level starts */
  const [showLevelIntro, setShowLevelIntro] = useState(true);

  /** Level complete overlay during slowdown (1.5s before DigestionScreen) */
  const [showLevelCompleteOverlay, setShowLevelCompleteOverlay] = useState(false);

  /** Intro zoom progress 0→1 over INTRO_DURATION_MS; drives zoom from INTRO_ZOOM to GAMEPLAY_ZOOM */
  const [introZoomProgress, setIntroZoomProgress] = useState(0);

  const [playerStats, setPlayerStats] = useState<PlayerGameStats | null>(null);
  const [playerFishData, setPlayerFishData] = useState<FishData | null>(null);
  const [fishData, setFishData] = useState<Map<string, FishData>>(new Map());
  const [selectedFish, setSelectedFish] = useState<FishData | null>(null);

  // Dash state from mobile GameControls (passed to FishEditorCanvas)
  const dashFromControlsRef = useRef(false);

  // Close pause menu and reset state
  const handleClosePauseMenu = useCallback(() => {
    setShowPauseMenu(false);
    setSelectedFish(null);
  }, []);

  // Handle Escape key for pause menu (SettingsDrawer handles its own Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPauseMenu(prev => {
          if (prev) setSelectedFish(null);
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Report when actively playing (for gamepad virtual cursor - disable during level)
  const inActiveLevel = !loading && !showLevelIntro && !showLevelCompleteOverlay && !paused;
  useEffect(() => {
    onGameplayActiveChange?.(inActiveLevel);
    return () => onGameplayActiveChange?.(false);
  }, [inActiveLevel, onGameplayActiveChange]);

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
        setCurrentLevel(currentRunState.currentLevel);

        // Load background
        const bgResponse = await fetch('/api/list-assets?type=background');
        const bgData = await bgResponse.json();
        const assets = bgData.assets ?? bgData.backgrounds ?? [];
        if (bgData.success && assets.length > 0) {
          const randomBg = assets[Math.floor(Math.random() * assets.length)];
          setSelectedBackground(randomBg.url);
        } else {
          // Static fallback when no blob backgrounds exist
          setSelectedBackground('/backgrounds/shallow.svg');
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

        // Spawn fish: only include bands at current depth or deeper (no shallow fish when continuing)
        const biomeId = 'shallow'; // TODO: from run state when we support multiple biomes
        const bands = currentRunState.unlockedDepthBands ?? [currentRunState.currentLevel];
        const spawnList: Array<Creature & { id: string; creatureId?: string; depthBandId?: string }> = [];
        for (const bandId of bands) {
          if (isBandShallowerThan(bandId, currentRunState.currentLevel)) continue;
          const levelId = getLevelIdFromDepthBandId(bandId);
          const result = await createLevel(biomeId, levelId);
          for (const fish of result.spawnList) {
            spawnList.push({ ...fish, id: `${fish.id}_${bandId}`, depthBandId: bandId });
          }
          loadedBandsRef.current.add(bandId);
        }
        setSpawnedFish(spawnList);
      } catch (error) {
        console.error('Failed to load game assets:', error);
        // Ensure background fallback even on error
        setSelectedBackground((prev) => prev ?? '/backgrounds/shallow.svg');
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

  const loadedBandsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handleRunStateUpdated = async () => {
      const rs = loadRunState();
      if (!rs) return;

      setRunState(rs);
      setCurrentLevel(rs.currentLevel);
      setShowLevelIntro(true); // Show intro when transitioning to new level

      const bands = rs.unlockedDepthBands ?? [rs.currentLevel];
      const newBands = bands.filter((b) => !loadedBandsRef.current.has(b));
      if (newBands.length === 0) return;

      const biomeId = 'shallow';
      const newFish: Array<Creature & { id: string; creatureId?: string; depthBandId?: string }> = [];
      for (const bandId of newBands) {
        const levelId = getLevelIdFromDepthBandId(bandId);
        const result = await createLevel(biomeId, levelId);
        for (const fish of result.spawnList) {
          newFish.push({ ...fish, id: `${fish.id}_${bandId}`, depthBandId: bandId });
        }
        loadedBandsRef.current.add(bandId);
      }
      setSpawnedFish((prev) => {
        const filtered = prev.filter((f) => {
          const band = (f as { depthBandId?: string }).depthBandId;
          return band == null || !isBandShallowerThan(band, rs.currentLevel);
        });
        return [...filtered, ...newFish];
      });
    };

    window.addEventListener('runStateUpdated', handleRunStateUpdated);
    return () => window.removeEventListener('runStateUpdated', handleRunStateUpdated);
  }, []);

  // Intro zoom animation: start zoomed out, pan in on fish during intro
  const introStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!showLevelIntro) {
      introStartTimeRef.current = null;
      setIntroZoomProgress(1); // Ensure we end at full zoom when intro hidden
      return;
    }
    introStartTimeRef.current = performance.now();
    let rafId: number;

    const tick = () => {
      const start = introStartTimeRef.current;
      if (start == null) return;
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / CAMERA.INTRO_DURATION_MS);
      setIntroZoomProgress(progress);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [showLevelIntro]);

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

  // Cheat: skip to a depth band level
  const handleCheatLevel = useCallback(async (depthBandId: string) => {
    const rs = loadRunState();
    if (!rs) return;
    const actConfigId = inferActConfigIdFromDepthBand(depthBandId);
    const updated = {
      ...rs,
      actConfigId,
      currentLevel: depthBandId,
      unlockedDepthBands: [depthBandId],
    };
    saveRunState(updated);
    setRunState(updated);
    setCurrentLevel(depthBandId);
    const biomeId = 'shallow';
    const levelId = getLevelIdFromDepthBandId(depthBandId);
    const result = await createLevel(biomeId, levelId);
    const spawnList = result.spawnList.map((f) => ({ ...f, id: `${f.id}_${depthBandId}`, depthBandId }));
    setSpawnedFish(spawnList);
    loadedBandsRef.current.clear();
    loadedBandsRef.current.add(depthBandId);
  }, []);

  // Cheat: set player size to a growth stage (juvenile / adult / elder)
  const handleCheatSize = useCallback((stage: CheatSizeStage) => {
    const sizes: Record<CheatSizeStage, number> = {
      juvenile: 50,
      adult: 150,
      elder: 250,
    };
    const size = Math.max(ART.SIZE_MIN, Math.min(ART.SIZE_MAX, sizes[stage]));
    const rs = loadRunState();
    if (!rs) return;
    const spriteUrl = playerCreature ? getSpriteUrlForSize(playerCreature, size) : rs.fishState.sprite;
    const updated = updateFishState(rs, { size, sprite: spriteUrl });
    saveRunState(updated);
    setRunState(updated);
  }, [playerCreature]);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black" style={{ minHeight: '600px' }}>
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${inActiveLevel ? 'cursor-none' : ''}`}>
      {/* Loading overlay: spawn + art load before game starts */}
      {loading && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 transition-opacity"
          aria-busy
          aria-label="Loading game"
        >
          <div
            className="w-12 h-12 border-4 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin"
            role="status"
          />
          <p className="mt-4 text-cyan-200 text-lg font-medium">Preparing ocean...</p>
          <p className="mt-1 text-cyan-400/80 text-sm">Loading fish and art</p>
        </div>
      )}

      {/* Level Intro Overlay (1.5s at level start) */}
      {!loading && showLevelIntro && runState && (
        <LevelIntroOverlay
          levelName={getActConfig(runState.actConfigId ?? 'shallow_act')?.name ?? 'Level'}
          levelLabel={currentLevel}
          stepIndex={(getActConfig(runState.actConfigId ?? 'shallow_act')?.steps ?? [currentLevel]).indexOf(currentLevel) + 1 || 1}
          totalSteps={(getActConfig(runState.actConfigId ?? 'shallow_act')?.steps ?? [currentLevel]).length || 1}
          onComplete={() => setShowLevelIntro(false)}
          objectives={getObjectivesForBand(currentLevel)}
          showDepthPrompt={currentLevel !== '1-1'}
        />
      )}

      {/* Level Complete Overlay (during 1.5s slowdown) */}
      {showLevelCompleteOverlay && runState && (
        <LevelCompleteOverlay
          levelName={getActConfig(runState.actConfigId ?? 'shallow_act')?.name ?? 'Level'}
          stepIndex={(getActConfig(runState.actConfigId ?? 'shallow_act')?.steps ?? [currentLevel]).indexOf(currentLevel) + 1 || 1}
          totalSteps={(getActConfig(runState.actConfigId ?? 'shallow_act')?.steps ?? [currentLevel]).length || 1}
        />
      )}

      {/* Level + Objectives + Timer Panel */}
      <LevelObjectivesPanel
        levelLabel={currentLevel}
        objectives={getObjectivesForBand(currentLevel)}
        progress={
          playerStats && runState
            ? {
              playerSize: playerStats.size,
              fishEaten: playerStats.fishEaten,
              preyEaten: playerStats.preyEaten ?? 0,
              predatorsEaten: playerStats.predatorsEaten ?? 0,
              essenceCollected: runState.collectedEssence,
            }
            : undefined
        }
        elapsedSeconds={playerStats?.timeSurvived ?? 0}
        actName={getActConfig(runState?.actConfigId ?? 'shallow_act')?.name}
        showProgress={true}
      />

      {/* HUD: Pause button (z-40 above AnalogJoystick overlay) */}
      <div className="absolute top-4 right-16 z-40 flex gap-2 items-center">
        <button
          onClick={() => showPauseMenu ? handleClosePauseMenu() : setShowPauseMenu(true)}
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

      {/* Dash button - bottom right, z-40 above AnalogJoystick overlay so it stays clickable */}
      {!paused && (
        <div className="absolute bottom-6 right-6 z-40">
          <DashButton
            onDash={(dashing) => {
              dashFromControlsRef.current = dashing;
            }}
          />
        </div>
      )}

      {/* Settings Menu - Pauses game when open (no pause overlay) */}
      <SettingsDrawer
        mode="game"
        onOpenChange={setSettingsDrawerOpen}
        showDepthBandOverlay={showDepthBandOverlay}
        onDepthBandOverlayChange={setShowDepthBandOverlay}
        showHitboxDebug={showHitboxDebug}
        onShowHitboxDebugChange={setShowHitboxDebug}
        showVignette={showVignette}
        onVignetteChange={setShowVignette}
        showParticles={showParticles}
        onParticlesChange={setShowParticles}
        currentLevel={currentLevel}
        onCheatLevel={handleCheatLevel}
        onCheatSize={handleCheatSize}
      />

      <FishEditorCanvas
        background={selectedBackground}
        playerFishSprite={playerFishSprite}
        playerCreature={playerCreature || undefined}
        spawnedFish={spawnedFish}
        fishData={fishData}
        chromaTolerance={50}
        zoom={
          showLevelIntro
            ? CAMERA.INTRO_ZOOM + (CAMERA.GAMEPLAY_ZOOM - CAMERA.INTRO_ZOOM) * introZoomProgress
            : CAMERA.GAMEPLAY_ZOOM
        }
        enableWaterDistortion={false}
        deformationIntensity={1}
        showDepthBandOverlay={showDepthBandOverlay}
        showHitboxDebug={showHitboxDebug}
        showEditButtons={false}
        showVignette={showVignette}
        showParticles={showParticles}
        runId={runState?.actConfigId ?? 'shallow_act'}
        currentLevel={runState?.currentLevel ?? '1-1'}
        unlockedDepthBands={runState?.unlockedDepthBands}
        gameMode={true}
        loading={loading}
        onReadyToPlay={() => setLoading(false)}
        onLevelCompletePhaseStart={() => setShowLevelCompleteOverlay(true)}
        paused={paused}
        dashFromControlsRef={dashFromControlsRef}
        gamepadZoomEnabled={inActiveLevel}
        syncedPlayerSize={runState?.fishState.size}
        onStatsUpdate={handleStatsUpdate}
        onGameOver={(stats) => {
          clearRunState();
          if (onGameOver) {
            onGameOver(stats);
          }
        }}
        onLevelComplete={(score, finalStats) => {
          setShowLevelCompleteOverlay(false);
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
        isOpen={showPauseMenu}
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
