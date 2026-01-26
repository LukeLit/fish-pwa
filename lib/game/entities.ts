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
    
    // Sync position from physics body
    this.x = this.body.position.x;
    this.y = this.body.position.y;
  }

  destroy(physics: PhysicsEngine): void {
    this.alive = false;
    physics.removeBody(this.body);
  }

  abstract render(p5: p5): void;
}

export class Fish extends Entity {
  public targetX?: number;
  public targetY?: number;
  public wanderAngle: number = 0;

  constructor(physics: PhysicsEngine, data: EntityData, id?: string) {
    super(physics, data, id);
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number, physics: PhysicsEngine): void {
    super.update(deltaTime);

    if (!this.alive) return;

    // Simple AI: wander or move toward target
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
