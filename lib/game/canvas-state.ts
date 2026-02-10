/**
 * Canvas Game State Management
 * Consolidates all game state refs into a single manageable object
 */

import { DashParticleSystem } from '@/lib/rendering/dash-particles';
import { MultiEntityDashParticleManager } from '@/lib/rendering/multi-entity-dash-particles';
import { getAnimationSpriteManager, type AnimationSprite } from '@/lib/rendering/animation-sprite';
import type { CreatureAnimations, Creature } from '@/lib/game/types';
import { PLAYER_BASE_SIZE, PLAYER_MAX_SIZE } from './spawn-fish';
import { HUNGER_MAX, HUNGER_DRAIN_RATE } from './hunger-constants';
import { WORLD_BOUNDS, STAMINA, PLAYER_BASE_MAX_HEALTH, PARTICLES } from './canvas-constants';
import { computeEffectiveMaxStamina } from './stamina-hunger';
import { getDefaultPlayerSpawnPosition } from './spawn-position';

import type { FishLifecycleState } from './combat-states';
import type { BakedHitbox } from './sprite-hitbox';
export type { FishLifecycleState };

export interface FishEntity {
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
  currentGrowthStage?: 'juvenile' | 'adult' | 'elder';
  spawnTime?: number;
  despawnTime?: number;
  opacity?: number;
  lifecycleState: FishLifecycleState;
  animations?: CreatureAnimations;
  animationSprite?: AnimationSprite;
  stamina?: number;
  maxStamina?: number;
  baseMaxStamina?: number;
  hunger?: number;
  hungerDrainRate?: number;
  isDashing?: boolean;
  /** Set when entering exhausted; cleared when stamina refills to full. Prevents dashing until refill. */
  recoveringFromExhausted?: boolean;
  chaseTargetId?: string;
  chaseStartTime?: number;
  // --- Combat / Health ---
  health?: number;
  maxHealth?: number;
  hitFlashEndTime?: number;
  hitPunchScaleEndTime?: number;
  attackFlashEndTime?: number;
  lungeStartTime?: number;
  lungeVx?: number;
  lungeVy?: number;
  fleeFromId?: string;
  fleeFromUntil?: number;
  lastDamagedTime?: number;
  /** Sprite-derived hitbox (baked at load); when absent, fallback to size-ratio ellipses */
  hitbox?: BakedHitbox;
}

export interface PlayerEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  sprite: HTMLCanvasElement | null;
  facingRight: boolean;
  verticalTilt: number;
  animTime: number;
  chompPhase: number;
  chompEndTime: number;
  hunger: number;
  hungerDrainRate: number;
  baseMaxStamina: number;
  stamina: number;
  maxStamina: number;
  isDashing: boolean;
  isExhausted?: boolean;
  animations?: CreatureAnimations;
  // --- Combat / Health ---
  health?: number;
  maxHealth?: number;
  hitFlashEndTime?: number;
  hitPunchScaleEndTime?: number;
  attackFlashEndTime?: number;
  lungeStartTime?: number;
  lungeVx?: number;
  lungeVy?: number;
  lastBiteTime?: number;
  chunkEatEndTime?: number;
  lastChunkEatTime?: number;
  /** Sprite-derived hitbox (baked at load); when absent, fallback to size-ratio ellipses */
  hitbox?: BakedHitbox;
}

export interface ChompParticle {
  x: number;
  y: number;
  life: number;
  scale: number;
  text: string;
  color?: string;
  punchScale?: number;
  floatUp?: boolean;
}

export interface CarcassEntity {
  carcassId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spawnTime: number;
  opacity: number;
  remainingChunks: number;
  /** Phase offset for bobbing/rotation (0..2π) */
  bobPhase?: number;
}

export interface ChunkEntity {
  chunkId: string;
  chunkKind: 'meat' | 'essence';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Only for meat chunks: size growth on collect */
  growthAmount?: number;
  /** Only for meat chunks: hunger restored on collect (split from fish.size * HUNGER_RESTORE_MULTIPLIER) */
  hungerRestore?: number;
  /** Only for essence chunks */
  essenceType?: string;
  essenceAmount?: number;
  carcassId?: string;
  spawnTime: number;
  size: number;
  /** Phase offset for bobbing/rotation (0..2π) */
  bobPhase?: number;
}

export interface BloodParticle {
  x: number;
  y: number;
  life: number;
  radius: number;
}

export interface CameraState {
  x: number;
  y: number;
  panX: number;
  panY: number;
  effectiveX: number;
  effectiveY: number;
}

export interface GameModeState {
  startTime: number;
  gameOverFired: boolean;
  levelCompleteFired: boolean;
  levelEnding: boolean;
  score: number;
  fishEaten: number;
  essenceCollected: number;
  pauseStartTime: number;
  totalPausedTime: number;
  wasPaused: boolean;
}

export interface FrameTimingState {
  lastFrameTime: number;
  frameTimes: number[];
}

/**
 * Canvas Game State Manager
 * Consolidates all game state into a single object
 */
export class CanvasGameState {
  player: PlayerEntity;
  fish: FishEntity[];
  camera: CameraState;
  particles: {
    chomp: ChompParticle[];
    blood: BloodParticle[];
    dashPlayer: DashParticleSystem;
    dashMultiEntity: MultiEntityDashParticleManager;
  };
  gameMode: GameModeState;
  frameTiming: FrameTimingState;
  worldBounds: typeof WORLD_BOUNDS;
  animationSpriteManager: ReturnType<typeof getAnimationSpriteManager>;
  dashHoldDurationMs: number;
  lastPlayerAnimAction: string | null;
  eatenIds: Set<string>;
  spriteCache: Map<string, HTMLCanvasElement>;
  spriteUrls: Map<string, string>;
  spriteVersions: Map<string, number>;
  spawnPool: Creature[];
  lastRespawnTime: number;
  lastSmallPreyRespawnTime: number;
  carcasses: CarcassEntity[];
  chunks: ChunkEntity[];

  constructor() {
    const spawnPos = getDefaultPlayerSpawnPosition();
    this.player = {
      id: 'player',
      x: spawnPos.x,
      y: spawnPos.y,
      vx: 0,
      vy: 0,
      size: PLAYER_BASE_SIZE,
      baseSize: PLAYER_BASE_SIZE,
      sprite: null,
      facingRight: true,
      verticalTilt: 0,
      animTime: 0,
      chompPhase: 0,
      chompEndTime: 0,
      hunger: HUNGER_MAX,
      hungerDrainRate: HUNGER_DRAIN_RATE,
      baseMaxStamina: STAMINA.BASE_MAX_START,
      stamina: computeEffectiveMaxStamina(STAMINA.BASE_MAX_START, HUNGER_MAX),
      maxStamina: computeEffectiveMaxStamina(STAMINA.BASE_MAX_START, HUNGER_MAX),
      isDashing: false,
      isExhausted: false,
      health: PLAYER_BASE_MAX_HEALTH,
      maxHealth: PLAYER_BASE_MAX_HEALTH,
    };

    this.fish = [];
    this.camera = {
      x: 0,
      y: 0,
      panX: 0,
      panY: 0,
      effectiveX: 0,
      effectiveY: 0,
    };
    this.particles = {
      chomp: [],
      blood: [],
      dashPlayer: new DashParticleSystem({
        flowCap: PARTICLES.PLAYER_DASH_FLOW_CAP,
        flowDistancePerParticle: PARTICLES.PLAYER_DASH_FLOW_DISTANCE_PER_PARTICLE,
        streakDistancePerParticle: PARTICLES.PLAYER_DASH_STREAK_DISTANCE_PER_PARTICLE,
        maxSpawnPerFrame: PARTICLES.PLAYER_DASH_MAX_SPAWN_PER_FRAME,
      }),
      dashMultiEntity: new MultiEntityDashParticleManager({
        flowCap: PARTICLES.MULTI_ENTITY_FLOW_CAP,
        flowDistancePerParticle: PARTICLES.MULTI_ENTITY_FLOW_DISTANCE_PER_PARTICLE,
        streakDistancePerParticle: PARTICLES.MULTI_ENTITY_STREAK_DISTANCE_PER_PARTICLE,
        maxSpawnPerFrame: PARTICLES.MULTI_ENTITY_MAX_SPAWN_PER_FRAME,
      }),
    };
    this.gameMode = {
      startTime: 0,
      gameOverFired: false,
      levelCompleteFired: false,
      levelEnding: false,
      score: 0,
      fishEaten: 0,
      essenceCollected: 0,
      pauseStartTime: 0,
      totalPausedTime: 0,
      wasPaused: false,
    };
    this.frameTiming = {
      lastFrameTime: 0,
      frameTimes: [],
    };
    this.worldBounds = { ...WORLD_BOUNDS };
    this.animationSpriteManager = getAnimationSpriteManager();
    this.dashHoldDurationMs = 0;
    this.lastPlayerAnimAction = null;
    this.eatenIds = new Set();
    this.spriteCache = new Map();
    this.spriteUrls = new Map();
    this.spriteVersions = new Map();
    this.spawnPool = [];
    this.lastRespawnTime = 0;
    this.lastSmallPreyRespawnTime = 0;
    this.carcasses = [];
    this.chunks = [];
  }

  /**
   * Reset game state for new game
   */
  resetGame(): void {
    this.gameMode.startTime = 0;
    this.gameMode.gameOverFired = false;
    this.gameMode.levelCompleteFired = false;
    this.gameMode.levelEnding = false;
    this.gameMode.score = 0;
    this.gameMode.fishEaten = 0;
    this.gameMode.totalPausedTime = 0;
    this.player.hunger = HUNGER_MAX;
    const maxSta = computeEffectiveMaxStamina(this.player.baseMaxStamina, HUNGER_MAX);
    this.player.stamina = maxSta;
    this.player.maxStamina = maxSta;
    this.player.isDashing = false;
    this.player.isExhausted = false;
    this.player.health = PLAYER_BASE_MAX_HEALTH;
    this.player.maxHealth = PLAYER_BASE_MAX_HEALTH;
    this.dashHoldDurationMs = 0;
    this.carcasses = [];
    this.chunks = [];
  }

  /**
   * Reset player to initial state
   */
  resetPlayer(): void {
    const spawnPos = getDefaultPlayerSpawnPosition();
    this.player.x = spawnPos.x;
    this.player.y = spawnPos.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.size = PLAYER_BASE_SIZE;
    this.player.baseSize = PLAYER_BASE_SIZE;
    this.player.facingRight = true;
    this.player.verticalTilt = 0;
    this.player.animTime = 0;
    this.player.chompPhase = 0;
    this.player.chompEndTime = 0;
    this.player.hunger = HUNGER_MAX;
    const maxSta = computeEffectiveMaxStamina(this.player.baseMaxStamina, HUNGER_MAX);
    this.player.stamina = maxSta;
    this.player.maxStamina = maxSta;
    this.player.isDashing = false;
    this.player.isExhausted = false;
    this.player.health = PLAYER_BASE_MAX_HEALTH;
    this.player.maxHealth = PLAYER_BASE_MAX_HEALTH;
  }

  /**
   * Clear all particles
   */
  clearParticles(): void {
    this.particles.chomp = [];
    this.particles.blood = [];
    this.particles.dashPlayer.reset();
    this.particles.dashMultiEntity.reset();
  }

  /**
   * Update particles (decay life, remove dead)
   */
  updateParticles(deltaTime: number): void {
    // Update chomp particles
    this.particles.chomp = this.particles.chomp
      .map((p) => ({ ...p, life: p.life - 0.02 * deltaTime }))
      .filter((p) => p.life > 0);

    // Update blood particles
    this.particles.blood = this.particles.blood
      .map((p) => ({ ...p, life: p.life - 0.015 * deltaTime }))
      .filter((p) => p.life > 0);
  }

  /**
   * Calculate delta time from frame timing
   */
  calculateDeltaTime(): number {
    const currentTime = performance.now();
    let deltaTime = 1; // Default to 1 for first frame (normalized to 60fps)

    if (this.frameTiming.lastFrameTime > 0) {
      const frameDelta = currentTime - this.frameTiming.lastFrameTime;
      deltaTime = Math.min(frameDelta / 16.67, 3); // Cap at 3x to prevent huge jumps
      this.frameTiming.frameTimes.push(frameDelta);
      if (this.frameTiming.frameTimes.length > 60) {
        this.frameTiming.frameTimes.shift();
      }
    }

    this.frameTiming.lastFrameTime = currentTime;
    return deltaTime;
  }

  /**
   * Update pause tracking
   */
  updatePauseTracking(isPaused: boolean): void {
    if (isPaused && !this.gameMode.wasPaused) {
      this.gameMode.pauseStartTime = Date.now();
      this.gameMode.wasPaused = true;
    } else if (!isPaused && this.gameMode.wasPaused) {
      this.gameMode.totalPausedTime += Date.now() - this.gameMode.pauseStartTime;
      this.gameMode.wasPaused = false;
    }
  }

  /**
   * Get elapsed game time (accounting for pauses)
   */
  getElapsedGameTime(): number {
    if (this.gameMode.startTime === 0) return 0;
    const currentPausedTime = this.gameMode.wasPaused
      ? Date.now() - this.gameMode.pauseStartTime
      : 0;
    return Date.now() - this.gameMode.startTime - this.gameMode.totalPausedTime - currentPausedTime;
  }
}
