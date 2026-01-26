/**
 * Matter.js physics wrapper
 */
import Matter from 'matter-js';

export class PhysicsEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  public render?: Matter.Render;

  constructor() {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    
    // Set gravity to simulate underwater feel
    this.engine.world.gravity.y = 0.1;
    this.engine.world.gravity.scale = 0.001;
  }

  /**
   * Update physics simulation
   */
  update(deltaTime: number): void {
    Matter.Engine.update(this.engine, deltaTime);
  }

  /**
   * Create a circular body
   */
  createCircle(x: number, y: number, radius: number, options?: Matter.IBodyDefinition): Matter.Body {
    const body = Matter.Bodies.circle(x, y, radius, {
      frictionAir: 0.1,
      restitution: 0.3,
      ...options,
    });
    Matter.World.add(this.world, body);
    return body;
  }

  /**
   * Create a rectangular body
   */
  createRectangle(x: number, y: number, width: number, height: number, options?: Matter.IBodyDefinition): Matter.Body {
    const mergedOptions = {
      frictionAir: 0.1,
      restitution: 0.3,
      ...options,
    };
    // Remove null chamfer if present
    if ('chamfer' in mergedOptions && mergedOptions.chamfer === null) {
      delete mergedOptions.chamfer;
    }
    const body = Matter.Bodies.rectangle(x, y, width, height, mergedOptions as Matter.IChamferableBodyDefinition);
    Matter.World.add(this.world, body);
    return body;
  }

  /**
   * Remove a body from the world
   */
  removeBody(body: Matter.Body): void {
    Matter.World.remove(this.world, body);
  }

  /**
   * Check collision between two bodies
   */
  checkCollision(bodyA: Matter.Body, bodyB: Matter.Body): boolean {
    return Matter.Collision.collides(bodyA, bodyB) !== null;
  }

  /**
   * Get bodies in a region
   */
  queryRegion(x: number, y: number, width: number, height: number): Matter.Body[] {
    return Matter.Query.region(this.world.bodies, {
      min: { x: x - width / 2, y: y - height / 2 },
      max: { x: x + width / 2, y: y + height / 2 },
    });
  }

  /**
   * Apply force to a body
   */
  applyForce(body: Matter.Body, force: { x: number; y: number }): void {
    Matter.Body.applyForce(body, body.position, force);
  }

  /**
   * Set velocity of a body
   */
  setVelocity(body: Matter.Body, velocity: { x: number; y: number }): void {
    Matter.Body.setVelocity(body, velocity);
  }

  /**
   * Clean up
   */
  destroy(): void {
    Matter.Engine.clear(this.engine);
  }
}
