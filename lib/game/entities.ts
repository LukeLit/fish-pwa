/**
 * Entity system for game objects
 */
import Matter from 'matter-js';
import type p5 from 'p5';
import { PhysicsEngine } from './physics';

export interface EntityData {
  x: number;
  y: number;
  size: number;
  type: 'prey' | 'predator' | 'food' | 'neutral';
  color?: string;
  speed?: number;
  stamina?: number;
  maxStamina?: number;
}

export abstract class Entity {
  public id: string;
  public x: number;
  public y: number;
  public size: number;
  public type: 'prey' | 'predator' | 'food' | 'neutral';
  public body: Matter.Body;
  public color: string;
  public speed: number;
  public alive: boolean = true;
  public age: number = 0;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public staminaRegenRate: number = 0.1; // stamina per millisecond
  public lastChompTime: number = 0;
  public chompCooldown: number = 500; // ms between chomps

  constructor(
    physics: PhysicsEngine,
    data: EntityData,
    id?: string
  ) {
    this.id = id || `entity_${Date.now()}_${Math.random()}`;
    this.x = data.x;
    this.y = data.y;
    this.size = data.size;
    this.type = data.type;
    this.color = data.color || this.getDefaultColor();
    this.speed = data.speed || 2;
    this.stamina = data.stamina ?? 100;
    this.maxStamina = data.maxStamina ?? 100;

    // Create physics body
    this.body = physics.createCircle(data.x, data.y, data.size, {
      isStatic: false,
      label: this.id,
    });
  }

  protected getDefaultColor(): string {
    switch (this.type) {
      case 'prey':
        return '#4ade80'; // green
      case 'predator':
        return '#ef4444'; // red
      case 'food':
        return '#fbbf24'; // yellow
      default:
        return '#60a5fa'; // blue
    }
  }

  update(deltaTime: number, physics?: PhysicsEngine): void {
    if (!this.alive) return;

    this.age += deltaTime;
    
    // Regenerate stamina over time
    this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * deltaTime);
    
    // Sync position from physics body
    this.x = this.body.position.x;
    this.y = this.body.position.y;
  }

  destroy(physics: PhysicsEngine): void {
    this.alive = false;
    physics.removeBody(this.body);
  }
  
  /**
   * Check if collision with another entity is from the front
   * Front is defined as the direction of movement
   */
  isFrontCollision(other: Entity): boolean {
    // Get velocity direction (angle of movement)
    const vel = this.body.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    
    // If not moving, no front collision
    if (speed < 0.1) return false;
    
    const movementAngle = Math.atan2(vel.y, vel.x);
    
    // Get angle to other entity
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const angleToOther = Math.atan2(dy, dx);
    
    // Calculate angle difference
    let angleDiff = Math.abs(movementAngle - angleToOther);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    // Front collision if angle difference is less than 90 degrees (PI/2)
    return angleDiff < Math.PI / 2;
  }
  
  /**
   * Chomp another entity (battle mechanic)
   */
  chomp(other: Entity): boolean {
    const now = Date.now();
    if (now - this.lastChompTime < this.chompCooldown) {
      return false; // On cooldown
    }
    
    if (this.stamina < 10) {
      return false; // Not enough stamina
    }
    
    // Deplete stamina from chomping
    this.stamina -= 10;
    other.stamina -= 15; // Target loses more stamina
    this.lastChompTime = now;
    
    return true;
  }

  abstract render(p5: p5): void;
}

export class Fish extends Entity {
  public targetX?: number;
  public targetY?: number;
  public wanderAngle: number = 0;
  public schoolingGroup?: string; // ID for schooling behavior

  constructor(physics: PhysicsEngine, data: EntityData, id?: string) {
    super(physics, data, id);
    this.wanderAngle = Math.random() * Math.PI * 2;
    // Prey fish get a schooling group ID based on their size
    if (this.type === 'prey') {
      this.schoolingGroup = `school_${Math.floor(data.size / 5)}`;
    }
  }

  update(deltaTime: number, physics: PhysicsEngine, allEntities?: Entity[], player?: Entity): void {
    super.update(deltaTime);

    if (!this.alive) return;

    const detectionRange = this.size * 10; // Detection range for AI
    let nearbyPrey: Fish[] = [];
    let nearbySchoolMates: Fish[] = [];
    let nearbyPredators: Fish[] = [];

    // Find nearby entities
    if (allEntities) {
      allEntities.forEach(entity => {
        if (entity === this || !entity.alive || !(entity instanceof Fish)) return;
        
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < detectionRange) {
          // Find prey (smaller fish)
          if (entity.size < this.size * 0.8) {
            nearbyPrey.push(entity);
          }
          // Find predators (larger fish)
          if (entity.size > this.size * 1.2) {
            nearbyPredators.push(entity);
          }
          // Find school mates (same type and size)
          if (this.type === 'prey' && entity.type === 'prey' && 
              this.schoolingGroup === entity.schoolingGroup) {
            nearbySchoolMates.push(entity);
          }
        }
      });
    }

    // Behavior based on type
    if (this.type === 'predator') {
      // Predator AI: hunt smaller fish or player
      let targetEntity: Entity | null = null;
      
      // Hunt nearby prey
      if (nearbyPrey.length > 0) {
        targetEntity = nearbyPrey.reduce((closest, fish) => {
          const d1 = Math.sqrt((fish.x - this.x) ** 2 + (fish.y - this.y) ** 2);
          const d2 = Math.sqrt((closest.x - this.x) ** 2 + (closest.y - this.y) ** 2);
          return d1 < d2 ? fish : closest;
        });
      } else if (player && player.size < this.size * 0.8) {
        // Hunt player if they're small enough
        const playerDist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
        if (playerDist < detectionRange) {
          targetEntity = player;
        }
      }

      if (targetEntity) {
        this.targetX = targetEntity.x;
        this.targetY = targetEntity.y;
      } else {
        // Wander if no prey
        this.targetX = undefined;
        this.targetY = undefined;
      }
    } else if (this.type === 'prey') {
      // Prey AI: school together and flee from predators
      
      // Flee from predators
      if (nearbyPredators.length > 0) {
        let fleeX = 0;
        let fleeY = 0;
        nearbyPredators.forEach(predator => {
          const dx = this.x - predator.x;
          const dy = this.y - predator.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            fleeX += dx / dist;
            fleeY += dy / dist;
          }
        });
        const magnitude = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
        if (magnitude > 0) {
          this.targetX = this.x + (fleeX / magnitude) * 100;
          this.targetY = this.y + (fleeY / magnitude) * 100;
        }
      } else if (nearbySchoolMates.length > 0) {
        // School with nearby fish of same type
        let avgX = 0;
        let avgY = 0;
        nearbySchoolMates.forEach(mate => {
          avgX += mate.x;
          avgY += mate.y;
        });
        avgX /= nearbySchoolMates.length;
        avgY /= nearbySchoolMates.length;
        
        // Move toward center of school
        this.targetX = avgX;
        this.targetY = avgY;
      } else {
        // Wander if alone
        this.targetX = undefined;
        this.targetY = undefined;
      }
    }

    // Movement logic
    if (this.targetX !== undefined && this.targetY !== undefined) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        const angle = Math.atan2(dy, dx);
        const forceX = Math.cos(angle) * this.speed * 0.01;
        const forceY = Math.sin(angle) * this.speed * 0.01;
        physics.applyForce(this.body, { x: forceX, y: forceY });
      }
    } else {
      // Wander behavior
      this.wanderAngle += (Math.random() - 0.5) * 0.1;
      const forceX = Math.cos(this.wanderAngle) * this.speed * 0.005;
      const forceY = Math.sin(this.wanderAngle) * this.speed * 0.005;
      physics.applyForce(this.body, { x: forceX, y: forceY });
    }

    // Limit velocity
    const maxVel = this.speed;
    if (Math.abs(this.body.velocity.x) > maxVel) {
      Matter.Body.setVelocity(this.body, {
        x: Math.sign(this.body.velocity.x) * maxVel,
        y: this.body.velocity.y,
      });
    }
    if (Math.abs(this.body.velocity.y) > maxVel) {
      Matter.Body.setVelocity(this.body, {
        x: this.body.velocity.x,
        y: Math.sign(this.body.velocity.y) * maxVel,
      });
    }
  }

  render(p5: p5): void {
    p5.push();
    p5.translate(this.x, this.y);
    p5.rotate(this.body.angle);

    // Simple fish shape
    p5.fill(this.color);
    p5.noStroke();
    
    // Body (ellipse)
    p5.ellipse(0, 0, this.size * 2, this.size * 1.5);
    
    // Tail
    p5.triangle(
      -this.size,
      0,
      -this.size * 1.5,
      -this.size * 0.5,
      -this.size * 1.5,
      this.size * 0.5
    );

    // Eye
    p5.fill(255);
    p5.circle(this.size * 0.3, -this.size * 0.2, this.size * 0.3);

    p5.pop();
  }
}

export class Food extends Entity {
  constructor(physics: PhysicsEngine, data: EntityData, id?: string) {
    super(physics, { ...data, type: 'food' }, id);
    this.size = Math.max(2, data.size); // Food is small
  }

  update(deltaTime: number, physics?: PhysicsEngine): void {
    super.update(deltaTime, physics);
    // Food doesn't move much, just drifts
  }

  render(p5: p5): void {
    p5.push();
    p5.fill(this.color);
    p5.noStroke();
    p5.circle(this.x, this.y, this.size * 2);
    p5.pop();
  }
}

export class EssenceOrb extends Entity {
  public essenceType: string;
  public essenceAmount: number;
  private pulseTime: number = 0;
  
  constructor(
    physics: PhysicsEngine, 
    x: number, 
    y: number, 
    essenceType: string = 'shallow',
    essenceAmount: number = 1
  ) {
    // Essence orbs are small, bright objects
    const orbColor = EssenceOrb.getEssenceColor(essenceType);
    super(physics, {
      x,
      y,
      size: 8,
      type: 'food', // Use 'food' type so they don't interact with AI
      color: orbColor,
      speed: 0,
    });
    
    this.essenceType = essenceType;
    this.essenceAmount = essenceAmount;
    
    // Make orb static (doesn't move)
    Matter.Body.setStatic(this.body, true);
  }
  
  static getEssenceColor(essenceType: string): string {
    const colors: Record<string, string> = {
      shallow: '#fbbf24', // gold/yellow
      deep_sea: '#1a237e', // deep blue
      tropical: '#10b981', // tropical green
      polluted: '#6b7280', // gray
      cosmic: '#8b5cf6', // purple
      demonic: '#ef4444', // red
      robotic: '#06b6d4', // cyan
    };
    return colors[essenceType] || '#fbbf24';
  }
  
  update(deltaTime: number, physics?: PhysicsEngine): void {
    super.update(deltaTime, physics);
    this.pulseTime += deltaTime * 0.003; // Slow pulse animation
  }
  
  render(p5: p5): void {
    p5.push();
    
    // Pulsing glow effect
    const pulse = 1 + Math.sin(this.pulseTime) * 0.3;
    const glowSize = this.size * 3 * pulse;
    
    // Outer glow
    p5.noStroke();
    p5.fill(this.color + '40'); // Semi-transparent
    p5.circle(this.x, this.y, glowSize);
    
    // Middle glow
    p5.fill(this.color + '80');
    p5.circle(this.x, this.y, this.size * 2 * pulse);
    
    // Core orb
    p5.fill(this.color);
    p5.circle(this.x, this.y, this.size * 1.5);
    
    // Bright center
    p5.fill(255, 255, 255, 200);
    p5.circle(this.x, this.y, this.size * 0.5);
    
    p5.pop();
  }
}
