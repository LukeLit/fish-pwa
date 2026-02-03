/**
 * Main game engine
 */
import p5 from 'p5';
import Matter from 'matter-js';
import { PhysicsEngine } from './physics';
import { Player } from './player';
import { Entity, Fish, EssenceOrb } from './entities';
import { MutationSystem } from './mutations';
import { PhaseManager } from './phases';
import { SeededRNG, generateSeed } from './procgen';
import { EssenceManager } from '../meta/essence';
import { GameStorage } from '../meta/storage';
import { getAudioManager } from './audio';
import { getFxhash } from '../blockchain/fxhash';
import { ESSENCE_TYPES } from './data/essence-types';
import { loadRunState, saveRunState, addEssenceToRun } from './run-state';
import {
  HUNGER_LOW_THRESHOLD,
  HUNGER_WARNING_PULSE_FREQUENCY,
  HUNGER_WARNING_PULSE_BASE,
  HUNGER_WARNING_INTENSITY,
} from './hunger-constants';
import { getBiome } from './data/biomes';
import { getCreaturesByBiome } from './data/creatures';
import { spawnAIFish } from './spawn-fish';

const DEFAULT_ESSENCE_COLOR = '#4ade80'; // Fallback color for essence orbs

export type GamePhase = 'playing' | 'levelComplete' | 'gameOver';

export interface GameState {
  running: boolean;
  paused: boolean;
  phase: GamePhase;
  score: number;
  startTime: number;
  currentTime: number;
  levelDuration: number; // Level duration in milliseconds (default 60 seconds)
  level: number;
  cachedEssence?: number;
}

export class GameEngine {
  private p5Instance: p5 | null = null;
  private physics: PhysicsEngine;
  private player: Player | null = null;
  private entities: Entity[] = [];
  private mutations: MutationSystem;
  private phases: PhaseManager;
  private rng: SeededRNG;
  private essenceManager: EssenceManager;
  private storage: GameStorage;

  public state: GameState = {
    running: false,
    paused: false,
    phase: 'playing',
    score: 0,
    startTime: 0,
    currentTime: 0,
    levelDuration: 60000, // 60 seconds per level
    level: 1,
  };

  private camera: { x: number; y: number } = { x: 0, y: 0 };
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 500; // ms - reduced for more frequent spawns
  private maxEntities: number = 50; // Limit total entities to prevent performance issues
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
  private floatingTexts: Array<{ x: number; y: number; vy: number; text: string; life: number; color: string }> = [];
  private audio = getAudioManager();
  private fxhash = getFxhash();
  private backgroundImage: p5.Image | null = null;
  private stageElementImages: p5.Image[] = [];
  private isLoadingBackground: boolean = false;
  private lastEssenceOrbSpawn: number = 0;
  private essenceOrbSpawnInterval: number = 3000; // Spawn essence orbs every 3 seconds
  private currentBiomeId: string = 'shallow'; // Default to shallow biome

  // World bounds (larger world for better gameplay)
  private worldBounds = {
    minX: -2000,
    maxX: 2000,
    minY: -2000,
    maxY: 2000,
  };

  constructor() {
    this.physics = new PhysicsEngine();
    this.rng = new SeededRNG(generateSeed());
    this.mutations = new MutationSystem();
    this.phases = new PhaseManager(this.rng.getSeed().toString());
    this.essenceManager = new EssenceManager();
    this.storage = GameStorage.getInstance();
  }

  /**
   * Initialize game with p5 instance
   */
  initialize(p5Instance: p5): void {
    this.p5Instance = p5Instance;
    // Load background image
    this.loadBackgroundImage();
    // Start game asynchronously
    this.start().catch(err => {
      console.error('Failed to start game:', err);
    });
  }

  /**
   * Load biome background and stage elements
   */
  private loadBackgroundImage(): void {
    if (this.isLoadingBackground || !this.p5Instance) return;
    this.isLoadingBackground = true;

    const biome = getBiome(this.currentBiomeId);
    if (!biome) {
      console.error(`Biome ${this.currentBiomeId} not found`);
      this.isLoadingBackground = false;
      return;
    }

    // Load background image
    if (biome.backgroundAssets.backgroundImage) {
      this.p5Instance.loadImage(biome.backgroundAssets.backgroundImage, (img: p5.Image) => {
        this.backgroundImage = img;
      }, () => {
        console.warn(`Failed to load background: ${biome.backgroundAssets.backgroundImage}`);
      });
    }

    // Load stage elements
    if (biome.backgroundAssets.stageElements) {
      this.stageElementImages = [];
      biome.backgroundAssets.stageElements.forEach((elementUrl) => {
        this.p5Instance?.loadImage(elementUrl, (img: p5.Image) => {
          this.stageElementImages.push(img);
        }, () => {
          console.warn(`Failed to load stage element: ${elementUrl}`);
        });
      });
    }

    this.isLoadingBackground = false;
  }

  /**
   * Start a new game
   */
  async start(): Promise<void> {
    // Reset everything
    this.entities.forEach(e => e.destroy(this.physics));
    this.entities = [];
    this.particles = [];
    this.floatingTexts = [];
    this.mutations.clear();
    this.phases.reset();

    // Load run state to get player size (for persistence across levels)
    const runState = loadRunState();
    const startingSize = runState?.fishState?.size ?? 20; // Default to 20 for new runs

    // Create player with saved size
    const startX = this.p5Instance?.width ? this.p5Instance.width / 2 : 400;
    const startY = this.p5Instance?.height ? this.p5Instance.height / 2 : 400;
    this.player = new Player(this.physics, startX, startY, startingSize);

    // Apply meta upgrades from player state (purchased with Evo Points)
    const { loadPlayerState } = await import('./player-state');
    const playerState = loadPlayerState();
    const metaUpgrades = playerState.metaUpgrades;

    // Note: We no longer apply size meta upgrades here
    // The size in RunState is the single source of truth
    // Players start at 20 and grow through eating

    // Apply starting speed upgrade
    if (metaUpgrades.meta_starting_speed) {
      const speedBonus = metaUpgrades.meta_starting_speed * 1;
      this.player.stats.speed += speedBonus;
    }

    // Apply essence multiplier (stored for later use when collecting essence)
    // Note: This is applied in dropEssenceFromFish and collectEssenceOrb methods

    // Apply hunger reduction
    if (metaUpgrades.meta_hunger_reduction) {
      // Hunger drain modifier is applied in Player.update()
      // Store it in player for reference
      const hungerDrainModifier = 1 - (metaUpgrades.meta_hunger_reduction * 0.1);
      Object.assign(this.player, { hungerDrainModifier });
    }

    // Cache essence for display
    const currentEssence = await this.essenceManager.getAmount();

    this.state = {
      running: true,
      paused: false,
      phase: 'playing',
      score: 0,
      startTime: Date.now(),
      currentTime: 0,
      levelDuration: 60000, // 60 seconds per level
      level: 1,
      cachedEssence: currentEssence,
    };

    this.camera = { x: startX, y: startY };
    this.lastSpawnTime = Date.now();
    this.lastEssenceOrbSpawn = Date.now();

    // Apply initial difficulty scaling for level 1
    this.applyLevelDifficultyScaling(1);
  }

  /**
   * Update game loop
   */
  update(): void {
    if (!this.p5Instance || !this.player || !this.state.running || this.state.paused) {
      return;
    }

    const deltaTime = 16; // ~60fps
    this.state.currentTime = Date.now() - this.state.startTime;

    // Check if level time is up
    if (this.state.currentTime >= this.state.levelDuration) {
      this.levelComplete();
      return;
    }

    // Update physics
    this.physics.update(deltaTime);

    // Update player
    this.player.update(deltaTime, this.physics);
    this.state.score = this.player.stats.score;

    // Constrain player within world bounds
    this.constrainToBounds(this.player);

    // Update camera to follow player (locked to player)
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    // Update mutations
    this.mutations.update(this.player, deltaTime);

    // Handle regeneration mutation
    if (this.mutations.hasMutation('regeneration')) {
      this.player.grow(0.01);
    }

    // Spawn entities
    this.spawnEntities();

    // Spawn essence orbs periodically
    this.spawnEssenceOrbs();

    // Update entities
    this.entities.forEach(entity => {
      if (entity instanceof Fish) {
        entity.update(deltaTime, this.physics, this.entities, this.player ?? undefined);
      } else {
        entity.update(deltaTime, this.physics);
      }
    });

    // Check collisions
    this.checkCollisions();

    // Remove dead entities
    this.entities = this.entities.filter(e => {
      if (!e.alive) {
        e.destroy(this.physics);
        return false;
      }
      return true;
    });

    // Update particles
    this.particles = this.particles
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - deltaTime,
      }))
      .filter(p => p.life > 0);

    // Update floating texts
    this.floatingTexts = this.floatingTexts
      .map(t => ({
        ...t,
        y: t.y + t.vy,
        life: t.life - deltaTime,
      }))
      .filter(t => t.life > 0);

    // Check phase transition
    if (this.phases.shouldTransition(this.player.stats.size)) {
      const newPhase = this.phases.transitionToNext();
      if (newPhase) {
        this.createParticles(this.player.x, this.player.y, '#ffffff', 50);
        this.audio.playSound('phase_transition', 0.7);
      }
    }

    // Check death condition
    this.checkDeath();
  }

  /**
   * Constrain entity to world bounds
   */
  private constrainToBounds(entity: Entity): void {
    if (entity.x < this.worldBounds.minX) {
      entity.x = this.worldBounds.minX;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: 0, y: entity.body.velocity.y });
    }
    if (entity.x > this.worldBounds.maxX) {
      entity.x = this.worldBounds.maxX;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: 0, y: entity.body.velocity.y });
    }
    if (entity.y < this.worldBounds.minY) {
      entity.y = this.worldBounds.minY;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: entity.body.velocity.x, y: 0 });
    }
    if (entity.y > this.worldBounds.maxY) {
      entity.y = this.worldBounds.maxY;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: entity.body.velocity.x, y: 0 });
    }
  }

  /**
   * Spawn entities based on biome creature rules
   */
  private spawnEntities(): void {
    if (!this.p5Instance || !this.player) return;

    const now = Date.now();
    if (now - this.lastSpawnTime < this.spawnInterval) return;

    // Don't spawn if at entity limit
    if (this.entities.length >= this.maxEntities) {
      this.lastSpawnTime = now;
      return;
    }

    const biome = getBiome(this.currentBiomeId);
    if (!biome) return;

    // Get creatures available in this biome
    const availableCreatures = getCreaturesByBiome(this.currentBiomeId);
    if (availableCreatures.length === 0) return;

    // Spawn 1-3 fish per interval, but respect entity limit
    const maxToSpawn = Math.min(3, this.maxEntities - this.entities.length);
    const spawnCount = Math.floor(Math.random() * maxToSpawn) + 1;

    for (let i = 0; i < spawnCount; i++) {
      // Select creature based on spawn weights
      const totalWeight = availableCreatures.reduce((sum, c) => sum + c.spawnRules.spawnWeight, 0);
      let randomWeight = Math.random() * totalWeight;
      let selectedCreature = availableCreatures[0]; // Default to first creature

      for (const creature of availableCreatures) {
        randomWeight -= creature.spawnRules.spawnWeight;
        if (randomWeight < 0) {
          selectedCreature = creature;
          break;
        }
      }

      // Spawn away from player but within visible range
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 400;
      let x = this.player.x + Math.cos(angle) * distance;
      let y = this.player.y + Math.sin(angle) * distance;

      // Clamp to world bounds
      x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, x));
      y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, y));

      // Use centralized spawn utility with player size for variance calculation
      const fish = spawnAIFish(
        selectedCreature,
        this.physics,
        { x, y },
        this.player.stats.size
      );

      this.entities.push(fish);
    }

    this.lastSpawnTime = now;
  }

  /**
   * Spawn essence orbs periodically
   */
  private spawnEssenceOrbs(): void {
    if (!this.p5Instance || !this.player) return;

    const biome = getBiome(this.currentBiomeId);
    if (!biome) return;

    const now = Date.now();
    // Adjust spawn interval based on biome spawn rate
    const adjustedInterval = this.essenceOrbSpawnInterval / Math.max(0.1, biome.essenceOrbSpawnRate);
    if (now - this.lastEssenceOrbSpawn < adjustedInterval) return;

    // Don't spawn if at entity limit
    if (this.entities.length >= this.maxEntities) {
      this.lastEssenceOrbSpawn = now;
      return;
    }

    // Spawn essence orbs based on biome's available essence types
    const essenceTypes = biome.availableEssenceTypes;
    const orbCount = 2 + Math.floor(Math.random() * 2); // 2-3 orbs

    for (let i = 0; i < orbCount; i++) {
      // Spawn near player but not too close
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 300;
      const x = this.player.x + Math.cos(angle) * distance;
      const y = this.player.y + Math.sin(angle) * distance;

      // Clamp to world bounds
      const clampedX = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, x));
      const clampedY = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, y));

      // Pick random essence type from biome's available types
      const essenceType = essenceTypes[Math.floor(Math.random() * essenceTypes.length)];
      const essenceColor = ESSENCE_TYPES[essenceType]?.color || DEFAULT_ESSENCE_COLOR;
      const amount = 1 + Math.floor(Math.random() * 3); // 1-3 essence per orb

      const orb = new EssenceOrb(
        this.physics,
        clampedX,
        clampedY,
        essenceType,
        amount,
        essenceColor
      );

      this.entities.push(orb);
    }

    this.lastEssenceOrbSpawn = now;
  }

  /**
   * Check collisions between player and entities
   */
  private checkCollisions(): void {
    if (!this.player) return;

    this.entities.forEach(entity => {
      if (!entity.alive || !this.player) return;

      const distance = Math.sqrt(
        Math.pow(this.player.x - entity.x, 2) + Math.pow(this.player.y - entity.y, 2)
      );
      const collisionDistance = this.player.stats.size + entity.size;

      if (distance < collisionDistance) {
        // Check for essence orb collection
        if (entity instanceof EssenceOrb) {
          this.collectEssenceOrb(entity);
          return;
        }

        // Check if collision is from the front
        const isPlayerFrontCollision = this.player.isFrontCollision(entity);
        const isEntityFrontCollision = entity.isFrontCollision(this.player);

        const sizeDiff = Math.abs(this.player.stats.size - entity.size);
        const sizeRatio = this.player.stats.size / entity.size;

        // Battle mechanic: if similar size (within 20%), engage in battle
        if (sizeDiff < this.player.stats.size * 0.2 && entity instanceof Fish) {
          // Battle - try to chomp each other
          if (isPlayerFrontCollision && this.player.chomp(entity)) {
            this.createParticles(entity.x, entity.y, '#ff0000', 5);
            this.audio.playSound('bite', 0.2);
          }
          if (isEntityFrontCollision && entity.chomp(this.player)) {
            this.createParticles(this.player.x, this.player.y, '#ff0000', 5);
            this.audio.playSound('bite', 0.2);
          }

          // Check if either lost all stamina
          if (this.player.stamina <= 0) {
            // Player loses battle
            this.gameOver();
          }
          if (entity.stamina <= 0) {
            // Entity loses battle, player can eat it
            this.player.eat(entity);
            this.syncPlayerSizeToRunState(); // Persist size after growth
            this.dropEssenceFromFish(entity as Fish);
            entity.destroy(this.physics);
            this.createParticles(entity.x, entity.y, entity.color, 10);
            this.audio.playSound('bite', 0.3);
          }
        } else if (this.player.canEat(entity) && isPlayerFrontCollision) {
          // Player eats entity (only from front)
          this.player.eat(entity);
          this.syncPlayerSizeToRunState(); // Persist size after growth
          this.dropEssenceFromFish(entity as Fish);
          entity.destroy(this.physics);
          this.createParticles(entity.x, entity.y, entity.color, 10);
          this.audio.playSound('bite', 0.3);

          // Chance for mutation
          if (Math.random() < 0.05) {
            const mutation = this.mutations.applyRandomMutation(this.player);
            if (mutation) {
              this.createParticles(this.player.x, this.player.y, '#ff00ff', 20);
              this.audio.playSound('mutation', 0.5);
            }
          }
        } else if (this.player.isEatenBy(entity) && isEntityFrontCollision) {
          // Player is eaten (only from front)
          this.gameOver();
        }
      }
    });

    // Also check fish-to-fish collisions for predator eating prey
    for (let i = 0; i < this.entities.length; i++) {
      const fish1 = this.entities[i];
      if (!(fish1 instanceof Fish) || !fish1.alive) continue;

      for (let j = i + 1; j < this.entities.length; j++) {
        const fish2 = this.entities[j];
        if (!(fish2 instanceof Fish) || !fish2.alive) continue;

        const distance = Math.sqrt(
          Math.pow(fish1.x - fish2.x, 2) + Math.pow(fish1.y - fish2.y, 2)
        );
        const collisionDistance = fish1.size + fish2.size;

        if (distance < collisionDistance) {
          // Check which fish is predator and which is prey
          if (fish1.type === 'predator' && fish1.size >= fish2.size * 1.2 && fish1.isFrontCollision(fish2)) {
            // fish1 eats fish2 - diminishing returns for AI too
            const sizeRatio = fish1.size / fish2.size;
            const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
            fish1.size += fish2.size * 0.1 * efficiencyMult;
            fish2.destroy(this.physics);
            this.createParticles(fish2.x, fish2.y, fish2.color, 5);
          } else if (fish2.type === 'predator' && fish2.size >= fish1.size * 1.2 && fish2.isFrontCollision(fish1)) {
            // fish2 eats fish1 - diminishing returns for AI too
            const sizeRatio = fish2.size / fish1.size;
            const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
            fish2.size += fish1.size * 0.1 * efficiencyMult;
            fish1.destroy(this.physics);
            this.createParticles(fish1.x, fish1.y, fish1.color, 5);
          }
        }
      }
    }
  }

  /**
   * Collect essence orb
   */
  private collectEssenceOrb(orb: EssenceOrb): void {
    if (!this.player) return;

    // Add essence to run state
    let runState = loadRunState();
    if (runState) {
      runState = addEssenceToRun(runState, orb.essenceType, orb.amount);
      saveRunState(runState);
    }

    // Create visual effects
    this.createParticles(orb.x, orb.y, orb.color, 15);
    this.createFloatingText(
      orb.x,
      orb.y,
      `+${orb.amount} ${ESSENCE_TYPES[orb.essenceType]?.name || orb.essenceType}`,
      orb.color
    );

    // Play collection sound
    this.audio.playSound('mutation', 0.3);

    // Destroy orb
    orb.destroy(this.physics);
  }

  /**
   * Sync player size to run state
   * Called after player eats and grows to persist size across level transitions
   */
  private syncPlayerSizeToRunState(): void {
    if (!this.player) return;
    
    const runState = loadRunState();
    if (runState) {
      const updated = updateFishState(runState, { size: this.player.stats.size });
      saveRunState(updated);
    }
  }

  /**
   * Drop essence when fish is eaten
   * Uses full formula from ROGUELITE_DESIGN.md:
   * Base Yield = Creature Size × Biome Multiplier
   * Quality Multiplier: Standard (1.0x), Perfect (1.5x), Combo (2.0x)
   * Rarity Multiplier: Common (1.0x), Rare (1.5x), Epic (2.0x), Legendary (3.0x)
   */
  private dropEssenceFromFish(fish: Fish): void {
    if (!this.player) return;

    // Get creature data to access essence types
    const creatureId = (fish as unknown as Record<string, unknown>).creatureId as string || 'unknown';
    const creature = (async () => {
      const { getCreature } = await import('./data/creatures');
      return getCreature(creatureId);
    })();

    void creature.then(creatureData => {
      if (!creatureData) {
        console.warn(`Creature ${creatureId} not found for essence drop`);
        return;
      }

      // Get biome multiplier (default 1.0 for now)
      // const biomeMultiplier = 1.0;

      // Calculate base yield - unused for now but kept for future enhancement
      // const baseYield = fish.size * biomeMultiplier;

      // Quality multiplier (for now, always standard; can be enhanced with combo detection)
      const qualityMultiplier = 1.0; // Standard kill

      // Rarity multiplier
      const rarityMultipliers: Record<string, number> = {
        common: 1.0,
        uncommon: 1.5,
        rare: 1.5,
        epic: 2.0,
        legendary: 3.0,
      };
      const rarityMultiplier = rarityMultipliers[creatureData.rarity] || 1.0;

      // Apply meta upgrade essence multiplier
      const { loadPlayerState } = require('./player-state') as { loadPlayerState: () => { metaUpgrades: Record<string, number> } };
      const playerState = loadPlayerState();
      const essenceMultiplierLevel = playerState.metaUpgrades.meta_essence_multiplier || 0;
      const metaMultiplier = 1 + (essenceMultiplierLevel * 0.1); // +10% per level

      // Grant all essence types from creature
      let runState = loadRunState();
      if (runState) {
        creatureData.essenceTypes.forEach(essenceConfig => {
          // Calculate final yield for this essence type
          const essenceYield = Math.max(
            1,
            Math.floor(essenceConfig.baseYield * qualityMultiplier * rarityMultiplier * metaMultiplier)
          );

          // Add essence to run state
          runState = addEssenceToRun(runState!, essenceConfig.type, essenceYield);

          // Create visual feedback
          this.createFloatingText(
            fish.x,
            fish.y - 20 * creatureData.essenceTypes.indexOf(essenceConfig), // Offset for multiple types
            `+${essenceYield} ${ESSENCE_TYPES[essenceConfig.type]?.name || essenceConfig.type}`,
            ESSENCE_TYPES[essenceConfig.type]?.color || DEFAULT_ESSENCE_COLOR
          );
        });

        saveRunState(runState);
      }
    }).catch((err: Error) => {
      console.error('Error processing essence drop:', err);
    });
  }

  /**
   * Check if player should die
   */
  private checkDeath(): void {
    if (!this.player || !this.p5Instance) return;

    // Die if too small (edge case)
    if (this.player.stats.size < 1) {
      this.gameOver();
    }

    // Die if starving
    if (this.player.isStarving()) {
      this.gameOver();
    }
  }

  /**
   * Handle level complete (time ran out)
   */
  levelComplete(): void {
    if (!this.player || !this.state.running) return;

    this.state.running = false;
    this.state.phase = 'levelComplete';

    this.audio.playSound('phase_transition', 0.7);
  }

  /**
   * Handle game over (player was eaten)
   */
  gameOver(): void {
    if (!this.player || !this.state.running) return;

    this.state.running = false;
    this.state.phase = 'gameOver';

    this.audio.playSound('death', 0.5);
  }

  /**
   * Start next level after upgrade selection
   * Implements difficulty scaling per ROGUELITE_DESIGN.md
   */
  async nextLevel(): Promise<void> {
    if (!this.player) return;

    // Increment level
    this.state.level += 1;

    // Apply difficulty scaling based on level
    this.applyLevelDifficultyScaling(this.state.level);

    // Reset level-specific state but keep player progress
    this.entities.forEach(e => e.destroy(this.physics));
    this.entities = [];
    this.particles = [];
    this.floatingTexts = [];

    // Reset timer
    this.state.running = true;
    this.state.phase = 'playing';
    this.state.startTime = Date.now();
    this.state.currentTime = 0;
    this.lastSpawnTime = Date.now();
    this.lastEssenceOrbSpawn = Date.now();
  }

  /**
   * Apply difficulty scaling based on level
   * Following ROGUELITE_DESIGN.md progression table
   */
  private applyLevelDifficultyScaling(level: number): void {
    // Difficulty scaling configuration
    const difficultyConfig: Record<number, {
      spawnInterval: number;
      maxEntities: number;
      levelDuration: number;
    }> = {
      1: { // Level 1-1
        spawnInterval: 600,
        maxEntities: 40,
        levelDuration: 60000, // 60 seconds
      },
      2: { // Level 1-2
        spawnInterval: 500,
        maxEntities: 50,
        levelDuration: 75000, // 75 seconds
      },
      3: { // Level 1-3
        spawnInterval: 400,
        maxEntities: 60,
        levelDuration: 90000, // 90 seconds
      },
      // Future levels can scale further
    };

    const config = difficultyConfig[level] || {
      spawnInterval: Math.max(300, 600 - (level * 50)),
      maxEntities: Math.min(80, 40 + (level * 10)),
      levelDuration: 60000 + (level * 15000),
    };

    this.spawnInterval = config.spawnInterval;
    this.maxEntities = config.maxEntities;
    this.state.levelDuration = config.levelDuration;
  }

  /**
   * End game and calculate rewards
   */
  async endGame(): Promise<void> {
    if (!this.player) return;

    const duration = this.state.currentTime;
    const essenceEarned = this.essenceManager.calculateEarned({
      score: this.state.score,
      phase: this.phases.getCurrentPhase(),
      maxSize: this.player.stats.maxSize,
      duration,
    });

    await this.essenceManager.add(essenceEarned);
    await this.storage.setHighScore(this.state.score);

    // Update cached essence
    this.state.cachedEssence = await this.essenceManager.getAmount();

    // Save run history
    await this.storage.addRunHistory({
      timestamp: Date.now(),
      score: this.state.score,
      essenceEarned,
      phase: this.phases.getCurrentPhase(),
      size: this.player.stats.maxSize,
      duration,
    });

    // Offer to mint fish if on fxhash and conditions met
    if (this.fxhash.isAvailable() && this.player.stats.maxSize >= 50 && this.player.mutations.length > 0) {
      // Could trigger minting UI here
      console.log('Fish eligible for minting:', {
        mutations: this.player.mutations,
        maxSize: this.player.stats.maxSize,
        phase: this.phases.getCurrentPhase(),
      });
    }
  }

  /**
   * Create particle effect
   */
  private createParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 500 + Math.random() * 500,
        color,
      });
    }
  }

  /**
   * Create floating text effect (like +X Essence)
   */
  private createFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -0.5, // Float upward
      text,
      life: 2000, // 2 seconds
      color,
    });
  }

  /**
   * Render game
   */
  render(): void {
    if (!this.p5Instance || !this.player) return;

    const p5 = this.p5Instance;
    const phaseConfig = this.phases.getCurrentConfig();

    // Background with parallax
    if (this.backgroundImage) {
      // Calculate parallax offset (background moves slower than camera)
      const parallaxFactor = 0.3; // Background moves at 30% of camera speed
      const bgOffsetX = this.camera.x * parallaxFactor;
      const bgOffsetY = this.camera.y * parallaxFactor;

      // Calculate scaling to maintain aspect ratio and cover screen
      const imgAspect = this.backgroundImage.width / this.backgroundImage.height;
      const screenAspect = p5.width / p5.height;

      let drawWidth, drawHeight;
      if (imgAspect > screenAspect) {
        // Image is wider than screen
        drawHeight = p5.height * 1.5; // Make it bigger to allow parallax
        drawWidth = drawHeight * imgAspect;
      } else {
        // Image is taller than screen
        drawWidth = p5.width * 1.5; // Make it bigger to allow parallax
        drawHeight = drawWidth / imgAspect;
      }

      // Center background with parallax offset
      const bgX = (p5.width - drawWidth) / 2 - bgOffsetX;
      const bgY = (p5.height - drawHeight) / 2 - bgOffsetY;

      p5.image(this.backgroundImage, bgX, bgY, drawWidth, drawHeight);
    } else {
      // Fallback to solid color
      p5.background(phaseConfig.backgroundColor);
    }

    // Draw stage elements with parallax (before camera translation)
    if (this.stageElementImages.length > 0) {
      const biome = getBiome(this.currentBiomeId);
      const parallaxFactor = 0.5; // Stage elements move at 50% of camera speed
      const stageOffsetX = this.camera.x * parallaxFactor;
      const stageOffsetY = this.camera.y * parallaxFactor;

      // Position stage elements at bottom of screen
      this.stageElementImages.forEach((img, index) => {
        const spacing = p5.width / (this.stageElementImages.length + 1);
        const x = spacing * (index + 1) - stageOffsetX;
        const y = p5.height - img.height * 0.3 - stageOffsetY * 0.2; // Bottom aligned
        const scale = 0.3; // Scale down to fit screen

        p5.push();
        p5.imageMode(p5.CENTER);
        p5.image(img, x, y, img.width * scale, img.height * scale);
        p5.pop();
      });
    }

    // Apply biome lighting tint
    const biome = getBiome(this.currentBiomeId);
    if (biome?.backgroundAssets.lighting === 'bright') {
      // Slight brightness boost for shallow waters
      p5.push();
      p5.blendMode(p5.ADD);
      p5.fill(255, 255, 255, 10);
      p5.noStroke();
      p5.rect(0, 0, p5.width, p5.height);
      p5.pop();
    }

    // Translate to camera
    p5.push();
    p5.translate(p5.width / 2 - this.camera.x, p5.height / 2 - this.camera.y);

    // Draw world bounds
    p5.push();
    p5.noFill();
    p5.stroke(255, 255, 255, 100);
    p5.strokeWeight(3);
    p5.rect(
      this.worldBounds.minX,
      this.worldBounds.minY,
      this.worldBounds.maxX - this.worldBounds.minX,
      this.worldBounds.maxY - this.worldBounds.minY
    );
    p5.pop();

    // Render entities
    this.entities.forEach(entity => entity.render(p5));

    // Render player
    this.player.render(p5);

    // Render particles
    this.particles.forEach(particle => {
      p5.push();
      p5.fill(particle.color);
      p5.noStroke();
      const alpha = Math.min(255, (particle.life / 500) * 255);
      p5.fill(p5.red(particle.color), p5.green(particle.color), p5.blue(particle.color), alpha);
      p5.circle(particle.x, particle.y, 3);
      p5.pop();
    });

    // Render floating texts
    this.floatingTexts.forEach(floatingText => {
      p5.push();
      const alpha = Math.min(255, (floatingText.life / 2000) * 255);
      p5.fill(p5.red(floatingText.color), p5.green(floatingText.color), p5.blue(floatingText.color), alpha);
      p5.textSize(18);
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.textStyle(p5.BOLD);
      // Add black outline for readability
      p5.strokeWeight(3);
      p5.stroke(0, 0, 0, alpha);
      p5.text(floatingText.text, floatingText.x, floatingText.y);
      p5.pop();
    });

    p5.pop();

    // Low hunger visual warning (red tint and vignette)
    if (this.player.stats.hunger <= HUNGER_LOW_THRESHOLD) {
      p5.push();
      const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
      const intensity = (1 - this.player.stats.hunger / HUNGER_LOW_THRESHOLD) * HUNGER_WARNING_INTENSITY * pulse;

      // Red tint overlay
      p5.fill(255, 0, 0, intensity * 255);
      p5.noStroke();
      p5.rect(0, 0, p5.width, p5.height);

      // Vignette effect (darker edges)
      p5.push();
      const ctx = p5.drawingContext as CanvasRenderingContext2D;
      const vignette = ctx.createRadialGradient(
        p5.width / 2, p5.height / 2, 0,
        p5.width / 2, p5.height / 2, Math.max(p5.width, p5.height) * 0.6
      );
      vignette.addColorStop(0, 'rgba(139, 0, 0, 0)');
      vignette.addColorStop(1, `rgba(139, 0, 0, ${intensity * 0.6})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, p5.width, p5.height);
      p5.pop();

      p5.pop();
    }

    // UI overlay
    this.renderUI();
  }

  /**
   * Render UI overlay
   */
  private renderUI(): void {
    if (!this.p5Instance || !this.player) return;

    const p5 = this.p5Instance;

    p5.push();
    p5.fill(255);
    p5.textSize(16);
    p5.textAlign(p5.LEFT, p5.TOP);
    p5.text(`Score: ${this.state.score}`, 10, 10);
    p5.text(`Size: ${Math.floor(this.player.stats.size)}`, 10, 30);
    p5.text(`Level: ${this.state.level}`, 10, 50);

    // Timer (countdown)
    const timeLeft = Math.max(0, this.state.levelDuration - this.state.currentTime);
    const seconds = Math.ceil(timeLeft / 1000);
    p5.text(`Time: ${seconds}s`, 10, 70);

    // Show collected essence from run state
    const runState = loadRunState();
    const collectedEssence = runState?.collectedEssence || {};
    const totalCollected = Object.values(collectedEssence).reduce((sum, val) => sum + val, 0);
    p5.text(`Essence Collected: ${totalCollected}`, 10, 90);

    // Stamina bar
    const staminaPercent = this.player.stamina / this.player.maxStamina;
    p5.text(`Stamina:`, 10, 110);
    p5.fill(50);
    p5.rect(80, 110, 100, 15);
    p5.fill(staminaPercent > 0.3 ? '#4ade80' : '#ef4444');
    p5.rect(80, 110, 100 * staminaPercent, 15);

    // Hunger Meter - centered at top
    const hungerBarWidth = 300;
    const hungerBarHeight = 30;
    const hungerBarX = (p5.width - hungerBarWidth) / 2;
    const hungerBarY = 20;
    const hungerPercent = this.player.stats.hunger / 100;

    // Background with chunky border (DICE VADERS style)
    p5.strokeWeight(4);
    p5.stroke(255, 255, 255, 230);
    p5.fill(0, 0, 0, 150);
    p5.rect(hungerBarX, hungerBarY, hungerBarWidth, hungerBarHeight);

    // Hunger fill - color-coded
    let hungerColor;
    if (hungerPercent > 0.5) {
      hungerColor = p5.color(74, 222, 128); // Green
    } else if (hungerPercent > 0.25) {
      hungerColor = p5.color(251, 191, 36); // Yellow
    } else {
      hungerColor = p5.color(239, 68, 68); // Red
    }

    p5.noStroke();
    p5.fill(hungerColor);
    const fillWidth = (hungerBarWidth - 8) * hungerPercent;
    p5.rect(hungerBarX + 4, hungerBarY + 4, fillWidth, hungerBarHeight - 8);

    // Glow effect for low hunger
    if (hungerPercent <= 0.25) {
      p5.push();
      const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
      p5.drawingContext.shadowColor = `rgb(239, 68, 68)`;
      p5.drawingContext.shadowBlur = 20 * pulse;
      p5.strokeWeight(3);
      p5.stroke(hungerColor);
      p5.noFill();
      p5.rect(hungerBarX, hungerBarY, hungerBarWidth, hungerBarHeight);
      p5.drawingContext.shadowBlur = 0;
      p5.drawingContext.shadowColor = 'transparent';
      p5.pop();
    }

    // Text label
    p5.fill(255, 255, 255, 240);
    p5.noStroke();
    p5.textSize(16);
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textStyle(p5.BOLD);
    p5.text(`HUNGER: ${Math.ceil(this.player.stats.hunger)}%`, hungerBarX + hungerBarWidth / 2, hungerBarY + hungerBarHeight / 2);

    // Mutations
    const activeMutations = this.mutations.getActiveMutations();
    if (activeMutations.length > 0) {
      p5.fill(255);
      p5.textAlign(p5.LEFT, p5.TOP);
      p5.textSize(16);
      p5.textStyle(p5.NORMAL);
      p5.text(`Mutations: ${activeMutations.map(m => m.name).join(', ')}`, 10, 130);
    }

    p5.pop();
  }

  /**
   * Handle key events
   */
  handleKeyDown(key: string): void {
    if (this.player) {
      this.player.handleKeyDown(key);
    }
    if (key === 'p' || key === 'P') {
      this.state.paused = !this.state.paused;
    }
  }

  handleKeyUp(key: string): void {
    if (this.player) {
      this.player.handleKeyUp(key);
    }
  }

  /**
   * Get game state for external access
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.entities.forEach(e => e.destroy(this.physics));
    this.physics.destroy();
  }
}
