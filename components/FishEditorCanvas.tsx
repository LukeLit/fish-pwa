/**
 * Fish Editor Canvas - Playable test environment for AI-generated assets
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
  HUNGER_LOW_THRESHOLD,
  HUNGER_WARNING_PULSE_FREQUENCY,
  HUNGER_WARNING_PULSE_BASE,
  HUNGER_WARNING_INTENSITY,
  HUNGER_FRAME_RATE,
} from '@/lib/game/hunger-constants';
import { DASH_SPEED_MULTIPLIER, DASH_STAMINA_DRAIN_RATE, DASH_STAMINA_RAMP_PER_SECOND, DASH_STAMINA_RAMP_CAP, ATTACK_SIZE_RATIO, SWALLOW_SIZE_RATIO, BATTLE_SIZE_THRESHOLD, DASH_ATTACK_STAMINA_COST, KO_STAMINA_REGEN_MULTIPLIER, KO_WAKE_THRESHOLD, KO_DRIFT_SPEED, PREY_FLEE_STAMINA_MULTIPLIER, ATTACK_LARGER_STAMINA_MULTIPLIER } from '@/lib/game/dash-constants';
import { loadRunState } from '@/lib/game/run-state';
import {
  removeBackground,
  drawFishWithDeformation,
  getSegmentsSmooth,
  PLAYER_SEGMENT_MULTIPLIER,
  getClipMode,
  hasUsableAnimations,
  getSpriteUrl,
  getResolutionKey,
  getGrowthStage,
  getGrowthStageSprite,
  getSpriteUrlForSize,
  getGrowthAwareSpriteUrl,
  type ClipMode,
  type RenderContext,
} from '@/lib/rendering/fish-renderer';
import { DashParticleSystem } from '@/lib/rendering/dash-particles';
import { MultiEntityDashParticleManager } from '@/lib/rendering/multi-entity-dash-particles';
import type { SpriteResolutions, GrowthSprites } from '@/lib/game/types';
import { ESSENCE_TYPES } from '@/lib/game/data/essence-types';
import { getAnimationSpriteManager, type AnimationSprite } from '@/lib/rendering/animation-sprite';
import type { AnimationAction, CreatureAnimations } from '@/lib/game/types';
import { cacheBust } from '@/lib/utils/cache-bust';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [operationStatus, setOperationStatus] = useState<string | null>(null);
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
        animations: fish.animations,
        stamina: 100,
        maxStamina: 100,
        isDashing: false,
      };
    };
    img.onerror = () => {
      console.error('Failed to load player fish sprite:', fish.sprite);
      playerRef.current.sprite = null;
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
        const prev = fishListRef.current[existingIndex];
        fishListRef.current[existingIndex] = {
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
        fishListRef.current.push({
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
      console.error('Failed to load AI fish sprite:', fish.sprite);
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
    size: PLAYER_BASE_SIZE,
    baseSize: PLAYER_BASE_SIZE,
    sprite: null as HTMLCanvasElement | null,
    facingRight: true,
    verticalTilt: 0,
    animTime: 0,
    chompPhase: 0, // 0–1, drives bulge + CHOMP
    chompEndTime: 0,
    hunger: HUNGER_MAX, // 0-100 hunger meter
    hungerDrainRate: HUNGER_DRAIN_RATE, // % per second
    stamina: 100,
    maxStamina: 100,
    isDashing: false,
    animations: undefined as CreatureAnimations | undefined,
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

  /** Dash particles - player (legacy, kept for backwards compat) */
  const dashParticleSystemRef = useRef(new DashParticleSystem({ flowCap: 200, flowSpawnPerFrame: 1 }));
  /** Shared dash particles for player + AI fish */
  const multiEntityDashRef = useRef(new MultiEntityDashParticleManager({ flowCap: 120, flowSpawnPerFrame: 1 }));

  /** How long the player has been holding dash (ms) - used for escalating stamina drain */
  const dashHoldDurationMsRef = useRef(0);

  /** Last animation action sent to player anim sprite (to avoid resetting every frame) */
  const lastPlayerAnimActionRef = useRef<string | null>(null);

  /** Fish lifecycle state for spawn/despawn animations and knockout */
  type FishLifecycleState = 'spawning' | 'active' | 'knocked_out' | 'despawning' | 'removed';

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
    // Frame-based animations
    animations?: CreatureAnimations;
    animationSprite?: AnimationSprite;
    // AI dash (prey/predator)
    stamina?: number;
    maxStamina?: number;
    isDashing?: boolean;
    chaseTargetId?: string;
    chaseStartTime?: number;
  }>>([]);

  // Animation sprite manager ref
  const animationSpriteManagerRef = useRef(getAnimationSpriteManager());

  // Spawn animation constants
  const SPAWN_FADE_DURATION = 1500; // ms to fully fade in (collision enables when fully opaque)

  /** 
   * Cache processed sprites by creature id and resolution for respawn (game mode).
   * Key format: "{creatureId}:{resolution}" where resolution is 'high'|'medium'|'low'
   */
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  /** Pool of creatures to spawn from (mirrors spawnedFish for use in game loop). */
  const spawnPoolRef = useRef<SpawnedCreature[]>([]);
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
    img.src = cacheBust(background);
  }, [background]);

  // Initialize player from playerCreature data AND load growth-aware sprite
  useEffect(() => {
    if (playerCreature) {
      console.log(`[FishEditorCanvas] playerCreature changed:`, {
        id: playerCreature.id,
        hasGrowthSprites: !!playerCreature.growthSprites,
        growthStages: playerCreature.growthSprites ? Object.keys(playerCreature.growthSprites) : [],
        updatedAt: playerCreature.updatedAt,
      });

      // Update player ID from creature data
      playerRef.current.id = playerCreature.id;

      // In game mode, use run state size (persisted from previous level) or PLAYER_BASE_SIZE (20)
      // In editor mode, use creature's actual size or base size
      const playerSize = gameMode
        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)
        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);
      playerRef.current.size = playerSize;
      playerRef.current.baseSize = playerSize;

      // Set player animations from creature data
      playerRef.current.animations = playerCreature.animations;

      // Remove old animation sprite to ensure fresh data is used
      // This handles the case where animations were regenerated
      animationSpriteManagerRef.current.removeSprite('player');

      // Pre-initialize animation sprite if animations exist
      if (playerCreature.animations && hasUsableAnimations(playerCreature.animations)) {
        // Determine the correct growth stage for the player's starting size
        let initialStage: 'juvenile' | 'adult' | 'elder' = 'adult';
        if (playerCreature.growthSprites) {
          initialStage = getGrowthStage(playerSize, playerCreature.growthSprites);
        }
        console.log(`[FishEditorCanvas] Initializing player animation sprite at ${initialStage} stage with animations:`, Object.keys(playerCreature.animations));
        animationSpriteManagerRef.current.getSprite('player', playerCreature.animations, { initialStage });
      }

      console.log(`[FishEditorCanvas] Initializing player: gameMode=${gameMode}, size=${playerSize}, hasAnimations=${!!playerCreature.animations}`);

      // Animation sprites are initialized on-demand when needed

      // Now load growth-aware sprite using the correct size
      if (playerFishSprite) {
        let spriteToLoad = playerFishSprite;
        if (playerCreature.growthSprites) {
          const growthStage = getGrowthStage(playerSize, playerCreature.growthSprites);
          const { sprite: growthSprite } = getGrowthStageSprite(playerCreature, playerSize, 'player');
          spriteToLoad = growthSprite;
          console.log(`[FishEditorCanvas] Loading player sprite for ${growthStage} stage (size: ${playerSize}), URL: ${spriteToLoad.substring(0, 80)}...`);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log(`[FishEditorCanvas] Player sprite loaded successfully`);
          playerRef.current.sprite = removeBackground(img, chromaToleranceRef.current);
        };
        img.onerror = () => {
          console.error('Failed to load player fish sprite:', spriteToLoad);
          playerRef.current.sprite = null;
        };
        img.src = cacheBust(spriteToLoad);
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
      img.src = cacheBust(playerFishSprite);
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
        img.src = cacheBust(spriteUrl);
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
  }, [spawnedFish, playerFishSprite, playerCreature, onCacheRefreshed]);

  // Listen for global refresh event
  useEffect(() => {
    const handleRefresh = () => {
      refreshAllSprites().catch(err => console.error('[FishEditorCanvas] Refresh error:', err));
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
      console.log(`[FishEditorCanvas] Preview animation requested: ${action}`);

      if (animationSpriteManagerRef.current.hasSprite('player')) {
        const sprite = animationSpriteManagerRef.current.getSprite('player', playerRef.current.animations || {});
        sprite.triggerAction(action as any);
      } else {
        console.warn('[FishEditorCanvas] No player animation sprite available for preview');
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
      console.error('[FishEditorCanvas] Failed to load growth sprite:', spriteUrl);
    };
    img.src = cacheBust(spriteUrl);
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
            img.src = cacheBust(spriteUrl);
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
            img.src = cacheBust(spriteUrl);
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
    // Filter to only SpawnedCreature items (not LegacySpawnItem)
    const isSpawnedCreature = (item: SpawnedCreature | LegacySpawnItem): item is SpawnedCreature => {
      return 'stats' in item && 'rarity' in item;
    };
    spawnPoolRef.current = spawnedFish.length
      ? (spawnedFish.filter(isSpawnedCreature) as SpawnedCreature[])
      : [];

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
      // Always use cache busting to ensure fresh images
      img.src = cacheBust(finalUrl);
    };

    spawnedFish.forEach((fishItem) => {
      if (eatenIdsRef.current.has(fishItem.id)) return;

      const existingFish = fishListRef.current.find((f) => f.id === fishItem.id);
      const previousSpriteUrl = fishSpriteUrlsRef.current.get(fishItem.id);

      // Resolve creature and instance size: support full Creature (stats + growthSprites) and legacy { id, sprite, type, creatureId }
      const hasFullCreature = fishItem && 'stats' in fishItem && fishItem.stats != null;
      const creatureForSprite: Creature | undefined = hasFullCreature
        ? (fishItem as Creature)
        : (() => {
          const creatureId = (fishItem as { creatureId?: string }).creatureId ?? fishItem.id;
          return fishDataRef.current.get(creatureId) as Creature | undefined;
        })();
      const instanceSize =
        (fishItem as { size?: number }).size ??
        (fishItem as { stats?: { size?: number } }).stats?.size;
      const fishSizeForSprite =
        typeof instanceSize === 'number'
          ? instanceSize
          : creatureForSprite?.stats?.size ?? (fishItem.type === 'prey' ? 30 : fishItem.type === 'predator' ? 100 : 60);

      if (!creatureForSprite) {
        console.warn('[FishEditorCanvas] No creature data for', fishItem.id, '- cannot resolve growth-stage sprite');
      }

      // Resolve growth-stage sprite once: use its sprite + spriteResolutions so we load the correct stage (e.g. juvenile) and its resolution variants, not the base creature's
      const fishSizeForResolution = fishSizeForSprite;
      const screenSize = fishSizeForResolution * zoomRef.current;
      const stageSprite = creatureForSprite
        ? getGrowthStageSprite(creatureForSprite, fishSizeForSprite, fishItem.id)
        : null;
      const currentSpriteUrl = stageSprite
        ? getSpriteUrl(stageSprite, screenSize, fishItem.id)
        : (fishItem as { sprite?: string }).sprite ?? '';
      const initialGrowthStage = creatureForSprite?.growthSprites
        ? getGrowthStage(fishSizeForSprite, creatureForSprite.growthSprites)
        : undefined;
      if (creatureForSprite?.growthSprites) {
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

      // Resolution options for loadSprite: use growth-stage sprite so juvenile gets juvenile resolutions, not base creature's
      const spriteResolutions = stageSprite?.spriteResolutions;

      // Calculate cache key with resolution
      const resolution = getResolutionKey(screenSize);
      const cacheKey = `${fishItem.id}:${resolution}`;

      // Sync size from spawn payload so growth stage stays correct (e.g. after unique-id fix)
      const sizeMismatch = existingFish && existingFish.size !== fishSizeForSprite;
      if (existingFish && sizeMismatch) {
        existingFish.size = fishSizeForSprite;
        if (creatureForSprite?.growthSprites) {
          existingFish.currentGrowthStage = getGrowthStage(fishSizeForSprite, creatureForSprite.growthSprites);
        }
      }

      if (existingFish && (spriteChanged || sizeMismatch)) {
        // SPRITE or SIZE CHANGED - reload the correct growth-stage sprite
        const newVersion = (spriteVersionRef.current.get(fishItem.id) || 0) + 1;
        spriteVersionRef.current.set(fishItem.id, newVersion);
        console.log('[FishEditorCanvas] Reloading sprite for fish:', fishItem.id, 'size:', fishSizeForSprite, sizeMismatch ? '(size synced)' : '(URL changed)');
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          existingFish.sprite = processedSprite;
          spriteCacheRef.current.set(cacheKey, processedSprite);
        }, { spriteResolutions, fishSize: fishSizeForResolution });
      } else if (!existingFish) {
        // NEW FISH - add to list
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          // Cache by creature id + resolution for respawn in game mode
          spriteCacheRef.current.set(cacheKey, processedSprite);

          let fishSize: number;
          let baseSpeed: number;
          let fishType: string;
          let creatureData: Creature | undefined;

          // Use instance size (fishSizeForSprite) so AI fish at juvenile size get correct sprite/size
          fishSize = fishSizeForSprite;
          baseSpeed = creatureForSprite?.stats.speed ?? 2;
          fishType = creatureForSprite?.type ?? (fishItem as { type?: string }).type ?? 'prey';
          creatureData = creatureForSprite;

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

          // Initialize animation sprite if creature has animations
          const animations = creatureForSprite?.animations;
          let animationSprite: AnimationSprite | undefined;
          if (animations && hasUsableAnimations(animations)) {
            animationSprite = animationSpriteManagerRef.current.getSprite(fishItem.id, animations);
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
            creatureData,
            currentGrowthStage: initialGrowthStage,
            spawnTime: performance.now() + staggerDelay,
            despawnTime: undefined,
            opacity: 0,
            lifecycleState: 'spawning' as FishLifecycleState,
            animations,
            animationSprite,
            stamina: 100,
            maxStamina: 100,
            isDashing: false,
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
            const timeSurvived = Math.floor((Date.now() - gameStartTimeRef.current - totalPausedTimeRef.current) / 1000);
            onLevelComplete(scoreRef.current, {
              size: playerRef.current.size,
              fishEaten: fishEatenRef.current,
              timeSurvived,
            });
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

      // Dash mechanic (game mode only): Shift/Space or mobile dash button
      const STAMINA_REGEN_RATE = 100; // per second
      const wantsDash = hasKey('shift') || hasKey(' ') || (dashFromControlsRefProp?.current ?? false);
      if (gameMode) {
        player.isDashing = wantsDash && player.stamina > 0;
        if (player.isDashing) {
          // Track hold duration for escalating drain (longer hold = faster drain)
          const frameMs = (deltaTime / 60) * 1000;
          dashHoldDurationMsRef.current += frameMs;
          const holdSeconds = dashHoldDurationMsRef.current / 1000;
          const rampMultiplier = Math.min(1 + holdSeconds * DASH_STAMINA_RAMP_PER_SECOND, DASH_STAMINA_RAMP_CAP);
          player.stamina = Math.max(0, player.stamina - DASH_STAMINA_DRAIN_RATE * rampMultiplier * (deltaTime / 60));
        } else {
          dashHoldDurationMsRef.current = 0;
          player.stamina = Math.min(player.maxStamina, player.stamina + STAMINA_REGEN_RATE * (deltaTime / 60));
        }
        if (player.stamina <= 0) player.isDashing = false;
      } else {
        player.isDashing = false;
        dashHoldDurationMsRef.current = 0;
      }

      const effectiveMaxSpeed = (gameMode && player.isDashing) ? MAX_SPEED * DASH_SPEED_MULTIPLIER : MAX_SPEED;

      // Lock movement in edit mode or when paused
      const currentEditMode = editModeRef.current;
      if (!currentEditMode && !isPaused) {
        // Use joystick if active, otherwise keyboard
        if (joystickActiveRef.current) {
          // Analog joystick control - smooth velocity (dash applies speed boost)
          player.vx = joystickVelocityRef.current.x * effectiveMaxSpeed;
          player.vy = joystickVelocityRef.current.y * effectiveMaxSpeed;
        } else {
          // Keyboard control with acceleration and friction (delta-time adjusted)
          const accelMult = (gameMode && player.isDashing) ? 1.3 : 1; // Snappier when dashing
          const accel = ACCELERATION * deltaTime * accelMult;
          const friction = Math.pow(FRICTION, deltaTime); // Correct friction for variable framerate

          if (hasKey('w') || hasKey('arrowup')) player.vy -= accel;
          if (hasKey('s') || hasKey('arrowdown')) player.vy += accel;
          if (hasKey('a') || hasKey('arrowleft')) player.vx -= accel;
          if (hasKey('d') || hasKey('arrowright')) player.vx += accel;
          player.vx *= friction;
          player.vy *= friction;
        }

        let speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
        if (speed > effectiveMaxSpeed) {
          player.vx = (player.vx / speed) * effectiveMaxSpeed;
          player.vy = (player.vy / speed) * effectiveMaxSpeed;
          speed = effectiveMaxSpeed;
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

      // Dash particles - driven by animation state (only when game mode)
      // Legacy single-player system kept for fallback
      if (gameMode) {
        const rawSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
        const animationAction = player.isDashing ? 'dash' : (rawSpeed < 0.2 ? 'idle' : 'swim');
        dashParticleSystemRef.current.update(
          {
            x: player.x,
            y: player.y,
            vx: player.vx,
            vy: player.vy,
            size: player.size,
            animationAction,
          },
          deltaTime
        );
      }

      // Update chomp phase (decay over ~280ms)
      const now = performance.now();
      if (player.chompEndTime > now) {
        player.chompPhase = (player.chompEndTime - now) / 280;
      } else {
        player.chompPhase = 0;
      }

      // Update hunger in game mode (movement-based, delta-time adjusted)
      if (gameMode && !isPaused) {
        // Hunger drains continuously: slowly when still, faster when moving
        // normalizedSpeed is 0 when still, 1 at max speed
        const STATIONARY_DRAIN_FRACTION = 0.1; // 10% of full rate when not moving
        const movementFactor = Math.max(STATIONARY_DRAIN_FRACTION, normalizedSpeed);
        const effectiveDrainRate = player.hungerDrainRate * movementFactor;
        player.hunger = Math.max(0, player.hunger - (effectiveDrainRate / HUNGER_FRAME_RATE) * deltaTime);

        // Check starvation death
        if (player.hunger <= 0 && !gameOverFiredRef.current) {
          // Trigger death animation on player if animation sprite exists
          if (animationSpriteManagerRef.current.hasSprite('player')) {
            const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
            sprite.triggerAction('death');
          }

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

      // Collision: head-based hitboxes (same for all fish and player)
      const getHeadPosition = (fishObj: { x: number; y: number; size: number; facingRight: boolean }) => {
        const headOffset = fishObj.size * 0.35;
        return {
          x: fishObj.x + (fishObj.facingRight ? headOffset : -headOffset),
          y: fishObj.y,
        };
      };
      const getHeadRadius = (size: number) => size * 0.25;

      // Fish-fish collisions: predator vs prey (eat or stamina battle) - game mode only
      if (gameMode) {
        const fishList = fishListRef.current;
        const eatenIds = new Set<string>();
        for (let i = 0; i < fishList.length; i++) {
          const fishA = fishList[i];
          if (eatenIds.has(fishA.id) || (fishA.opacity ?? 1) < 1) continue;

          const aHead = getHeadPosition(fishA);
          const aR = getHeadRadius(fishA.size);

          for (let j = i + 1; j < fishList.length; j++) {
            const fishB = fishList[j];
            if (eatenIds.has(fishB.id) || (fishB.opacity ?? 1) < 1) continue;

            const bHead = getHeadPosition(fishB);
            const bR = getHeadRadius(fishB.size);
            const dx = bHead.x - aHead.x;
            const dy = bHead.y - aHead.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= aR + bR) continue;

            const aIsPredator = fishA.type === 'predator' || fishA.type === 'mutant';
            const bIsPredator = fishB.type === 'predator' || fishB.type === 'mutant';
            const aIsPrey = fishA.type === 'prey';
            const bIsPrey = fishB.type === 'prey';
            const aKo = fishA.lifecycleState === 'knocked_out';
            const bKo = fishB.lifecycleState === 'knocked_out';

            // Predator can eat KO prey (any dashing fish can eat KO fish)
            if (aKo && bIsPredator && fishB.isDashing) {
              eatenIds.add(fishA.id);
              const eatX = (fishA.x + fishB.x) * 0.5;
              const eatY = (fishA.y + fishB.y) * 0.5;
              const effMult = Math.max(0.05, 1 / (1 + (fishB.size / fishA.size) * 0.4));
              fishB.size = Math.min(PLAYER_MAX_SIZE, fishB.size + fishA.size * 0.15 * effMult);
              if (fishB.animationSprite?.hasAction?.('bite')) fishB.animationSprite.triggerAction('bite');
              for (let b = 0; b < 12; b++) {
                bloodParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * fishA.size * 1.2,
                  y: eatY + (Math.random() - 0.5) * fishA.size * 1.2,
                  life: 1,
                  radius: 4 + Math.random() * 8,
                });
              }
              continue;
            }
            if (bKo && aIsPredator && fishA.isDashing) {
              eatenIds.add(fishB.id);
              const eatX = (fishA.x + fishB.x) * 0.5;
              const eatY = (fishA.y + fishB.y) * 0.5;
              const effMult = Math.max(0.05, 1 / (1 + (fishA.size / fishB.size) * 0.4));
              fishA.size = Math.min(PLAYER_MAX_SIZE, fishA.size + fishB.size * 0.15 * effMult);
              if (fishA.animationSprite?.hasAction?.('bite')) fishA.animationSprite.triggerAction('bite');
              for (let b = 0; b < 12; b++) {
                bloodParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * fishB.size * 1.2,
                  y: eatY + (Math.random() - 0.5) * fishB.size * 1.2,
                  life: 1,
                  radius: 4 + Math.random() * 8,
                });
              }
              continue;
            }

            if (!((aIsPredator && bIsPrey) || (aIsPrey && bIsPredator))) continue;
            const predator = aIsPredator ? fishA : fishB;
            const prey = aIsPredator ? fishB : fishA;
            const bothDashing = predator.isDashing && prey.isDashing;

            if (!predator.isDashing && !prey.isDashing) continue;

            const sizeRatio = predator.size / prey.size;
            const evenlyMatchedFf = sizeRatio >= 1 - BATTLE_SIZE_THRESHOLD && sizeRatio <= 1 + BATTLE_SIZE_THRESHOLD;
            const oneSidedFf = evenlyMatchedFf && (predator.isDashing !== prey.isDashing);

            if (oneSidedFf) {
              const attacker = predator.isDashing ? predator : prey;
              const target = predator.isDashing ? prey : predator;
              const targetSizeRatio = attacker.size / target.size;
              const staminaMult = targetSizeRatio < 1 ? ATTACK_LARGER_STAMINA_MULTIPLIER : 1;
              target.stamina = Math.max(0, (target.stamina ?? 100) - DASH_ATTACK_STAMINA_COST * staminaMult);
              if ((target.stamina ?? 0) <= 0) {
                target.lifecycleState = 'knocked_out';
                target.stamina = 0;
                target.vx = (target.vx ?? 0) * 0.3;
                target.vy = (target.vy ?? 0) * 0.3;
              }
            } else if (sizeRatio >= ATTACK_SIZE_RATIO) {
              // Predator big enough to eat
              eatenIds.add(prey.id);
              const eatX = (predator.x + prey.x) * 0.5;
              const eatY = (predator.y + prey.y) * 0.5;
              const effMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
              predator.size = Math.min(PLAYER_MAX_SIZE, predator.size + prey.size * 0.15 * effMult);
              if (predator.animationSprite?.hasAction?.('bite')) {
                predator.animationSprite.triggerAction('bite');
              }
              for (let b = 0; b < 12; b++) {
                bloodParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * prey.size * 1.2,
                  y: eatY + (Math.random() - 0.5) * prey.size * 1.2,
                  life: 1,
                  radius: 4 + Math.random() * 8,
                });
              }
            } else if (sizeRatio <= 1 / ATTACK_SIZE_RATIO) {
              // Prey bigger - prey wins and eats predator
              eatenIds.add(predator.id);
              const eatX = (predator.x + prey.x) * 0.5;
              const eatY = (predator.y + prey.y) * 0.5;
              const invRatio = prey.size / predator.size;
              const effMult = Math.max(0.05, 1 / (1 + invRatio * 0.4));
              prey.size = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.15 * effMult);
              if (prey.animationSprite?.hasAction?.('bite')) {
                prey.animationSprite.triggerAction('bite');
              }
              for (let b = 0; b < 12; b++) {
                bloodParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * predator.size * 1.2,
                  y: eatY + (Math.random() - 0.5) * predator.size * 1.2,
                  life: 1,
                  radius: 4 + Math.random() * 8,
                });
              }
            } else {
              // Stamina battle: evenly matched (within 20%)
              if (bothDashing) {
                predator.stamina = Math.max(0, (predator.stamina ?? 100) - DASH_ATTACK_STAMINA_COST);
                prey.stamina = Math.max(0, (prey.stamina ?? 100) - DASH_ATTACK_STAMINA_COST);
                const predKo = (predator.stamina ?? 0) <= 0;
                const preyKo = (prey.stamina ?? 0) <= 0;
                if (predKo) {
                  eatenIds.add(predator.id);
                  const eatX = (predator.x + prey.x) * 0.5;
                  const eatY = (predator.y + prey.y) * 0.5;
                  prey.size = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);
                  if (prey.animationSprite?.hasAction?.('bite')) prey.animationSprite.triggerAction('bite');
                  for (let b = 0; b < 10; b++) {
                    bloodParticlesRef.current.push({ x: eatX + (Math.random() - 0.5) * 20, y: eatY + (Math.random() - 0.5) * 20, life: 1, radius: 4 + Math.random() * 6 });
                  }
                } else if (preyKo) {
                  prey.lifecycleState = 'knocked_out';
                  prey.stamina = 0;
                  prey.vx = (prey.vx ?? 0) * 0.3;
                  prey.vy = (prey.vy ?? 0) * 0.3;
                }
              }
            }
            break;
          }
        }
        if (eatenIds.size > 0) {
          fishListRef.current = fishListRef.current.filter((f) => !eatenIds.has(f.id));
        }
      }

      const playerHead = getHeadPosition(player);
      const playerHeadR = getHeadRadius(player.size);

      for (let idx = fishListRef.current.length - 1; idx >= 0; idx--) {
        const fish = fishListRef.current[idx];

        // Skip collision for fish still fading in (not fully opaque yet)
        if ((fish.opacity ?? 1) < 1) {
          continue;
        }

        const fishHead = getHeadPosition(fish);
        const fishHeadR = getHeadRadius(fish.size);

        // Check head-to-head collision (eating happens when mouths touch)
        const dx = fishHead.x - playerHead.x;
        const dy = fishHead.y - playerHead.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < playerHeadR + fishHeadR) {
          // In game mode, check who eats whom or stamina battle
          if (gameMode) {
            // KNOCKED OUT: Any dashing fish can eat KO fish (design: "can be bitten by any dashing fish")
            if (fish.lifecycleState === 'knocked_out' && player.isDashing) {
              fishEatenRef.current += 1;
              eatenIdsRef.current.add(fish.id);
              fishListRef.current.splice(idx, 1);
              const sizeRatio = player.size / fish.size;
              const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
              const sizeGain = fish.size * 0.15 * efficiencyMult;
              player.size = Math.min(PLAYER_MAX_SIZE, player.size + sizeGain);
              const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
              player.hunger = Math.min(HUNGER_MAX, player.hunger + hungerRestore);
              player.chompPhase = 1;
              player.chompEndTime = now + 280;
              const eatX = (fish.x + player.x) * 0.5;
              const eatY = (fish.y + player.y) * 0.5;
              if (animationSpriteManagerRef.current.hasSprite('player')) {
                const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                sprite.triggerAction('bite');
              }
              for (let b = 0; b < 10; b++) {
                bloodParticlesRef.current.push({ x: eatX + (Math.random() - 0.5) * 20, y: eatY + (Math.random() - 0.5) * 20, life: 1, radius: 4 + Math.random() * 6 });
              }
              if (fish.creatureData?.essenceTypes) {
                fish.creatureData.essenceTypes.forEach((ec: { type: string; baseYield: number }, i: number) => {
                  const et = ESSENCE_TYPES[ec.type];
                  if (et) {
                    chompParticlesRef.current.push({
                      x: eatX + (Math.random() - 0.5) * 24,
                      y: eatY - 20 - (i * 18),
                      life: 1.5,
                      scale: 1.4,
                      text: `+${ec.baseYield} ${et.name}`,
                      color: et.color,
                      punchScale: 1.8,
                    });
                  }
                });
              }
              continue;
            }

            const playerAttacking = player.isDashing && player.size > fish.size * ATTACK_SIZE_RATIO;
            const fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;
            const sizeRatio = player.size / fish.size;
            const evenlyMatched = sizeRatio >= 1 - BATTLE_SIZE_THRESHOLD && sizeRatio <= 1 + BATTLE_SIZE_THRESHOLD;
            const bothDashing = player.isDashing && fish.isDashing;
            const oneSidedAttack = evenlyMatched && (player.isDashing !== fish.isDashing);

            if (!playerAttacking && !fishAttacking && !(evenlyMatched && bothDashing) && !oneSidedAttack) continue;

            if (oneSidedAttack) {
              // One-sided: dashing attacker deals damage to non-dashing target
              const attacker = player.isDashing ? player : fish;
              const target = player.isDashing ? fish : player;
              // Size-based stamina penalty: attacking larger target costs more
              const targetSizeRatio = (attacker as { size: number }).size / (target as { size: number }).size;
              const staminaMult = targetSizeRatio < 1 ? ATTACK_LARGER_STAMINA_MULTIPLIER : 1;
              (target as { stamina?: number }).stamina = Math.max(0, ((target as { stamina?: number }).stamina ?? 100) - DASH_ATTACK_STAMINA_COST * staminaMult);
              const targetKo = ((target as { stamina?: number }).stamina ?? 0) <= 0;
              if (targetKo) {
                if (target === fish) {
                  // KNOCKED OUT: Fish enters KO state, drifts, can be eaten when bitten
                  fish.lifecycleState = 'knocked_out';
                  fish.stamina = 0;
                  fish.vx = (fish.vx ?? 0) * 0.3;
                  fish.vy = (fish.vy ?? 0) * 0.3;
                } else {
                  if (animationSpriteManagerRef.current.hasSprite('player')) {
                    const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                    sprite.triggerAction('death');
                  }
                  if (!gameOverFiredRef.current) {
                    gameOverFiredRef.current = true;
                    if (onGameOver) {
                      const timeSurvived = Math.floor((now - gameStartTimeRef.current - totalPausedTimeRef.current) / 1000);
                      onGameOver({ score: scoreRef.current, cause: 'eaten', size: player.size, fishEaten: fishEatenRef.current, essenceCollected: essenceCollectedRef.current, timeSurvived });
                    }
                  }
                  return;
                }
              }
            } else if (evenlyMatched && bothDashing) {
              // Stamina battle
              player.stamina = Math.max(0, player.stamina - DASH_ATTACK_STAMINA_COST);
              fish.stamina = Math.max(0, (fish.stamina ?? 100) - DASH_ATTACK_STAMINA_COST);
              const playerKo = player.stamina <= 0;
              const fishKo = (fish.stamina ?? 0) <= 0;
              if (fishKo) {
                // KNOCKED OUT: Fish enters KO state, drifts, can be eaten when bitten
                fish.lifecycleState = 'knocked_out';
                fish.stamina = 0;
                fish.vx = (fish.vx ?? 0) * 0.3;
                fish.vy = (fish.vy ?? 0) * 0.3;
              } else if (playerKo) {
                if (animationSpriteManagerRef.current.hasSprite('player')) {
                  const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                  sprite.triggerAction('death');
                }
                if (!gameOverFiredRef.current) {
                  gameOverFiredRef.current = true;
                  if (onGameOver) {
                    const timeSurvived = Math.floor((now - gameStartTimeRef.current - totalPausedTimeRef.current) / 1000);
                    onGameOver({ score: scoreRef.current, cause: 'eaten', size: player.size, fishEaten: fishEatenRef.current, essenceCollected: essenceCollectedRef.current, timeSurvived });
                  }
                }
                return;
              }
            } else if (fishAttacking) {
              // Predator ate player - GAME OVER
              // Trigger death animation on player before game over
              if (animationSpriteManagerRef.current.hasSprite('player')) {
                const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                sprite.triggerAction('death');
              }

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
            } else if (playerAttacking) {
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
              player.size = Math.min(PLAYER_MAX_SIZE, player.size + sizeGain);

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

                  // Update animation sprite's growth stage
                  if (animationSpriteManagerRef.current.hasSprite('player')) {
                    const animSprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                    animSprite.setGrowthStage(newStage);
                    console.log(`[Growth] Updated animation sprite to ${newStage} stage`);
                  }
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

              // Trigger bite animation on player (if animation sprite exists)
              const hasBiteSprite = animationSpriteManagerRef.current.hasSprite('player');
              console.log(`[Bite] Player ate fish. hasSprite=${hasBiteSprite}, hasAnimations=${!!player.animations}`);
              if (hasBiteSprite) {
                const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                console.log(`[Bite] Triggering bite action on sprite`);
                sprite.triggerAction('bite');
              }

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
            player.size = Math.min(PLAYER_MAX_SIZE, player.size + sizeGain);

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

                // Update animation sprite's growth stage
                if (animationSpriteManagerRef.current.hasSprite('player')) {
                  const animSprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
                  animSprite.setGrowthStage(newStage);
                }
              }
            }

            player.chompPhase = 1;
            player.chompEndTime = now + 280;
            const eatX = (fish.x + player.x) * 0.5;
            const eatY = (fish.y + player.y) * 0.5;

            // Trigger bite animation on player (if animation sprite exists)
            if (animationSpriteManagerRef.current.hasSprite('player')) {
              const sprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
              sprite.triggerAction('bite');
            }

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
          // Bias toward small prey to compensate for predator competition
          const weightedPool: SpawnedCreature[] = [];
          pool.forEach((c) => {
            const size = c.stats?.size ?? 60;
            const isSmallPrey = c.type === 'prey' && size < 50;
            const isPrey = c.type === 'prey' && size < 80;
            const copies = isSmallPrey ? 6 : isPrey ? 4 : 1; // Double small prey for competition
            for (let i = 0; i < copies; i++) weightedPool.push(c);
          });
          const creature = weightedPool[Math.floor(Math.random() * weightedPool.length)];
          const fishSize = creature.stats.size;
          // Same rules as player: size → growth stage → sprite (getSpriteUrlForSize / getGrowthAwareSpriteUrl)
          const screenSize = fishSize * zoomRef.current;
          const resolution = getResolutionKey(screenSize);
          const cacheId = creature.creatureId ?? creature.id;
          const cacheKey = `${cacheId}:${resolution}`;
          let sprite = spriteCacheRef.current.get(cacheKey) || spriteCacheRef.current.get(cacheId);
          // On cache miss, load growth-stage sprite so AI fish always use same rules as player
          if (!sprite && canvas) {
            const spriteUrl = getGrowthAwareSpriteUrl(creature, fishSize, screenSize, creature.id);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const processedSprite = removeBackground(img, chromaToleranceRef.current);
              spriteCacheRef.current.set(cacheKey, processedSprite);
              const baseSpeed = creature.stats.speed ?? 2;
              const speedScale = 0.1;
              const vx = (Math.random() - 0.5) * baseSpeed * speedScale;
              const vy = (Math.random() - 0.5) * baseSpeed * speedScale;
              const bounds = worldBoundsRef.current;
              const MIN_SPAWN_DIST = 500;
              const angle = Math.random() * Math.PI * 2;
              const distance = MIN_SPAWN_DIST + Math.random() * 200;
              let spawnX = player.x + Math.cos(angle) * distance;
              let spawnY = player.y + Math.sin(angle) * distance;
              spawnX = Math.max(bounds.minX, Math.min(bounds.maxX, spawnX));
              spawnY = Math.max(bounds.minY, Math.min(bounds.maxY, spawnY));
              const newId = `${creature.id}-r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
              const anims = creature.animations;
              const animSprite = anims && hasUsableAnimations(anims)
                ? animationSpriteManagerRef.current.getSprite(newId, anims)
                : undefined;
              fishListRef.current.push({
                id: newId,
                x: spawnX,
                y: spawnY,
                vx,
                vy,
                size: fishSize,
                sprite: processedSprite,
                type: creature.type,
                facingRight: vx >= 0,
                verticalTilt: 0,
                animTime: Math.random() * Math.PI * 2,
                creatureData: creature,
                spawnTime: now,
                despawnTime: undefined,
                opacity: 0,
                lifecycleState: 'spawning' as FishLifecycleState,
                stamina: 100,
                maxStamina: 100,
                isDashing: false,
                animations: anims,
                animationSprite: animSprite,
              });
            };
            img.onerror = () => console.error('[FishEditorCanvas] Respawn sprite load failed:', spriteUrl);
            img.src = cacheBust(spriteUrl);
          }
          if (sprite && canvas) {
            const baseSpeed = creature.stats.speed ?? 2;
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

            const newId = `${cacheId}-r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const anims = creature.animations;
            const animSprite = anims && hasUsableAnimations(anims)
              ? animationSpriteManagerRef.current.getSprite(newId, anims)
              : undefined;
            const newFish = {
              id: newId,
              x: spawnX,
              y: spawnY,
              vx,
              vy,
              size: fishSize,
              sprite,
              type: creature.type,
              facingRight: vx >= 0,
              verticalTilt: 0,
              animTime: Math.random() * Math.PI * 2,
              creatureData: creature,
              spawnTime: now,
              despawnTime: undefined,
              opacity: 0,
              lifecycleState: 'spawning' as FishLifecycleState,
              stamina: 100,
              maxStamina: 100,
              isDashing: false,
              animations: anims,
              animationSprite: animSprite,
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

      // AI constants for prey/predator behavior
      const AI_BASE_SPEED = 0.7;
      const AI_PREDATOR_CHASE_SPEED = 1.15; // Predators faster to catch prey
      const AI_PREY_FLEE_SPEED = 0.85; // Prey slightly slower when fleeing
      const AI_DETECTION_RANGE = 400;
      const AI_STAMINA_REGEN = 100; // per second
      const AI_CHASE_TIMEOUT_MS = 4500; // Give up chase after 4.5s

      // Update AI fish (lock movement in edit mode or when paused)
      fishListRef.current.forEach((fish) => {
        // Ensure AI fish have stamina (for prey/predator)
        if (fish.stamina === undefined) fish.stamina = 100;
        if (fish.maxStamina === undefined) fish.maxStamina = 100;
        if (fish.isDashing === undefined) fish.isDashing = false;

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
          // KO fish: drift slowly, regenerate stamina at 50%, wake at 40%
          if (gameMode && fish.lifecycleState === 'knocked_out') {
            fish.stamina = Math.min(fish.maxStamina ?? 100, (fish.stamina ?? 0) + AI_STAMINA_REGEN * KO_STAMINA_REGEN_MULTIPLIER * (deltaTime / 60));
            if ((fish.stamina ?? 0) >= (fish.maxStamina ?? 100) * KO_WAKE_THRESHOLD) {
              fish.lifecycleState = 'active';
            }
            fish.vx = (fish.vx ?? 0) * 0.98 + (Math.random() - 0.5) * KO_DRIFT_SPEED * 0.02;
            fish.vy = (fish.vy ?? 0) * 0.98 + (Math.random() - 0.5) * KO_DRIFT_SPEED * 0.02;
            const driftMag = Math.sqrt((fish.vx ?? 0) ** 2 + (fish.vy ?? 0) ** 2);
            if (driftMag > KO_DRIFT_SPEED) {
              fish.vx = (fish.vx! / driftMag) * KO_DRIFT_SPEED;
              fish.vy = (fish.vy! / driftMag) * KO_DRIFT_SPEED;
            }
          } else if (gameMode && (fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant') && fish.lifecycleState === 'active') {
            const others = fishListRef.current.filter(
              (f) => f.id !== fish.id && (f.lifecycleState === 'active' || f.lifecycleState === 'knocked_out') && (f.opacity ?? 1) >= 1
            );
            const speedMult = (fish.isDashing && (fish.stamina ?? 0) > 0) ? DASH_SPEED_MULTIPLIER : 1;
            const baseSpeed = AI_BASE_SPEED * speedMult;

            if (fish.type === 'predator' || fish.type === 'mutant') {
              // Predator: seek nearest prey or player (if smaller), with chase timeout
              let targetX: number | null = null;
              let targetY: number | null = null;
              let targetId: string | null = null;
              let distToTarget = Infinity;

              // Check chase timeout - give up if chasing too long
              const chaseElapsed = fish.chaseStartTime != null ? now - fish.chaseStartTime : 0;
              const sameTarget = fish.chaseTargetId != null;
              if (sameTarget && chaseElapsed > AI_CHASE_TIMEOUT_MS) {
                fish.chaseTargetId = undefined;
                fish.chaseStartTime = undefined;
              }

              // Find nearest prey (if not timed out)
              if (chaseElapsed <= AI_CHASE_TIMEOUT_MS) {
                for (const other of others) {
                  if (other.size < fish.size * 0.8 && (other.type === 'prey' || other.lifecycleState === 'knocked_out')) {
                    const dx = other.x - fish.x;
                    const dy = other.y - fish.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < AI_DETECTION_RANGE && d < distToTarget) {
                      distToTarget = d;
                      targetX = other.x;
                      targetY = other.y;
                      targetId = other.id;
                    }
                  }
                }
                // Or hunt player if smaller
                if (player.size < fish.size * 0.8) {
                  const pdx = player.x - fish.x;
                  const pdy = player.y - fish.y;
                  const pd = Math.sqrt(pdx * pdx + pdy * pdy);
                  if (pd < AI_DETECTION_RANGE && pd < distToTarget) {
                    distToTarget = pd;
                    targetX = player.x;
                    targetY = player.y;
                    targetId = 'player';
                  }
                }
              }

              const maxSpeed = baseSpeed * AI_PREDATOR_CHASE_SPEED;
              if (targetX != null && targetY != null && distToTarget > 5) {
                fish.chaseTargetId = targetId ?? undefined;
                if (fish.chaseStartTime == null) fish.chaseStartTime = now;
                const dx = targetX - fish.x;
                const dy = targetY - fish.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                fish.vx = (dx / len) * maxSpeed;
                fish.vy = (dy / len) * maxSpeed;
                fish.isDashing = distToTarget < fish.size * 6 && (fish.stamina ?? 0) > 15;
              } else {
                fish.chaseTargetId = undefined;
                fish.chaseStartTime = undefined;
                fish.vx += (Math.random() - 0.5) * 0.05;
                fish.vy += (Math.random() - 0.5) * 0.05;
                fish.isDashing = false;
              }

              if (fish.isDashing) {
                fish.stamina = Math.max(0, (fish.stamina ?? 100) - DASH_STAMINA_DRAIN_RATE * (deltaTime / 60));
              } else {
                fish.stamina = Math.min(fish.maxStamina ?? 100, (fish.stamina ?? 100) + AI_STAMINA_REGEN * (deltaTime / 60));
              }
              if ((fish.stamina ?? 0) <= 0) fish.isDashing = false;
            } else if (fish.type === 'prey') {
              // Prey: flee from predators or player (if bigger), slightly slower than predators
              let fleeX = 0;
              let fleeY = 0;
              let nearestThreatDist = Infinity;
              let threatened = false;

              for (const other of others) {
                if (other.size > fish.size * 1.2 && (other.type === 'predator' || other.type === 'mutant')) {
                  const dx = fish.x - other.x;
                  const dy = fish.y - other.y;
                  const d = Math.sqrt(dx * dx + dy * dy);
                  if (d < AI_DETECTION_RANGE) {
                    threatened = true;
                    if (d < nearestThreatDist) nearestThreatDist = d;
                    if (d > 0) {
                      fleeX += dx / d;
                      fleeY += dy / d;
                    }
                  }
                }
              }
              // Flee from player if player is bigger
              if (player.size > fish.size * 1.2) {
                const pdx = fish.x - player.x;
                const pdy = fish.y - player.y;
                const pd = Math.sqrt(pdx * pdx + pdy * pdy);
                if (pd < AI_DETECTION_RANGE) {
                  threatened = true;
                  if (pd < nearestThreatDist) nearestThreatDist = pd;
                  if (pd > 0) {
                    fleeX += pdx / pd;
                    fleeY += pdy / pd;
                  }
                }
              }

              const maxSpeed = baseSpeed * AI_PREY_FLEE_SPEED;
              if (threatened) {
                const mag = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
                fish.vx = (fleeX / mag) * maxSpeed;
                fish.vy = (fleeY / mag) * maxSpeed;
                fish.isDashing = nearestThreatDist < fish.size * 8 && (fish.stamina ?? 0) > 15;
              } else {
                // Wander
                fish.vx += (Math.random() - 0.5) * 0.05;
                fish.vy += (Math.random() - 0.5) * 0.05;
                fish.isDashing = false;
              }

              // Prey flee stamina penalty - prey drains faster when escaping (player/predators get upper hand)
              const fleeDrainMult = fish.isDashing ? PREY_FLEE_STAMINA_MULTIPLIER : 1;
              if (fish.isDashing) {
                fish.stamina = Math.max(0, (fish.stamina ?? 100) - DASH_STAMINA_DRAIN_RATE * fleeDrainMult * (deltaTime / 60));
              } else {
                fish.stamina = Math.min(fish.maxStamina ?? 100, (fish.stamina ?? 100) + AI_STAMINA_REGEN * (deltaTime / 60));
              }
              if ((fish.stamina ?? 0) <= 0) fish.isDashing = false;
            }

            // Clamp speed (use appropriate max for predator vs prey)
            const effectiveMax = (fish.type === 'predator' || fish.type === 'mutant')
              ? baseSpeed * AI_PREDATOR_CHASE_SPEED
              : baseSpeed * AI_PREY_FLEE_SPEED;
            const sp = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
            if (sp > effectiveMax && sp > 0) {
              fish.vx = (fish.vx / sp) * effectiveMax;
              fish.vy = (fish.vy / sp) * effectiveMax;
            }
          } else if (!gameMode || fish.type !== 'prey' && fish.type !== 'predator') {
            // Non-AI or edit mode: occasional random direction
            if (Math.random() < 0.01) {
              fish.vx = (Math.random() - 0.5) * 2;
              fish.vy = (Math.random() - 0.5) * 2;
            }
          }

          // Delta-time adjusted position update
          fish.x += fish.vx * deltaTime;
          fish.y += fish.vy * deltaTime;
        } else {
          // Lock fish movement in edit mode
          fish.vx = 0;
          fish.vy = 0;
          if (fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant') fish.isDashing = false;
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
      });

      // Shared dash particles for player + AI fish (after all positions updated)
      if (gameMode) {
        const dashEntities = [
          { id: 'player', x: player.x, y: player.y, vx: player.vx, vy: player.vy, size: player.size, isDashing: player.isDashing },
          ...fishListRef.current
            .filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed')
            .map((f) => ({
              id: f.id,
              x: f.x,
              y: f.y,
              vx: f.vx ?? 0,
              vy: f.vy ?? 0,
              size: f.size,
              isDashing: !!(f.isDashing && (f.stamina ?? 0) > 0),
            })),
        ];
        multiEntityDashRef.current.update(dashEntities, deltaTime);
      }

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

        // Determine rendering mode based on LOD and animation availability
        const fishHasAnimations = hasUsableAnimations(fish.animations);
        const clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);

        // Apply spawn fade-in opacity
        ctx.save();
        ctx.globalAlpha = fishOpacity;

        let rendered = false;

        // Try animation frame rendering if animations are available
        if (clipMode === 'video' && fish.animations && fish.animationSprite) {
          // KO fish: use 'hurt' if available, otherwise idle; belly-up rotation
          const isKo = fish.lifecycleState === 'knocked_out';
          const desiredAction = isKo && fish.animationSprite.hasAction('hurt')
            ? 'hurt'
            : (fish.isDashing && fish.animationSprite.hasAction('dash')
              ? 'dash'
              : (fishSpeed < 0.15 ? 'idle' : 'swim'));
          fish.animationSprite.playAction(desiredAction);
          fish.animationSprite.update();

          const baseRotation = fish.facingRight ? fish.verticalTilt : -fish.verticalTilt;
          const rotation = isKo ? baseRotation + Math.PI / 2 : baseRotation;
          ctx.globalAlpha = isKo ? fishOpacity * 0.85 : fishOpacity;

          // Draw current frame
          rendered = fish.animationSprite.drawToContext(
            ctx,
            fish.x,
            fish.y,
            fish.size,
            fish.size,
            {
              flipX: !fish.facingRight,
              rotation,
            }
          );
        }

        // Fallback to deformation rendering if video not available/ready
        if (!rendered && fish.sprite) {
          const segments = getSegmentsSmooth(screenSize);
          const koTilt = fish.lifecycleState === 'knocked_out' ? Math.PI / 2 : 0;
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
              verticalTilt: fish.verticalTilt + koTilt,
              segments
            }
          );
        } else if (!rendered && !fish.sprite) {
          // Fallback to colored circle if no sprite
          ctx.fillStyle = fish.type === 'prey' ? '#4ade80' : fish.type === 'predator' ? '#f87171' : '#a78bfa';
          if (fish.lifecycleState === 'knocked_out') ctx.globalAlpha = (fishOpacity ?? 1) * 0.85;
          ctx.beginPath();
          ctx.arc(fish.x, fish.y, fish.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Store position for edit button
        buttonPositions.set(fish.id, { x: fish.x, y: fish.y, size: fish.size });
      });

      // Draw dash particles behind fish (flow, streaks) - shared for player + AI fish
      if (gameMode) {
        const dashEntityIds = [
          'player',
          ...fishListRef.current
            .filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed')
            .map((f) => f.id),
        ];
        multiEntityDashRef.current.drawBehind(ctx, dashEntityIds);
      }

      // Draw player with LOD based on screen-space size
      const playerSpeed = Math.min(1, Math.sqrt(player.vx ** 2 + player.vy ** 2) / MAX_SPEED);
      const playerScreenSize = player.size * currentZoom;
      const playerHasAnimations = hasUsableAnimations(player.animations);
      const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);

      let playerRendered = false;

      // Try animation sprite rendering first if animations available
      if (playerClipMode === 'video' && playerHasAnimations && animationSpriteManagerRef.current.hasSprite('player')) {
        const animSprite = animationSpriteManagerRef.current.getSprite('player', player.animations || {});
        // Switch to dash animation when dashing (if available)
        const desiredAction = player.isDashing && animSprite.hasAction('dash')
          ? 'dash'
          : (playerSpeed < 0.2 ? 'idle' : 'swim');
        if (lastPlayerAnimActionRef.current !== desiredAction) {
          lastPlayerAnimActionRef.current = desiredAction;
          animSprite.playAction(desiredAction);
        }
        animSprite.update();
        const state = animSprite.getState();
        // Log occasionally (every 60 frames)
        if (Math.random() < 0.017) {
          console.log(`[Render] Player animation: action=${state.currentAction}, frame=${state.currentFrame}, isLoaded=${state.isLoaded}`);
        }
        playerRendered = animSprite.drawToContext(
          ctx,
          player.x,
          player.y,
          player.size,
          player.size,
          {
            flipX: !player.facingRight,
            rotation: player.facingRight ? player.verticalTilt : -player.verticalTilt,
          }
        );
      }

      // Fall back to deformation rendering
      if (!playerRendered && player.sprite) {
        // Calculate screen-space size for smooth LOD (player gets extra segments)
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
        playerRendered = true;
      }

      if (!playerRendered) {
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

      // Draw dash particles in front of fish (burst bubbles at head)
      if (gameMode) {
        const dashEntityIds = [
          'player',
          ...fishListRef.current
            .filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed')
            .map((f) => f.id),
        ];
        multiEntityDashRef.current.drawInFront(ctx, dashEntityIds);
      }

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

        // Stamina bar - below hunger bar
        const staminaBarY = hungerBarY + hungerBarHeight + 8;
        const staminaPercent = player.stamina / player.maxStamina;
        const staminaColor = staminaPercent > 0.3 ? '#4ade80' : '#ef4444'; // Green when >30%, red when low
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(hungerBarX, staminaBarY, hungerBarWidth, hungerBarHeight);
        ctx.strokeRect(hungerBarX, staminaBarY, hungerBarWidth, hungerBarHeight);
        ctx.fillStyle = staminaColor;
        const staminaFillWidth = (hungerBarWidth - 6) * staminaPercent;
        ctx.fillRect(hungerBarX + 3, staminaBarY + 3, staminaFillWidth, hungerBarHeight - 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(`STAMINA: ${Math.ceil(player.stamina)}%`, hungerBarX + hungerBarWidth / 2, staminaBarY + hungerBarHeight / 2);

        // Timer display - underneath stamina bar
        const timerY = staminaBarY + hungerBarHeight + 12;
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
