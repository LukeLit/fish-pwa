/**
 * Sprite Selector - Centralized sprite swapping logic
 * 
 * Handles all sprite selection decisions:
 * - Growth stage selection (juvenile/adult/elder)
 * - Resolution selection (high/medium/low mipmap)
 * - Animation mode selection (video/frames/deformation/static)
 * - Combined selection (growth + resolution)
 * 
 * This is the single source of truth for sprite swapping logic.
 */

import { ART } from '@/lib/game/canvas-constants';
import type { SpriteResolutions, GrowthSprites, GrowthStage } from '@/lib/game/types';

// =============================================================================
// Growth Stage Selection
// =============================================================================

/**
 * Default size ranges for growth stages.
 * Single source of truth: editor slider (20-300), game spawn, and saved growthSprites
 * all use this scale so juvenile/adult/elder match everywhere.
 */
export const DEFAULT_GROWTH_RANGES: Record<GrowthStage, { min: number; max: number }> = {
  juvenile: { min: ART.GROWTH_RANGES.JUVENILE_MIN, max: ART.GROWTH_RANGES.JUVENILE_MAX },
  adult: { min: ART.GROWTH_RANGES.ADULT_MIN, max: ART.GROWTH_RANGES.ADULT_MAX },
  elder: { min: ART.GROWTH_RANGES.ELDER_MIN, max: ART.GROWTH_RANGES.ELDER_MAX },
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
export function getGrowthStage(fishSize: number, growthSprites?: GrowthSprites): GrowthStage {
  // Use custom ranges only if they match our 20-300 scale (elder starts at 200)
  // Legacy saved data (e.g. elder 70-150) would show elder too early; use defaults instead
  const elderRangeStored = growthSprites?.elder?.sizeRange;
  const useStoredRanges =
    elderRangeStored != null && elderRangeStored.min >= ART.GROWTH_RANGES.ELDER_MIN;

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

// =============================================================================
// Resolution Selection (Mipmap)
// =============================================================================

// Debug flag for mipmap logging
let MIPMAP_DEBUG = false;
let lastLoggedResolution: Map<string, string> = new Map();

/** Enable/disable mipmap debug logging */
export function setMipmapDebug(enabled: boolean): void {
  MIPMAP_DEBUG = enabled;
  if (!enabled) {
    lastLoggedResolution.clear();
  }
}

/** Check if mipmap debug is enabled */
export function isMipmapDebugEnabled(): boolean {
  return MIPMAP_DEBUG;
}

/**
 * Get the resolution key (high/medium/low) for a given screen size
 * Useful for cache key generation
 * 
 * @param screenSize - Size of fish in screen pixels
 * @returns Resolution key
 */
export function getResolutionKey(screenSize: number): 'high' | 'medium' | 'low' {
  if (screenSize >= ART.SPRITE_RESOLUTION_THRESHOLDS.HIGH) return 'high';
  if (screenSize >= ART.SPRITE_RESOLUTION_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
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
  const resolution = getResolutionKey(screenSize);
  let url: string;

  if (resolution === 'high') {
    url = creature.spriteResolutions.high;
  } else if (resolution === 'medium') {
    url = creature.spriteResolutions.medium;
  } else {
    url = creature.spriteResolutions.low;
  }

  // Debug logging - only log when resolution changes for a creature
  if (MIPMAP_DEBUG && creatureId) {
    const lastRes = lastLoggedResolution.get(creatureId);
    if (lastRes !== resolution) {
      lastLoggedResolution.set(creatureId, resolution);
    }
  }

  return url;
}

// =============================================================================
// Combined Growth + Resolution Selection
// =============================================================================

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
// Animation Mode Selection (Video/Frames/Deformation/Static)
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
  if (screenSize >= ART.LOD_THRESHOLDS.VIDEO_DETAIL && hasClips) {
    return 'video';
  }

  // Use extracted frames for animation at medium-high LOD when clips exist
  if (screenSize >= ART.LOD_THRESHOLDS.FULL_DETAIL && hasClips) {
    return 'frames';
  }

  // Use deformation for medium and low LOD
  if (screenSize >= ART.LOD_THRESHOLDS.STATIC) {
    return 'deformation';
  }

  // Static sprite for very small fish
  return 'static';
}
