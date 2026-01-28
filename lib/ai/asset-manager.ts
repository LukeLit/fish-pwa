/**
 * Asset Manager
 * Manages AI-generated assets
 */

import { getFishSpriteService, FishSpriteService } from './fish-sprite-service';

export interface AssetCache {
  fishSprites: Map<string, HTMLImageElement | string>;
  fish3D: Map<string, string>;
  scenes: Map<string, string>;
}

export interface CachedModel {
  localPath: string;
  cacheKey: string;
  timestamp: number;
}

/**
 * Asset Manager - handles AI asset generation
 */
export class AssetManager {
  private fishSpriteService: FishSpriteService;
  private cache: AssetCache;
  private useAI: boolean = false;

  constructor() {
    this.fishSpriteService = getFishSpriteService();
    this.cache = {
      fishSprites: new Map(),
      fish3D: new Map(),
      scenes: new Map(),
    };

    // Check AI availability
    this.checkAIAvailability();

    // Load cached models from localStorage
    this.loadCachedModels();
  }

  /**
   * Check if AI generation is available
   */
  private checkAIAvailability(): void {
    if (typeof window !== 'undefined') {
      // Using Flux 2 Pro via Vercel AI Gateway for fish sprites
      // Much more reliable and affordable than 3D generation
      this.useAI = true;
    }
  }

  /**
   * Load cached models - no longer needed with Vercel Blob Storage
   * Assets are tracked server-side in blob storage
   */
  private loadCachedModels(): void {
    // No-op: Blob storage handles caching server-side
    console.log('[AssetManager] Using Vercel Blob Storage for asset management');
  }

  /**
   * Save model cache - no longer needed with Vercel Blob Storage
   * Assets are tracked server-side in blob storage
   */
  private saveCachedModel(cacheKey: string, localPath: string): void {
    // Store in memory cache for this session
    this.cache.fish3D.set(cacheKey, localPath);
    console.log(`[AssetManager] Cached model in memory: ${cacheKey} -> ${localPath}`);
  }

  /**
   * Download sprite and save to Vercel Blob Storage
   */
  private async downloadSprite(
    imageUrl?: string,
    imageBase64?: string,
    filename?: string
  ): Promise<string | null> {
    try {
      console.log(`[AssetManager] Saving sprite: ${filename}`);

      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, imageBase64, filename }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[AssetManager] Save failed:', error);
        return null;
      }

      const data = await response.json();

      if (data.success && data.localPath) {
        console.log(`[AssetManager] Sprite saved to: ${data.localPath}${data.cached ? ' (already cached)' : ''}`);
        this.saveCachedModel(filename!, data.localPath);
        return data.localPath;
      }

      return null;
    } catch (error) {
      console.error('[AssetManager] Save error:', error);
      return null;
    }
  }

  /**
   * Get fish asset - tries AI first, falls back to procedural
   */
  async getFishAsset(params: {
    type: 'prey' | 'predator' | 'mutant';
    size: number;
    mutations?: string[];
    seed?: string;
  }): Promise<{
    sprite?: HTMLImageElement | string;
    modelUrl?: string;
    useAI: boolean;
  }> {
    const cacheKey = `${params.type}_${params.size}_${params.seed || 'default'}`;

    // Check if we have a cached local model
    if (this.cache.fish3D.has(cacheKey)) {
      const localPath = this.cache.fish3D.get(cacheKey)!;
      console.log(`[AssetManager] Using cached model: ${localPath}`);
      return {
        modelUrl: localPath,
        useAI: true,
      };
    }

    // Try AI sprite generation if enabled
    if (this.useAI) {
      try {
        const result = await this.fishSpriteService.generateFishSprite({
          type: params.type,
          mutations: params.mutations,
          seed: params.seed,
        });

        if (result && (result.imageUrl || result.imageBase64)) {
          // Download and save the sprite locally
          const filename = `${cacheKey}.png`;
          const localPath = await this.downloadSprite(
            result.imageUrl,
            result.imageBase64,
            filename
          );

          if (localPath) {
            this.cache.fishSprites.set(cacheKey, localPath);
            return {
              sprite: localPath,
              useAI: true,
            };
          } else {
            // If download failed, use the data URL
            console.warn('[AssetManager] Failed to download sprite, using data URL');
            const spriteUrl = result.imageUrl || `data:image/png;base64,${result.imageBase64}`;
            return {
              sprite: spriteUrl,
              useAI: true,
            };
          }
        }

        if (result && result.error) {
          console.warn('[AssetManager] AI sprite generation failed:', result.error);
        }
      } catch (error) {
        console.warn('[AssetManager] AI sprite generation error:', error);
      }
    }

    // No sprite available - return empty object
    // Sprites should be loaded from creature definitions in the game
    console.warn('[AssetManager] No AI sprite available, use creature sprite from data');
    return {
      useAI: false,
    };
  }

  /**
   * Get fish sprite (AI only, no procedural fallback)
   */
  async getFishSprite(params: {
    type: 'prey' | 'predator' | 'mutant';
    mutations?: string[];
    seed?: string;
  }): Promise<{ spriteUrl?: string; error?: string } | null> {
    if (!this.useAI) {
      return null;
    }

    const cacheKey = `fish_sprite_${params.type}_${params.seed || 'default'}`;

    // Check if we have a cached local sprite
    if (this.cache.fishSprites.has(cacheKey)) {
      const localPath = this.cache.fishSprites.get(cacheKey);
      console.log(`[AssetManager] Using cached sprite: ${localPath}`);
      return {
        spriteUrl: typeof localPath === 'string' ? localPath : undefined,
      };
    }

    // Generate new sprite
    const result = await this.fishSpriteService.generateFishSprite(params);

    if (result && (result.imageUrl || result.imageBase64)) {
      const filename = `${cacheKey}.png`;
      const localPath = await this.downloadSprite(
        result.imageUrl,
        result.imageBase64,
        filename
      );

      if (localPath) {
        this.cache.fishSprites.set(cacheKey, localPath);
        return { spriteUrl: localPath };
      } else {
        const spriteUrl = result.imageUrl || `data:image/png;base64,${result.imageBase64}`;
        return { spriteUrl };
      }
    }

    return result ? { error: result.error } : null;
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.fishSprites.clear();
    this.cache.fish3D.clear();
    this.cache.scenes.clear();
    this.fishSpriteService.clearCache();
  }

  /**
   * Get AI availability status
   */
  isAIEnabled(): boolean {
    return this.useAI;
  }
}

/**
 * Singleton instance
 */
let assetManagerInstance: AssetManager | null = null;

export function getAssetManager(): AssetManager {
  if (!assetManagerInstance) {
    assetManagerInstance = new AssetManager();
  }
  return assetManagerInstance;
}
