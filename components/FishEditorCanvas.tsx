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

// Chroma key color - bright magenta for easy removal
const CHROMA_KEY = { r: 255, g: 0, b: 255 }; // #FF00FF

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

interface DrawFishOpts {
  /** Speed 0–1+; boosts tail motion when moving */
  speed?: number;
  /** 0–1 chomp phase; bulges front (head) when > 0 */
  chompPhase?: number;
}

// Draw fish sprite with spine-based deformation (warping/bending animation)
function drawFishWithDeformation(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  animTime: number,
  facingRight: boolean,
  verticalTilt: number,
  intensity: number,
  opts: DrawFishOpts = {}
) {
  const { speed = 0, chompPhase = 0 } = opts;
  // Movement-based animation: more tail motion when swimming
  const speedBoost = 1 + Math.min(1, speed) * 0.6;
  const effectiveIntensity = intensity * speedBoost;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facingRight ? verticalTilt : -verticalTilt);
  ctx.scale(facingRight ? 1 : -1, 1);

  const segments = 8;
  const segmentWidth = size / segments;

  for (let i = 0; i < segments; i++) {
    const waveStrength = 1 - i / segments; // 1 at tail, 0 at head
    const wave = Math.sin(animTime + i * 0.3) * 1.5 * waveStrength * effectiveIntensity;

    ctx.save();

    const segX = -size / 2 + i * segmentWidth;
    ctx.translate(segX, wave);

    const rotation = Math.sin(animTime + i * 0.3) * 0.025 * waveStrength * effectiveIntensity;
    ctx.rotate(rotation);

    // Chomp bulge: stretch front segments (head) horizontally
    let drawW = segmentWidth;
    let drawX = 0;
    if (chompPhase > 0) {
      const headAmount = i / segments; // 0 at tail, 1 at head
      const bulge = 1 + chompPhase * 0.4 * headAmount; // up to 40% wider at peak
      drawW = segmentWidth * bulge;
      drawX = facingRight ? -segmentWidth * (bulge - 1) * 0.5 : segmentWidth * (bulge - 1) * 0.5;
    }
    ctx.translate(drawX, 0);

    ctx.drawImage(
      sprite,
      (i / segments) * sprite.width,
      0,
      sprite.width / segments,
      sprite.height,
      0,
      -size / 2,
      drawW,
      size
    );

    ctx.restore();
  }

  ctx.restore();
}

// Advanced background removal - detects and removes background color automatically
function removeBackground(img: HTMLImageElement, tolerance: number = 50): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample corner colors to detect background
  const corners = [
    { x: 0, y: 0 },
    { x: canvas.width - 1, y: 0 },
    { x: 0, y: canvas.height - 1 },
    { x: canvas.width - 1, y: canvas.height - 1 },
  ];

  // Get average corner color (likely the background)
  let totalR = 0, totalG = 0, totalB = 0;
  corners.forEach(corner => {
    const idx = (corner.y * canvas.width + corner.x) * 4;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
  });

  const bgColor = {
    r: Math.round(totalR / corners.length),
    g: Math.round(totalG / corners.length),
    b: Math.round(totalB / corners.length),
  };

  console.log('Detected background color:', bgColor);

  // Remove background color
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate color difference from detected background
    const diff = Math.sqrt(
      Math.pow(r - bgColor.r, 2) +
      Math.pow(g - bgColor.g, 2) +
      Math.pow(b - bgColor.b, 2)
    );

    // If pixel is close to background color, make it transparent
    if (diff < tolerance) {
      data[i + 3] = 0; // Set alpha to 0
    } else if (diff < tolerance * 1.5) {
      // Feather edges for smoother transitions
      const alpha = ((diff - tolerance) / (tolerance * 0.5)) * 255;
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export default function FishEditorCanvas({
  background,
  playerFishSprite,
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


  // Update refs when props change
  useEffect(() => { chromaToleranceRef.current = chromaTolerance }, [chromaTolerance])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { deformationRef.current = deformationIntensity }, [deformationIntensity])
  useEffect(() => { editModeRef.current = editMode }, [editMode])
  useEffect(() => { selectedFishIdRef.current = selectedFishId }, [selectedFishId])
  useEffect(() => { fishDataRef.current = fishData }, [fishData])
  useEffect(() => { pausedRef.current = paused }, [paused])
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

    const canvas = canvasRef.current;
    const pos = canvas ? { x: Math.random() * canvas.width, y: Math.random() * canvas.height } : { x: 400, y: 300 };

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
        };
      } else {
        fishListRef.current.push({
          ...aiFish,
          sprite: processedSprite,
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
  const scoreRef = useRef<number>(0);
  const fishEatenRef = useRef<number>(0);
  const essenceCollectedRef = useRef<number>(0);
  // Pause timer tracking
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const wasPausedRef = useRef<boolean>(false);

  // FPS tracking
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const [showFPS, setShowFPS] = useState<boolean>(false);
  const cameraRef = useRef({ x: 0, y: 0 });
  const worldBoundsRef = useRef({
    minX: -2000,
    maxX: 2000,
    minY: -2000,
    maxY: 2000,
  });

  // Game state
  const playerRef = useRef({
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
  }>>([]);

  const bloodParticlesRef = useRef<Array<{
    x: number;
    y: number;
    life: number;
    radius: number;
  }>>([]);

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
  }>>([]);

  /** Cache processed sprites by creature id for respawn (game mode). */
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  /** Pool of creatures to spawn from (mirrors spawnedFish for use in game loop). */
  const spawnPoolRef = useRef<(Creature | { id: string; sprite: string; type: string })[]>([]);
  const lastRespawnTimeRef = useRef(0);
  const MAX_FISH_IN_WORLD = 28;
  const RESPAWN_INTERVAL_MS = 3500;

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
    const currentZoom = zoomRef.current;
    for (const [fishId, pos] of editButtonPositionsRef.current.entries()) {
      // Calculate button position in screen space (same as rendering)
      const screenX = pos.x * currentZoom;
      const screenY = pos.y * currentZoom - pos.size * currentZoom / 2 - 24 - 5;
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
      }
    }
  }, [checkEditButtonClick]);

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

  // Load player fish sprite
  useEffect(() => {
    if (!playerFishSprite) {
      playerRef.current.sprite = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Process to remove background
      playerRef.current.sprite = removeBackground(img, chromaToleranceRef.current);
    };
    img.onerror = () => {
      console.error('Failed to load player fish sprite');
      playerRef.current.sprite = null;
    };
    // For HTTP(S) sprites, use clean URL to allow browser caching; for data: URLs, use as-is
    if (playerFishSprite.startsWith('data:')) {
      img.src = playerFishSprite;
    } else {
      // Remove any existing query params to use clean URL for caching
      img.src = playerFishSprite.split('?')[0];
    }
  }, [playerFishSprite]);

  // Update fish sizes from fishData
  useEffect(() => {
    fishListRef.current.forEach((fish) => {
      const data = fishDataRef.current.get(fish.id);
      if (data) {
        fish.size = data.stats.size;
      }
    });
  }, [fishData]);

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

    // 5. Reload all fish sprites
    const reloadPromises: Promise<void>[] = [];
    fishListRef.current.forEach((fish) => {
      const data = fishDataRef.current.get(fish.id);
      const spriteUrl = data?.sprite || spawnedFish.find(f => f.id === fish.id)?.sprite;
      if (spriteUrl) {
        console.log('[FishEditorCanvas] Queuing reload for:', fish.id);
        reloadPromises.push(
          reloadSprite(fish.id, spriteUrl, (processedSprite) => {
            fish.sprite = processedSprite;
            spriteCacheRef.current.set(fish.id, processedSprite);
            fishSpriteUrlsRef.current.set(fish.id, spriteUrl);
          })
        );
      }
    });

    // 6. Also reload player sprite
    if (playerRef.current.sprite && playerFishSprite) {
      console.log('[FishEditorCanvas] Queuing player sprite reload');
      reloadPromises.push(
        reloadSprite('player', playerFishSprite, (processedSprite) => {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Keep spawn pool in sync for respawn (use full list so weighting matches initial spawn)
    spawnPoolRef.current = spawnedFish.length ? [...spawnedFish] : [];

    // Helper to load and process a sprite
    const loadSprite = (spriteUrl: string, fishId: string, onLoaded: (processedSprite: HTMLCanvasElement) => void) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSprite = removeBackground(img, chromaToleranceRef.current);
        onLoaded(processedSprite);
      };
      img.onerror = () => {
        console.error('Failed to load fish sprite:', spriteUrl);
      };
      // For data: URLs, use as-is; for HTTP(S), add cache buster to force reload
      if (spriteUrl.startsWith('data:')) {
        img.src = spriteUrl;
      } else {
        // Add cache buster with version to force reload after save
        const version = spriteVersionRef.current.get(fishId) || 0;
        img.src = `${spriteUrl.split('?')[0]}?v=${version}&t=${Date.now()}`;
      }
    };

    spawnedFish.forEach((fishItem) => {
      if (eatenIdsRef.current.has(fishItem.id)) return;

      const existingFish = fishListRef.current.find((f) => f.id === fishItem.id);
      const previousSpriteUrl = fishSpriteUrlsRef.current.get(fishItem.id);
      const currentSpriteUrl = fishItem.sprite;

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

      if (existingFish && spriteChanged) {
        // SPRITE CHANGED - reload the sprite for existing fish
        // Increment version to bust cache
        const newVersion = (spriteVersionRef.current.get(fishItem.id) || 0) + 1;
        spriteVersionRef.current.set(fishItem.id, newVersion);
        console.log('[FishEditorCanvas] Sprite changed for fish:', fishItem.id, '- reloading (version:', newVersion, ')');
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          existingFish.sprite = processedSprite;
          // Update cache for respawn
          spriteCacheRef.current.set(fishItem.id, processedSprite);
        });
      } else if (!existingFish) {
        // NEW FISH - add to list
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          // Cache by creature id for respawn in game mode
          spriteCacheRef.current.set(fishItem.id, processedSprite);

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
            // Legacy format - use defaults or fishData
            const fishInfo = fishDataRef.current.get(fishItem.id);
            const defaultSize = fishItem.type === 'prey' ? 60 : fishItem.type === 'predator' ? 120 : 90;
            fishSize = fishInfo?.stats.size ?? defaultSize;
            baseSpeed = fishInfo?.stats.speed ?? 2;
            fishType = fishItem.type;
          }

          // Calculate velocity based on speed
          const speedScale = 0.1; // Scale down for canvas movement
          const vx = (Math.random() - 0.5) * baseSpeed * speedScale;
          const vy = (Math.random() - 0.5) * baseSpeed * speedScale;

          const newFish = {
            id: fishItem.id,
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
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
          };
          fishListRef.current.push(newFish);
        });
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

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyKeysRef.current.add(key);

      // Toggle FPS with F key
      if (key === 'f') {
        setShowFPS(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyKeysRef.current.delete(key);
    };

    const hasKey = (k: string) => keyKeysRef.current.has(k);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

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
        if (frameTimesRef.current.length > 0) {
          const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          fpsRef.current = Math.round(1000 / avgFrameTime);
        }
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

      // Collision: eat prey and check predators
      const playerR = player.size * 0.45;
      for (let idx = fishListRef.current.length - 1; idx >= 0; idx--) {
        const fish = fishListRef.current[idx];
        const fishR = fish.size * 0.45;
        const dx = fish.x - player.x;
        const dy = fish.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < playerR + fishR) {
          // In game mode, check if player can eat this fish or gets eaten
          if (gameMode) {
            if (fish.size > player.size * 1.2) {
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
              player.size = Math.min(200, player.size + sizeGain);

              // Restore hunger based on fish size
              const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
              player.hunger = Math.min(HUNGER_MAX, player.hunger + hungerRestore);

              player.chompPhase = 1;
              player.chompEndTime = now + 280;
              const eatX = (fish.x + player.x) * 0.5;
              const eatY = (fish.y + player.y) * 0.5;
              for (let k = 0; k < 6; k++) {
                chompParticlesRef.current.push({
                  x: eatX + (Math.random() - 0.5) * 16,
                  y: eatY + (Math.random() - 0.5) * 16,
                  life: 1,
                  scale: 1 + Math.random() * 0.5,
                  text: k === 0 ? 'CHOMP' : ['!', '•', '*', '♥'][k % 4],
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
            player.size = Math.min(200, player.size + sizeGain);
            player.chompPhase = 1;
            player.chompEndTime = now + 280;
            const eatX = (fish.x + player.x) * 0.5;
            const eatY = (fish.y + player.y) * 0.5;
            for (let k = 0; k < 6; k++) {
              chompParticlesRef.current.push({
                x: eatX + (Math.random() - 0.5) * 16,
                y: eatY + (Math.random() - 0.5) * 16,
                life: 1,
                scale: 1 + Math.random() * 0.5,
                text: k === 0 ? 'CHOMP' : ['!', '•', '*', '♥'][k % 4],
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
          const sprite = spriteCacheRef.current.get(creature.id);
          if (sprite && canvas) {
            const fishSize = isCreature(creature) ? creature.stats.size : 60;
            const baseSpeed = isCreature(creature) ? (creature.stats.speed ?? 2) : 2;
            const speedScale = 0.1;
            const vx = (Math.random() - 0.5) * baseSpeed * speedScale;
            const vy = (Math.random() - 0.5) * baseSpeed * speedScale;
            const bounds = worldBoundsRef.current;
            const newFish = {
              id: `${creature.id}-r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
              y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
              vx,
              vy,
              size: fishSize,
              sprite,
              type: isCreature(creature) ? creature.type : 'prey',
              facingRight: vx >= 0,
              verticalTilt: 0,
              animTime: Math.random() * Math.PI * 2,
              creatureData: isCreature(creature) ? creature : undefined,
            };
            fishListRef.current.push(newFish);
          }
          lastRespawnTimeRef.current = now;
        }
      }

      // Game mode: constrain to world bounds, else wrap around screen
      if (gameMode) {
        // Constrain player to world bounds
        const bounds = worldBoundsRef.current;
        player.x = Math.max(bounds.minX, Math.min(bounds.maxX, player.x));
        player.y = Math.max(bounds.minY, Math.min(bounds.maxY, player.y));

        // Update camera to follow player
        cameraRef.current.x = player.x;
        cameraRef.current.y = player.y;

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
      } else {
        // Wrap around screen (editor mode)
        if (player.x < 0) player.x = canvas.width;
        if (player.x > canvas.width) player.x = 0;
        if (player.y < 0) player.y = canvas.height;
        if (player.y > canvas.height) player.y = 0;
      }

      // Update AI fish (lock movement in edit mode or when paused)
      fishListRef.current.forEach((fish) => {
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

        // Game mode: keep fish in bounds, else wrap around
        if (gameMode) {
          const bounds = worldBoundsRef.current;
          // Bounce off edges
          if (fish.x < bounds.minX || fish.x > bounds.maxX) {
            fish.vx = -fish.vx;
            fish.x = Math.max(bounds.minX, Math.min(bounds.maxX, fish.x));
          }
          if (fish.y < bounds.minY || fish.y > bounds.maxY) {
            fish.vy = -fish.vy;
            fish.y = Math.max(bounds.minY, Math.min(bounds.maxY, fish.y));
          }
        } else {
          // Wrap around (editor mode)
          if (fish.x < 0) fish.x = canvas.width;
          if (fish.x > canvas.width) fish.x = 0;
          if (fish.y < 0) fish.y = canvas.height;
          if (fish.y > canvas.height) fish.y = 0;
        }

        // Occasional direction change
        if (Math.random() < 0.01) {
          fish.vx = (Math.random() - 0.5) * 2;
          fish.vy = (Math.random() - 0.5) * 2;
        }
      });

      // Update water effect time
      waterTimeRef.current += 0.01;

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate target zoom and camera for edit mode
      let targetZoom = zoomRef.current;
      let targetCameraX = 0;
      let targetCameraY = 0;
      let useEditModeCamera = false;

      const currentSelectedFishId = selectedFishIdRef.current;
      if (currentEditMode && currentSelectedFishId) {
        // Find selected fish (could be AI fish or player)
        let selectedFish = fishListRef.current.find((f) => f.id === currentSelectedFishId);
        let selectedSize = 0;
        let selectedX = 0;
        let selectedY = 0;

        if (selectedFish) {
          selectedSize = selectedFish.size;
          selectedX = selectedFish.x;
          selectedY = selectedFish.y;
        } else if (currentSelectedFishId === 'player') {
          // Player fish selected
          selectedSize = player.size;
          selectedX = player.x;
          selectedY = player.y;
        }

        if (selectedSize > 0) {
          useEditModeCamera = true;
          // In edit mode, we want to show fish in top area (50% of screen height)
          // Calculate zoom to fit fish in top half horizontally with padding
          const padding = 40;
          const targetWidth = canvas.width - padding * 2;
          const baseZoomToFit = targetWidth / selectedSize;
          const baseZoom = Math.max(1, baseZoomToFit);

          // Apply manual zoom multiplier (allows zooming in/out from base)
          targetZoom = baseZoom * zoomRef.current;

          // Position camera to show fish in top area (center horizontally, top 25% vertically)
          targetCameraX = selectedX;
          targetCameraY = selectedY;
        }
      }

      // Update target refs
      targetZoomRef.current = targetZoom;
      targetCameraRef.current = { x: targetCameraX, y: targetCameraY };

      // Smooth interpolation (lerp) for zoom and camera
      const lerpSpeed = 0.08; // Adjust for faster/slower transitions
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

      // Draw background BEFORE camera translation (so it stays in place)
      // For edit mode, we want the background to fill the view centered on the fish
      if (backgroundImageRef.current) {
        ctx.save();
        ctx.filter = 'blur(6px)';

        if (gameMode) {
          // Parallax background - moves slower than camera
          const camera = cameraRef.current;
          const parallaxFactor = 0.3;
          const bgOffsetX = camera.x * parallaxFactor;
          const bgOffsetY = camera.y * parallaxFactor;

          // Calculate scaling to maintain aspect ratio
          const img = backgroundImageRef.current;
          const imgAspect = img.width / img.height;
          const screenAspect = scaledWidth / scaledHeight;

          let drawWidth, drawHeight;
          if (imgAspect > screenAspect) {
            drawHeight = scaledHeight * 1.5;
            drawWidth = drawHeight * imgAspect;
          } else {
            drawWidth = scaledWidth * 1.5;
            drawHeight = drawWidth / imgAspect;
          }

          const bgX = (scaledWidth - drawWidth) / 2 - bgOffsetX + camera.x - scaledWidth / 2;
          const bgY = (scaledHeight - drawHeight) / 2 - bgOffsetY + camera.y - scaledHeight / 2;

          ctx.drawImage(backgroundImageRef.current, bgX, bgY, drawWidth, drawHeight);
        } else if (usingEditCamera) {
          // Edit mode with camera - draw background centered on fish position
          const img = backgroundImageRef.current;
          const imgAspect = img.width / img.height;
          const screenAspect = scaledWidth / scaledHeight;

          // Scale background to cover view with some extra for parallax effect
          let drawWidth, drawHeight;
          if (imgAspect > screenAspect) {
            drawHeight = scaledHeight * 1.3;
            drawWidth = drawHeight * imgAspect;
          } else {
            drawWidth = scaledWidth * 1.3;
            drawHeight = drawWidth / imgAspect;
          }

          // Center background on fish with parallax
          const topAreaCenterY = scaledHeight * 0.25;
          const parallaxFactor = 0.5;
          const bgX = (scaledWidth / 2) - (drawWidth / 2) - (cameraX - scaledWidth / 2) * parallaxFactor;
          const bgY = topAreaCenterY - (drawHeight / 2) - (cameraY - scaledHeight / 2) * parallaxFactor;

          ctx.drawImage(backgroundImageRef.current, bgX, bgY, drawWidth, drawHeight);
        } else {
          // Editor mode - normal background
          ctx.drawImage(backgroundImageRef.current, 0, 0, scaledWidth, scaledHeight);
        }
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
        // Default gradient background - need to account for camera offset in edit mode
        if (usingEditCamera) {
          const topAreaCenterY = scaledHeight * 0.25;
          // Draw a larger gradient that covers the view even with camera offset
          const offsetX = scaledWidth / 2 - cameraX;
          const offsetY = topAreaCenterY - cameraY;
          const gradient = ctx.createLinearGradient(-offsetX, -offsetY, -offsetX, scaledHeight - offsetY);
          gradient.addColorStop(0, '#1e40af');
          gradient.addColorStop(1, '#1e3a8a');
          ctx.fillStyle = gradient;
          ctx.fillRect(-offsetX, -offsetY, scaledWidth * 2, scaledHeight * 2);
        } else {
          const gradient = ctx.createLinearGradient(0, 0, 0, scaledHeight);
          gradient.addColorStop(0, '#1e40af');
          gradient.addColorStop(1, '#1e3a8a');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, scaledWidth, scaledHeight);
        }
      }

      // Apply camera transform AFTER background is drawn
      if (usingEditCamera) {
        // Position fish in top area: center horizontally, top 25% vertically
        const topAreaCenterY = scaledHeight * 0.25;
        ctx.translate(scaledWidth / 2 - cameraX, topAreaCenterY - cameraY);
      } else if (gameMode) {
        // In game mode, translate for camera following
        const camera = cameraRef.current;
        ctx.translate(scaledWidth / 2 - camera.x, scaledHeight / 2 - camera.y);
      }

      // Draw AI fish
      const buttonPositions = new Map<string, { x: number; y: number; size: number }>();
      fishListRef.current.forEach((fish) => {
        if (fish.sprite) {
          const fishSpeed = Math.min(1, Math.sqrt(fish.vx ** 2 + fish.vy ** 2) / MAX_SPEED);
          drawFishWithDeformation(
            ctx,
            fish.sprite,
            fish.x,
            fish.y,
            fish.size,
            fish.animTime,
            fish.facingRight,
            fish.verticalTilt,
            deformationRef.current,
            { speed: fishSpeed }
          );
        } else {
          ctx.fillStyle = fish.type === 'prey' ? '#4ade80' : fish.type === 'predator' ? '#f87171' : '#a78bfa';
          ctx.beginPath();
          ctx.arc(fish.x, fish.y, fish.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Store position for edit button
        buttonPositions.set(fish.id, { x: fish.x, y: fish.y, size: fish.size });
      });

      // Draw player
      const playerSpeed = Math.min(1, Math.sqrt(player.vx ** 2 + player.vy ** 2) / MAX_SPEED);
      if (player.sprite) {
        drawFishWithDeformation(
          ctx,
          player.sprite,
          player.x,
          player.y,
          player.size,
          player.animTime,
          player.facingRight,
          player.verticalTilt,
          deformationRef.current,
          { speed: playerSpeed, chompPhase: player.chompPhase }
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

      // Store player position for edit button (use special ID "player")
      buttonPositions.set('player', { x: player.x, y: player.y, size: player.size });

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
        ctx.font = `bold ${Math.round(16 * p.scale)}px sans-serif`;

        // Color based on text type
        let fillColor = '#fff';
        if (p.text === 'CHOMP') {
          fillColor = '#ffcc00';
        } else if (p.text.startsWith('+')) {
          fillColor = '#4ade80'; // Green for hunger restore
        }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
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

      // Low hunger visual warning (red tint and vignette)
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

      // Restore zoom transform (now we're in screen space)
      ctx.restore();

      // Draw edit buttons on fish (in screen space)
      if (showEditButtonsRef.current && !currentEditMode && onEditFish) {
        buttonPositions.forEach((pos, fishId) => {
          // Calculate screen position - buttons are drawn after all transforms are restored
          const screenX = pos.x * currentZoom;
          const screenY = pos.y * currentZoom;

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

      // UI text overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '14px monospace';

      if (gameMode) {
        // Game mode UI - account for paused time
        const currentPausedTime = isPaused ? (Date.now() - pauseStartTimeRef.current) : 0;
        const elapsed = Date.now() - gameStartTimeRef.current - totalPausedTimeRef.current - currentPausedTime;
        const timeLeft = Math.max(0, Math.ceil((levelDuration - elapsed) / 1000));
        ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);
        ctx.fillText(`Size: ${Math.floor(player.size)}`, 10, 40);
        ctx.fillText(`Time: ${timeLeft}s`, 10, 60);

        // Hunger Meter - centered at top
        const hungerBarWidth = 300;
        const hungerBarHeight = 30;
        const hungerBarX = (canvas.width - hungerBarWidth) / 2;
        const hungerBarY = 20;
        const hungerPercent = player.hunger / 100;

        // Background with chunky border (DICE VADERS style)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
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
        const fillWidth = (hungerBarWidth - 8) * hungerPercent;
        ctx.fillRect(hungerBarX + 4, hungerBarY + 4, fillWidth, hungerBarHeight - 8);

        // Glow effect for low hunger
        if (hungerPercent <= 0.25) {
          const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
          ctx.shadowColor = hungerColor;
          ctx.shadowBlur = 20 * pulse;
          ctx.strokeStyle = hungerColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(hungerBarX, hungerBarY, hungerBarWidth, hungerBarHeight);
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        // Text label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`HUNGER: ${Math.ceil(player.hunger)}%`, hungerBarX + hungerBarWidth / 2, hungerBarY + hungerBarHeight / 2);

        ctx.restore();
      } else if (!currentEditMode) {
        // Editor mode UI
        ctx.fillText('WASD / Arrows · Tap and hold for analog control', 10, 20);
        ctx.fillText(`Zoom: ${(currentZoom * 100).toFixed(0)}%`, 10, 40);
        ctx.fillText(`Size: ${player.size} (eat prey to grow)`, 10, 60);
      }

      // Draw paused indicator (small, non-blocking) if paused
      if (isPaused) {
        // Small pause indicator in top-left corner instead of full overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 120, 40);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸ PAUSED', 20, 30);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', updateCanvasSize);
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
        onTouchStart={handleCanvasTouchStart}
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
      />
      <div style={{ pointerEvents: paused ? 'none' : 'auto', position: 'absolute', inset: 0, zIndex: 20 }}>
        <AnalogJoystick onChange={handleJoystickChange} mode="on-touch" disabled={paused} />
      </div>
      {/* FPS Counter */}
      {showFPS && (
        <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded border border-cyan-400 text-cyan-300 text-sm font-mono z-30">
          {fpsRef.current} FPS
        </div>
      )}
      {/* FPS Toggle Button (small, bottom-right) */}
      <button
        onClick={() => setShowFPS(!showFPS)}
        className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded border border-gray-600 text-gray-400 text-xs font-mono z-30 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
        title="Toggle FPS counter (or press F)"
      >
        FPS
      </button>
    </div>
  );
}
