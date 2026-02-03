/**
 * Fish Rendering Utilities
 * 
 * Shared module for rendering animated fish sprites consistently
 * across the game, editor, and selection screens.
 * 
 * All fish display should use these functions to ensure:
 * - Consistent chroma key removal
 * - Consistent animation/deformation
 * - Single source of truth for future animation enhancements
 */

import { cacheBust } from '@/lib/utils/cache-bust';

// Default chroma key tolerance
export const DEFAULT_CHROMA_TOLERANCE = 50;

// =============================================================================
// LOD (Level of Detail) System - Smooth Interpolation
// =============================================================================

/** LOD level type */
export type LODLevel = 1 | 2 | 3 | 4;

/** LOD thresholds based on screen-space size in pixels */
export const LOD_THRESHOLDS = {
  VIDEO_DETAIL: 120,  // >= 120px: use video clips if available
  FULL_DETAIL: 80,    // >= 80px: max segments
  MEDIUM_DETAIL: 40,  // 40-79px: medium segments  
  LOW_DETAIL: 20,     // 20-39px: low segments
  STATIC: 12,         // < 12px: static sprite (no animation)
};

/** Segment range for smooth interpolation */
export const SEGMENT_RANGE = {
  MAX: 12,   // Maximum segments at full detail
  MIN: 3,    // Minimum segments before going static
};

/** Player segment multiplier (2x vs 1.5x for AI) */
export const PLAYER_SEGMENT_MULTIPLIER = 1.34; // 12 * 1.34 ≈ 16 for player

/**
 * Calculate LOD level based on screen-space size (for compatibility)
 * 
 * @param screenSize - Size of fish in screen pixels (fish.size * zoom)
 * @returns LOD level (1-4, where 1 is highest detail)
 */
export function getLODLevel(screenSize: number): LODLevel {
  if (screenSize >= LOD_THRESHOLDS.FULL_DETAIL) return 1;
  if (screenSize >= LOD_THRESHOLDS.MEDIUM_DETAIL) return 2;
  if (screenSize >= LOD_THRESHOLDS.LOW_DETAIL) return 3;
  return 4;
}

/**
 * Get segment count with smooth interpolation based on screen size
 * This prevents flickering by smoothly transitioning segment counts
 * 
 * @param screenSize - Size of fish in screen pixels (fish.size * zoom)
 * @returns Number of segments to use for animation (smoothly interpolated)
 */
export function getSegmentsSmooth(screenSize: number): number {
  // Below static threshold - use static rendering
  if (screenSize < LOD_THRESHOLDS.STATIC) {
    return 0;
  }

  // Smoothly interpolate segments based on screen size
  // Map screen size from [STATIC, FULL_DETAIL] to [MIN, MAX] segments
  const t = Math.min(1, Math.max(0,
    (screenSize - LOD_THRESHOLDS.STATIC) / (LOD_THRESHOLDS.FULL_DETAIL - LOD_THRESHOLDS.STATIC)
  ));

  // Use smoothstep for even smoother transitions
  const smoothT = t * t * (3 - 2 * t);

  // Interpolate and round to nearest integer
  const segments = Math.round(SEGMENT_RANGE.MIN + smoothT * (SEGMENT_RANGE.MAX - SEGMENT_RANGE.MIN));

  return segments;
}

/**
 * Get segment count for a given LOD level (discrete, for compatibility)
 * @deprecated Use getSegmentsSmooth for smoother transitions
 */
export function getSegmentsForLOD(lod: LODLevel): number {
  switch (lod) {
    case 1: return 12;
    case 2: return 6;
    case 3: return 3;
    case 4: return 0;
  }
}

// =============================================================================
// Multi-Resolution Sprite Selection
// =============================================================================

import type { SpriteResolutions, GrowthSprites, GrowthStage, GrowthSpriteData } from '@/lib/game/types';

/** Thresholds for selecting sprite resolution based on screen size */
export const SPRITE_RESOLUTION_THRESHOLDS = {
  HIGH: 100,    // >= 100px screen size: use 512px sprite
  MEDIUM: 40,   // >= 40px screen size: use 256px sprite
  // < 40px: use 128px sprite
};

// Debug flag for mipmap logging - set to true to see resolution swaps in console
let MIPMAP_DEBUG = false;
let lastLoggedResolution: Map<string, string> = new Map();

/** Enable/disable mipmap debug logging */
export function setMipmapDebug(enabled: boolean): void {
  MIPMAP_DEBUG = enabled;
  if (!enabled) {
    lastLoggedResolution.clear();
  }
  console.log(`[Mipmap] Debug logging ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/** Check if mipmap debug is enabled */
export function isMipmapDebugEnabled(): boolean {
  return MIPMAP_DEBUG;
}

/**
 * Get the appropriate sprite URL based on screen-space size
 * 
 * Selects the optimal resolution variant to avoid choppy rendering
 * when large images are scaled down significantly (mipmap-like behavior).
 * 
 * @param creature - Object with sprite URL and optional resolution variants
 * @param screenSize - Size of fish in screen pixels (fish.size * zoom)
 * @param creatureId - Optional ID for debug logging
 * @returns URL of the appropriate sprite resolution
 */
export function getSpriteUrl(
  creature: { sprite: string; spriteResolutions?: SpriteResolutions },
  screenSize: number,
  creatureId?: string
): string {
  // Fall back to original sprite if no resolution variants available
  if (!creature.spriteResolutions) {
    return creature.sprite;
  }

  // Select resolution based on screen size
  let resolution: 'high' | 'medium' | 'low';
  let url: string;

  if (screenSize >= SPRITE_RESOLUTION_THRESHOLDS.HIGH) {
    resolution = 'high';
    url = creature.spriteResolutions.high;
  } else if (screenSize >= SPRITE_RESOLUTION_THRESHOLDS.MEDIUM) {
    resolution = 'medium';
    url = creature.spriteResolutions.medium;
  } else {
    resolution = 'low';
    url = creature.spriteResolutions.low;
  }

  // Debug logging - only log when resolution changes for a creature
  if (MIPMAP_DEBUG && creatureId) {
    const lastRes = lastLoggedResolution.get(creatureId);
    if (lastRes !== resolution) {
      console.log(`[Mipmap] ${creatureId}: ${lastRes || 'none'} -> ${resolution} (screenSize: ${screenSize.toFixed(1)}px)`);
      lastLoggedResolution.set(creatureId, resolution);
    }
  }

  return url;
}

/**
 * Get the resolution key (high/medium/low) for a given screen size
 * Useful for cache key generation
 * 
 * @param screenSize - Size of fish in screen pixels
 * @returns Resolution key
 */
export function getResolutionKey(screenSize: number): 'high' | 'medium' | 'low' {
  if (screenSize >= SPRITE_RESOLUTION_THRESHOLDS.HIGH) return 'high';
  if (screenSize >= SPRITE_RESOLUTION_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

// =============================================================================
// Growth Stage Sprite Selection (unified 20-300 art scale)
// =============================================================================

/** Art size bounds - used by editor slider and growth stage logic */
export const ART_SIZE_MIN = 20;
export const ART_SIZE_MAX = 300;

/**
 * Default size ranges for growth stages.
 * Single source of truth: editor slider (20-300), game spawn, and saved growthSprites
 * all use this scale so juvenile/adult/elder match everywhere.
 */
export const DEFAULT_GROWTH_RANGES = {
  juvenile: { min: ART_SIZE_MIN, max: 99 },    // 20-99: small / young
  adult: { min: 100, max: 199 },               // 100-199: mature (adult starts at 100)
  elder: { min: 200, max: ART_SIZE_MAX },     // 200-300: large / elder (elder starts at 200)
};

// Debug flag for growth stage logging
let GROWTH_DEBUG = false;
let lastLoggedGrowthStage: Map<string, GrowthStage> = new Map();

/** Enable/disable growth stage debug logging */
export function setGrowthDebug(enabled: boolean): void {
  GROWTH_DEBUG = enabled;
  if (!enabled) {
    lastLoggedGrowthStage.clear();
  }
  console.log(`[Growth] Debug logging ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/** Check if growth debug is enabled */
export function isGrowthDebugEnabled(): boolean {
  return GROWTH_DEBUG;
}

/**
 * Get the growth stage for a given fish size
 * 
 * @param fishSize - The actual size of the fish (not screen size)
 * @param growthSprites - Optional growth sprites with custom size ranges
 * @returns The growth stage ('juvenile', 'adult', or 'elder')
 */
/** Canonical elder start; stored ranges below this are treated as legacy and ignored */
const CANONICAL_ELDER_MIN = 200;

export function getGrowthStage(fishSize: number, growthSprites?: GrowthSprites): GrowthStage {
  // Use custom ranges only if they match our 20-300 scale (elder starts at 200)
  // Legacy saved data (e.g. elder 70-150) would show elder too early; use defaults instead
  const elderRangeStored = growthSprites?.elder?.sizeRange;
  const useStoredRanges =
    elderRangeStored != null && elderRangeStored.min >= CANONICAL_ELDER_MIN;

  const juvenileRange =
    useStoredRanges && growthSprites?.juvenile?.sizeRange
      ? growthSprites.juvenile.sizeRange
      : DEFAULT_GROWTH_RANGES.juvenile;
  const elderRange =
    useStoredRanges && elderRangeStored
      ? elderRangeStored
      : DEFAULT_GROWTH_RANGES.elder;

  if (fishSize <= juvenileRange.max) {
    return 'juvenile';
  } else if (fishSize >= elderRange.min) {
    return 'elder';
  }
  return 'adult';
}

/**
 * Get the appropriate sprite data for a growth stage
 * Falls back to the base sprite if the stage-specific sprite isn't available
 * 
 * @param creature - Creature with sprite, spriteResolutions, and growthSprites
 * @param fishSize - The actual size of the fish
 * @param creatureId - Optional ID for debug logging
 * @returns Object with sprite URL and optional resolutions for the growth stage
 */
export function getGrowthStageSprite(
  creature: {
    sprite: string;
    spriteResolutions?: SpriteResolutions;
    growthSprites?: GrowthSprites;
  },
  fishSize: number,
  creatureId?: string
): { sprite: string; spriteResolutions?: SpriteResolutions } {
  const stage = getGrowthStage(fishSize, creature.growthSprites);

  // Debug logging - only log when stage changes for a creature
  if (GROWTH_DEBUG && creatureId) {
    const lastStage = lastLoggedGrowthStage.get(creatureId);
    if (lastStage !== stage) {
      console.log(`[Growth] ${creatureId}: ${lastStage || 'none'} -> ${stage} (size: ${fishSize})`);
      lastLoggedGrowthStage.set(creatureId, stage);
    }
  }

  // Get the growth stage sprite data if available
  const stageData = creature.growthSprites?.[stage];

  if (stageData?.sprite) {
    return {
      sprite: stageData.sprite,
      spriteResolutions: stageData.spriteResolutions,
    };
  }

  // Fall back to base sprite
  return {
    sprite: creature.sprite,
    spriteResolutions: creature.spriteResolutions,
  };
}

/**
 * Single source of truth: get the sprite URL for a creature at a given size.
 * Use this everywhere we display a fish (fish select, thumbnails, pause menu, game, editor).
 * Growth stage (juvenile/adult/elder) is derived from size; falls back to base sprite if no growthSprites.
 */
export function getSpriteUrlForSize(
  creature: {
    sprite: string;
    growthSprites?: GrowthSprites;
  },
  fishSize: number
): string {
  const { sprite } = getGrowthStageSprite(creature, fishSize);
  return sprite;
}

/**
 * Get the appropriate sprite URL considering both growth stage AND resolution
 * This is the main function to use for rendering growth-aware sprites
 * 
 * @param creature - Creature with sprite, spriteResolutions, and growthSprites
 * @param fishSize - The actual size of the fish (for growth stage selection)
 * @param screenSize - The screen-space size (for resolution selection)
 * @param creatureId - Optional ID for debug logging
 * @returns The final sprite URL to use
 */
export function getGrowthAwareSpriteUrl(
  creature: {
    sprite: string;
    spriteResolutions?: SpriteResolutions;
    growthSprites?: GrowthSprites;
  },
  fishSize: number,
  screenSize: number,
  creatureId?: string
): string {
  // First, get the appropriate sprite for the growth stage
  const stageSprite = getGrowthStageSprite(creature, fishSize, creatureId);

  // Then, select the appropriate resolution
  return getSpriteUrl(stageSprite, screenSize, creatureId);
}

// =============================================================================
// Clip Mode System - Video/Frame Animation Integration
// =============================================================================

/** Rendering mode for a fish based on LOD and available assets */
export type ClipMode = 'video' | 'frames' | 'deformation' | 'static';

/** Context for clip mode decision */
export type RenderContext = 'game' | 'edit' | 'select' | 'cinematic';

/**
 * Determine the rendering mode for a fish based on LOD, available clips, and context
 * 
 * @param screenSize - Size of fish in screen pixels (fish.size * zoom)
 * @param hasClips - Whether the creature has video clips available
 * @param context - Rendering context (game, edit, select, cinematic)
 * @returns The rendering mode to use
 */
export function getClipMode(
  screenSize: number,
  hasClips: boolean,
  context: RenderContext = 'game'
): ClipMode {
  // Force video in edit/select/cinematic mode if clips available
  if ((context === 'edit' || context === 'select' || context === 'cinematic') && hasClips) {
    return 'video';
  }

  // LOD-based selection during gameplay
  if (screenSize >= LOD_THRESHOLDS.VIDEO_DETAIL && hasClips) {
    return 'video';
  }

  // Use extracted frames for animation at medium-high LOD when clips exist
  if (screenSize >= LOD_THRESHOLDS.FULL_DETAIL && hasClips) {
    return 'frames';
  }

  // Use deformation for medium and low LOD
  if (screenSize >= LOD_THRESHOLDS.STATIC) {
    return 'deformation';
  }

  // Static sprite for very small fish
  return 'static';
}

/**
 * Check if a creature has usable animations
 * Checks for actual frame URLs, not just empty objects
 * 
 * @param animations - CreatureAnimations object or undefined
 * @returns boolean indicating if animations are available
 */
export function hasUsableAnimations(animations: object | undefined | null): boolean {
  if (!animations) return false;

  // Check each growth stage
  for (const stage of Object.values(animations)) {
    if (!stage || typeof stage !== 'object') continue;

    // Check each action in the stage
    for (const sequence of Object.values(stage as object)) {
      if (!sequence || typeof sequence !== 'object') continue;

      // Check if the sequence has actual frames
      const seq = sequence as { frames?: string[] };
      if (seq.frames && Array.isArray(seq.frames) && seq.frames.length > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Draw a static fish sprite (no animation/deformation)
 * Used for LOD level 4 when fish is very small on screen.
 * 
 * @param ctx - Canvas 2D rendering context
 * @param sprite - Pre-processed sprite canvas
 * @param x - Center X position
 * @param y - Center Y position
 * @param size - Fish size (width)
 * @param facingRight - Direction fish is facing
 */
export function drawStaticFish(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  facingRight: boolean
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingRight ? 1 : -1, 1);

  // Draw sprite centered, maintaining aspect ratio
  const aspectRatio = sprite.width / sprite.height;
  const drawWidth = size;
  const drawHeight = size / aspectRatio;

  ctx.drawImage(
    sprite,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();
}

// =============================================================================
// Drawing Options
// =============================================================================

export interface DrawFishOptions {
  /** Speed 0–1+; boosts tail motion when moving */
  speed?: number;
  /** 0–1 chomp phase; bulges front (head) when > 0 */
  chompPhase?: number;
  /** Deformation intensity multiplier (default 1) */
  intensity?: number;
  /** Vertical tilt in radians */
  verticalTilt?: number;
  /** Override segment count for LOD (default 8, use getSegmentsForLOD) */
  segments?: number;
}

/**
 * Remove background color from sprite (chroma key removal)
 * Detects corner colors and removes them with edge feathering.
 * 
 * @param img - Source image element
 * @param tolerance - Color difference tolerance (default 50)
 * @returns Processed canvas with transparent background
 */
export function removeBackground(img: HTMLImageElement, tolerance: number = DEFAULT_CHROMA_TOLERANCE): HTMLCanvasElement {
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

  // Get average corner color (likely the background - usually magenta #FF00FF)
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
      data[i + 3] = 0;
    } else if (diff < tolerance * 1.5) {
      // Feather edges for smoother transitions
      const alpha = ((diff - tolerance) / (tolerance * 0.5)) * 255;
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Load and process a fish sprite with chroma key removal
 * 
 * @param spriteUrl - URL of the sprite image
 * @param tolerance - Chroma key tolerance
 * @returns Promise resolving to processed canvas
 */
export function loadFishSprite(spriteUrl: string, tolerance: number = DEFAULT_CHROMA_TOLERANCE): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processed = removeBackground(img, tolerance);
      resolve(processed);
    };
    img.onerror = () => reject(new Error(`Failed to load sprite: ${spriteUrl}`));
    // Always use cache busting to ensure fresh images
    img.src = cacheBust(spriteUrl);
  });
}

/**
 * Draw fish with spine-based wave deformation animation
 * 
 * This is the canonical fish rendering function used across the entire game.
 * Any animation enhancements should be made here to affect all fish displays.
 * 
 * @param ctx - Canvas 2D rendering context
 * @param sprite - Pre-processed sprite canvas (use removeBackground first)
 * @param x - Center X position
 * @param y - Center Y position
 * @param size - Fish size (width)
 * @param animTime - Animation time (increment each frame for animation)
 * @param facingRight - Direction fish is facing
 * @param options - Additional drawing options
 */
export function drawFishWithDeformation(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  animTime: number,
  facingRight: boolean,
  options: DrawFishOptions = {}
): void {
  const {
    speed = 0,
    chompPhase = 0,
    intensity = 1,
    verticalTilt = 0,
    segments: segmentOverride
  } = options;

  // Use LOD-based segment count if provided, otherwise default to 8
  const segments = segmentOverride ?? 8;

  // If segments is 0 or very low, fall back to static rendering
  if (segments < 2) {
    drawStaticFish(ctx, sprite, x, y, size, facingRight);
    return;
  }

  // Movement-based animation: more tail motion when swimming
  const speedBoost = 1 + Math.min(1, speed) * 0.6;
  const effectiveIntensity = intensity * speedBoost;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facingRight ? verticalTilt : -verticalTilt);
  ctx.scale(facingRight ? 1 : -1, 1);

  const segmentWidth = size / segments;

  // Wave phase constant - total phase shift from tail to head
  // Using normalized position (0-1) ensures consistent wave shape regardless of segment count
  const WAVE_PHASE_LENGTH = 2.4; // ~0.3 * 8 segments worth of phase

  // Overlap factor to hide seams between segments (percentage of segment width)
  // Each segment is drawn slightly wider, overlapping its neighbors
  const OVERLAP_FACTOR = 0.15; // 15% overlap on each side
  const overlapPx = segmentWidth * OVERLAP_FACTOR;
  const srcOverlapPx = (sprite.width / segments) * OVERLAP_FACTOR;

  for (let i = 0; i < segments; i++) {
    // Use normalized position (0-1) for consistent wave regardless of segment count
    const normalizedPos = i / segments;
    const waveStrength = 1 - normalizedPos; // 1 at tail, 0 at head
    const phaseOffset = normalizedPos * WAVE_PHASE_LENGTH;
    const wave = Math.sin(animTime + phaseOffset) * 1.5 * waveStrength * effectiveIntensity;

    ctx.save();

    const segX = -size / 2 + i * segmentWidth;
    ctx.translate(segX, wave);

    const rotation = Math.sin(animTime + phaseOffset) * 0.025 * waveStrength * effectiveIntensity;
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

    // Calculate source and destination with overlap to hide seams
    // First and last segments only overlap on one side
    const srcX = Math.max(0, (i / segments) * sprite.width - srcOverlapPx);
    const srcW = Math.min(
      sprite.width - srcX,
      sprite.width / segments + srcOverlapPx * 2
    );
    const dstX = i === 0 ? 0 : -overlapPx;
    const dstW = drawW + (i === 0 ? overlapPx : overlapPx * 2);

    ctx.drawImage(
      sprite,
      srcX,
      0,
      srcW,
      sprite.height,
      dstX,
      -size / 2,
      dstW,
      size
    );

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Calculate animation time increment based on speed
 * Use this for consistent animation speed across components
 * 
 * @param currentAnimTime - Current animation time
 * @param speed - Movement speed (0-1 normalized)
 * @param baseRate - Base animation rate (default 0.05)
 * @returns New animation time
 */
export function updateAnimTime(
  currentAnimTime: number,
  speed: number = 0,
  baseRate: number = 0.05
): number {
  const normalizedSpeed = Math.min(1, speed);
  return currentAnimTime + baseRate + normalizedSpeed * 0.06;
}
