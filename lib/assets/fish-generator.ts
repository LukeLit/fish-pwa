/**
 * Procedural fish generation
 * Can be enhanced with AI-generated base sprites
 */
import type p5 from 'p5';
import { SeededRNG } from '../game/procgen';

export interface FishShape {
  bodyPoints: Array<{ x: number; y: number }>;
  tailPoints: Array<{ x: number; y: number }>;
  finPoints: Array<{ x: number; y: number }>;
  color: string;
  size: number;
}

export class FishGenerator {
  private rng: SeededRNG;

  constructor(seed?: string) {
    this.rng = new SeededRNG(seed || Math.random().toString());
  }

  /**
   * Generate a procedural fish shape
   */
  generate(size: number, type: 'prey' | 'predator' | 'neutral' = 'neutral'): FishShape {
    const bodyLength = size * 2;
    const bodyWidth = size * 1.5;
    const tailSize = size * 0.8;

    // Generate body points using perlin-like noise
    const bodyPoints: Array<{ x: number; y: number }> = [];
    const numPoints = 8;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = (t - 0.5) * bodyLength;
      const noise = (this.rng.random() - 0.5) * 0.2;
      const y = Math.sin(t * Math.PI) * bodyWidth * 0.5 + noise * size;
      bodyPoints.push({ x, y });
    }

    // Generate tail
    const tailPoints: Array<{ x: number; y: number }> = [
      { x: -bodyLength * 0.5, y: 0 },
      { x: -bodyLength * 0.5 - tailSize, y: -tailSize * 0.6 },
      { x: -bodyLength * 0.5 - tailSize * 1.2, y: 0 },
      { x: -bodyLength * 0.5 - tailSize, y: tailSize * 0.6 },
    ];

    // Generate fins
    const finPoints: Array<{ x: number; y: number }> = [];
    const finCount = this.rng.randomInt(0, 3);
    for (let i = 0; i < finCount; i++) {
      const finX = this.rng.randomFloat(-bodyLength * 0.3, bodyLength * 0.3);
      const finY = this.rng.randomFloat(-bodyWidth * 0.4, bodyWidth * 0.4);
      finPoints.push({ x: finX, y: finY });
    }

    // Generate color based on type
    const color = this.generateColor(type);

    return {
      bodyPoints,
      tailPoints,
      finPoints,
      color,
      size,
    };
  }

  private generateColor(type: 'prey' | 'predator' | 'neutral'): string {
    const hue = this.rng.randomFloat(0, 360);
    const saturation = this.rng.randomFloat(40, 80);
    const lightness = this.rng.randomFloat(40, 70);

    switch (type) {
      case 'prey':
        return `hsl(${hue % 120}, ${saturation}%, ${lightness}%)`; // Greenish
      case 'predator':
        return `hsl(${(hue + 180) % 360}, ${saturation}%, ${lightness}%)`; // Reddish
      default:
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
  }

  /**
   * Render a fish shape using p5
   */
  render(p5: p5, shape: FishShape, x: number, y: number, angle: number): void {
    p5.push();
    p5.translate(x, y);
    p5.rotate(angle);

    // Body
    p5.fill(shape.color);
    p5.noStroke();
    p5.beginShape();
    shape.bodyPoints.forEach(point => {
      p5.vertex(point.x, point.y);
    });
    p5.endShape(p5.CLOSE);

    // Tail
    p5.beginShape();
    shape.tailPoints.forEach(point => {
      p5.vertex(point.x, point.y);
    });
    p5.endShape(p5.CLOSE);

    // Fins
    shape.finPoints.forEach(point => {
      p5.circle(point.x, point.y, shape.size * 0.3);
    });

    p5.pop();
  }
}
