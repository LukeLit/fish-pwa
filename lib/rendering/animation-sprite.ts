/**
 * AnimationSprite - Frame-based sprite animation system
 * 
 * Renders animation sequences from pre-generated image frames.
 * Much simpler and more reliable than video-based animation.
 */

import type { 
  AnimationAction, 
  AnimationSequence, 
  CreatureAnimations,
  GrowthStage
} from '@/lib/game/types';
import { ANIMATION_CONFIG as CONFIG } from '@/lib/game/types';

export interface AnimationSpriteOptions {
  /** Initial growth stage (default: 'adult') */
  initialStage?: GrowthStage;
  /** Default action when no specific action is requested (default: 'idle') */
  defaultAction?: AnimationAction;
  /** Whether to preload all frames on creation (default: true) */
  preload?: boolean;
}

export interface AnimationSpriteState {
  currentStage: GrowthStage;
  currentAction: AnimationAction;
  currentFrame: number;
  isPlaying: boolean;
  isLoaded: boolean;
}

/**
 * AnimationSprite - Simple frame-based animation playback
 */
export class AnimationSprite {
  private animations: CreatureAnimations;
  private currentStage: GrowthStage;
  private currentAction: AnimationAction;
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  private isPlaying: boolean = true;
  private defaultAction: AnimationAction;
  
  // Cached image elements
  private frameImages: Map<string, HTMLImageElement> = new Map();
  private loadedFrames: Set<string> = new Set();

  // Callbacks
  private onActionComplete?: (action: AnimationAction) => void;

  constructor(animations: CreatureAnimations, options: AnimationSpriteOptions = {}) {
    this.animations = animations;
    this.currentStage = options.initialStage ?? 'adult';
    this.defaultAction = options.defaultAction ?? 'idle';
    this.currentAction = this.defaultAction;

    // Preload if requested
    if (options.preload !== false) {
      this.preloadStage(this.currentStage);
    }
  }

  /**
   * Get current animation sequence
   */
  private getSequence(stage: GrowthStage, action: AnimationAction): AnimationSequence | null {
    return this.animations[stage]?.[action] || null;
  }

  /**
   * Get frame key for caching
   */
  private getFrameKey(url: string): string {
    return url;
  }

  /**
   * Preload all frames for a growth stage
   */
  async preloadStage(stage: GrowthStage): Promise<void> {
    const stageAnims = this.animations[stage];
    if (!stageAnims) return;

    const loadPromises: Promise<void>[] = [];

    for (const action of Object.keys(stageAnims) as AnimationAction[]) {
      const sequence = stageAnims[action];
      if (!sequence?.frames) continue;

      for (const frameUrl of sequence.frames) {
        if (!this.loadedFrames.has(frameUrl)) {
          loadPromises.push(this.loadFrame(frameUrl));
        }
      }
    }

    await Promise.all(loadPromises);
  }

  /**
   * Load a single frame image
   */
  private async loadFrame(url: string): Promise<void> {
    if (this.loadedFrames.has(url)) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.frameImages.set(url, img);
        this.loadedFrames.add(url);
        resolve();
      };
      
      img.onerror = () => {
        console.error(`[AnimationSprite] Failed to load frame: ${url}`);
        reject(new Error(`Failed to load frame: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Get current state
   */
  getState(): AnimationSpriteState {
    return {
      currentStage: this.currentStage,
      currentAction: this.currentAction,
      currentFrame: this.currentFrame,
      isPlaying: this.isPlaying,
      isLoaded: this.loadedFrames.size > 0,
    };
  }

  /**
   * Get available actions for current stage
   */
  getAvailableActions(): AnimationAction[] {
    const stageAnims = this.animations[this.currentStage];
    if (!stageAnims) return [];
    return Object.keys(stageAnims) as AnimationAction[];
  }

  /**
   * Check if a specific action is available
   */
  hasAction(action: AnimationAction): boolean {
    return !!this.getSequence(this.currentStage, action);
  }

  /**
   * Play a specific action
   */
  playAction(action: AnimationAction): void {
    if (!this.hasAction(action)) {
      console.warn(`[AnimationSprite] Action not available: ${action}`);
      return;
    }

    this.currentAction = action;
    this.currentFrame = 0;
    this.lastFrameTime = performance.now();
    this.isPlaying = true;
  }

  /**
   * Trigger a one-shot action then return to default
   */
  triggerAction(action: AnimationAction): void {
    const sequence = this.getSequence(this.currentStage, action);
    if (!sequence || sequence.loop) {
      this.playAction(action);
      return;
    }

    // For non-looping, play once then the update() will handle return to default
    this.playAction(action);
  }

  /**
   * Switch growth stage
   */
  async setGrowthStage(stage: GrowthStage): Promise<void> {
    if (stage === this.currentStage) return;

    this.currentStage = stage;
    await this.preloadStage(stage);
    this.playAction(this.defaultAction);
  }

  /**
   * Update method - called each frame to advance animation
   * Returns true if frame changed
   */
  update(): boolean {
    if (!this.isPlaying) return false;

    const sequence = this.getSequence(this.currentStage, this.currentAction);
    if (!sequence || !sequence.frames.length) return false;

    const now = performance.now();
    const frameDuration = 1000 / sequence.frameRate;
    
    if (now - this.lastFrameTime >= frameDuration) {
      this.lastFrameTime = now;
      this.currentFrame++;

      // Check if animation completed
      if (this.currentFrame >= sequence.frames.length) {
        if (sequence.loop) {
          this.currentFrame = 0;
        } else {
          // Non-looping animation completed
          this.currentFrame = sequence.frames.length - 1;
          this.onActionComplete?.(this.currentAction);
          
          // Return to default action
          if (this.currentAction !== this.defaultAction) {
            this.playAction(this.defaultAction);
          }
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Get the current frame image
   */
  getCurrentFrameImage(): HTMLImageElement | null {
    const sequence = this.getSequence(this.currentStage, this.currentAction);
    if (!sequence || !sequence.frames.length) return null;

    const frameUrl = sequence.frames[this.currentFrame];
    return this.frameImages.get(frameUrl) || null;
  }

  /**
   * Draw current frame to a canvas context
   */
  drawToContext(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      flipX?: boolean;
      rotation?: number;
    } = {}
  ): boolean {
    const img = this.getCurrentFrameImage();
    if (!img) return false;

    ctx.save();
    ctx.translate(x, y);

    if (options.rotation) {
      ctx.rotate(options.rotation);
    }

    if (options.flipX) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    return true;
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Resume playback
   */
  resume(): void {
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
  }

  /**
   * Set callback for when a non-looping action completes
   */
  setOnActionComplete(callback: (action: AnimationAction) => void): void {
    this.onActionComplete = callback;
  }

  /**
   * Clean up loaded images
   */
  dispose(): void {
    this.frameImages.clear();
    this.loadedFrames.clear();
  }
}

/**
 * AnimationSpriteManager - Manages multiple AnimationSprites
 */
export class AnimationSpriteManager {
  private sprites: Map<string, { sprite: AnimationSprite; lastUsed: number }> = new Map();
  private maxSprites: number;

  constructor(maxSprites: number = 10) {
    this.maxSprites = maxSprites;
  }

  /**
   * Get or create an AnimationSprite for a creature
   */
  getSprite(
    creatureId: string,
    animations: CreatureAnimations,
    options?: AnimationSpriteOptions
  ): AnimationSprite {
    const existing = this.sprites.get(creatureId);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.sprite;
    }

    // Check if we need to evict
    if (this.sprites.size >= this.maxSprites) {
      this.evictOldest();
    }

    // Create new sprite
    const sprite = new AnimationSprite(animations, options);
    this.sprites.set(creatureId, {
      sprite,
      lastUsed: Date.now(),
    });

    return sprite;
  }

  /**
   * Check if a creature has an active sprite
   */
  hasSprite(creatureId: string): boolean {
    return this.sprites.has(creatureId);
  }

  /**
   * Remove a specific sprite
   */
  removeSprite(creatureId: string): void {
    const entry = this.sprites.get(creatureId);
    if (entry) {
      entry.sprite.dispose();
      this.sprites.delete(creatureId);
    }
  }

  /**
   * Evict the least recently used sprite
   */
  private evictOldest(): void {
    let oldest: { id: string; time: number } | null = null;

    for (const [id, entry] of this.sprites.entries()) {
      if (!oldest || entry.lastUsed < oldest.time) {
        oldest = { id, time: entry.lastUsed };
      }
    }

    if (oldest) {
      this.removeSprite(oldest.id);
    }
  }

  /**
   * Dispose all sprites
   */
  disposeAll(): void {
    for (const entry of this.sprites.values()) {
      entry.sprite.dispose();
    }
    this.sprites.clear();
  }
}

// Singleton manager instance
let sharedManager: AnimationSpriteManager | null = null;

/**
 * Get shared AnimationSpriteManager instance
 */
export function getAnimationSpriteManager(): AnimationSpriteManager {
  if (!sharedManager) {
    sharedManager = new AnimationSpriteManager();
  }
  return sharedManager;
}
