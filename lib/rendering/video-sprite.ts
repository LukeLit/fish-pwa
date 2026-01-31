/**
 * VideoSprite - Manages video-based creature animation
 * 
 * Handles video element lifecycle, clip state machine, and chroma key processing.
 * Used for high-LOD creature rendering when video clips are available.
 */

import type { CreatureClips, CreatureClip, ClipAction } from '@/lib/game/types';
import { getChromaKeyProcessor } from './chroma-shader';

export interface VideoSpriteOptions {
  /** Chroma key tolerance (0-255, default: 50) */
  chromaTolerance?: number;
  /** Whether to preload all clips (default: false - load on demand) */
  preloadAll?: boolean;
  /** Default action when no specific action is requested (default: swimIdle) */
  defaultAction?: ClipAction;
}

export interface VideoSpriteState {
  currentAction: ClipAction;
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
}

/**
 * VideoSprite class - manages video-based creature animations
 */
export class VideoSprite {
  private clips: CreatureClips;
  private videos: Map<ClipAction, HTMLVideoElement> = new Map();
  private loadedClips: Set<ClipAction> = new Set();
  private currentAction: ClipAction;
  private chromaTolerance: number;
  private defaultAction: ClipAction;

  // Callbacks
  private onActionComplete?: (action: ClipAction) => void;
  private onLoadComplete?: (action: ClipAction) => void;

  constructor(clips: CreatureClips, options: VideoSpriteOptions = {}) {
    this.clips = clips;
    this.chromaTolerance = options.chromaTolerance ?? 50;
    this.defaultAction = options.defaultAction ?? 'swimIdle';
    this.currentAction = this.defaultAction;

    // Determine initial action (first available clip)
    const availableActions = Object.keys(clips) as ClipAction[];
    if (availableActions.length > 0) {
      this.currentAction = availableActions.includes(this.defaultAction)
        ? this.defaultAction
        : availableActions[0];
    }

    // Preload if requested
    if (options.preloadAll) {
      this.preloadAll();
    }
  }

  /**
   * Get current state
   */
  getState(): VideoSpriteState {
    const video = this.videos.get(this.currentAction);
    return {
      currentAction: this.currentAction,
      isPlaying: video ? !video.paused : false,
      isLoaded: this.loadedClips.has(this.currentAction),
      currentTime: video?.currentTime ?? 0,
      duration: video?.duration ?? 0,
    };
  }

  /**
   * Get available actions for this sprite
   */
  getAvailableActions(): ClipAction[] {
    return Object.keys(this.clips) as ClipAction[];
  }

  /**
   * Check if a specific action has clips
   */
  hasAction(action: ClipAction): boolean {
    return action in this.clips && !!this.clips[action];
  }

  /**
   * Load a specific clip
   */
  async loadClip(action: ClipAction): Promise<void> {
    const clip = this.clips[action];
    if (!clip) {
      throw new Error(`No clip data for action: ${action}`);
    }

    if (this.loadedClips.has(action)) {
      return; // Already loaded
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      // Default loop based on action type if not specified
      video.loop = clip.loop ?? (action === 'swimIdle' || action === 'swimFast');
      video.preload = 'auto';

      video.onloadeddata = () => {
        this.videos.set(action, video);
        this.loadedClips.add(action);
        console.log(`[VideoSprite] Loaded clip: ${action}`);
        this.onLoadComplete?.(action);
        resolve();
      };

      video.onerror = () => {
        reject(new Error(`Failed to load clip: ${action}`));
      };

      // Handle clip completion for non-looping clips
      video.onended = () => {
        if (!clip.loop) {
          this.onActionComplete?.(action);
          // Return to default action
          this.playAction(this.defaultAction);
        }
      };

      video.src = clip.videoUrl;
      video.load();
    });
  }

  /**
   * Preload all available clips
   */
  async preloadAll(): Promise<void> {
    const actions = this.getAvailableActions();
    await Promise.all(actions.map((action) => this.loadClip(action).catch(console.error)));
  }

  /**
   * Play a specific action
   */
  async playAction(action: ClipAction): Promise<void> {
    if (!this.hasAction(action)) {
      console.warn(`[VideoSprite] Action not available: ${action}`);
      return;
    }

    // Pause current video
    const currentVideo = this.videos.get(this.currentAction);
    if (currentVideo && !currentVideo.paused) {
      currentVideo.pause();
    }

    // Load clip if needed
    if (!this.loadedClips.has(action)) {
      await this.loadClip(action);
    }

    // Play new action
    this.currentAction = action;
    const video = this.videos.get(action);
    if (video) {
      video.currentTime = 0;
      await video.play().catch((err) => {
        console.warn(`[VideoSprite] Play failed for ${action}:`, err);
      });
    }
  }

  /**
   * Trigger a one-shot action (like bite) then return to default
   */
  async triggerAction(action: ClipAction): Promise<void> {
    const clip = this.clips[action];
    if (!clip || clip.loop) {
      // For looping clips, just switch to them
      await this.playAction(action);
      return;
    }

    // For non-looping clips, play once then return to default
    await this.playAction(action);
    // The onended handler will return to default
  }

  /**
   * Get the current frame as a processed canvas (with chroma key removal)
   */
  getCurrentFrame(): HTMLCanvasElement | null {
    const video = this.videos.get(this.currentAction);
    if (!video || video.readyState < 2) {
      return null;
    }

    const processor = getChromaKeyProcessor();
    processor.setTolerance(this.chromaTolerance);
    return processor.processToCanvas(video);
  }

  /**
   * Draw current frame to a canvas context
   * This is the main render method for the game loop
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
    const frame = this.getCurrentFrame();
    if (!frame) {
      return false; // No frame available
    }

    ctx.save();
    ctx.translate(x, y);

    if (options.rotation) {
      ctx.rotate(options.rotation);
    }

    if (options.flipX) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(frame, -width / 2, -height / 2, width, height);
    ctx.restore();

    return true;
  }

  /**
   * Pause playback
   */
  pause(): void {
    const video = this.videos.get(this.currentAction);
    if (video) {
      video.pause();
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    const video = this.videos.get(this.currentAction);
    if (video) {
      video.play().catch(console.warn);
    }
  }

  /**
   * Set callback for when a non-looping action completes
   */
  setOnActionComplete(callback: (action: ClipAction) => void): void {
    this.onActionComplete = callback;
  }

  /**
   * Set callback for when a clip finishes loading
   */
  setOnLoadComplete(callback: (action: ClipAction) => void): void {
    this.onLoadComplete = callback;
  }

  /**
   * Update chroma tolerance
   */
  setChromaTolerance(tolerance: number): void {
    this.chromaTolerance = tolerance;
  }

  /**
   * Clean up all video elements
   */
  dispose(): void {
    for (const video of this.videos.values()) {
      video.pause();
      video.src = '';
      video.load();
    }
    this.videos.clear();
    this.loadedClips.clear();
  }
}

/**
 * VideoSpriteManager - Manages multiple VideoSprites with resource limits
 * 
 * Limits the number of active video sprites to prevent memory issues.
 * Uses LRU eviction when limit is reached.
 */
export class VideoSpriteManager {
  private sprites: Map<string, { sprite: VideoSprite; lastUsed: number }> = new Map();
  private maxSprites: number;

  constructor(maxSprites: number = 5) {
    this.maxSprites = maxSprites;
  }

  /**
   * Get or create a VideoSprite for a creature
   */
  getSprite(creatureId: string, clips: CreatureClips, options?: VideoSpriteOptions): VideoSprite {
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
    const sprite = new VideoSprite(clips, options);
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
      console.log(`[VideoSpriteManager] Evicting sprite: ${oldest.id}`);
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
let sharedManager: VideoSpriteManager | null = null;

/**
 * Get shared VideoSpriteManager instance
 */
export function getVideoSpriteManager(): VideoSpriteManager {
  if (!sharedManager) {
    sharedManager = new VideoSpriteManager();
  }
  return sharedManager;
}
