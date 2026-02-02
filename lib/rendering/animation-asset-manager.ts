/**
 * AnimationAssetManager - Manages animation frame assets with proper versioning
 * 
 * Responsibilities:
 * - Load and cache animation frames
 * - Handle version changes without overwriting
 * - Apply chroma key removal on load
 * - Provide lifecycle management (dispose old versions)
 */

import { removeBackground, DEFAULT_CHROMA_TOLERANCE } from '@/lib/rendering/fish-renderer';
import type {
  AnimationAction,
  CreatureAnimations,
  GrowthStage,
  AnimationSequence
} from '@/lib/game/types';

export interface AnimationVersion {
  /** Unique version identifier (timestamp-based) */
  version: string;
  /** When this version was created */
  createdAt: number;
  /** Growth stage this version is for */
  stage: GrowthStage;
  /** Action this version is for */
  action: AnimationAction;
  /** Frame URLs for this version */
  frameUrls: string[];
}

export interface LoadedAnimation {
  version: string;
  stage: GrowthStage;
  action: AnimationAction;
  frames: CanvasImageSource[];
  frameRate: number;
  loop: boolean;
}

interface CacheEntry {
  animation: LoadedAnimation;
  lastUsed: number;
  refCount: number;
}

/**
 * Generate a unique version ID
 */
export function generateVersionId(): string {
  return `v${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Build a versioned asset path for an animation frame
 */
export function buildAnimationFramePath(
  creatureId: string,
  stage: GrowthStage,
  action: AnimationAction,
  frameIndex: number,
  version: string
): string {
  return `creatures/${creatureId}/animations/${stage}/${action}/${version}/frame_${String(frameIndex).padStart(2, '0')}.png`;
}

/**
 * AnimationAssetManager - Singleton manager for animation assets
 */
export class AnimationAssetManager {
  private static instance: AnimationAssetManager | null = null;

  private cache: Map<string, CacheEntry> = new Map();
  private loadingPromises: Map<string, Promise<LoadedAnimation>> = new Map();
  private chromaTolerance: number = DEFAULT_CHROMA_TOLERANCE;
  private maxCacheSize: number = 50;

  private constructor() { }

  static getInstance(): AnimationAssetManager {
    if (!AnimationAssetManager.instance) {
      AnimationAssetManager.instance = new AnimationAssetManager();
    }
    return AnimationAssetManager.instance;
  }

  /**
   * Set chroma tolerance for background removal
   */
  setChromaTolerance(tolerance: number): void {
    this.chromaTolerance = tolerance;
  }

  /**
   * Get cache key for an animation
   */
  private getCacheKey(creatureId: string, stage: GrowthStage, action: AnimationAction, version?: string): string {
    return `${creatureId}:${stage}:${action}${version ? `:${version}` : ''}`;
  }

  /**
   * Load a single frame and apply chroma key removal
   */
  private async loadFrame(url: string): Promise<CanvasImageSource> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const processed = removeBackground(img, this.chromaTolerance);
        resolve(processed);
      };

      img.onerror = () => {
        reject(new Error(`Failed to load frame: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Load an animation sequence
   */
  async loadAnimation(
    creatureId: string,
    stage: GrowthStage,
    action: AnimationAction,
    sequence: AnimationSequence
  ): Promise<LoadedAnimation> {
    // Extract version from first frame URL if present
    const version = this.extractVersionFromUrl(sequence.frames[0]) || 'default';
    const cacheKey = this.getCacheKey(creatureId, stage, action, version);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastUsed = Date.now();
      cached.refCount++;
      return cached.animation;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    const loadPromise = this.doLoadAnimation(creatureId, stage, action, sequence, version, cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async doLoadAnimation(
    creatureId: string,
    stage: GrowthStage,
    action: AnimationAction,
    sequence: AnimationSequence,
    version: string,
    cacheKey: string
  ): Promise<LoadedAnimation> {
    console.log(`[AnimAssetMgr] Loading ${creatureId}/${stage}/${action} (${sequence.frames.length} frames)`);

    // Load all frames in parallel
    const framePromises = sequence.frames.map(url => this.loadFrame(url));
    const frames = await Promise.all(framePromises);

    const animation: LoadedAnimation = {
      version,
      stage,
      action,
      frames,
      frameRate: sequence.frameRate,
      loop: sequence.loop,
    };

    // Cache it
    this.cache.set(cacheKey, {
      animation,
      lastUsed: Date.now(),
      refCount: 1,
    });

    // Evict old entries if cache is too large
    this.evictIfNeeded();

    console.log(`[AnimAssetMgr] Loaded ${creatureId}/${stage}/${action} successfully`);
    return animation;
  }

  /**
   * Extract version from a frame URL (if versioned)
   */
  private extractVersionFromUrl(url: string): string | null {
    // Pattern: /v{timestamp}_{random}/frame_
    const match = url.match(/\/(v\d+_[a-z0-9]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Check if an animation is cached
   */
  hasCached(creatureId: string, stage: GrowthStage, action: AnimationAction): boolean {
    // Check for any version of this animation
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${creatureId}:${stage}:${action}`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get a cached animation (or null if not cached)
   */
  getCached(creatureId: string, stage: GrowthStage, action: AnimationAction): LoadedAnimation | null {
    // Find the most recent version
    let newestEntry: CacheEntry | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${creatureId}:${stage}:${action}`)) {
        if (!newestEntry || entry.animation.version > newestEntry.animation.version) {
          newestEntry = entry;
        }
      }
    }

    if (newestEntry) {
      newestEntry.lastUsed = Date.now();
      return newestEntry.animation;
    }

    return null;
  }

  /**
   * Release a reference to an animation
   */
  release(creatureId: string, stage: GrowthStage, action: AnimationAction): void {
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${creatureId}:${stage}:${action}`)) {
        entry.refCount = Math.max(0, entry.refCount - 1);
      }
    }
  }

  /**
   * Invalidate cached animations for a creature (call after regenerating)
   */
  invalidate(creatureId: string, stage?: GrowthStage, action?: AnimationAction): void {
    const prefix = stage && action
      ? `${creatureId}:${stage}:${action}`
      : stage
        ? `${creatureId}:${stage}`
        : creatureId;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        console.log(`[AnimAssetMgr] Invalidated cache: ${key}`);
      }
    }
  }

  /**
   * Evict least recently used entries if cache is too large
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Sort by lastUsed, evict oldest with refCount 0
    const entries = Array.from(this.cache.entries())
      .filter(([, entry]) => entry.refCount === 0)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    while (this.cache.size > this.maxCacheSize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.cache.delete(key);
      console.log(`[AnimAssetMgr] Evicted: ${key}`);
    }
  }

  /**
   * Clear all cached animations
   */
  clearAll(): void {
    this.cache.clear();
    console.log(`[AnimAssetMgr] Cache cleared`);
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton getter
export const getAnimationAssetManager = () => AnimationAssetManager.getInstance();
