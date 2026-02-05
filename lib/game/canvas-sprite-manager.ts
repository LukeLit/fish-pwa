/**
 * Sprite Manager for Canvas Game
 * Handles loading, caching, and growth-aware sprite management
 */

import { removeBackground } from '@/lib/rendering/fish-renderer';
import { getGrowthStageSprite, getSpriteUrl, getResolutionKey, getGrowthStage } from '@/lib/rendering/fish-renderer';
import type { SpriteResolutions, GrowthSprites, Creature } from '@/lib/game/types';
import { cacheBust } from '@/lib/utils/cache-bust';

export interface SpriteOptions {
  spriteResolutions?: SpriteResolutions;
  fishSize?: number;
  zoom?: number;
}

export interface FishSpriteData {
  id: string;
  size: number;
  creatureData?: Creature;
  sprite: HTMLCanvasElement | null;
  currentGrowthStage?: 'juvenile' | 'adult' | 'elder';
}

/**
 * Sprite Manager handles loading, caching, and growth-aware sprite management
 */
export class SpriteManager {
  private cache = new Map<string, HTMLCanvasElement>();
  private spriteUrls = new Map<string, string>();
  private spriteVersions = new Map<string, number>();
  private chromaTolerance: number;

  constructor(chromaTolerance: number = 50) {
    this.chromaTolerance = chromaTolerance;
  }

  /**
   * Update chroma tolerance for background removal
   */
  setChromaTolerance(tolerance: number): void {
    this.chromaTolerance = tolerance;
  }

  /**
   * Load a sprite with resolution awareness
   */
  async loadSprite(
    spriteUrl: string,
    fishId: string,
    onLoaded: (sprite: HTMLCanvasElement) => void,
    options?: SpriteOptions
  ): Promise<void> {
    // Calculate screen size to determine appropriate resolution
    const fishSize = options?.fishSize || 60;
    const currentZoom = options?.zoom || 1;
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
      const processedSprite = removeBackground(img, this.chromaTolerance);
      onLoaded(processedSprite);
    };
    img.onerror = () => {
      // Failed to load sprite
    };
    img.src = cacheBust(finalUrl);
  }

  /**
   * Reload sprite bypassing ALL caches (Service Worker, browser, localStorage, in-memory)
   */
  async reloadSprite(
    fishId: string,
    spriteUrl: string,
    onLoaded: (sprite: HTMLCanvasElement) => void
  ): Promise<void> {
    if (spriteUrl.startsWith('data:')) {
      // Data URLs don't need cache busting
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSprite = removeBackground(img, this.chromaTolerance);
        onLoaded(processedSprite);
      };
      img.src = cacheBust(spriteUrl);
      return;
    }

    try {
      // Use fetch with cache: 'reload' to bypass browser cache entirely
      const cleanUrl = spriteUrl.split('?')[0];
      const response = await fetch(cleanUrl, {
        cache: 'reload',
        mode: 'cors',
      });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processedSprite = removeBackground(img, this.chromaTolerance);
        onLoaded(processedSprite);
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    } catch (err) {
      // Failed to fetch sprite
    }
  }

  /**
   * Load a growth-stage-aware sprite
   */
  async loadGrowthAwareSprite(
    fish: FishSpriteData,
    onLoaded: (sprite: HTMLCanvasElement) => void
  ): Promise<void> {
    if (!fish.creatureData?.sprite) return;

    // Get the appropriate sprite for this size
    const { sprite: spriteUrl } = getGrowthStageSprite(
      fish.creatureData,
      fish.size,
      fish.id
    );

    // Load the sprite
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processedSprite = removeBackground(img, this.chromaTolerance);
      onLoaded(processedSprite);
    };
    img.onerror = () => {
      // Failed to load growth sprite
    };
    img.src = cacheBust(spriteUrl);
  }

  /**
   * Check if growth stage changed and reload sprite if needed
   */
  async updateSpriteForGrowthStage(
    fish: FishSpriteData,
    oldSize: number,
    onLoaded: (sprite: HTMLCanvasElement) => void
  ): Promise<boolean> {
    if (!fish.creatureData?.growthSprites) return false;

    const oldStage = getGrowthStage(oldSize, fish.creatureData.growthSprites);
    const newStage = getGrowthStage(fish.size, fish.creatureData.growthSprites);

    if (oldStage !== newStage) {
      fish.currentGrowthStage = newStage;
      await this.loadGrowthAwareSprite(fish, onLoaded);
      return true;
    }
    return false;
  }

  /**
   * Get cached sprite
   */
  getCached(fishId: string): HTMLCanvasElement | undefined {
    return this.cache.get(fishId);
  }

  /**
   * Set cached sprite
   */
  setCached(fishId: string, sprite: HTMLCanvasElement, spriteUrl?: string): void {
    this.cache.set(fishId, sprite);
    if (spriteUrl) {
      this.spriteUrls.set(fishId, spriteUrl);
    }
  }

  /**
   * Get sprite URL for a fish
   */
  getSpriteUrl(fishId: string): string | undefined {
    return this.spriteUrls.get(fishId);
  }

  /**
   * Increment sprite version (for cache invalidation)
   */
  incrementVersion(fishId: string): number {
    const current = this.spriteVersions.get(fishId) || 0;
    const newVersion = current + 1;
    this.spriteVersions.set(fishId, newVersion);
    return newVersion;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.spriteUrls.clear();
    this.spriteVersions.clear();
  }

  /**
   * Clear cache for a specific fish
   */
  clearFishCache(fishId: string): void {
    this.cache.delete(fishId);
    this.spriteUrls.delete(fishId);
    this.spriteVersions.delete(fishId);
  }
}
