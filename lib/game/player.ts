/**
 * Player fish entity
 */
import Matter from 'matter-js';
import type p5 from 'p5';
import { PhysicsEngine } from './physics';
import { Entity } from './entities';
import { FishGenerator, FishShape } from '../assets/fish-generator';
import { getAssetManager } from '../ai/asset-manager';

// Hunger system constants
const HUNGER_RESTORE_MULTIPLIER = 0.3; // 30% of fish size

export interface PlayerStats {
  size: number;
  maxSize: number;
  score: number;
  speed: number;
  growthMultiplier: number;
  hunger: number;
  hungerDrainRate: number;
}

export class Player extends Entity {
  public stats: PlayerStats;
  public keys: { [key: string]: boolean } = {};
  public growthTarget: number = 10;
  public mutations: string[] = [];
  private fishGenerator: FishGenerator;
  private fishShape: FishShape | null = null;
  private sprite: p5.Image | null = null;
  private useSprite: boolean = false;
  private assetManager = getAssetManager();

  constructor(physics: PhysicsEngine, x: number, y: number, initialSize: number = 10) {
    super(physics, {
      x,
      y,
      size: initialSize,
      type: 'neutral',
      color: '#3b82f6',
      speed: 3,
    });

    this.stats = {
      size: initialSize,
      maxSize: initialSize,
      score: 0,
      speed: 3,
      growthMultiplier: 1,
      hunger: 100,
      hungerDrainRate: 1.5,
    };

    // Initialize fish generator with a seed based on player ID
    this.fishGenerator = new FishGenerator(`player_${Date.now()}`);
    this.fishShape = this.fishGenerator.generate(initialSize, 'neutral');

    // Make player body larger
    Matter.Body.scale(this.body, initialSize / 10, initialSize / 10);

    // Try to load AI-generated sprite in background
    this.loadAISprite();
  }

  /**
   * Load AI-generated sprite if available
   */
  private async loadAISprite(): Promise<void> {
    try {
      const asset = await this.assetManager.getFishAsset({
        type: this.mutations.length > 0 ? 'mutant' : 'prey',
        size: this.stats.size,
        mutations: this.mutations,
        seed: `player_${this.id}`,
      });

      if (asset.modelUrl && asset.useAI) {
        // For now, AI assets return URLs to 3D models
        // We'll use procedural shapes until we implement 3D rendering
        console.log('AI model available:', asset.modelUrl);
      }

      if (asset.shape) {
        // Use procedural shape
        this.fishShape = asset.shape;
        this.useSprite = false;
      }
    } catch (error) {
      console.warn('Failed to load AI sprite, using procedural:', error);
      // Keep using procedural shape
    }
  }

  handleKeyDown(key: string): void {
    this.keys[key.toLowerCase()] = true;
  }

  handleKeyUp(key: string): void {
    this.keys[key.toLowerCase()] = false;
  }

  update(deltaTime: number, physics: PhysicsEngine): void {
    super.update(deltaTime);

    // Update hunger (drain over time)
    this.stats.hunger = Math.max(0, this.stats.hunger - (this.stats.hungerDrainRate * deltaTime / 1000));

    // Handle movement input
    const moveSpeed = this.stats.speed * 0.02;
    let forceX = 0;
    let forceY = 0;

    if (this.keys['w'] || this.keys['arrowup']) {
      forceY -= moveSpeed;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      forceY += moveSpeed;
    }
    if (this.keys['a'] || this.keys['arrowleft']) {
      forceX -= moveSpeed;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      forceX += moveSpeed;
    }

    if (forceX !== 0 || forceY !== 0) {
      physics.applyForce(this.body, { x: forceX, y: forceY });
    }

    // Limit velocity
    const maxVel = this.stats.speed;
    const vel = this.body.velocity;
    if (Math.abs(vel.x) > maxVel || Math.abs(vel.y) > maxVel) {
      const angle = Math.atan2(vel.y, vel.x);
      physics.setVelocity(this.body, {
        x: Math.cos(angle) * maxVel,
        y: Math.sin(angle) * maxVel,
      });
    }

    // Update size if grown
    if (this.stats.size !== this.size) {
      const scale = this.stats.size / this.size;
      Matter.Body.scale(this.body, scale, scale);
      this.size = this.stats.size;
      
      // Regenerate fish shape for new size
      this.fishShape = this.fishGenerator.generate(this.stats.size, 'neutral');
      
      // Try to reload AI sprite for new size
      if (this.mutations.length > 0 || this.stats.size > 20) {
        this.loadAISprite();
      }
    }
  }

  grow(amount: number): void {
    const newSize = this.stats.size + amount * this.stats.growthMultiplier;
    this.stats.size = newSize;
    this.stats.maxSize = Math.max(this.stats.maxSize, newSize);
    this.stats.score += Math.floor(amount * 10);
  }

  eat(entity: Entity): void {
    // Calculate growth based on entity size
    const growthAmount = entity.size * 0.1;
    this.grow(growthAmount);
    
    // Restore hunger based on entity size
    const hungerRestore = Math.min(entity.size * HUNGER_RESTORE_MULTIPLIER, 100 - this.stats.hunger);
    this.stats.hunger = Math.min(100, this.stats.hunger + hungerRestore);
  }

  isStarving(): boolean {
    return this.stats.hunger <= 0;
  }

  canEat(entity: Entity): boolean {
    // Can eat if player is at least 1.2x larger
    return this.stats.size >= entity.size * 1.2;
  }

  isEatenBy(entity: Entity): boolean {
    // Can be eaten if entity is at least 1.2x larger
    return entity.size >= this.stats.size * 1.2;
  }

  addMutation(mutationId: string): void {
    if (!this.mutations.includes(mutationId)) {
      this.mutations.push(mutationId);
      // Reload sprite with mutations
      this.loadAISprite();
    }
  }

  render(p5: p5): void {
    p5.push();
    p5.translate(this.x, this.y);
    
    const angle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
    p5.rotate(angle);

    // Use AI sprite if available
    if (this.useSprite && this.sprite) {
      p5.imageMode(p5.CENTER);
      const spriteSize = this.size * 2.5;
      p5.image(this.sprite, 0, 0, spriteSize, spriteSize * 0.6);
      
      // Add mutation glow effect
      if (this.mutations.length > 0) {
        p5.push();
        p5.noFill();
        p5.stroke(255, 200, 0, 150);
        p5.strokeWeight(3);
        p5.circle(0, 0, spriteSize * 1.1);
        p5.pop();
      }
    } else if (this.fishShape) {
      // Use procedural fish shape (much better than basic ellipse)
      this.fishGenerator.render(p5, this.fishShape, 0, 0, 0);
      
      // Add eye detail
      p5.fill(255);
      p5.noStroke();
      const eyeX = this.size * 0.6;
      const eyeY = -this.size * 0.3;
      p5.circle(eyeX, eyeY, this.size * 0.4);
      p5.fill(0);
      p5.circle(eyeX + this.size * 0.1, eyeY, this.size * 0.2);
      
      // Add mutation glow
      if (this.mutations.length > 0) {
        p5.push();
        p5.noFill();
        p5.stroke(255, 200, 0, 150);
        p5.strokeWeight(2);
        p5.circle(0, 0, this.size * 2.5);
        p5.pop();
      }
    } else {
      // Fallback: improved basic fish (better than before)
      p5.push();
      
      // Body with gradient-like effect
      p5.fill(this.color);
      p5.stroke(255, 200);
      p5.strokeWeight(1.5);
      p5.ellipse(0, 0, this.size * 2.2, this.size * 1.6);
      
      // Tail with better shape
      p5.beginShape();
      p5.vertex(-this.size * 1.0, 0);
      p5.vertex(-this.size * 1.8, -this.size * 0.7);
      p5.vertex(-this.size * 2.2, 0);
      p5.vertex(-this.size * 1.8, this.size * 0.7);
      p5.endShape(p5.CLOSE);
      
      // Dorsal fin
      p5.triangle(
        this.size * 0.2,
        -this.size * 0.8,
        this.size * 0.5,
        -this.size * 1.2,
        this.size * 0.8,
        -this.size * 0.8
      );
      
      // Eye
      p5.fill(255);
      p5.noStroke();
      p5.circle(this.size * 0.5, -this.size * 0.3, this.size * 0.4);
      p5.fill(0);
      p5.circle(this.size * 0.6, -this.size * 0.3, this.size * 0.2);
      
      // Mutation indicator
      if (this.mutations.length > 0) {
        p5.fill(255, 200, 0, 200);
        p5.noStroke();
        p5.circle(0, -this.size * 1.3, this.size * 0.6);
      }
      
      p5.pop();
    }

    p5.pop();
  }
}
