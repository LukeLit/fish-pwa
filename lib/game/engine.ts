/**
 * Main game engine
 */
import p5 from 'p5';
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

export interface GameState {
  running: boolean;
  paused: boolean;
  score: number;
  startTime: number;
  currentTime: number;
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
    score: 0,
    startTime: 0,
    currentTime: 0,
  };

  private camera: { x: number; y: number } = { x: 0, y: 0 };
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 1000; // ms
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
  private audio = getAudioManager();
  private fxhash = getFxhash();

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
    // Start game asynchronously
    this.start().catch(err => {
      console.error('Failed to start game:', err);
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
      score: 0,
      startTime: Date.now(),
      currentTime: 0,
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

    // Update physics
    this.physics.update(deltaTime);

    // Update player
    this.player.update(deltaTime, this.physics);
    this.state.score = this.player.stats.score;

    // Update camera to follow player
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
        entity.update(deltaTime, this.physics);
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
   * Spawn entities based on phase
   */
  private spawnEntities(): void {
    if (!this.p5Instance || !this.player) return;

    const now = Date.now();
    if (now - this.lastSpawnTime < this.spawnInterval) return;

    const params = this.phases.getSpawnParams();
    if (Math.random() < params.rate) {
      const phaseConfig = this.phases.getCurrentConfig();
      const worldWidth = this.p5Instance.width * 2;
      const worldHeight = this.p5Instance.height * 2;

      // Spawn away from player
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.max(worldWidth, worldHeight) * 0.4;
      const x = this.player.x + Math.cos(angle) * distance;
      const y = this.player.y + Math.sin(angle) * distance;

      const type = this.rng.pick(params.types);
      const size = this.rng.randomFloat(params.minSize, params.maxSize);

      if (type === 'food') {
        const food = new Food(this.physics, { x, y, size, type: 'food' });
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
        if (this.player.canEat(entity)) {
          // Player eats entity
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
        } else if (this.player.isEatenBy(entity)) {
          // Player is eaten - run async endGame
          this.endGame().catch(err => {
            console.error('Failed to end game:', err);
          });
        }
      }
    });
  }

  /**
   * Check if player should die
   */
  private checkDeath(): void {
    if (!this.player || !this.p5Instance) return;

    // Die if too small (edge case)
    if (this.player.stats.size < 1) {
      this.endGame().catch(err => {
        console.error('Failed to end game:', err);
      });
    }
  }

  /**
   * End game and calculate rewards
   */
  async endGame(): Promise<void> {
    if (!this.player || !this.state.running) return;

    this.state.running = false;

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
    
    this.audio.playSound('death', 0.5);

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

    // Background
    p5.background(phaseConfig.backgroundColor);

    // Translate to camera
    p5.push();
    p5.translate(p5.width / 2 - this.camera.x, p5.height / 2 - this.camera.y);

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
    p5.text(`Phase: ${this.phases.getCurrentConfig().name}`, 10, 50);
    p5.text(`Essence: ${this.state.cachedEssence ?? 0}`, 10, 70);

    // Mutations
    const activeMutations = this.mutations.getActiveMutations();
    if (activeMutations.length > 0) {
      p5.text(`Mutations: ${activeMutations.map(m => m.name).join(', ')}`, 10, 90);
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
