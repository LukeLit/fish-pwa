/**
 * Main game engine
 */
import p5 from 'p5';
import Matter from 'matter-js';
import { PhysicsEngine } from './physics';
import { Player } from './player';
import { Entity, Fish, Food } from './entities';
import { MutationSystem } from './mutations';
import { PhaseManager } from './phases';
import { SeededRNG, generateSeed } from './procgen';
import { EssenceManager } from '../meta/essence';
import { GameStorage } from '../meta/storage';
import { getAudioManager } from './audio';
import { getFxhash } from '../blockchain/fxhash';
import {
  HUNGER_LOW_THRESHOLD,
  HUNGER_WARNING_PULSE_FREQUENCY,
  HUNGER_WARNING_PULSE_BASE,
  HUNGER_WARNING_INTENSITY,
} from './hunger-constants';

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
  private audio = getAudioManager();
  private fxhash = getFxhash();
  private backgroundImage: p5.Image | null = null;
  private isLoadingBackground: boolean = false;
  
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
   * Load random background image
   */
  private loadBackgroundImage(): void {
    if (this.isLoadingBackground || !this.p5Instance) return;
    this.isLoadingBackground = true;

    fetch('/api/list-assets?type=background')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.assets.length > 0 && this.p5Instance) {
          const randomBg = data.assets[Math.floor(Math.random() * data.assets.length)];
          this.p5Instance.loadImage(randomBg.url, (img: p5.Image) => {
            this.backgroundImage = img;
          }, () => {
            // Failed to load background, will use solid color fallback
          });
        }
      })
      .catch(err => {
        // Failed to fetch background assets, will use solid color fallback
      })
      .finally(() => {
        this.isLoadingBackground = false;
      });
  }

  /**
   * Start a new game
   */
  async start(): Promise<void> {
    // Reset everything
    this.entities.forEach(e => e.destroy(this.physics));
    this.entities = [];
    this.particles = [];
    this.mutations.clear();
    this.phases.reset();

    // Create player
    const startX = this.p5Instance?.width ? this.p5Instance.width / 2 : 400;
    const startY = this.p5Instance?.height ? this.p5Instance.height / 2 : 400;
    this.player = new Player(this.physics, startX, startY, 10);

    // Apply starting upgrades
    const upgrades = await this.storage.getUpgrades();
    if (upgrades.starting_size) {
      this.player.stats.size += upgrades.starting_size * 2;
      this.player.size = this.player.stats.size;
    }
    if (upgrades.starting_speed) {
      this.player.stats.speed += upgrades.starting_speed * 0.5;
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
    let constrained = false;
    if (entity.x < this.worldBounds.minX) {
      entity.x = this.worldBounds.minX;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: 0, y: entity.body.velocity.y });
      constrained = true;
    }
    if (entity.x > this.worldBounds.maxX) {
      entity.x = this.worldBounds.maxX;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: 0, y: entity.body.velocity.y });
      constrained = true;
    }
    if (entity.y < this.worldBounds.minY) {
      entity.y = this.worldBounds.minY;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: entity.body.velocity.x, y: 0 });
      constrained = true;
    }
    if (entity.y > this.worldBounds.maxY) {
      entity.y = this.worldBounds.maxY;
      Matter.Body.setPosition(entity.body, { x: entity.x, y: entity.y });
      Matter.Body.setVelocity(entity.body, { x: entity.body.velocity.x, y: 0 });
      constrained = true;
    }
  }

  /**
   * Spawn entities based on phase
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

    const params = this.phases.getSpawnParams();
    // Spawn 1-3 fish per interval, but respect entity limit
    const maxToSpawn = Math.min(3, this.maxEntities - this.entities.length);
    const spawnCount = Math.floor(Math.random() * maxToSpawn) + 1;
    
    for (let i = 0; i < spawnCount; i++) {
      const phaseConfig = this.phases.getCurrentConfig();
      const worldWidth = this.worldBounds.maxX - this.worldBounds.minX;
      const worldHeight = this.worldBounds.maxY - this.worldBounds.minY;

      // Spawn away from player but within visible range
      const angle = Math.random() * Math.PI * 2;
      // Spawn at a distance between 200-600 pixels from player (visible on screen)
      const distance = 200 + Math.random() * 400;
      let x = this.player.x + Math.cos(angle) * distance;
      let y = this.player.y + Math.sin(angle) * distance;
      
      // Clamp to world bounds
      x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, x));
      y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, y));

      const type = this.rng.pick(params.types);
      
      // Spawn fish both smaller and larger than player for variety
      const playerSize = this.player.stats.size;
      let size: number;
      if (Math.random() < 0.4) {
        // Smaller fish (prey)
        size = this.rng.randomFloat(playerSize * 0.3, playerSize * 0.8);
      } else if (Math.random() < 0.7) {
        // Similar size (competition)
        size = this.rng.randomFloat(playerSize * 0.8, playerSize * 1.3);
      } else {
        // Larger fish (predators)
        size = this.rng.randomFloat(playerSize * 1.3, playerSize * 2.5);
      }
      
      // Ensure minimum and maximum sizes
      size = Math.max(params.minSize, Math.min(params.maxSize, size));

      if (type === 'food') {
        const food = new Food(this.physics, { x, y, size: size * 0.3, type: 'food' });
        this.entities.push(food);
      } else {
        const fish = new Fish(this.physics, {
          x,
          y,
          size,
          type: type as 'prey' | 'predator',
          speed: this.rng.randomFloat(1, 3),
        });
        this.entities.push(fish);
      }
    }

    this.lastSpawnTime = now;
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
            entity.destroy(this.physics);
            this.createParticles(entity.x, entity.y, entity.color, 10);
            this.audio.playSound('bite', 0.3);
          }
        } else if (this.player.canEat(entity) && isPlayerFrontCollision) {
          // Player eats entity (only from front)
          this.player.eat(entity);
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
            // fish1 eats fish2
            fish1.size += fish2.size * 0.05; // Predators grow by eating
            fish2.destroy(this.physics);
            this.createParticles(fish2.x, fish2.y, fish2.color, 5);
          } else if (fish2.type === 'predator' && fish2.size >= fish1.size * 1.2 && fish2.isFrontCollision(fish1)) {
            // fish2 eats fish1
            fish2.size += fish1.size * 0.05; // Predators grow by eating
            fish1.destroy(this.physics);
            this.createParticles(fish1.x, fish1.y, fish1.color, 5);
          }
        }
      }
    }
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
   */
  async nextLevel(): Promise<void> {
    if (!this.player) return;

    // Increment level
    this.state.level += 1;
    
    // Reset level-specific state but keep player progress
    this.entities.forEach(e => e.destroy(this.physics));
    this.entities = [];
    this.particles = [];

    // Reset timer
    this.state.running = true;
    this.state.phase = 'playing';
    this.state.startTime = Date.now();
    this.state.currentTime = 0;
    this.lastSpawnTime = Date.now();

    // Make enemies slightly harder each level
    this.spawnInterval = Math.max(300, this.spawnInterval - 20);
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
    
    p5.text(`Essence: ${this.state.cachedEssence ?? 0}`, 10, 90);
    
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
