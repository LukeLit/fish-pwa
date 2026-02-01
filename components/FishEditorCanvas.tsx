/**
 * Fish Editor Canvas - Playable test environment for AI-generated assets
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AnalogJoystick, { type AnalogJoystickOutput } from './AnalogJoystick';
import type { Creature } from '@/lib/game/types';
import { type FishData } from './FishEditOverlay';
import { spawnFishFromData } from '@/lib/game/spawn-fish';
import {
  HUNGER_MAX,
  HUNGER_DRAIN_RATE,
  HUNGER_RESTORE_MULTIPLIER,
  HUNGER_LOW_THRESHOLD,
  HUNGER_WARNING_PULSE_FREQUENCY,
  HUNGER_WARNING_PULSE_BASE,
  HUNGER_WARNING_INTENSITY,
  HUNGER_FRAME_RATE,
} from '@/lib/game/hunger-constants';
import { loadRunState } from '@/lib/game/run-state';
import {
  removeBackground,
  drawFishWithDeformation,
  getSegmentsSmooth,
  PLAYER_SEGMENT_MULTIPLIER,
  getClipMode,
  hasUsableClips,
  getSpriteUrl,
  getResolutionKey,
  getGrowthStage,
  getGrowthStageSprite,
  type ClipMode,
  type RenderContext,
} from '@/lib/rendering/fish-renderer';
import type { SpriteResolutions, GrowthSprites } from '@/lib/game/types';
import { ESSENCE_TYPES } from '@/lib/game/data/essence-types';
import { getVideoSpriteManager, type VideoSprite } from '@/lib/rendering/video-sprite';
import { getClipStateManager } from '@/lib/game/clip-state';
import type { CreatureClips, ClipAction } from '@/lib/game/types';

export interface PlayerGameStats {
  size: number;
  hunger: number;
  score: number;
  fishEaten: number;
  timeSurvived: number;
}

interface FishEditorCanvasProps {
  background: string | null;
  playerFishSprite: string | null;
  playerCreature?: Creature; // Full player creature data (for clips, etc.)
  spawnedFish: Creature[] | Array<{ id: string; sprite: string; type: string }>;
  chromaTolerance?: number;
  zoom?: number;
  enableWaterDistortion?: boolean;
  deformationIntensity?: number;
  // Game mode features
  gameMode?: boolean;
  levelDuration?: number; // in milliseconds
  onGameOver?: (stats: { score: number; cause: 'starved' | 'eaten'; size: number; fishEaten: number; essenceCollected: number; timeSurvived: number }) => void;
  onLevelComplete?: (score: number) => void;
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
}

/**
 * Type guard to check if a fish item is a full Creature object
 * Checks for required Creature fields that distinguish it from legacy format
 */
function isCreature(fish: Creature | { id: string; sprite: string; type: string }): fish is Creature {
  return (
    'stats' in fish &&
    'essenceTypes' in fish &&
    'rarity' in fish &&
    'spawnRules' in fish
  );
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
}: FishEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const chromaToleranceRef = useRef<number>(chromaTolerance);
  const zoomRef = useRef<number>(zoom);
  const deformationRef = useRef<number>(deformationIntensity);
  const editButtonPositionsRef = useRef<Map<string, { x: number; y: number; size: number }>>(new Map());
  const editModeRef = useRef<boolean>(editMode);
  const selectedFishIdRef = useRef<string | null>(selectedFishId);
  const fishDataRef = useRef<Map<string, FishData>>(fishData);
  const pausedRef = useRef<boolean>(paused);
  const showEditButtonsRef = useRef<boolean>(showEditButtons);
  // Smooth zoom animation refs
  const animatedZoomRef = useRef<number>(zoom);
  const animatedCameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetZoomRef = useRef<number>(zoom);
  const targetCameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom control constants and refs
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5.0;
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);

  // Camera pan refs for edit/paused mode
  const cameraPanRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);
  const isDraggingRef = useRef(false);
  // Track effective camera position used in rendering (for button click detection)
  const effectiveCameraRef = useRef({ x: 0, y: 0 });

  // Update refs when props change
  useEffect(() => { chromaToleranceRef.current = chromaTolerance }, [chromaTolerance])
  useEffect(() => {
    zoomRef.current = zoom;
    targetZoomRef.current = zoom;
  }, [zoom])
  useEffect(() => { deformationRef.current = deformationIntensity }, [deformationIntensity])
  useEffect(() => { editModeRef.current = editMode }, [editMode])
  useEffect(() => { selectedFishIdRef.current = selectedFishId }, [selectedFishId])
  useEffect(() => { fishDataRef.current = fishData }, [fishData])
  useEffect(() => {
    pausedRef.current = paused;
    // When entering paused mode, initialize camera pan to current player position
    if (paused) {
      const player = playerRef.current;
      cameraPanRef.current = { x: player.x, y: player.y };
    }
  }, [paused])
  useEffect(() => { showEditButtonsRef.current = showEditButtons }, [showEditButtons])

  // Shared spawn logic for player and AI
  const spawnPlayerFish = (fish: FishData) => {
    // Load sprite and convert to canvas before assigning
    if (!fish.sprite) {
      playerRef.current.sprite = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processedSprite = removeBackground(img, chromaToleranceRef.current);
      const spawned = spawnFishFromData(fish, { isPlayer: true });
      // Preserve baseSize for scoring while using spawned size as baseline
      playerRef.current = {
        ...spawned,
        baseSize: spawned.size,
        sprite: processedSprite,
      };
    };
    img.onerror = () => {
      console.error('Failed to load player fish sprite:', fish.sprite);
      playerRef.current.sprite = null;
    };
    // For HTTP(S) sprites, use clean URL to allow browser caching; for data: URLs, use as-is
    if (fish.sprite.startsWith('data:')) {
      img.src = fish.sprite;
    } else {
      // Remove any existing query params to use clean URL for caching
      img.src = fish.sprite.split('?')[0];
    }
  }

  const spawnAIFish = (fish: FishData) => {
    // Load sprite and convert to canvas before adding to list
    if (!fish.sprite) {
      return;
    }

    // Spawn within world bounds instead of canvas dimensions
    const bounds = worldBoundsRef.current;
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
      const existingIndex = fishListRef.current.findIndex(f => f.id === aiFish.id);
      if (existingIndex >= 0) {
        fishListRef.current[existingIndex] = {
          ...aiFish,
          sprite: processedSprite,
          // Preserve spawn/despawn animation state if exists
          spawnTime: fishListRef.current[existingIndex].spawnTime,
          despawnTime: fishListRef.current[existingIndex].despawnTime,
          opacity: fishListRef.current[existingIndex].opacity,
          lifecycleState: fishListRef.current[existingIndex].lifecycleState || 'active',
        };
      } else {
        fishListRef.current.push({
          ...aiFish,
          sprite: processedSprite,
          // Spawn/despawn animation
          spawnTime: performance.now(),
          despawnTime: undefined,
          opacity: 0,
          lifecycleState: 'spawning' as FishLifecycleState,
        });
      }
    };
    img.onerror = () => {
      console.error('Failed to load AI fish sprite:', fish.sprite);
    };
    // For HTTP(S) sprites, use clean URL to allow browser caching; for data: URLs, use as-is
    if (fish.sprite.startsWith('data:')) {
      img.src = fish.sprite;
    } else {
      // Remove any existing query params to use clean URL for caching
      img.src = fish.sprite.split('?')[0];
    }
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

  const eatenIdsRef = useRef<Set<string>>(new Set());

  // Game mode state
  const gameStartTimeRef = useRef<number>(0);
  const gameOverFiredRef = useRef<boolean>(false);
  const levelCompleteFiredRef = useRef<boolean>(false);
  const levelEndingRef = useRef<boolean>(false); // True while fish are animating out at level end
  const scoreRef = useRef<number>(0);
  const fishEatenRef = useRef<number>(0);
  const essenceCollectedRef = useRef<number>(0);
  // Pause timer tracking
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const wasPausedRef = useRef<boolean>(false);

  // Frame timing for delta time calculation
  const lastFrameTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const worldBoundsRef = useRef({
    minX: -1500,
    maxX: 1500,
    minY: -1200,
    maxY: 1200,
  });

  // Game state
  const playerRef = useRef({
    id: 'player' as string, // Can be updated to actual creature ID
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    size: 80,
    baseSize: 80,
    sprite: null as HTMLCanvasElement | null,
    facingRight: true,
    verticalTilt: 0,
    animTime: 0,
    chompPhase: 0, // 0–1, drives bulge + CHOMP
    chompEndTime: 0,
    hunger: HUNGER_MAX, // 0-100 hunger meter
    hungerDrainRate: HUNGER_DRAIN_RATE, // % per second
  });

  const chompParticlesRef = useRef<Array<{
    x: number;
    y: number;
    life: number;
    scale: number;
    text: string;
    color?: string; // Color for essence numbers
    punchScale?: number; // Extra scale for punch animation
  }>>([]);

  const bloodParticlesRef = useRef<Array<{
    x: number;
    y: number;
    life: number;
    radius: number;
  }>>([]);

  /** Fish lifecycle state for spawn/despawn animations */
  type FishLifecycleState = 'spawning' | 'active' | 'despawning' | 'removed';

  const fishListRef = useRef<Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    sprite: HTMLCanvasElement | null;
    type: string;
    facingRight: boolean;
    verticalTilt: number;
    animTime: number;
    creatureData?: Creature;
    currentGrowthStage?: 'juvenile' | 'adult' | 'elder'; // Track current growth stage for sprite swapping
    // Spawn/despawn animation properties
    spawnTime?: number;      // When fish spawned (for fade-in)
    despawnTime?: number;    // When despawn started (for fade-out)
    opacity?: number;        // Current opacity (0-1)
    lifecycleState: FishLifecycleState; // Current lifecycle state
    // Video clip animation
    clips?: CreatureClips;
    videoSprite?: VideoSprite;
  }>>([]);

  // Video sprite manager ref
  const videoSpriteManagerRef = useRef(getVideoSpriteManager());
  const clipStateManagerRef = useRef(getClipStateManager());

  // Spawn animation constants
  const SPAWN_FADE_DURATION = 1500; // ms to fully fade in (collision enables when fully opaque)

  /** 
   * Cache processed sprites by creature id and resolution for respawn (game mode).
   * Key format: "{creatureId}:{resolution}" where resolution is 'high'|'medium'|'low'
   */
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  /** Pool of creatures to spawn from (mirrors spawnedFish for use in game loop). */
  const spawnPoolRef = useRef<(Creature | { id: string; sprite: string; type: string })[]>([]);
  const lastRespawnTimeRef = useRef(0);
  const MAX_FISH_IN_WORLD = 45;
  const RESPAWN_INTERVAL_MS = 2000; // Faster respawn to populate world

  const keyKeysRef = useRef<Set<string>>(new Set());
  const joystickVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickActiveRef = useRef<boolean>(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const waterTimeRef = useRef<number>(0);
  const waterDistortionRef = useRef<HTMLCanvasElement | null>(null);

  const handleJoystickChange = useCallback((output: AnalogJoystickOutput) => {
    joystickVelocityRef.current = output.velocity;
    joystickActiveRef.current = output.isActive;
  }, []);

  // ============================================================================
  // Despawn Animation Helpers
  // ============================================================================

  /**
   * Trigger despawn animation for a single fish by ID
   */
  const triggerDespawn = useCallback((fishId: string) => {
    const fish = fishListRef.current.find(f => f.id === fishId);
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
    fishListRef.current.forEach(fish => {
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
    fishListRef.current.forEach((fish, index) => {
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
    const fish = fishListRef.current.find(f => f.id === fishId);
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
    const currentZoom = animatedZoomRef.current;
    const cam = effectiveCameraRef.current;

    for (const [fishId, pos] of editButtonPositionsRef.current.entries()) {
      // Calculate button position in screen space (same formula as rendering)
      // screenPos = (worldPos - cameraPos) * zoom + canvas.center
      const screenX = (pos.x - cam.x) * currentZoom + canvas.width / 2;
      const screenY = (pos.y - cam.y) * currentZoom + canvas.height / 2 - pos.size * currentZoom / 2 - 24 - 5;
      const buttonSize = 24;

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
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          camX: cameraPanRef.current.x,
          camY: cameraPanRef.current.y,
        };
        isDraggingRef.current = true;
      }
    }
  }, [checkEditButtonClick]);

  // Camera pan handlers for paused mode (disabled when editing a specific fish)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only enable pan in paused mode when NOT editing a specific fish
    // When a fish is selected, camera locks to that fish
    if (pausedRef.current && !selectedFishIdRef.current) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        camX: cameraPanRef.current.x,
        camY: cameraPanRef.current.y,
      };
      isDraggingRef.current = true;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const currentZoom = animatedZoomRef.current;

    // Update camera pan (invert direction for natural drag feel, scale by zoom)
    cameraPanRef.current.x = dragStartRef.current.camX - dx / currentZoom;
    cameraPanRef.current.y = dragStartRef.current.camY - dy / currentZoom;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    const currentZoom = animatedZoomRef.current;

    // Update camera pan (invert direction for natural drag feel, scale by zoom)
    cameraPanRef.current.x = dragStartRef.current.camX - dx / currentZoom;
    cameraPanRef.current.y = dragStartRef.current.camY - dy / currentZoom;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
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
      console.error('Failed to load background image');
      backgroundImageRef.current = null;
    };
    img.src = background;
  }, [background]);

  // Initialize player from playerCreature data AND load growth-aware sprite
  useEffect(() => {
    if (playerCreature) {
      // Update player ID from creature data
      playerRef.current.id = playerCreature.id;

      // In game mode, use PLAYER_BASE_SIZE (45) for starting size
      // In editor mode, use creature's actual size
      const PLAYER_BASE_SIZE = 45; // Matches lib/game/spawn-fish.ts
      const playerSize = gameMode ? PLAYER_BASE_SIZE : (playerCreature.stats?.size ?? 80);
      playerRef.current.size = playerSize;
      playerRef.current.baseSize = playerSize;

      console.log(`[FishEditorCanvas] Initializing player: gameMode=${gameMode}, size=${playerSize}, creature.stats.size=${playerCreature.stats?.size}`);

      // Initialize clip state machine if creature has clips
      if (playerCreature.clips) {
        const availableActions = Object.keys(playerCreature.clips) as ClipAction[];
        if (availableActions.length > 0) {
          clipStateManagerRef.current.getStateMachine('player', availableActions);
        }
      }

      // Now load growth-aware sprite using the correct size
      if (playerFishSprite) {
        let spriteToLoad = playerFishSprite;
        if (playerCreature.growthSprites) {
          const growthStage = getGrowthStage(playerSize, playerCreature.growthSprites);
          const { sprite: growthSprite } = getGrowthStageSprite(playerCreature, playerSize, 'player');
          spriteToLoad = growthSprite;
          console.log(`[FishEditorCanvas] Loading player sprite for ${growthStage} stage (size: ${playerSize})`);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          playerRef.current.sprite = removeBackground(img, chromaToleranceRef.current);
        };
        img.onerror = () => {
          console.error('Failed to load player fish sprite');
          playerRef.current.sprite = null;
        };
        if (spriteToLoad.startsWith('data:')) {
          img.src = spriteToLoad;
        } else {
          img.src = spriteToLoad.split('?')[0];
        }
      }
    } else if (playerFishSprite) {
      // No creature data, just load the base sprite
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        playerRef.current.sprite = removeBackground(img, chromaToleranceRef.current);
      };
      img.onerror = () => {
        console.error('Failed to load player fish sprite');
        playerRef.current.sprite = null;
      };
      if (playerFishSprite.startsWith('data:')) {
        img.src = playerFishSprite;
      } else {
        img.src = playerFishSprite.split('?')[0];
      }
    } else {
      playerRef.current.sprite = null;
    }
  }, [playerFishSprite, playerCreature, gameMode]);

  // Note: Fish sizes are updated via updateFishSize events from the size slider
  // We don't sync from fishData here to allow independent sizing of fish instances

  // Spawn new fish using full Creature data when available, or legacy format.
  // Also sync spawn pool and sprite cache for continuous respawn in game mode.
  // Track sprite URLs and versions to detect changes
  const fishSpriteUrlsRef = useRef<Map<string, string>>(new Map());
  const spriteVersionRef = useRef<Map<string, number>>(new Map());

  // Force refresh all sprites - clears ALL caches (SW, browser, localStorage, in-memory) and reloads from server
  const refreshAllSprites = useCallback(async () => {
    console.log('[FishEditorCanvas] NUCLEAR REFRESH - clearing ALL caches...');

    // 1. Clear Service Worker's asset cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[FishEditorCanvas] Clearing Service Worker asset cache...');
      const messageChannel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_ASSET_CACHE' },
        [messageChannel.port2]
      );
      // Wait for confirmation
      await new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          console.log('[FishEditorCanvas] SW cache cleared:', event.data);
          resolve();
        };
        // Timeout after 1s
        setTimeout(resolve, 1000);
      });
    }

    // 2. Clear browser's Cache API (all caches we can access)
    if ('caches' in window) {
      console.log('[FishEditorCanvas] Clearing browser Cache API...');
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('asset') || cacheName.includes('fish')) {
          console.log('[FishEditorCanvas] Deleting cache:', cacheName);
          await caches.delete(cacheName);
        }
      }
    }

    // 3. Clear localStorage fish cache (old creatures stored locally)
    try {
      const localCreatures = localStorage.getItem('fish_game_creatures');
      if (localCreatures) {
        console.log('[FishEditorCanvas] Clearing localStorage fish_game_creatures cache');
        localStorage.removeItem('fish_game_creatures');
      }
    } catch (err) {
      console.warn('[FishEditorCanvas] Could not clear localStorage:', err);
    }

    // 3. Clear all in-memory tracking refs
    fishSpriteUrlsRef.current.clear();
    spriteVersionRef.current.clear();
    spriteCacheRef.current.clear();

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
        img.src = spriteUrl;
        return;
      }

      try {
        // Use fetch with cache: 'reload' to bypass browser cache entirely
        const cleanUrl = spriteUrl.split('?')[0];
        console.log('[FishEditorCanvas] Fetching fresh:', cleanUrl);
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
          console.error('Failed to load sprite after fetch:', fishId);
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      } catch (err) {
        console.error('Failed to fetch sprite:', fishId, err);
      }
    };

    // 5. Reload all fish sprites (growth-aware)
    const reloadPromises: Promise<void>[] = [];
    fishListRef.current.forEach((fish) => {
      // Get creature data for growth-aware sprite selection
      const creatureData = fish.creatureData || fishDataRef.current.get(fish.id);
      let spriteUrl = creatureData?.sprite || spawnedFish.find(f => f.id === fish.id)?.sprite;

      // Select growth-stage-aware sprite based on fish's current size
      if (creatureData?.growthSprites && spriteUrl) {
        const { sprite: growthSprite } = getGrowthStageSprite(creatureData, fish.size, fish.id);
        spriteUrl = growthSprite;
      }

      if (spriteUrl) {
        console.log('[FishEditorCanvas] Queuing reload for:', fish.id, 'size:', fish.size);
        reloadPromises.push(
          reloadSprite(fish.id, spriteUrl, (processedSprite) => {
            fish.sprite = processedSprite;
            spriteCacheRef.current.set(fish.id, processedSprite);
            fishSpriteUrlsRef.current.set(fish.id, spriteUrl!);
          })
        );
      }
    });

    // 6. Also reload player sprite (growth-aware)
    if (playerRef.current.sprite && playerFishSprite) {
      let playerSpriteUrl = playerFishSprite;
      if (playerCreature?.growthSprites) {
        const { sprite: growthSprite } = getGrowthStageSprite(playerCreature, playerRef.current.size, 'player');
        playerSpriteUrl = growthSprite;
      }
      console.log('[FishEditorCanvas] Queuing player sprite reload, size:', playerRef.current.size);
      reloadPromises.push(
        reloadSprite('player', playerSpriteUrl, (processedSprite) => {
          playerRef.current.sprite = processedSprite;
        })
      );
    }

    await Promise.all(reloadPromises);
    console.log('[FishEditorCanvas] All sprites reloaded!');

    // Notify parent
    if (onCacheRefreshed) {
      onCacheRefreshed();
    }
  }, [spawnedFish, playerFishSprite, onCacheRefreshed]);

  // Listen for global refresh event
  useEffect(() => {
    const handleRefresh = () => {
      refreshAllSprites().catch(err => console.error('[FishEditorCanvas] Refresh error:', err));
    };
    window.addEventListener('refreshFishSprites', handleRefresh);
    return () => window.removeEventListener('refreshFishSprites', handleRefresh);
  }, [refreshAllSprites]);

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
      console.error('[FishEditorCanvas] Failed to load growth sprite:', spriteUrl);
    };
    img.src = spriteUrl;
  }, []);

  // Listen for fish size updates from the size slider
  useEffect(() => {
    const handleSizeUpdate = (e: CustomEvent<{ fishId: string; size: number }>) => {
      const { fishId, size } = e.detail;

      // Update player if that's the target
      if (fishId === 'player' || fishId === playerRef.current.id) {
        const oldSize = playerRef.current.size;
        playerRef.current.size = size;

        // Check if player growth stage changed
        if (playerCreature?.growthSprites) {
          const oldStage = getGrowthStage(oldSize, playerCreature.growthSprites);
          const newStage = getGrowthStage(size, playerCreature.growthSprites);

          if (oldStage !== newStage) {
            console.log(`[FishEditorCanvas] Player growth stage changed: ${oldStage} -> ${newStage}`);
            // Reload player sprite for new growth stage
            const { sprite: spriteUrl } = getGrowthStageSprite(playerCreature, size, 'player');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              playerRef.current.sprite = removeBackground(img, chromaToleranceRef.current);
            };
            img.src = spriteUrl;
          }
        }
        return;
      }

      // Update fish in fishListRef
      const fish = fishListRef.current.find(f => f.id === fishId);
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
            console.log(`[FishEditorCanvas] Fish ${fishId} growth stage changed: ${oldStage} -> ${newStage}`);
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
            img.src = spriteUrl;
          }
        }
      }
    };

    window.addEventListener('updateFishSize', handleSizeUpdate as EventListener);
    return () => window.removeEventListener('updateFishSize', handleSizeUpdate as EventListener);
  }, [playerCreature, loadGrowthAwareSprite]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Keep spawn pool in sync for respawn (use full list so weighting matches initial spawn)
    spawnPoolRef.current = spawnedFish.length ? [...spawnedFish] : [];

    // Helper to load and process a sprite with resolution awareness
    const loadSprite = (
      spriteUrl: string,
      fishId: string,
      onLoaded: (processedSprite: HTMLCanvasElement) => void,
      options?: {
        spriteResolutions?: SpriteResolutions;
        fishSize?: number;
      }
    ) => {
      // Calculate screen size to determine appropriate resolution
      const fishSize = options?.fishSize || 60; // Default size
      const currentZoom = zoomRef.current;
      const screenSize = fishSize * currentZoom;

      // Get the appropriate sprite URL based on screen size
      let finalUrl = spriteUrl;
      let resolution: 'high' | 'medium' | 'low' = 'high';

      if (options?.spriteResolutions) {
        finalUrl = getSpriteUrl({ sprite: spriteUrl, spriteResolutions: options.spriteResolutions }, screenSize, fishId);
        resolution = getResolutionKey(screenSize);
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSprite = removeBackground(img, chromaToleranceRef.current);
        onLoaded(processedSprite);
      };
      img.onerror = () => {
        console.error('Failed to load fish sprite:', finalUrl);
      };
      // For data: URLs, use as-is; for HTTP(S), add cache buster to force reload
      if (finalUrl.startsWith('data:')) {
        img.src = finalUrl;
      } else {
        // Add cache buster with version to force reload after save
        const version = spriteVersionRef.current.get(fishId) || 0;
        img.src = `${finalUrl.split('?')[0]}?v=${version}&t=${Date.now()}`;
      }
    };

    spawnedFish.forEach((fishItem) => {
      if (eatenIdsRef.current.has(fishItem.id)) return;

      const existingFish = fishListRef.current.find((f) => f.id === fishItem.id);
      const previousSpriteUrl = fishSpriteUrlsRef.current.get(fishItem.id);

      // Get full creature data - either directly if it's a Creature, or look up from fishDataRef
      let creatureForSprite: Creature | undefined;
      if (isCreature(fishItem)) {
        creatureForSprite = fishItem;
      } else {
        // Look up by direct ID first, then by creatureId if it exists
        creatureForSprite = fishDataRef.current.get(fishItem.id) as Creature | undefined;
        if (!creatureForSprite) {
          const creatureId = (fishItem as { creatureId?: string }).creatureId;
          if (creatureId) {
            creatureForSprite = fishDataRef.current.get(creatureId) as Creature | undefined;
          }
        }
      }

      // Determine fish size for growth-aware sprite selection
      const fishSizeForSprite = creatureForSprite?.stats?.size ||
        (fishItem.type === 'prey' ? 60 : fishItem.type === 'predator' ? 120 : 90);

      // Select growth-stage-aware sprite URL based on fish's spawn size
      let currentSpriteUrl = fishItem.sprite;
      let initialGrowthStage: 'juvenile' | 'adult' | 'elder' | undefined;
      if (creatureForSprite?.growthSprites) {
        initialGrowthStage = getGrowthStage(fishSizeForSprite, creatureForSprite.growthSprites);
        const { sprite: growthSprite } = getGrowthStageSprite(creatureForSprite, fishSizeForSprite, fishItem.id);
        currentSpriteUrl = growthSprite;
        console.log(`[FishEditorCanvas] Spawning ${fishItem.id} at size ${fishSizeForSprite} with ${initialGrowthStage} sprite`);
      }

      // Detect changes: URL changed OR it was a data URL and now it's a blob URL (after save)
      const wasDataUrl = previousSpriteUrl?.startsWith('data:') || false;
      const isNowBlobUrl = currentSpriteUrl && !currentSpriteUrl.startsWith('data:');
      const urlChanged = previousSpriteUrl !== currentSpriteUrl;
      const savedToBlobAfterRegenerate = wasDataUrl && isNowBlobUrl;
      const spriteChanged = urlChanged || savedToBlobAfterRegenerate;

      // Debug logging for sprite changes
      if (existingFish && (urlChanged || savedToBlobAfterRegenerate)) {
        console.log('[FishEditorCanvas] Sprite state for', fishItem.id, ':', {
          previousUrl: previousSpriteUrl?.substring(0, 50),
          currentUrl: currentSpriteUrl?.substring(0, 50),
          wasDataUrl,
          isNowBlobUrl,
          urlChanged,
          savedToBlobAfterRegenerate,
          willReload: spriteChanged
        });
      }

      // Update tracked sprite URL
      fishSpriteUrlsRef.current.set(fishItem.id, currentSpriteUrl);

      // Get creature data for resolution selection
      const creatureForResolution = isCreature(fishItem) ? fishItem : undefined;
      const fishSizeForResolution = creatureForResolution?.stats.size ||
        (fishItem.type === 'prey' ? 60 : fishItem.type === 'predator' ? 120 : 90);
      const spriteResolutions = creatureForResolution?.spriteResolutions;

      // Calculate cache key with resolution
      const screenSize = fishSizeForResolution * zoomRef.current;
      const resolution = getResolutionKey(screenSize);
      const cacheKey = `${fishItem.id}:${resolution}`;

      if (existingFish && spriteChanged) {
        // SPRITE CHANGED - reload the sprite for existing fish
        // Increment version to bust cache
        const newVersion = (spriteVersionRef.current.get(fishItem.id) || 0) + 1;
        spriteVersionRef.current.set(fishItem.id, newVersion);
        console.log('[FishEditorCanvas] Sprite changed for fish:', fishItem.id, '- reloading (version:', newVersion, ')');
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          existingFish.sprite = processedSprite;
          // Update cache for respawn with resolution-aware key
          spriteCacheRef.current.set(cacheKey, processedSprite);
        }, { spriteResolutions, fishSize: fishSizeForResolution });
      } else if (!existingFish) {
        // NEW FISH - add to list
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          // Cache by creature id + resolution for respawn in game mode
          spriteCacheRef.current.set(cacheKey, processedSprite);

          // Check if this is a full Creature object or legacy format
          let fishSize: number;
          let baseSpeed: number;
          let fishType: string;
          let creatureData: Creature | undefined;

          if (isCreature(fishItem)) {
            // Use full creature metadata
            fishSize = fishItem.stats.size;
            baseSpeed = fishItem.stats.speed ?? 2;
            fishType = fishItem.type;
            creatureData = fishItem;
          } else {
            // Legacy format - use creatureForSprite (already looked up) or defaults
            const defaultSize = fishItem.type === 'prey' ? 60 : fishItem.type === 'predator' ? 120 : 90;
            fishSize = creatureForSprite?.stats?.size ?? defaultSize;
            baseSpeed = creatureForSprite?.stats?.speed ?? 2;
            fishType = fishItem.type;
            creatureData = creatureForSprite; // Store creature data for growth stage tracking
          }

          // Calculate velocity based on speed
          const speedScale = 0.1; // Scale down for canvas movement
          const vx = (Math.random() - 0.5) * baseSpeed * speedScale;
          const vy = (Math.random() - 0.5) * baseSpeed * speedScale;

          // Spawn fish at a safe distance from player, swimming inward
          const playerPos = playerRef.current;
          const bounds = worldBoundsRef.current;
          const MIN_SPAWN_DIST = 400; // Spawn off-screen

          // Random angle and spawn at edge of play area
          const angle = Math.random() * Math.PI * 2;
          const distance = MIN_SPAWN_DIST + Math.random() * 300;
          let spawnX = playerPos.x + Math.cos(angle) * distance;
          let spawnY = playerPos.y + Math.sin(angle) * distance;

          // Clamp to world bounds
          spawnX = Math.max(bounds.minX, Math.min(bounds.maxX, spawnX));
          spawnY = Math.max(bounds.minY, Math.min(bounds.maxY, spawnY));

          // Stagger spawn times to avoid performance spike
          // Each fish spawns 100-200ms after the previous one
          const spawnIndex = fishListRef.current.length;
          const staggerDelay = spawnIndex * (100 + Math.random() * 100);

          // Initialize video sprite if creature has clips
          const clips = isCreature(fishItem) ? fishItem.clips : undefined;
          let videoSprite: VideoSprite | undefined;
          if (clips && hasUsableClips(clips)) {
            videoSprite = videoSpriteManagerRef.current.getSprite(fishItem.id, clips, {
              chromaTolerance: chromaToleranceRef.current,
            });
            // Initialize clip state machine
            const availableActions = Object.keys(clips) as ClipAction[];
            clipStateManagerRef.current.getStateMachine(fishItem.id, availableActions);
          }

          const newFish = {
            id: fishItem.id,
            x: spawnX,
            y: spawnY,
            vx,
            vy,
            size: fishSize,
            sprite: processedSprite,
            type: fishType,
            facingRight: vx >= 0,
            verticalTilt: 0,
            animTime: Math.random() * Math.PI * 2,
            // Store creature metadata if available
            creatureData,
            // Track current growth stage for sprite swapping
            currentGrowthStage: initialGrowthStage,
            // Spawn/despawn animation
            spawnTime: performance.now() + staggerDelay,
            despawnTime: undefined,
            opacity: 0,
            lifecycleState: 'spawning' as FishLifecycleState,
            // Video clip animation
            clips,
            videoSprite,
          };
          fishListRef.current.push(newFish);
        }, { spriteResolutions, fishSize: fishSizeForResolution });
      }
    });

    fishListRef.current = fishListRef.current.filter((fish) =>
      spawnedFish.find((f) => f.id === fish.id) || fish.id.includes('-r-')
    );
    // Clear eaten set when user clears all fish
    if (spawnedFish.length === 0) eatenIdsRef.current.clear();
  }, [spawnedFish]);

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
      const key = e.key.toLowerCase();
      keyKeysRef.current.add(key);

    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyKeysRef.current.delete(key);
    };

    // Wheel zoom handler (desktop) - works in all modes
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1; // 10% per scroll tick
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomRef.current * zoomDelta));
      targetZoomRef.current = newZoom;
    };

    // Helper to calculate distance between two touches
    const getTouchDistance = (t1: Touch, t2: Touch): number => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Pinch-to-zoom handlers (mobile) - works in all modes
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Start pinch gesture
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        pinchRef.current = { startDistance: dist, startZoom: targetZoomRef.current };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault(); // Prevent page zoom
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = dist / pinchRef.current.startDistance;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.startZoom * scale));
        targetZoomRef.current = newZoom;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        // End pinch gesture
        pinchRef.current = null;
      }
    };

    const hasKey = (k: string) => keyKeysRef.current.has(k);

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

    // Game physics constants
    const MAX_SPEED = 1.5;
    const ACCELERATION = 0.15;
    const FRICTION = 0.92;

    const gameLoop = () => {
      const player = playerRef.current;
      const isPaused = pausedRef.current;

      // Calculate delta time for frame-rate independent movement
      const currentTime = performance.now();
      let deltaTime = 1; // Default to 1 for first frame (normalized to 60fps)
      if (lastFrameTimeRef.current > 0) {
        const frameDelta = currentTime - lastFrameTimeRef.current;
        // Normalize delta time to 60fps (16.67ms per frame)
        // This means all movement values work as if running at 60fps
        deltaTime = Math.min(frameDelta / 16.67, 3); // Cap at 3x to prevent huge jumps
        frameTimesRef.current.push(frameDelta);
        if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();
      }
      lastFrameTimeRef.current = currentTime;

      // Skip game state updates if paused, but continue to render

      // Track pause time for level timer
      if (isPaused && !wasPausedRef.current) {
        // Just became paused - record start time
        pauseStartTimeRef.current = Date.now();
        wasPausedRef.current = true;
      } else if (!isPaused && wasPausedRef.current) {
        // Just unpaused - add paused duration to total
        totalPausedTimeRef.current += Date.now() - pauseStartTimeRef.current;
        wasPausedRef.current = false;
      }

      // Initialize game start time in game mode
      if (gameMode && gameStartTimeRef.current === 0) {
        gameStartTimeRef.current = Date.now();
        fishEatenRef.current = 0;
        scoreRef.current = 0;
        totalPausedTimeRef.current = 0; // Reset paused time on new game

        // Load essence collected from run state
        const runState = loadRunState();
        if (runState) {
          const totalEssence = Object.values(runState.collectedEssence).reduce((sum, val) => sum + val, 0);
          essenceCollectedRef.current = totalEssence;
        } else {
          essenceCollectedRef.current = 0;
        }
      }

      // Check game timer in game mode (only when not paused)
      if (gameMode && !levelCompleteFiredRef.current && !gameOverFiredRef.current && !isPaused) {
        const elapsed = Date.now() - gameStartTimeRef.current - totalPausedTimeRef.current;
        if (elapsed >= levelDuration) {
          // Level complete - end immediately
          levelCompleteFiredRef.current = true;
          if (onLevelComplete) {
            onLevelComplete(scoreRef.current);
          }
          return; // Stop game loop
        }

        // Sync essence collected from run state (updated by engine)
        const runState = loadRunState();
        if (runState) {
          const totalEssence = Object.values(runState.collectedEssence).reduce((sum, val) => sum + val, 0);
          essenceCollectedRef.current = totalEssence;
        }
      }

      // Lock movement in edit mode or when paused
      const currentEditMode = editModeRef.current;
      if (!currentEditMode && !isPaused) {
        // Use joystick if active, otherwise keyboard
        if (joystickActiveRef.current) {
          // Analog joystick control - smooth velocity
          player.vx = joystickVelocityRef.current.x * MAX_SPEED;
          player.vy = joystickVelocityRef.current.y * MAX_SPEED;
        } else {
          // Keyboard control with acceleration and friction (delta-time adjusted)
          const accel = ACCELERATION * deltaTime;
          const friction = Math.pow(FRICTION, deltaTime); // Correct friction for variable framerate

          if (hasKey('w') || hasKey('arrowup')) player.vy -= accel;
          if (hasKey('s') || hasKey('arrowdown')) player.vy += accel;
          if (hasKey('a') || hasKey('arrowleft')) player.vx -= accel;
          if (hasKey('d') || hasKey('arrowright')) player.vx += accel;
          player.vx *= friction;
          player.vy *= friction;
        }

        let speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
        if (speed > MAX_SPEED) {
          player.vx = (player.vx / speed) * MAX_SPEED;
          player.vy = (player.vy / speed) * MAX_SPEED;
          speed = MAX_SPEED;
        }

        // Delta-time adjusted position update
        player.x += player.vx * deltaTime;
        player.y += player.vy * deltaTime;
      } else {
        // In edit mode, stop player movement
        player.vx = 0;
        player.vy = 0;
      }

      // Update facing direction based on horizontal velocity
      if (Math.abs(player.vx) > 0.1) {
        player.facingRight = player.vx > 0;
      }

      const maxTilt = Math.PI / 6;
      const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, player.vy * 0.3));
      player.verticalTilt += (targetTilt - player.verticalTilt) * 0.1;

      // Movement-based animation: faster tail cycle when swimming
      const rawPlayerSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
      const normalizedSpeed = Math.min(1, rawPlayerSpeed / MAX_SPEED);
      player.animTime += 0.05 + normalizedSpeed * 0.06;

      // Update chomp phase (decay over ~280ms)
      const now = performance.now();
      if (player.chompEndTime > now) {
        player.chompPhase = (player.chompEndTime - now) / 280;
      } else {
        player.chompPhase = 0;
      }

      // Update hunger in game mode (movement-based, delta-time adjusted)
      if (gameMode && !isPaused) {
        // Hunger only drains when moving - proportional to speed
        // normalizedSpeed is 0 when still, 1 at max speed
        const movementFactor = normalizedSpeed;
        const effectiveDrainRate = player.hungerDrainRate * movementFactor;
        player.hunger = Math.max(0, player.hunger - (effectiveDrainRate / HUNGER_FRAME_RATE) * deltaTime);

        // Check starvation death
        if (player.hunger <= 0 && !gameOverFiredRef.current) {
          // Trigger death animation on player
          clipStateManagerRef.current.processEvent('player', { type: 'death' });

          gameOverFiredRef.current = true;
          if (onGameOver) {
            const timeSurvived = Math.floor((now - gameStartTimeRef.current - totalPausedTimeRef.current) / 1000);
            onGameOver({
              score: scoreRef.current,
              cause: 'starved',
              size: player.size,
              fishEaten: fishEatenRef.current,
              essenceCollected: essenceCollectedRef.current,
              timeSurvived,
            });
          }
          return;
        }
      }

      // Collision: eat prey and check predators (head-based hitboxes)
      // Hitbox is at the "mouth" of the fish (front 30% of body)
      const getHeadPosition = (fishObj: { x: number; y: number; size: number; facingRight: boolean }) => {
        const headOffset = fishObj.size * 0.35; // Head is 35% from center toward front
        return {
          x: fishObj.x + (fishObj.facingRight ? headOffset : -headOffset),
          y: fishObj.y,
        };
      };

      const playerHead = getHeadPosition(player);
      const playerHeadR = player.size * 0.25; // Smaller head hitbox

      for (let idx = fishListRef.current.length - 1; idx >= 0; idx--) {
        const fish = fishListRef.current[idx];

        // Skip collision for fish still fading in (not fully opaque yet)
        if ((fish.opacity ?? 1) < 1) {
          continue;
        }

        const fishHead = getHeadPosition(fish);
        const fishHeadR = fish.size * 0.25; // Smaller head hitbox

        // Check head-to-head collision (eating happens when mouths touch)
        const dx = fishHead.x - playerHead.x;
        const dy = fishHead.y - playerHead.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < playerHeadR + fishHeadR) {
          // In game mode, check if player can eat this fish or gets eaten
          if (gameMode) {
            if (fish.size > player.size * 1.2) {
              // Trigger death animation on player before game over
              clipStateManagerRef.current.processEvent('player', { type: 'death' });

              // Player is eaten by larger fish - GAME OVER
              if (!gameOverFiredRef.current) {
                gameOverFiredRef.current = true;
                if (onGameOver) {
                  const timeSurvived = Math.floor((now - gameStartTimeRef.current - totalPausedTimeRef.current) / 1000);
                  onGameOver({
                    score: scoreRef.current,
                    cause: 'eaten',
                    size: player.size,
                    fishEaten: fishEatenRef.current,
                    essenceCollected: essenceCollectedRef.current,
                    timeSurvived,
                  });
                }
              }
              return; // Stop game loop
            } else if (player.size > fish.size * 1.2) {
              // Player eats fish
              fishEatenRef.current += 1;
              eatenIdsRef.current.add(fish.id);
              fishListRef.current.splice(idx, 1);

              // Diminishing returns: bigger fish relative to prey = less growth
              // Encourages eating appropriately-sized targets, not grinding tiny fish
              const sizeRatio = player.size / fish.size;
              const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
              const sizeGain = fish.size * 0.15 * efficiencyMult;
              const oldPlayerSize = player.size;
              player.size = Math.min(200, player.size + sizeGain);

              // Check if player crossed a growth stage threshold
              if (playerCreature?.growthSprites) {
                const oldStage = getGrowthStage(oldPlayerSize, playerCreature.growthSprites);
                const newStage = getGrowthStage(player.size, playerCreature.growthSprites);

                // Log size progress periodically (every 5 size units)
                if (Math.floor(player.size / 5) !== Math.floor(oldPlayerSize / 5)) {
                  console.log(`[Growth] Player size: ${player.size.toFixed(1)}, stage: ${newStage}, has growthSprites:`, Object.keys(playerCreature.growthSprites));
                }

                if (oldStage !== newStage) {
                  console.log(`[Growth] Player grew from ${oldStage} to ${newStage} (size: ${oldPlayerSize.toFixed(1)} -> ${player.size.toFixed(1)})`);
                  // Reload sprite for new growth stage
                  const { sprite: spriteUrl } = getGrowthStageSprite(playerCreature, player.size, 'player');
                  console.log(`[Growth] Loading new sprite: ${spriteUrl.substring(0, 80)}...`);
                  const growthImg = new Image();
                  growthImg.crossOrigin = 'anonymous';
                  growthImg.onload = () => {
                    console.log(`[Growth] Sprite loaded successfully for ${newStage}`);
                    player.sprite = removeBackground(growthImg, chromaToleranceRef.current);
                  };
                  growthImg.onerror = (e) => {
                    console.error(`[Growth] Failed to load sprite for ${newStage}:`, e);
                  };
                  growthImg.src = spriteUrl;
                }
              } else {
                // Log if we're missing growth sprites
                if (Math.floor(player.size / 10) !== Math.floor(oldPlayerSize / 10)) {
                  console.log(`[Growth] Player size: ${player.size.toFixed(1)}, NO growthSprites available`);
                }
              }

              // Restore hunger based on fish size
              const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
              player.hunger = Math.min(HUNGER_MAX, player.hunger + hungerRestore);

              player.chompPhase = 1;
              player.chompEndTime = now + 280;
              const eatX = (fish.x + player.x) * 0.5;
              const eatY = (fish.y + player.y) * 0.5;

              // Trigger bite animation on player (if clip state machine exists)
              clipStateManagerRef.current.processEvent('player', { type: 'bite' });

              // Haptic feedback
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50); // Short vibration on eat
              }

              // Create chomp particles (CHOMP text + decoration symbols, NO hearts)
              for (let k = 0; k < 5; k++) {
                chompParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * 16,
                  y: eatY + (Math.random() - 0.5) * 16,
                  life: 1,
                  scale: 1 + Math.random() * 0.5,
                  text: k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4], // Removed heart, added star
                  punchScale: 1.5, // Start with punch effect
                });
              }

              // Add essence notifications with colors if creature data available
              if (fish.creatureData?.essenceTypes && fish.creatureData.essenceTypes.length > 0) {
                fish.creatureData.essenceTypes.forEach((essenceConfig, idx) => {
                  const essenceType = ESSENCE_TYPES[essenceConfig.type];
                  if (essenceType) {
                    chompParticlesRef.current.push({
                      x: eatX + (Math.random() - 0.5) * 24,
                      y: eatY - 20 - (idx * 18), // Stack vertically
                      life: 1.5,
                      scale: 1.4,
                      text: `+${essenceConfig.baseYield} ${essenceType.name}`,
                      color: essenceType.color,
                      punchScale: 1.8, // Bigger punch for essence
                    });
                  }
                });
              }

              // Add hunger restore notification
              if (hungerRestore > 0) {
                chompParticlesRef.current.push({
                  x: player.x,
                  y: player.y - player.size * 0.6,
                  life: 1.5,
                  scale: 1.2,
                  text: `+${Math.ceil(hungerRestore)}`,
                  color: '#4ade80', // Green for hunger
                  punchScale: 1.6,
                });
              }
              for (let b = 0; b < 22; b++) {
                bloodParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * fish.size * 1.2,
                  y: eatY + (Math.random() - 0.5) * fish.size * 1.2,
                  life: 1,
                  radius: 4 + Math.random() * 10,
                });
              }
            }
          } else {
            // Editor mode - only eat prey type
            if (fish.type !== 'prey') continue;
            eatenIdsRef.current.add(fish.id);
            fishListRef.current.splice(idx, 1);
            // Diminishing returns in editor mode too
            const sizeRatio = player.size / fish.size;
            const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
            const sizeGain = fish.size * 0.15 * efficiencyMult;
            const oldPlayerSize = player.size;
            player.size = Math.min(200, player.size + sizeGain);

            // Check if player crossed a growth stage threshold (editor mode)
            if (playerCreature?.growthSprites) {
              const oldStage = getGrowthStage(oldPlayerSize, playerCreature.growthSprites);
              const newStage = getGrowthStage(player.size, playerCreature.growthSprites);
              if (oldStage !== newStage) {
                console.log(`[Growth] Player grew from ${oldStage} to ${newStage} (size: ${oldPlayerSize.toFixed(1)} -> ${player.size.toFixed(1)})`);
                const { sprite: spriteUrl } = getGrowthStageSprite(playerCreature, player.size, 'player');
                const growthImg = new Image();
                growthImg.crossOrigin = 'anonymous';
                growthImg.onload = () => {
                  player.sprite = removeBackground(growthImg, chromaToleranceRef.current);
                };
                growthImg.src = spriteUrl;
              }
            }

            player.chompPhase = 1;
            player.chompEndTime = now + 280;
            const eatX = (fish.x + player.x) * 0.5;
            const eatY = (fish.y + player.y) * 0.5;

            // Trigger bite animation on player (if clip state machine exists)
            clipStateManagerRef.current.processEvent('player', { type: 'bite' });

            // Haptic feedback
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(50); // Short vibration on eat
            }

            // Create chomp particles (CHOMP text + decoration symbols, NO hearts)
            for (let k = 0; k < 5; k++) {
              chompParticlesRef.current.push({
                x: eatX + (Math.random() - 0.5) * 16,
                y: eatY + (Math.random() - 0.5) * 16,
                life: 1,
                scale: 1 + Math.random() * 0.5,
                text: k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4], // Removed heart, added star
                punchScale: 1.5, // Start with punch effect
              });
            }
            for (let b = 0; b < 22; b++) {
              bloodParticlesRef.current.push({
                x: eatX + (Math.random() - 0.5) * fish.size * 1.2,
                y: eatY + (Math.random() - 0.5) * fish.size * 1.2,
                life: 1,
                radius: 4 + Math.random() * 10,
              });
            }
          }
        }
      }

      chompParticlesRef.current = chompParticlesRef.current.filter((p) => {
        p.life -= 0.01;
        // Decay punch scale for punch animation effect
        if (p.punchScale !== undefined && p.punchScale > 1) {
          p.punchScale = Math.max(1, p.punchScale - 0.08);
        }
        return p.life > 0;
      });

      bloodParticlesRef.current = bloodParticlesRef.current.filter((b) => {
        b.life -= 0.007;
        return b.life > 0;
      });

      // Game mode: continuous respawn so player doesn't run out of prey
      if (gameMode && spawnPoolRef.current.length > 0) {
        const pool = spawnPoolRef.current;
        const now = performance.now();
        if (
          now - lastRespawnTimeRef.current >= RESPAWN_INTERVAL_MS &&
          fishListRef.current.length < MAX_FISH_IN_WORLD
        ) {
          const creature = pool[Math.floor(Math.random() * pool.length)];
          const fishSize = isCreature(creature) ? creature.stats.size : 60;
          // Get sprite from cache using resolution-aware key
          const screenSize = fishSize * zoomRef.current;
          const resolution = getResolutionKey(screenSize);
          const cacheKey = `${creature.id}:${resolution}`;
          const sprite = spriteCacheRef.current.get(cacheKey) || spriteCacheRef.current.get(creature.id);
          if (sprite && canvas) {
            const baseSpeed = isCreature(creature) ? (creature.stats.speed ?? 2) : 2;
            const speedScale = 0.1;
            const vx = (Math.random() - 0.5) * baseSpeed * speedScale;
            const vy = (Math.random() - 0.5) * baseSpeed * speedScale;
            const bounds = worldBoundsRef.current;

            // Respawn at edge of visible area, swimming inward
            const MIN_SPAWN_DIST = 500; // Off-screen
            const angle = Math.random() * Math.PI * 2;
            const distance = MIN_SPAWN_DIST + Math.random() * 200;
            let spawnX = player.x + Math.cos(angle) * distance;
            let spawnY = player.y + Math.sin(angle) * distance;

            // Clamp to bounds
            spawnX = Math.max(bounds.minX, Math.min(bounds.maxX, spawnX));
            spawnY = Math.max(bounds.minY, Math.min(bounds.maxY, spawnY));

            const newFish = {
              id: `${creature.id}-r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              x: spawnX,
              y: spawnY,
              vx,
              vy,
              size: fishSize,
              sprite,
              type: isCreature(creature) ? creature.type : 'prey',
              facingRight: vx >= 0,
              verticalTilt: 0,
              animTime: Math.random() * Math.PI * 2,
              creatureData: isCreature(creature) ? creature : undefined,
              // Spawn/despawn animation
              spawnTime: now,
              despawnTime: undefined,
              opacity: 0,
              lifecycleState: 'spawning' as FishLifecycleState,
            };
            fishListRef.current.push(newFish);
          }
          lastRespawnTimeRef.current = now;
        }
      }

      // Constrain player to world bounds (unified for all modes)
      const bounds = worldBoundsRef.current;
      player.x = Math.max(bounds.minX, Math.min(bounds.maxX, player.x));
      player.y = Math.max(bounds.minY, Math.min(bounds.maxY, player.y));

      // Camera follow: in play mode (not edit, not paused), follow player
      // In edit/paused mode, camera is controlled by pan (handled elsewhere)
      if (!currentEditMode && !isPaused) {
        cameraRef.current.x = player.x;
        cameraRef.current.y = player.y;
      }

      // Game mode specific: update score and report stats
      if (gameMode) {
        // Update score based on size
        scoreRef.current = Math.floor((player.size - player.baseSize) * 10);

        // Report stats to parent (throttled to ~4fps to avoid excessive updates)
        if (onStatsUpdate && Math.random() < 0.07) {
          const timeSurvived = Math.floor((Date.now() - gameStartTimeRef.current - totalPausedTimeRef.current) / 1000);
          onStatsUpdate({
            size: player.size,
            hunger: player.hunger,
            score: scoreRef.current,
            fishEaten: fishEatenRef.current,
            timeSurvived,
          });
        }
      }

      // Update AI fish (lock movement in edit mode or when paused)
      fishListRef.current.forEach((fish) => {
        // Update opacity based on lifecycle state (spawn fade-in or despawn fade-out)
        if (fish.despawnTime !== undefined) {
          // Despawning: fade out from 1 to 0
          const elapsed = now - fish.despawnTime;
          fish.opacity = Math.max(0, 1 - elapsed / SPAWN_FADE_DURATION);
          if (fish.opacity <= 0) {
            fish.lifecycleState = 'removed';
          }
        } else if (fish.spawnTime !== undefined) {
          // Spawning: fade in from 0 to 1
          const elapsed = now - fish.spawnTime;
          // Clamp to 0-1 range (negative elapsed = fish hasn't "spawned" yet)
          fish.opacity = Math.max(0, Math.min(1, elapsed / SPAWN_FADE_DURATION));
          if (fish.opacity >= 1 && fish.lifecycleState === 'spawning') {
            fish.lifecycleState = 'active';
          }
        } else {
          fish.opacity = 1; // Legacy fish without spawnTime
          if (!fish.lifecycleState) {
            fish.lifecycleState = 'active';
          }
        }

        if (!currentEditMode && !isPaused) {
          // Delta-time adjusted position update
          fish.x += fish.vx * deltaTime;
          fish.y += fish.vy * deltaTime;
        } else {
          // Lock fish movement in edit mode
          fish.vx = 0;
          fish.vy = 0;
        }

        // Update facing direction
        if (Math.abs(fish.vx) > 0.1) {
          fish.facingRight = fish.vx > 0;
        }

        // Update vertical tilt
        const maxTilt = Math.PI / 6;
        const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, fish.vy * 0.3));
        fish.verticalTilt += (targetTilt - fish.verticalTilt) * 0.1;

        const fishSpeed = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
        fish.animTime += 0.04 + Math.min(0.04, (fishSpeed / 1.5) * 0.04);

        // Keep fish in world bounds (unified for all modes) - bounce off edges
        const bounds = worldBoundsRef.current;
        if (fish.x < bounds.minX || fish.x > bounds.maxX) {
          fish.vx = -fish.vx;
          fish.x = Math.max(bounds.minX, Math.min(bounds.maxX, fish.x));
        }
        if (fish.y < bounds.minY || fish.y > bounds.maxY) {
          fish.vy = -fish.vy;
          fish.y = Math.max(bounds.minY, Math.min(bounds.maxY, fish.y));
        }

        // Occasional direction change
        if (Math.random() < 0.01) {
          fish.vx = (Math.random() - 0.5) * 2;
          fish.vy = (Math.random() - 0.5) * 2;
        }
      });

      // Clean up fish that have finished despawning
      // Don't remove fish while in edit mode - we need them for respawn when exiting
      if (!currentEditMode) {
        fishListRef.current = fishListRef.current.filter(f => f.lifecycleState !== 'removed');
      }

      // Update water effect time
      waterTimeRef.current += 0.01;

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Enable high-quality image smoothing for better fish rendering on mobile
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Calculate target zoom and camera for edit mode
      // Use current targetZoomRef as base (preserves wheel/slider changes)
      let targetCameraX = 0;
      let targetCameraY = 0;
      let useEditModeCamera = false;

      const currentSelectedFishId = selectedFishIdRef.current;
      // Follow camera when editing OR when paused with a selected fish (for navigation)
      if ((currentEditMode || isPaused) && currentSelectedFishId) {
        // Check if selected fish is the player
        const isPlayerSelected = currentSelectedFishId === player.id;

        // Find selected fish in the spawned fish list or use player
        let selectedFish = isPlayerSelected ? null : fishListRef.current.find((f) => f.id === currentSelectedFishId);
        let selectedSize = 0;
        let selectedX = 0;
        let selectedY = 0;

        if (isPlayerSelected) {
          // Use player position
          selectedSize = player.size;
          selectedX = player.x;
          selectedY = player.y;
        } else if (selectedFish) {
          selectedSize = selectedFish.size;
          selectedX = selectedFish.x;
          selectedY = selectedFish.y;
        }

        if (selectedSize > 0) {
          useEditModeCamera = true;
          // Center camera on the selected fish
          targetCameraX = selectedX;
          targetCameraY = selectedY;
        }
      }

      // Only update camera target, NOT zoom (preserve user zoom from wheel/slider)
      targetCameraRef.current = { x: targetCameraX, y: targetCameraY };

      // Smooth interpolation (lerp) for zoom and camera
      const lerpSpeed = 0.12; // Faster for snappier response while still smooth
      animatedZoomRef.current += (targetZoomRef.current - animatedZoomRef.current) * lerpSpeed;
      animatedCameraRef.current.x += (targetCameraRef.current.x - animatedCameraRef.current.x) * lerpSpeed;
      animatedCameraRef.current.y += (targetCameraRef.current.y - animatedCameraRef.current.y) * lerpSpeed;

      // Use animated values
      const currentZoom = animatedZoomRef.current;
      const cameraX = animatedCameraRef.current.x;
      const cameraY = animatedCameraRef.current.y;

      // Check if we're close enough to target to snap (prevents endless tiny movements)
      const zoomDiff = Math.abs(targetZoomRef.current - animatedZoomRef.current);
      const cameraDiffX = Math.abs(targetCameraRef.current.x - animatedCameraRef.current.x);
      const cameraDiffY = Math.abs(targetCameraRef.current.y - animatedCameraRef.current.y);
      const isAnimating = zoomDiff > 0.01 || cameraDiffX > 1 || cameraDiffY > 1;

      // Apply zoom
      ctx.save();
      ctx.scale(currentZoom, currentZoom);
      const scaledWidth = canvas.width / currentZoom;
      const scaledHeight = canvas.height / currentZoom;

      // Determine if we're using edit mode camera
      const usingEditCamera = useEditModeCamera || (isAnimating && targetZoomRef.current !== zoomRef.current);

      // Calculate effective camera position BEFORE drawing (used for background parallax and transforms)
      let effectiveCamX = 0;
      let effectiveCamY = 0;

      if (currentEditMode || isPaused) {
        if (usingEditCamera) {
          effectiveCamX = cameraX;
          effectiveCamY = cameraY;
        } else {
          // Free pan mode
          effectiveCamX = cameraPanRef.current.x;
          effectiveCamY = cameraPanRef.current.y;
        }
      } else {
        // Play mode: follow player
        effectiveCamX = cameraRef.current.x;
        effectiveCamY = cameraRef.current.y;
      }

      // Store for click detection
      effectiveCameraRef.current = { x: effectiveCamX, y: effectiveCamY };

      // Draw background BEFORE camera translation (so it stays in place)
      // Use same parallax logic as game mode - background moves with camera but slower
      if (backgroundImageRef.current) {
        ctx.save();
        ctx.filter = 'blur(6px)';

        // Unified parallax background logic (same as game mode)
        // Uses effectiveCameraRef which tracks the actual camera position in all modes
        const parallaxFactor = 0.15;
        const bgScale = 1.3; // Scale up to provide buffer for parallax

        // Calculate scaling to maintain aspect ratio (cover mode)
        const img = backgroundImageRef.current;
        const imgAspect = img.width / img.height;
        const screenAspect = scaledWidth / scaledHeight;

        let drawWidth, drawHeight;
        if (imgAspect > screenAspect) {
          drawHeight = scaledHeight * bgScale;
          drawWidth = drawHeight * imgAspect;
        } else {
          drawWidth = scaledWidth * bgScale;
          drawHeight = drawWidth / imgAspect;
        }

        // Center background, then offset by camera * parallaxFactor
        // Clamp the offset to prevent showing edges
        const maxOffsetX = (drawWidth - scaledWidth) / 2;
        const maxOffsetY = (drawHeight - scaledHeight) / 2;
        const rawOffsetX = effectiveCamX * parallaxFactor;
        const rawOffsetY = effectiveCamY * parallaxFactor;
        const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
        const clampedOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));

        const bgX = (scaledWidth - drawWidth) / 2 - clampedOffsetX;
        const bgY = (scaledHeight - drawHeight) / 2 - clampedOffsetY;

        ctx.drawImage(backgroundImageRef.current, bgX, bgY, drawWidth, drawHeight);
        ctx.restore();

        // Add subtle vignette effect for polished look (both modes)
        ctx.save();
        const vignetteGradient = ctx.createRadialGradient(
          scaledWidth / 2, scaledHeight / 2, scaledHeight * 0.3,
          scaledWidth / 2, scaledHeight / 2, scaledHeight * 0.8
        );
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
        ctx.restore();

        // Optional: Simple water shimmer overlay (much faster than pixel distortion)
        if (enableWaterDistortion) {
          ctx.save();
          ctx.globalAlpha = 0.03;
          const time = waterTimeRef.current;

          // Draw wavy overlay patterns (very lightweight)
          for (let y = 0; y < scaledHeight; y += 30) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x < scaledWidth; x += 10) {
              const wave = Math.sin(x * 0.01 + time * 2 + y * 0.02) * 5;
              if (x === 0) {
                ctx.moveTo(x, y + wave);
              } else {
                ctx.lineTo(x, y + wave);
              }
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Default gradient background - account for camera offset
        // Draw a larger gradient that covers the view even with camera movement
        const offsetX = scaledWidth / 2 - effectiveCamX;
        const offsetY = scaledHeight / 2 - effectiveCamY;
        const gradient = ctx.createLinearGradient(-offsetX, -offsetY, -offsetX, scaledHeight - offsetY);
        gradient.addColorStop(0, '#1e40af');
        gradient.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = gradient;
        ctx.fillRect(-offsetX - scaledWidth, -offsetY - scaledHeight, scaledWidth * 3, scaledHeight * 3);
      }

      // Apply camera transform AFTER background is drawn
      // Uses effectiveCamX/effectiveCamY calculated earlier
      if (currentEditMode || isPaused) {
        if (usingEditCamera) {
          const topAreaCenterY = scaledHeight / 2;
          ctx.translate(scaledWidth / 2 - effectiveCamX, topAreaCenterY - effectiveCamY);
        } else {
          ctx.translate(scaledWidth / 2 - effectiveCamX, scaledHeight / 2 - effectiveCamY);
        }
      } else {
        ctx.translate(scaledWidth / 2 - effectiveCamX, scaledHeight / 2 - effectiveCamY);
      }

      // Draw AI fish with LOD based on screen-space size
      // Determine render context for clip mode decisions
      const renderContext: RenderContext = currentEditMode ? 'edit' : (gameMode ? 'game' : 'game');
      const buttonPositions = new Map<string, { x: number; y: number; size: number }>();
      fishListRef.current.forEach((fish) => {
        // Skip rendering fish that are fully despawned (kept in list for potential respawn)
        if (fish.lifecycleState === 'removed') {
          return;
        }

        const fishOpacity = fish.opacity ?? 1;
        const fishSpeed = Math.min(1, Math.sqrt(fish.vx ** 2 + fish.vy ** 2) / MAX_SPEED);
        const screenSize = fish.size * currentZoom;

        // Determine rendering mode based on LOD and clip availability
        const fishHasClips = hasUsableClips(fish.clips);
        const clipMode = getClipMode(screenSize, fishHasClips, renderContext);

        // Apply spawn fade-in opacity
        ctx.save();
        ctx.globalAlpha = fishOpacity;

        let rendered = false;

        // Try video rendering if in video mode with clips
        if (clipMode === 'video' && fish.clips && fish.videoSprite) {
          // Update clip state based on speed
          const clipStateManager = clipStateManagerRef.current;
          if (clipStateManager.hasStateMachine(fish.id)) {
            clipStateManager.processEvent(fish.id, { type: 'speed_change', speed: fishSpeed });
          }

          // Draw from video sprite
          rendered = fish.videoSprite.drawToContext(
            ctx,
            fish.x,
            fish.y,
            fish.size,
            fish.size,
            {
              flipX: !fish.facingRight,
              rotation: fish.facingRight ? fish.verticalTilt : -fish.verticalTilt,
            }
          );
        }

        // Fallback to deformation rendering if video not available/ready
        if (!rendered && fish.sprite) {
          const segments = getSegmentsSmooth(screenSize);

          drawFishWithDeformation(
            ctx,
            fish.sprite,
            fish.x,
            fish.y,
            fish.size,
            fish.animTime,
            fish.facingRight,
            {
              speed: fishSpeed,
              intensity: deformationRef.current,
              verticalTilt: fish.verticalTilt,
              segments
            }
          );
        } else if (!rendered && !fish.sprite) {
          // Fallback to colored circle if no sprite
          ctx.fillStyle = fish.type === 'prey' ? '#4ade80' : fish.type === 'predator' ? '#f87171' : '#a78bfa';
          ctx.beginPath();
          ctx.arc(fish.x, fish.y, fish.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Store position for edit button
        buttonPositions.set(fish.id, { x: fish.x, y: fish.y, size: fish.size });
      });

      // Draw player with LOD based on screen-space size
      const playerSpeed = Math.min(1, Math.sqrt(player.vx ** 2 + player.vy ** 2) / MAX_SPEED);
      if (player.sprite) {
        // Calculate screen-space size for smooth LOD (player gets extra segments)
        const playerScreenSize = player.size * currentZoom;
        const playerSegments = Math.round(getSegmentsSmooth(playerScreenSize) * PLAYER_SEGMENT_MULTIPLIER);

        drawFishWithDeformation(
          ctx,
          player.sprite,
          player.x,
          player.y,
          player.size,
          player.animTime,
          player.facingRight,
          {
            speed: playerSpeed,
            chompPhase: player.chompPhase,
            intensity: deformationRef.current,
            verticalTilt: player.verticalTilt,
            segments: playerSegments
          }
        );
      } else {
        ctx.fillStyle = '#60a5fa';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Store player position for edit button (use actual creature ID)
      buttonPositions.set(player.id, { x: player.x, y: player.y, size: player.size });

      // Update edit button positions ref
      editButtonPositionsRef.current = buttonPositions;

      // Blood fog + CHOMP (world space, fixed at eat position — no movement)
      bloodParticlesRef.current.forEach((b) => {
        const alpha = Math.max(0, b.life) * 0.55;
        const r = Math.max(3, b.radius * b.life);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
        g.addColorStop(0, `rgba(180, 40, 50, ${alpha})`);
        g.addColorStop(0.5, `rgba(140, 30, 40, ${alpha * 0.35})`);
        g.addColorStop(1, 'rgba(100, 20, 30, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      chompParticlesRef.current.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.max(0, p.life);

        // Apply punch scale animation
        const totalScale = p.scale * (p.punchScale || 1);
        ctx.font = `bold ${Math.round(16 * totalScale)}px sans-serif`;

        // Use custom color if provided, otherwise determine by text type
        let fillColor = p.color || '#fff';
        if (!p.color) {
          if (p.text === 'CHOMP') {
            fillColor = '#ffcc00';
          } else if (p.text.startsWith('+') && !p.text.includes('Shallow') && !p.text.includes('Deep') && !p.text.includes('Tropical') && !p.text.includes('Polluted')) {
            fillColor = '#4ade80'; // Green for hunger restore (if no essence name)
          }
        }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      });

      // Draw water effect overlay
      ctx.save();
      ctx.globalAlpha = 0.03; // Reduced from 0.1 to 0.03
      const time = waterTimeRef.current;

      // Create subtle wavy patterns
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        for (let x = 0; x < canvas.width; x += 10) {
          const wave = Math.sin(x * 0.01 + time + y * 0.02) * 5;
          if (x === 0) {
            ctx.moveTo(x, y + wave);
          } else {
            ctx.lineTo(x, y + wave);
          }
        }
        ctx.stroke();
      }

      // Add light rays from top
      ctx.globalAlpha = 0.02; // Reduced from 0.05 to 0.02
      const rayCount = 5;
      for (let i = 0; i < rayCount; i++) {
        const xPos = (i / rayCount) * canvas.width + Math.sin(time + i) * 50;
        const gradient = ctx.createLinearGradient(xPos, 0, xPos, canvas.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(xPos - 30, 0, 60, canvas.height);
      }

      ctx.restore();

      // Restore zoom transform (now we're in screen space)
      ctx.restore();

      // Low hunger visual warning (red tint and vignette) - drawn in screen space
      if (gameMode && player.hunger <= HUNGER_LOW_THRESHOLD) {
        ctx.save();
        const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
        const intensity = (1 - player.hunger / HUNGER_LOW_THRESHOLD) * HUNGER_WARNING_INTENSITY * pulse;

        // Red tint overlay
        ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vignette effect
        const vignette = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.6
        );
        vignette.addColorStop(0, 'rgba(139, 0, 0, 0)');
        vignette.addColorStop(1, `rgba(139, 0, 0, ${intensity * 0.6})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.restore();
      }

      // Draw edit buttons on fish (in screen space, accounting for camera)
      if (showEditButtonsRef.current && !currentEditMode && onEditFish) {
        const cam = effectiveCameraRef.current;
        buttonPositions.forEach((pos, fishId) => {
          // Calculate screen position accounting for camera offset
          // Formula: screenPos = (worldPos - cameraPos) * zoom + canvas.center
          const screenX = (pos.x - cam.x) * currentZoom + canvas.width / 2;
          const screenY = (pos.y - cam.y) * currentZoom + canvas.height / 2;

          // Draw edit button above fish
          const buttonSize = 24;
          const buttonY = screenY - pos.size * currentZoom / 2 - buttonSize - 5;

          ctx.save();
          ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(screenX, buttonY, buttonSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw edit icon (pencil)
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✎', screenX, buttonY);
          ctx.restore();
        });
      }

      // UI text overlay - positioned to not overlap with React HUD elements
      // React Level label is at top-4 left-4 (~16px, ~16px) with ~44px height
      // React Pause button is at top-4 right-4

      if (gameMode) {
        // Game mode UI - account for paused time
        const currentPausedTime = isPaused ? (Date.now() - pauseStartTimeRef.current) : 0;
        const elapsed = Date.now() - gameStartTimeRef.current - totalPausedTimeRef.current - currentPausedTime;
        const timeLeft = Math.max(0, Math.ceil((levelDuration - elapsed) / 1000));

        // Stats panel - bottom left corner
        const fishCount = fishListRef.current.length;
        const statsY = canvas.height - 90;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, statsY, 130, 80);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, statsY, 130, 80);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`Score: ${scoreRef.current}`, 20, statsY + 18);
        ctx.fillText(`Size: ${Math.floor(player.size)}`, 20, statsY + 36);
        ctx.fillText(`Time: ${timeLeft}s`, 20, statsY + 54);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
        ctx.fillText(`Fish: ${fishCount}`, 20, statsY + 72);
        ctx.restore();

        // Hunger Meter - centered at top, below the React HUD buttons
        const hungerBarWidth = Math.min(300, canvas.width - 200); // Responsive width
        const hungerBarHeight = 24;
        const hungerBarX = (canvas.width - hungerBarWidth) / 2;
        const hungerBarY = 16; // Positioned at top
        const hungerPercent = player.hunger / 100;

        // Background with chunky border (DICE VADERS style)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(hungerBarX, hungerBarY, hungerBarWidth, hungerBarHeight);
        ctx.strokeRect(hungerBarX, hungerBarY, hungerBarWidth, hungerBarHeight);

        // Hunger fill - color-coded
        let hungerColor;
        if (hungerPercent > 0.5) {
          hungerColor = '#4ade80'; // Green
        } else if (hungerPercent > 0.25) {
          hungerColor = '#fbbf24'; // Yellow
        } else {
          hungerColor = '#ef4444'; // Red
        }

        ctx.fillStyle = hungerColor;
        const fillWidth = (hungerBarWidth - 6) * hungerPercent;
        ctx.fillRect(hungerBarX + 3, hungerBarY + 3, fillWidth, hungerBarHeight - 6);

        // Glow effect for low hunger
        if (hungerPercent <= 0.25) {
          const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
          ctx.shadowColor = hungerColor;
          ctx.shadowBlur = 15 * pulse;
          ctx.strokeStyle = hungerColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(hungerBarX, hungerBarY, hungerBarWidth, hungerBarHeight);
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        // Text label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`HUNGER: ${Math.ceil(player.hunger)}%`, hungerBarX + hungerBarWidth / 2, hungerBarY + hungerBarHeight / 2);

        // Timer display - underneath hunger meter
        const timerY = hungerBarY + hungerBarHeight + 12;
        ctx.font = 'bold 20px monospace';

        // Flash yellow when 10 seconds or less
        if (timeLeft <= 10) {
          const flash = Math.sin(Date.now() * 0.01) > 0;
          ctx.fillStyle = flash ? '#fbbf24' : '#ffffff'; // Yellow / White flash
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        }

        ctx.fillText(`${timeLeft}s`, canvas.width / 2, timerY);

        ctx.restore();
      }
      // Note: Editor mode UI removed - will be added to proper HUD later

      // Draw paused indicator (centered, semi-transparent) - only in game mode
      if (isPaused && gameMode) {
        ctx.save();
        // Dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Centered pause text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

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

    </div>
  );
}
