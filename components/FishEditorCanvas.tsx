/**
 * Fish Editor Canvas - Playable test environment for AI-generated assets
 * Refactored to use extracted systems for better maintainability
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AnalogJoystick, { type AnalogJoystickOutput } from './AnalogJoystick';
import type { Creature } from '@/lib/game/types';
import { type FishData } from './FishEditOverlay';
import { spawnFishFromData, PLAYER_BASE_SIZE, PLAYER_MAX_SIZE } from '@/lib/game/spawn-fish';
import {
  HUNGER_MAX,
  HUNGER_DRAIN_RATE,
  HUNGER_RESTORE_MULTIPLIER,
  HUNGER_FRAME_RATE,
} from '@/lib/game/hunger-constants';
import {
  DASH_STAMINA_RAMP_PER_SECOND,
  DASH_STAMINA_RAMP_CAP,
  DASH_ATTACK_STAMINA_COST,
  SWALLOW_SIZE_RATIO,
  ATTACK_SIZE_RATIO,
  BATTLE_SIZE_THRESHOLD,
  KO_STAMINA_REGEN_MULTIPLIER,
  KO_WAKE_THRESHOLD,
  KO_DRIFT_SPEED,
  PREY_FLEE_STAMINA_MULTIPLIER,
  ATTACK_LARGER_STAMINA_MULTIPLIER,
} from '@/lib/game/dash-constants';
import { ESSENCE_TYPES } from '@/lib/game/data/essence-types';
import { loadRunState } from '@/lib/game/run-state';
import {
  removeBackground,
  getGrowthStage,
  getGrowthStageSprite,
  getGrowthAwareSpriteUrl,
  getResolutionKey,
  hasUsableAnimations,
  getClipMode,
  getSegmentsSmooth,
  drawFishWithDeformation,
  PLAYER_SEGMENT_MULTIPLIER,
} from '@/lib/rendering/fish-renderer';
import type { SpriteResolutions } from '@/lib/game/types';
import { getAnimationSpriteManager, type AnimationSprite } from '@/lib/rendering/animation-sprite';
import type { CreatureAnimations } from '@/lib/game/types';
import { cacheBust } from '@/lib/utils/cache-bust';

// Extracted systems
import { getCanvasConfig } from '@/lib/game/canvas-config';
import { CAMERA, SPAWN, WORLD_BOUNDS, PHYSICS, AI, COLLISION, ANIMATION, RENDERING, STAMINA, UI } from '@/lib/game/canvas-constants';
import { InputManager } from '@/lib/game/canvas-input';
import { SpriteManager } from '@/lib/game/canvas-sprite-manager';
import { updatePlayerPhysics, constrainToBounds, getAnimationAction } from '@/lib/game/canvas-physics';
import { updateAIFish } from '@/lib/game/canvas-ai';
import { detectFishFishCollisions, detectPlayerFishCollision } from '@/lib/game/canvas-collision';
import { CanvasGameState, type FishEntity, type PlayerEntity, type FishLifecycleState } from '@/lib/game/canvas-state';
import { renderGame } from '@/lib/game/canvas-renderer';
import { tickGameState } from '@/lib/game/canvas-game-loop';
import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';
import { createStaminaUpdater, type StaminaEntity } from '@/lib/game/canvas-stamina';
import { HUNGER_LOW_THRESHOLD, HUNGER_WARNING_PULSE_FREQUENCY, HUNGER_WARNING_PULSE_BASE, HUNGER_WARNING_INTENSITY } from '@/lib/game/hunger-constants';
import { DashParticleSystem } from '@/lib/rendering/dash-particles';
import { MultiEntityDashParticleManager } from '@/lib/rendering/multi-entity-dash-particles';
import { getSpriteUrl } from '@/lib/rendering/fish-renderer';

export interface PlayerGameStats {
  size: number;
  hunger: number;
  score: number;
  fishEaten: number;
  timeSurvived: number;
}

type SpawnedCreature = Creature & { creatureId?: string };

/** Legacy spawn item (id, sprite, type, creatureId) - canvas resolves creature from fishData when needed */
type LegacySpawnItem = { id: string; sprite: string; type: string; creatureId?: string };

interface FishEditorCanvasProps {
  background: string | null;
  playerFishSprite: string | null;
  playerCreature?: Creature; // Full player creature data (for animations, etc.)
  spawnedFish: SpawnedCreature[] | LegacySpawnItem[];
  chromaTolerance?: number;
  zoom?: number;
  enableWaterDistortion?: boolean;
  deformationIntensity?: number;
  showBoundaryOverlay?: boolean;
  showDepthBandOverlay?: boolean;
  runId?: string;
  /** Game mode: when set, canvas player size/sprite sync from this value (e.g. cheats) */
  syncedPlayerSize?: number;
  // Game mode features
  gameMode?: boolean;
  levelDuration?: number; // in milliseconds
  onGameOver?: (stats: { score: number; cause: 'starved' | 'eaten'; size: number; fishEaten: number; essenceCollected: number; timeSurvived: number }) => void;
  onLevelComplete?: (score: number, finalStats?: Pick<PlayerGameStats, 'size' | 'fishEaten' | 'timeSurvived'>) => void;
  onStatsUpdate?: (stats: PlayerGameStats) => void;
  // Edit mode features
  editMode?: boolean;
  selectedFishId?: string | null;
  onEditFish?: (fishId: string) => void;
  showEditButtons?: boolean;
  fishData?: Map<string, FishData>;
  // Pause feature
  paused?: boolean;
  // Cache refresh callback - called when textures are refreshed
  onCacheRefreshed?: () => void;
  // Ref for mobile dash button state (set by parent GameControls)
  dashFromControlsRef?: React.MutableRefObject<boolean>;
}

export default function FishEditorCanvas({
  background,
  playerFishSprite,
  playerCreature,
  spawnedFish,
  chromaTolerance = 50,
  zoom = 1,
  enableWaterDistortion = false,
  deformationIntensity = 1,
  showBoundaryOverlay = false,
  showDepthBandOverlay = false,
  runId = 'shallow_run',
  syncedPlayerSize,
  gameMode = false,
  levelDuration = 60000,
  onGameOver,
  onLevelComplete,
  onStatsUpdate,
  editMode = false,
  selectedFishId = null,
  onEditFish,
  showEditButtons = true,
  fishData = new Map(),
  paused = false,
  onCacheRefreshed,
  dashFromControlsRef: dashFromControlsRefProp,
}: FishEditorCanvasProps) {
  // Get canvas configuration (base constants only)
  const canvasConfig = getCanvasConfig();

  // Component refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [operationStatus, setOperationStatus] = useState<string | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Prop refs (for stable access in callbacks)
  const chromaToleranceRef = useRef<number>(chromaTolerance);
  const zoomRef = useRef<number>(zoom);
  const deformationRef = useRef<number>(deformationIntensity);
  const editModeRef = useRef<boolean>(editMode);
  const selectedFishIdRef = useRef<string | null>(selectedFishId);
  const fishDataRef = useRef<Map<string, FishData>>(fishData);
  const pausedRef = useRef<boolean>(paused);
  const showEditButtonsRef = useRef<boolean>(showEditButtons);
  const showBoundaryOverlayRef = useRef<boolean>(showBoundaryOverlay);
  const showDepthBandOverlayRef = useRef<boolean>(showDepthBandOverlay);
  const runIdRef = useRef<string>(runId);
  const editButtonPositionsRef = useRef<Map<string, { x: number; y: number; size: number }>>(new Map());

  // Initialize systems
  const inputManagerRef = useRef(new InputManager());
  const spriteManagerRef = useRef(new SpriteManager(chromaTolerance));
  const gameStateRef = useRef(new CanvasGameState());
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const waterTimeRef = useRef<number>(0);
  const lastPlayerAnimActionRef = useRef<string | null>(null);

  // Update refs when props change
  useEffect(() => { chromaToleranceRef.current = chromaTolerance }, [chromaTolerance])
  useEffect(() => {
    zoomRef.current = zoom;
    inputManagerRef.current.setAnimatedZoom(zoom);
  }, [zoom])
  useEffect(() => { deformationRef.current = deformationIntensity }, [deformationIntensity])
  useEffect(() => { editModeRef.current = editMode }, [editMode])
  useEffect(() => { selectedFishIdRef.current = selectedFishId }, [selectedFishId])
  useEffect(() => { fishDataRef.current = fishData }, [fishData])
  useEffect(() => {
    pausedRef.current = paused;
    // When entering paused mode, initialize camera pan to current player position
    if (paused) {
      const player = gameStateRef.current.player;
      gameStateRef.current.camera.panX = player.x;
      gameStateRef.current.camera.panY = player.y;
    }
  }, [paused])
  useEffect(() => { showEditButtonsRef.current = showEditButtons }, [showEditButtons])
  useEffect(() => { showBoundaryOverlayRef.current = showBoundaryOverlay }, [showBoundaryOverlay])
  useEffect(() => { showDepthBandOverlayRef.current = showDepthBandOverlay }, [showDepthBandOverlay])
  useEffect(() => { runIdRef.current = runId }, [runId])

  // Shared spawn logic for player and AI
  const spawnPlayerFish = (fish: FishData) => {
    // Load sprite and convert to canvas before assigning
    if (!fish.sprite) {
      gameStateRef.current.player.sprite = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processedSprite = removeBackground(img, chromaToleranceRef.current);
      const spawned = spawnFishFromData(fish, { isPlayer: true });
      // Preserve baseSize for scoring while using spawned size as baseline
      gameStateRef.current.player = {
        ...spawned,
        baseSize: spawned.size,
        sprite: processedSprite,
        animations: fish.animations,
        stamina: 100,
        maxStamina: 100,
        isDashing: false,
        chompPhase: gameStateRef.current.player.chompPhase,
        chompEndTime: gameStateRef.current.player.chompEndTime,
        hunger: gameStateRef.current.player.hunger,
        hungerDrainRate: gameStateRef.current.player.hungerDrainRate,
      };
    };
    img.onerror = () => {
      gameStateRef.current.player.sprite = null;
    };
    // Always use cache busting to ensure fresh images
    img.src = cacheBust(fish.sprite);
  }

  const spawnAIFish = (fish: FishData) => {
    // Load sprite and convert to canvas before adding to list
    if (!fish.sprite) {
      return;
    }

    // Spawn within world bounds instead of canvas dimensions
    const bounds = gameStateRef.current.worldBounds;
    const pos = {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processedSprite = removeBackground(img, chromaToleranceRef.current);
      const aiFish = spawnFishFromData(fish, { isPlayer: false, position: pos });
      // Find existing fish or add new one
      const existingIndex = gameStateRef.current.fish.findIndex(f => f.id === aiFish.id);
      if (existingIndex >= 0) {
        const prev = gameStateRef.current.fish[existingIndex];
        gameStateRef.current.fish[existingIndex] = {
          ...aiFish,
          sprite: processedSprite,
          spawnTime: prev.spawnTime,
          despawnTime: prev.despawnTime,
          opacity: prev.opacity,
          lifecycleState: prev.lifecycleState || 'active',
          stamina: prev.stamina ?? 100,
          maxStamina: prev.maxStamina ?? 100,
          isDashing: prev.isDashing ?? false,
        };
      } else {
        gameStateRef.current.fish.push({
          ...aiFish,
          sprite: processedSprite,
          spawnTime: performance.now(),
          despawnTime: undefined,
          opacity: 0,
          lifecycleState: 'spawning' as FishLifecycleState,
          stamina: 100,
          maxStamina: 100,
          isDashing: false,
        });
      }
    };
    img.onerror = () => {
      // Failed to load AI fish sprite
    };
    // Always use cache busting to ensure fresh images
    img.src = cacheBust(fish.sprite);
  }

  // Listen for global events from overlay
  useEffect(() => {
    const handleSetPlayer = (e: any) => {
      if (e.detail?.fish) spawnPlayerFish(e.detail.fish)
    }
    const handleSpawnAI = (e: any) => {
      if (e.detail?.fish) spawnAIFish(e.detail.fish)
    }
    window.addEventListener('setPlayerFish', handleSetPlayer)
    window.addEventListener('spawnAIFish', handleSpawnAI)
    return () => {
      window.removeEventListener('setPlayerFish', handleSetPlayer)
      window.removeEventListener('spawnAIFish', handleSpawnAI)
    }
  }, [])

  // Create stamina updater using extracted helper
  const updateStamina = createStaminaUpdater(
    (entity) => entity === gameStateRef.current.player
  );

  // Spawn animation constants
  const SPAWN_FADE_DURATION = canvasConfig.spawn.fadeDuration;

  const getMaxFish = () => SPAWN.DEFAULT_MAX_FISH;
  const getRespawnInterval = () => SPAWN.RESPAWN_INTERVAL_MS;

  const handleJoystickChange = useCallback((output: AnalogJoystickOutput) => {
    inputManagerRef.current.handleJoystick(output);
  }, []);

  // ============================================================================
  // Despawn Animation Helpers
  // ============================================================================

  /**
   * Trigger despawn animation for a single fish by ID
   */
  const triggerDespawn = useCallback((fishId: string) => {
    const fish = gameStateRef.current.fish.find(f => f.id === fishId);
    if (fish && fish.lifecycleState !== 'despawning' && fish.lifecycleState !== 'removed') {
      fish.despawnTime = performance.now();
      fish.lifecycleState = 'despawning';
    }
  }, []);

  /**
   * Trigger despawn animation for all fish, optionally excluding specific IDs
   * @param excludeIds - Set of fish IDs to exclude from despawning (e.g., player, selected fish)
   */
  const triggerDespawnAll = useCallback((excludeIds?: Set<string>) => {
    const now = performance.now();
    gameStateRef.current.fish.forEach(fish => {
      if (!excludeIds?.has(fish.id) && fish.lifecycleState !== 'despawning' && fish.lifecycleState !== 'removed') {
        fish.despawnTime = now;
        fish.lifecycleState = 'despawning';
      }
    });
  }, []);

  /**
   * Re-spawn (animate back in) all fish that were despawned or removed
   * Uses staggered timing for visual effect
   */
  const triggerRespawnAll = useCallback(() => {
    const now = performance.now();
    gameStateRef.current.fish.forEach((fish, index) => {
      if (fish.lifecycleState === 'despawning' || fish.lifecycleState === 'removed') {
        // Stagger respawn for visual effect
        fish.despawnTime = undefined;
        fish.spawnTime = now + index * 100;
        fish.opacity = 0;
        fish.lifecycleState = 'spawning';
      }
    });
  }, []);

  /**
   * Re-spawn (animate back in) a specific fish by ID
   * Used when switching between fish in edit mode
   */
  const triggerRespawnFish = useCallback((fishId: string) => {
    const fish = gameStateRef.current.fish.find(f => f.id === fishId);
    if (fish && (fish.lifecycleState === 'despawning' || fish.lifecycleState === 'removed')) {
      fish.despawnTime = undefined;
      fish.spawnTime = performance.now();
      fish.opacity = 0;
      fish.lifecycleState = 'spawning';
    }
  }, []);

  // ============================================================================
  // Edit Mode Animation - Animate fish out/in when entering/exiting edit mode
  // ============================================================================

  // Track previous editMode and selectedFishId to detect transitions
  const prevEditModeRef = useRef<boolean>(editMode);
  const prevSelectedFishIdRef = useRef<string | null>(selectedFishId);

  // Animate fish out when entering edit mode or switching selected fish, back in when exiting
  useEffect(() => {
    const wasEditMode = prevEditModeRef.current;
    const prevSelectedFishId = prevSelectedFishIdRef.current;
    prevEditModeRef.current = editMode;
    prevSelectedFishIdRef.current = selectedFishId;

    if (editMode && selectedFishId) {
      // Check if we just entered edit mode OR switched to a different fish while in edit mode
      const justEnteredEditMode = !wasEditMode;
      const switchedFishWhileEditing = wasEditMode && prevSelectedFishId !== selectedFishId;

      if (justEnteredEditMode || switchedFishWhileEditing) {
        // Animate out all fish except selected one and player
        triggerDespawnAll(new Set([selectedFishId, 'player']));

        // Also respawn the newly selected fish (in case it was previously despawned)
        triggerRespawnFish(selectedFishId);
      }
    } else if (!editMode && wasEditMode) {
      // Exiting edit mode: animate all fish back in
      triggerRespawnAll();
    }
  }, [editMode, selectedFishId, triggerDespawnAll, triggerRespawnAll, triggerRespawnFish]);

  // Handle canvas clicks/touches for edit buttons
  const checkEditButtonClick = useCallback((clientX: number, clientY: number) => {
    // Allow clicks even when paused - we want to be able to click edit buttons
    if (!showEditButtonsRef.current || editModeRef.current || !onEditFish) return false;

    const canvas = canvasRef.current;
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Check if click is on an edit button
    const zoomState = inputManagerRef.current.getZoomState();
    const currentZoom = zoomState.animatedZoom;
    const cam = gameStateRef.current.camera;

    for (const [fishId, pos] of editButtonPositionsRef.current.entries()) {
      // Calculate button position in screen space (same formula as rendering)
      // screenPos = (worldPos - cameraPos) * zoom + canvas.center
      const screenX = (pos.x - cam.x) * currentZoom + canvas.width / 2;
      const screenY = (pos.y - cam.y) * currentZoom + canvas.height / 2 - pos.size * currentZoom / 2 - UI.EDIT_BUTTON_SIZE - UI.EDIT_BUTTON_OFFSET;
      const buttonSize = UI.EDIT_BUTTON_SIZE;

      const dx = x - screenX;
      const dy = y - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < buttonSize / 2) {
        onEditFish(fishId);
        return true;
      }
    }
    return false;
  }, [onEditFish]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (checkEditButtonClick(e.clientX, e.clientY)) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, [checkEditButtonClick]);

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (checkEditButtonClick(touch.clientX, touch.clientY)) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      // Start camera pan drag in paused mode (but NOT when editing a specific fish)
      // When a fish is selected for editing, camera locks to that fish
      if (pausedRef.current && !selectedFishIdRef.current) {
        inputManagerRef.current.startDrag(
          touch.clientX,
          touch.clientY,
          gameStateRef.current.camera.panX,
          gameStateRef.current.camera.panY
        );
      }
    }
  }, [checkEditButtonClick]);

  // Camera pan handlers for paused mode (disabled when editing a specific fish)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only enable pan in paused mode when NOT editing a specific fish
    // When a fish is selected, camera locks to that fish
    if (pausedRef.current && !selectedFishIdRef.current) {
      inputManagerRef.current.startDrag(
        e.clientX,
        e.clientY,
        gameStateRef.current.camera.panX,
        gameStateRef.current.camera.panY
      );
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!inputManagerRef.current.isDraggingCamera()) return;

    const zoomState = inputManagerRef.current.getZoomState();
    const newPan = inputManagerRef.current.updateDrag(e.clientX, e.clientY, zoomState.animatedZoom);
    if (newPan) {
      gameStateRef.current.camera.panX = newPan.x;
      gameStateRef.current.camera.panY = newPan.y;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    inputManagerRef.current.endDrag();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!inputManagerRef.current.isDraggingCamera() || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const zoomState = inputManagerRef.current.getZoomState();
    const newPan = inputManagerRef.current.updateDrag(touch.clientX, touch.clientY, zoomState.animatedZoom);
    if (newPan) {
      gameStateRef.current.camera.panX = newPan.x;
      gameStateRef.current.camera.panY = newPan.y;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    inputManagerRef.current.endDrag();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load background image
  useEffect(() => {
    if (!background) {
      backgroundImageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      backgroundImageRef.current = img;
    };
    img.onerror = () => {
      backgroundImageRef.current = null;
    };
    img.src = cacheBust(background);
  }, [background]);

  // Initialize player from playerCreature data AND load growth-aware sprite
  useEffect(() => {
    if (playerCreature) {
      // Update player ID from creature data
      gameStateRef.current.player.id = playerCreature.id;

      // In game mode, use run state size (persisted from previous level) or PLAYER_BASE_SIZE (20)
      // In editor mode, use creature's actual size or base size
      const playerSize = gameMode
        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)
        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);
      gameStateRef.current.player.size = playerSize;
      gameStateRef.current.player.baseSize = playerSize;

      // Set player animations from creature data
      gameStateRef.current.player.animations = playerCreature.animations;

      // Remove old animation sprite to ensure fresh data is used
      // This handles the case where animations were regenerated
      gameStateRef.current.animationSpriteManager.removeSprite('player');

      // Pre-initialize animation sprite if animations exist
      if (playerCreature.animations && hasUsableAnimations(playerCreature.animations)) {
        // Determine the correct growth stage for the player's starting size
        let initialStage: 'juvenile' | 'adult' | 'elder' = 'adult';
        if (playerCreature.growthSprites) {
          initialStage = getGrowthStage(playerSize, playerCreature.growthSprites);
        }
        gameStateRef.current.animationSpriteManager.getSprite('player', playerCreature.animations, { initialStage });
      }

      // Animation sprites are initialized on-demand when needed

      // Now load growth-aware sprite using the correct size
      if (playerFishSprite) {
        let spriteToLoad = playerFishSprite;
        if (playerCreature.growthSprites) {
          const growthStage = getGrowthStage(playerSize, playerCreature.growthSprites);
          const { sprite: growthSprite } = getGrowthStageSprite(playerCreature, playerSize, 'player');
          spriteToLoad = growthSprite;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          gameStateRef.current.player.sprite = removeBackground(img, chromaToleranceRef.current);
        };
        img.onerror = () => {
          gameStateRef.current.player.sprite = null;
        };
        img.src = cacheBust(spriteToLoad);
      }
    } else if (playerFishSprite) {
      // No creature data, just load the base sprite
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        gameStateRef.current.player.sprite = removeBackground(img, chromaToleranceRef.current);
      };
      img.onerror = () => {
        gameStateRef.current.player.sprite = null;
      };
      img.src = cacheBust(playerFishSprite);
    } else {
      gameStateRef.current.player.sprite = null;
    }
  }, [playerFishSprite, playerCreature, gameMode]);

  // Game mode: when syncedPlayerSize changes (e.g. size cheat), apply to player and refresh sprite
  useEffect(() => {
    if (!gameMode || syncedPlayerSize == null || !playerCreature) return;
    const size = syncedPlayerSize;
    gameStateRef.current.player.size = size;
    gameStateRef.current.player.baseSize = size;
    if (playerFishSprite && playerCreature.growthSprites) {
      const { sprite: growthSprite } = getGrowthStageSprite(playerCreature, size, 'player');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        gameStateRef.current.player.sprite = removeBackground(img, chromaToleranceRef.current);
      };
      img.onerror = () => {
        gameStateRef.current.player.sprite = null;
      };
      img.src = cacheBust(growthSprite);
    }
  }, [gameMode, syncedPlayerSize, playerCreature, playerFishSprite]);

  // Note: Fish sizes are updated via updateFishSize events from the size slider
  // We don't sync from fishData here to allow independent sizing of fish instances

  // Spawn new fish using full Creature data when available, or legacy format.
  // Also sync spawn pool and sprite cache for continuous respawn in game mode.
  // Track sprite URLs and versions to detect changes
  const fishSpriteUrlsRef = useRef<Map<string, string>>(new Map());
  const spriteVersionRef = useRef<Map<string, number>>(new Map());

  // Force refresh all sprites - clears ALL caches (SW, browser, localStorage, in-memory) and reloads from server
  const refreshAllSprites = useCallback(async () => {
    // 1. Clear Service Worker's asset cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_ASSET_CACHE' },
        [messageChannel.port2]
      );
      // Wait for confirmation
      await new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve();
        };
        // Timeout after 1s
        setTimeout(resolve, 1000);
      });
    }

    // 2. Clear browser's Cache API (all caches we can access)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('asset') || cacheName.includes('fish')) {
          await caches.delete(cacheName);
        }
      }
    }

    // 3. Clear localStorage fish cache (old creatures stored locally)
    try {
      const localCreatures = localStorage.getItem('fish_game_creatures');
      if (localCreatures) {
        localStorage.removeItem('fish_game_creatures');
      }
    } catch (err) {
      // Could not clear localStorage
    }

    // 3. Clear all in-memory tracking refs
    fishSpriteUrlsRef.current.clear();
    spriteVersionRef.current.clear();
    gameStateRef.current.spriteCache.clear();

    // 4. Helper to reload sprite bypassing ALL caches
    const reloadSprite = async (fishId: string, spriteUrl: string, onLoaded: (sprite: HTMLCanvasElement) => void) => {
      if (spriteUrl.startsWith('data:')) {
        // Data URLs don't need cache busting
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const processedSprite = removeBackground(img, chromaToleranceRef.current);
          onLoaded(processedSprite);
        };
        img.src = cacheBust(spriteUrl);
        return;
      }

      try {
        // Use fetch with cache: 'reload' to bypass browser cache entirely
        const cleanUrl = spriteUrl.split('?')[0];
        const response = await fetch(cleanUrl, {
          cache: 'reload',  // Bypass cache completely
          mode: 'cors',
        });
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const processedSprite = removeBackground(img, chromaToleranceRef.current);
          onLoaded(processedSprite);
          URL.revokeObjectURL(objectUrl); // Clean up
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      } catch (err) {
        // Failed to fetch sprite
      }
    };

    // 5. Reload all fish sprites (growth-aware)
    const reloadPromises: Promise<void>[] = [];
    gameStateRef.current.fish.forEach((fish) => {
      // Get creature data for growth-aware sprite selection
      const creatureData = fish.creatureData || fishDataRef.current.get(fish.id);
      let spriteUrl = creatureData?.sprite || spawnedFish.find(f => f.id === fish.id)?.sprite;

      // Select growth-stage-aware sprite based on fish's current size
      if (creatureData?.growthSprites && spriteUrl) {
        const { sprite: growthSprite } = getGrowthStageSprite(creatureData, fish.size, fish.id);
        spriteUrl = growthSprite;
      }

      if (spriteUrl) {
        reloadPromises.push(
          reloadSprite(fish.id, spriteUrl, (processedSprite) => {
            fish.sprite = processedSprite;
            gameStateRef.current.spriteCache.set(fish.id, processedSprite);
            fishSpriteUrlsRef.current.set(fish.id, spriteUrl!);
          })
        );
      }
    });

    // 6. Also reload player sprite (growth-aware)
    if (gameStateRef.current.player.sprite && playerFishSprite) {
      let playerSpriteUrl = playerFishSprite;
      if (playerCreature?.growthSprites) {
        const { sprite: growthSprite } = getGrowthStageSprite(playerCreature, gameStateRef.current.player.size, 'player');
        playerSpriteUrl = growthSprite;
      }
      reloadPromises.push(
        reloadSprite('player', playerSpriteUrl, (processedSprite) => {
          gameStateRef.current.player.sprite = processedSprite;
        })
      );
    }

    await Promise.all(reloadPromises);

    // Notify parent
    if (onCacheRefreshed) {
      onCacheRefreshed();
    }
  }, [spawnedFish, playerFishSprite, playerCreature, onCacheRefreshed]);

  // Listen for global refresh event
  useEffect(() => {
    const handleRefresh = () => {
      refreshAllSprites().catch(() => {
        // Refresh failed
      });
    };
    window.addEventListener('refreshFishSprites', handleRefresh);
    return () => window.removeEventListener('refreshFishSprites', handleRefresh);
  }, [refreshAllSprites]);

  // Listen for operation status events (uploading, generating, etc.)
  useEffect(() => {
    const handleStatus = (e: CustomEvent<{ status: string | null }>) => {
      setOperationStatus(e.detail.status);
    };
    window.addEventListener('canvasOperationStatus', handleStatus as EventListener);
    return () => window.removeEventListener('canvasOperationStatus', handleStatus as EventListener);
  }, []);

  // Listen for animation preview requests
  useEffect(() => {
    const handlePreviewAnimation = (e: CustomEvent<{ action: string }>) => {
      const { action } = e.detail;

      if (gameStateRef.current.animationSpriteManager.hasSprite('player')) {
        const sprite = gameStateRef.current.animationSpriteManager.getSprite('player', gameStateRef.current.player.animations || {});
        sprite.triggerAction(action as any);
      }
    };
    window.addEventListener('previewAnimation', handlePreviewAnimation as EventListener);
    return () => window.removeEventListener('previewAnimation', handlePreviewAnimation as EventListener);
  }, []);

  // Helper to load a growth-stage-aware sprite
  const loadGrowthAwareSprite = useCallback((
    fish: { id: string; size: number; creatureData?: Creature; sprite: HTMLCanvasElement | null; currentGrowthStage?: string },
    onLoaded: (sprite: HTMLCanvasElement) => void
  ) => {
    if (!fish.creatureData?.sprite) return;

    // Get the appropriate sprite for this size
    const { sprite: spriteUrl, spriteResolutions } = getGrowthStageSprite(
      fish.creatureData,
      fish.size,
      fish.id
    );

    // Load the sprite
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processedSprite = removeBackground(img, chromaToleranceRef.current);
      onLoaded(processedSprite);
    };
    img.onerror = () => {
      // Failed to load growth sprite
    };
    img.src = cacheBust(spriteUrl);
  }, []);

  // Listen for fish size updates from the size slider
  useEffect(() => {
    const handleSizeUpdate = (e: CustomEvent<{ fishId: string; size: number }>) => {
      const { fishId, size } = e.detail;

      // Update player if that's the target
      if (fishId === 'player' || fishId === gameStateRef.current.player.id) {
        const oldSize = gameStateRef.current.player.size;
        gameStateRef.current.player.size = size;

        // Check if player growth stage changed
        if (playerCreature?.growthSprites) {
          const oldStage = getGrowthStage(oldSize, playerCreature.growthSprites);
          const newStage = getGrowthStage(size, playerCreature.growthSprites);

          if (oldStage !== newStage) {
            // Reload player sprite for new growth stage
            const { sprite: spriteUrl } = getGrowthStageSprite(playerCreature, size, 'player');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              gameStateRef.current.player.sprite = removeBackground(img, chromaToleranceRef.current);
            };
            img.src = cacheBust(spriteUrl);
          }
        }
        return;
      }

      // Update fish in fish list
      const fish = gameStateRef.current.fish.find(f => f.id === fishId);
      if (fish) {
        const oldSize = fish.size;
        fish.size = size;

        // Get creature data - check fish.creatureData first, then try fishDataRef lookup
        // For instance IDs, we need to find the spawned fish entry to get creatureId
        let creatureData = fish.creatureData;
        if (!creatureData) {
          // Try direct lookup
          creatureData = fishDataRef.current.get(fishId) as Creature | undefined;
          // If not found, fish might have instance ID - extract creature ID from spawnedFish
          if (!creatureData) {
            const spawnedEntry = spawnedFish.find(f => f.id === fishId);
            const creatureId = (spawnedEntry as { creatureId?: string })?.creatureId;
            if (creatureId) {
              creatureData = fishDataRef.current.get(creatureId) as Creature | undefined;
            }
          }
        }

        // Check if growth stage changed
        if (creatureData?.growthSprites) {
          const oldStage = getGrowthStage(oldSize, creatureData.growthSprites);
          const newStage = getGrowthStage(size, creatureData.growthSprites);

          if (oldStage !== newStage) {
            fish.currentGrowthStage = newStage;

            // Store creature data for future lookups
            if (!fish.creatureData) {
              fish.creatureData = creatureData as Creature;
            }

            // Reload sprite for new growth stage
            const { sprite: spriteUrl } = getGrowthStageSprite(creatureData, size, fishId);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              fish.sprite = removeBackground(img, chromaToleranceRef.current);
            };
            img.src = cacheBust(spriteUrl);
          }
        }
      }
    };

    window.addEventListener('updateFishSize', handleSizeUpdate as EventListener);
    return () => window.removeEventListener('updateFishSize', handleSizeUpdate as EventListener);
  }, [playerCreature, loadGrowthAwareSprite]);

  // Mark canvas ready when canvas actually mounts (canvas is not rendered until isClient is true)
  useEffect(() => {
    if (isClient && canvasRef.current) setCanvasReady(true);
  }, [isClient]);

  useCanvasSpawnSync(spawnedFish, {
    gameStateRef,
    fishSpriteUrlsRef,
    spriteVersionRef,
    zoomRef,
    chromaToleranceRef,
    fishDataRef: fishDataRef as unknown as React.MutableRefObject<Map<string, FishDataLike>>,
    canvasRef,
  }, canvasReady);

  // Setup canvas and game loop
  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to fill available space
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Use ResizeObserver to detect container size changes (e.g., when side panel opens/closes)
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      inputManagerRef.current.handleKeyDown(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      inputManagerRef.current.handleKeyUp(e.key);
    };

    // Wheel zoom handler (desktop) - works in all modes
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      inputManagerRef.current.handleWheel(e.deltaY, CAMERA.MIN_ZOOM, CAMERA.MAX_ZOOM);
    };

    // Pinch-to-zoom handlers (mobile) - works in all modes
    const handleTouchStart = (e: TouchEvent) => {
      const zoomState = inputManagerRef.current.getZoomState();
      inputManagerRef.current.handleTouchStart(e.touches, zoomState.currentZoom);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (inputManagerRef.current.handleTouchMove(e.touches, CAMERA.MIN_ZOOM, CAMERA.MAX_ZOOM)) {
        e.preventDefault(); // Prevent page zoom
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      inputManagerRef.current.handleTouchEnd(e.touches);
    };

    const hasKey = (k: string) => inputManagerRef.current.hasKey(k);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Attach zoom controls to container (not canvas, since joystick overlay blocks canvas events)
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    const gameLoop = () => {
      const isPaused = pausedRef.current;
      const currentEditMode = editModeRef.current;

      const shouldContinue = tickGameState({
        state: gameStateRef.current,
        input: inputManagerRef.current.getState(),
        options: {
          gameMode,
          levelDuration,
          isPaused,
          currentEditMode,
          zoom: zoomRef.current,
          dashFromControls: dashFromControlsRefProp?.current ?? false,
          chromaTolerance: chromaToleranceRef.current,
          selectedFishId: selectedFishIdRef.current,
        },
        playerCreature: playerCreature,
        callbacks: {
          onLevelComplete,
          onGameOver,
          onStatsUpdate,
          onReloadPlayerSprite: (spriteUrl, onLoaded) => {
                  const growthImg = new Image();
                  growthImg.crossOrigin = 'anonymous';
                  growthImg.onload = () => {
              onLoaded(removeBackground(growthImg, chromaToleranceRef.current));
                  };
            growthImg.onerror = () => { };
                  growthImg.src = spriteUrl;
          },
        },
        helpers: {
          getRespawnInterval,
          getMaxFish,
          spawnFadeDuration: SPAWN_FADE_DURATION,
        },
      });

      if (!shouldContinue) return;

      waterTimeRef.current += 0.01;
      const lerpSpeed = CAMERA.LERP_SPEED;
      inputManagerRef.current.updateAnimatedZoom(lerpSpeed);

      // Delegate all drawing to extracted renderer
      renderGame({
        canvas,
        ctx,
        player: gameStateRef.current.player,
        fish: gameStateRef.current.fish,
        camera: gameStateRef.current.camera,
        zoom: zoomRef.current,
        animatedZoom: inputManagerRef.current.getZoomState().animatedZoom,
        background: backgroundImageRef.current ?? undefined,
        enableWaterDistortion,
        waterTime: waterTimeRef.current,
        deformationIntensity: deformationRef.current,
        gameMode,
        isEditMode: currentEditMode,
        isPaused,
        selectedFishId: selectedFishIdRef.current,
        showEditButtons: showEditButtonsRef.current,
        editButtonPositions: editButtonPositionsRef.current,
        chompParticles: gameStateRef.current.particles.chomp,
        bloodParticles: gameStateRef.current.particles.blood,
        dashMultiEntity: gameStateRef.current.particles.dashMultiEntity,
        animationSpriteManager: gameStateRef.current.animationSpriteManager,
        lastPlayerAnimAction: lastPlayerAnimActionRef.current,
        levelDuration,
        gameStartTime: gameStateRef.current.gameMode.startTime,
        totalPausedTime: gameStateRef.current.gameMode.totalPausedTime,
        pauseStartTime: gameStateRef.current.gameMode.pauseStartTime,
        score: gameStateRef.current.gameMode.score,
        fishCount: gameStateRef.current.fish.length,
        showBoundaryOverlay: showBoundaryOverlayRef.current,
        showDepthBandOverlay: showDepthBandOverlayRef.current,
        runId: runIdRef.current,
        onEditFish,
        setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },
      });

      // REMOVED: inline rendering block - now in canvas-renderer via renderGame()

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', updateCanvasSize);
      resizeObserver.disconnect();
      // Clean up zoom controls
      if (container) {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isClient]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1, cursor: (paused && !selectedFishId) ? 'grab' : 'default' }}
      />
      <div style={{ pointerEvents: paused ? 'none' : 'auto', position: 'absolute', inset: 0, zIndex: 20 }}>
        <AnalogJoystick onChange={handleJoystickChange} mode="on-touch" disabled={paused} />
      </div>

      {/* Operation status overlay */}
      {operationStatus && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs text-white/90 flex items-center gap-2 pointer-events-none"
        >
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          {operationStatus}
        </div>
      )}
    </div>
  );
}
