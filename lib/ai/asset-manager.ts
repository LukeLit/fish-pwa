/**
 * Asset Manager
 * Manages AI-generated and procedural assets with fallback handling
 */

import { getFishSpriteService, FishSpriteService } from './fish-sprite-service';
import { FishGenerator } from '../assets/fish-generator';

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
 * Asset Manager - handles both AI and procedural asset generation
 */
export class AssetManager {
  private fishSpriteService: FishSpriteService;
  private fishGenerator: FishGenerator;
  private cache: AssetCache;
  private useAI: boolean = false;

  constructor() {
    this.fishSpriteService = getFishSpriteService();
    this.fishGenerator = new FishGenerator();
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
   * Load cached models from localStorage
   */
  private loadCachedModels(): void {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem('fish_models_cache');
      if (cached) {
        const models: CachedModel[] = JSON.parse(cached);
        models.forEach((model) => {
          this.cache.fish3D.set(model.cacheKey, model.localPath);
        });
        console.log(`[AssetManager] Loaded ${models.length} cached models from localStorage`);
      }
    } catch (error) {
      console.warn('[AssetManager] Failed to load cached models:', error);
    }
  }

  /**
   * Save model to localStorage cache
   */
  private saveCachedModel(cacheKey: string, localPath: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem('fish_models_cache');
      const models: CachedModel[] = cached ? JSON.parse(cached) : [];

      // Add or update the model
      const existing = models.findIndex((m) => m.cacheKey === cacheKey);
      const newModel: CachedModel = {
        cacheKey,
        localPath,
        timestamp: Date.now(),
      };

      if (existing >= 0) {
        models[existing] = newModel;
      } else {
        models.push(newModel);
      }

      localStorage.setItem('fish_models_cache', JSON.stringify(models));
      console.log(`[AssetManager] Cached model: ${cacheKey} -> ${localPath}`);
    } catch (error) {
      console.warn('[AssetManager] Failed to save cached model:', error);
    }
  }

  /**
   * Download sprite and save locally
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
    shape?: any;
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

    // Fallback to procedural generation
    const generatorType = params.type === 'mutant' ? 'neutral' : params.type;
    const shape = this.fishGenerator.generate(params.size, generatorType);

    return {
      shape,
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
