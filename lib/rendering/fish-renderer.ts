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

import type { SpriteResolutions } from '@/lib/game/types';

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
 * Check if a creature has usable clips
 * 
 * @param clips - CreatureClips object or undefined
 * @returns boolean indicating if clips are available
 */
export function hasUsableClips(clips: object | undefined | null): boolean {
  if (!clips) return false;
  return Object.keys(clips).length > 0;
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
    img.src = spriteUrl;
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
