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
const CARCASS_DRIFT_SPEED = 0.035; // slow upward float
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
  // Slow drift: upward bias, slight random horizontal
  const vx = (Math.random() - 0.5) * CARCASS_DRIFT_SPEED * 0.8;
  const vy = -CARCASS_DRIFT_SPEED * (0.8 + Math.random() * 0.4);
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

    // Apply drift (slow float)
    c.x += c.vx;
    c.y += c.vy;

    // If all chunks collected, start immediate fade
    if (c.remainingChunks <= 0) {
      c.opacity -= 0.02; // ~1 second at 60fps
      return c.opacity > 0;
    }

    // Time-based decay
    if (age >= CARCASS_DECAY_TIME) {
      return false; // expired
    }

    // Fade in last CARCASS_FADE_DURATION ms
    const fadeStart = CARCASS_DECAY_TIME - CARCASS_FADE_DURATION;
    if (age > fadeStart) {
      c.opacity = Math.max(0, 1 - (age - fadeStart) / CARCASS_FADE_DURATION);
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
  for (const c of carcasses) {
    ctx.save();
    ctx.globalAlpha = c.opacity * 0.8; // carcasses are slightly translucent

    if (carcassSprite) {
      // Draw the cached sprite - preserve natural aspect ratio (like fish rendering)
      const aspect = carcassSprite.height / carcassSprite.width;
      const w = c.size;
      const h = c.size * aspect;
      ctx.drawImage(carcassSprite, c.x - w / 2, c.y - h / 2, w, h);
    } else {
      // Placeholder: dark oval
      ctx.fillStyle = CARCASS_TINT_COLOR;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.size * 0.5, c.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // X mark
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.6)';
      ctx.lineWidth = 2;
      const s = c.size * 0.15;
      ctx.beginPath();
      ctx.moveTo(c.x - s, c.y - s);
      ctx.lineTo(c.x + s, c.y + s);
      ctx.moveTo(c.x + s, c.y - s);
      ctx.lineTo(c.x - s, c.y + s);
      ctx.stroke();
    }

    ctx.restore();
  }
}
