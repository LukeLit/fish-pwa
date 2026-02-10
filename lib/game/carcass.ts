/**
 * Carcass System
 * Manages carcass entities: spawning on death, decay, fade, rendering.
 * A carcass lingers at the death site while essence chunks scatter outward.
 * Once all chunks are collected (or decay timer expires), the carcass fades.
 */

import type { CarcassEntity } from './canvas-state';
import { removeBackground, DEFAULT_CHROMA_TOLERANCE } from '@/lib/rendering/fish-renderer';

// --- Constants ---
const CARCASS_DECAY_TIME = 45_000; // 45 seconds total lifespan
const CARCASS_FADE_DURATION = 2_000; // fade over final 2 seconds
const CARCASS_DRIFT_SPEED = 0.035; // slow downward float (sinks)
const CARCASS_TINT_COLOR = 'rgba(80, 60, 60, 0.4)';

// --- Sprite cache ---
let carcassSprite: HTMLCanvasElement | null = null;

/**
 * Clear the cached carcass sprite (call when sprites refresh).
 */
export function clearCarcassSpriteCache(): void {
  carcassSprite = null;
}

/**
 * Preload the carcass sprite from IndexedDB or generate a placeholder.
 */
export async function preloadCarcassSprite(): Promise<void> {
  try {
    // Try loading from IndexedDB shared sprites (Sprite Lab saves as 'carcass')
    const { getSharedSprite } = await import('@/lib/storage/sprite-lab-db');
    let blob = await getSharedSprite('carcass');
    if (!blob) blob = await getSharedSprite('carcass-default');
    if (blob) {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          carcassSprite = removeBackground(img, DEFAULT_CHROMA_TOLERANCE);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load carcass sprite'));
        };
        img.src = url;
      });
    }
  } catch {
    // No saved sprite — will use placeholder
  }
}

/**
 * Spawn a carcass entity at a death position.
 */
export function spawnCarcass(
  x: number,
  y: number,
  size: number,
  chunkCount: number
): CarcassEntity {
  // Slow drift: downward sink, slight random horizontal
  const vx = (Math.random() - 0.5) * CARCASS_DRIFT_SPEED * 0.8;
  const vy = CARCASS_DRIFT_SPEED * (0.8 + Math.random() * 0.4);
  return {
    carcassId: `carcass-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x,
    y,
    vx,
    vy,
    size,
    spawnTime: performance.now(),
    opacity: 1,
    remainingChunks: chunkCount,
    bobPhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Decrement remaining chunks for a carcass (called when a chunk is collected).
 */
export function decrementCarcassChunks(
  carcasses: CarcassEntity[],
  carcassId: string
): void {
  const c = carcasses.find((car) => car.carcassId === carcassId);
  if (c) c.remainingChunks = Math.max(0, c.remainingChunks - 1);
}

/**
 * Update all carcasses: handle decay, fade, removal.
 * Returns the filtered array (removes fully decayed carcasses).
 */
export function updateCarcasses(carcasses: CarcassEntity[]): CarcassEntity[] {
  const now = performance.now();
  return carcasses.filter((c) => {
    const age = now - c.spawnTime;

    // Apply drift (slow sink)
    c.x += c.vx;
    c.y += c.vy;

    // Sine-based underwater bob (slow, gentle)
    const phase = (c.bobPhase ?? 0) + (now / 3200) * Math.PI * 2;
    c.x += Math.sin(phase * 0.6) * 0.4;
    c.y += Math.sin(phase) * 0.5;

    // If all chunks collected, start immediate fade
    if (c.remainingChunks <= 0) {
      c.opacity -= 0.02; // ~1 second at 60fps
      return c.opacity > 0;
    }

    // Time-based decay
    if (age >= CARCASS_DECAY_TIME) {
      return false; // expired
    }

    // Gradual fade over lifetime: start fading after spawn, reach 0 at decay
    const fadeStart = 3_000; // stay visible for 3s, then fade
    if (age > fadeStart) {
      c.opacity = Math.max(0, 1 - (age - fadeStart) / (CARCASS_DECAY_TIME - fadeStart));
    }

    return c.opacity > 0;
  });
}

/**
 * Draw all carcasses.
 */
export function drawCarcasses(
  ctx: CanvasRenderingContext2D,
  carcasses: CarcassEntity[]
): void {
  const now = performance.now();
  for (const c of carcasses) {
    const phase = (c.bobPhase ?? 0) + (now / 4200) * Math.PI * 2;
    const rotation = Math.sin(phase * 0.4) * 0.12;
    const bobY = Math.sin(phase * 1.1) * 4;

    ctx.save();
    ctx.globalAlpha = c.opacity * 0.8; // carcasses are slightly translucent
    ctx.translate(c.x, c.y + bobY);
    ctx.rotate(rotation);

    if (carcassSprite) {
      const aspect = carcassSprite.height / carcassSprite.width;
      const w = c.size;
      const h = c.size * aspect;
      ctx.drawImage(carcassSprite, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = CARCASS_TINT_COLOR;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.size * 0.5, c.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(200, 50, 50, 0.6)';
      ctx.lineWidth = 2;
      const s = c.size * 0.15;
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, s);
      ctx.moveTo(s, -s);
      ctx.lineTo(-s, s);
      ctx.stroke();
    }

    ctx.restore();
  }
}
