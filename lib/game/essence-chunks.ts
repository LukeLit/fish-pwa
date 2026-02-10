/**
 * Essence Chunk System
 * Manages collectible essence chunks that scatter from dead fish.
 * Chunks decelerate, can be collected by the player, and link back to carcasses.
 */

import type { ChunkEntity, PlayerEntity } from './canvas-state';
import { getHeadEllipseResolved } from './canvas-collision';

// --- Constants ---
const CHUNK_SCATTER_SPEED = 2.5; // initial scatter velocity
const CHUNK_FRICTION = 0.96; // deceleration per frame
const CHUNK_LIFETIME = 30_000; // 30 seconds before despawn
const CHUNK_FADE_DURATION = 2_000;
const CHUNK_COLLECTION_RADIUS_MULT = 1.5; // collect within 1.5x head radius
const CHUNK_MIN_SIZE = 8;
const CHUNK_MAX_SIZE = 16;

// --- Sprite cache ---
const chunkSprites = new Map<string, HTMLCanvasElement>();

/**
 * Clear all cached chunk sprites (call when sprites refresh).
 */
export function clearChunkSpriteCache(): void {
  chunkSprites.clear();
}

/**
 * Preload chunk sprites from IndexedDB.
 */
export async function preloadChunkSprites(): Promise<void> {
  try {
    const { getSharedSprite } = await import('@/lib/storage/sprite-lab-db');
    const keys = ['chunk-essence-default', 'chunk-meat-default'];
    for (const key of keys) {
      const blob = await getSharedSprite(key);
      if (blob) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            chunkSprites.set(key, c);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          img.src = url;
        });
      }
    }
  } catch {
    // No saved sprites — will use placeholder
  }
}

/**
 * Spawn essence chunks from a dead fish.
 * Returns an array of ChunkEntity.
 */
export function spawnChunksFromFish(
  fishX: number,
  fishY: number,
  fishSize: number,
  essenceTypes: { type: string; baseYield: number }[] | undefined,
  carcassId: string
): ChunkEntity[] {
  const chunks: ChunkEntity[] = [];

  // Always spawn at least 2 chunks (meat chunks if no essence types)
  const types =
    essenceTypes && essenceTypes.length > 0
      ? essenceTypes
      : [{ type: 'generic', baseYield: Math.ceil(fishSize / 10) }];

  for (const et of types) {
    // Spawn 1-3 chunks per essence type based on yield
    const count = Math.max(1, Math.min(3, Math.ceil(et.baseYield / 5)));
    const amountPerChunk = Math.max(1, Math.round(et.baseYield / count));

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const speed = CHUNK_SCATTER_SPEED * (0.7 + Math.random() * 0.6);

      chunks.push({
        chunkId: `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        x: fishX + (Math.random() - 0.5) * fishSize * 0.3,
        y: fishY + (Math.random() - 0.5) * fishSize * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        essenceType: et.type,
        essenceAmount: amountPerChunk,
        carcassId,
        spawnTime: performance.now(),
        size: CHUNK_MIN_SIZE + Math.random() * (CHUNK_MAX_SIZE - CHUNK_MIN_SIZE),
      });
    }
  }

  return chunks;
}

/**
 * Update all chunks: apply friction, handle lifetime/fade.
 * Returns the filtered array (removes expired chunks).
 */
export function updateChunks(chunks: ChunkEntity[], deltaTime: number): ChunkEntity[] {
  const now = performance.now();
  return chunks.filter((chunk) => {
    // Apply friction
    const friction = Math.pow(CHUNK_FRICTION, deltaTime);
    chunk.vx *= friction;
    chunk.vy *= friction;

    // Move
    chunk.x += chunk.vx * deltaTime;
    chunk.y += chunk.vy * deltaTime;

    // Lifetime
    const age = now - chunk.spawnTime;
    if (age >= CHUNK_LIFETIME) return false;

    return true;
  });
}

/**
 * Check if the player collects any chunks.
 * Returns collected chunks (removed from the input array in-place).
 */
export function checkChunkCollection(
  chunks: ChunkEntity[],
  player: PlayerEntity
): ChunkEntity[] {
  const collected: ChunkEntity[] = [];
  const playerHead = getHeadEllipseResolved(player);
  const playerR = Math.max(playerHead.rx, playerHead.ry) * CHUNK_COLLECTION_RADIUS_MULT;

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    const dx = chunk.x - playerHead.cx;
    const dy = chunk.y - playerHead.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < playerR + chunk.size * 0.5) {
      collected.push(chunk);
      chunks.splice(i, 1);
    }
  }

  return collected;
}

/**
 * Draw all essence chunks.
 */
export function drawChunks(
  ctx: CanvasRenderingContext2D,
  chunks: ChunkEntity[]
): void {
  const now = performance.now();

  for (const chunk of chunks) {
    const age = now - chunk.spawnTime;

    // Fade near end of life
    let alpha = 1;
    const fadeStart = CHUNK_LIFETIME - CHUNK_FADE_DURATION;
    if (age > fadeStart) {
      alpha = Math.max(0, 1 - (age - fadeStart) / CHUNK_FADE_DURATION);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const spriteKey = `chunk-${chunk.essenceType === 'generic' ? 'meat' : 'essence'}-default`;
    const sprite = chunkSprites.get(spriteKey);

    if (sprite) {
      ctx.drawImage(
        sprite,
        chunk.x - chunk.size / 2,
        chunk.y - chunk.size / 2,
        chunk.size,
        chunk.size
      );
    } else {
      // Placeholder: colored circle
      const color = getChunkColor(chunk.essenceType);

      // Glow
      ctx.beginPath();
      ctx.arc(chunk.x, chunk.y, chunk.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = color + '40'; // low alpha glow
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(chunk.x, chunk.y, chunk.size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(
        chunk.x - chunk.size * 0.1,
        chunk.y - chunk.size * 0.1,
        chunk.size * 0.12,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    }

    ctx.restore();
  }
}

function getChunkColor(essenceType: string): string {
  switch (essenceType) {
    case 'generic':
    case 'meat':
      return '#e06050';
    case 'fire':
      return '#ff6622';
    case 'ice':
      return '#66ccff';
    case 'electric':
      return '#ffee44';
    case 'shadow':
      return '#8844cc';
    case 'nature':
      return '#44cc66';
    default:
      return '#ccaa44';
  }
}
