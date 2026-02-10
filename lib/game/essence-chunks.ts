/**
 * Essence Chunk System
 * Manages collectible chunks (meat + essence) that scatter from dead fish.
 * Meat chunks grant growth and hunger; essence chunks grant essence only.
 * Chunks decelerate, bob slowly, and link back to carcasses.
 */

import type { ChunkEntity, PlayerEntity } from './canvas-state';
import { getHeadEllipseResolved } from './canvas-collision';
import { COLLISION } from './canvas-constants';
import { HUNGER_RESTORE_MULTIPLIER } from './hunger-constants';
import { samplePointInsideEllipse, type Ellipse } from './ellipse-collision';

// --- Constants ---
const CHUNK_SCATTER_SPEED = 1.0; // initial scatter velocity (reduced for tighter spread)
const CHUNK_FRICTION = 0.96; // deceleration per frame
const CHUNK_DRIFT_SPEED = 0.025; // slow upward bob like carcass
const CHUNK_LIFETIME = 30_000; // 30 seconds before despawn
const CHUNK_FADE_DURATION = 2_000;
const CHUNK_COLLECTION_RADIUS_MULT = 1.5; // collect within 1.5x head radius
const CHUNK_COLLECTION_DELAY_MS = 500; // chunks visible for this long before collectible (teach mechanic)
const CHUNK_MIN_SIZE = 16;
const CHUNK_MAX_SIZE = 26;
const CHUNK_SIZE_FISH_RATIO = 0.45; // chunk size = fishSize * this (clamped to min/max)
const CHUNK_SPAWN_OFFSET = 0.15; // position variance (fishSize * this) — reduced spread
const MEAT_CHUNK_COUNT = 3; // fixed count so fish always drop same amount
const MEAT_CHUNK_GROWTH_MULTIPLIER = 0.6; // Reduce vs pre-combat; tune to target ~45–55 size after 1-1

// --- Sprite cache ---
const chunkSprites = new Map<string, HTMLCanvasElement>();

/**
 * Clear all cached chunk sprites (call when sprites refresh).
 */
export function clearChunkSpriteCache(): void {
  chunkSprites.clear();
}

/**
 * Preload chunk sprites from IndexedDB (Sprite Lab keys).
 * Applies chroma removal and aspect-ratio preservation like fish/carcasses.
 */
export async function preloadChunkSprites(
  chromaTolerance?: number
): Promise<void> {
  try {
    const { getSharedSprite } = await import('@/lib/storage/sprite-lab-db');
    const { removeBackground, DEFAULT_CHROMA_TOLERANCE } = await import(
      '@/lib/rendering/fish-renderer'
    );
    const { getAllEssenceTypes } = await import('./data/essence-types');

    const tolerance = chromaTolerance ?? DEFAULT_CHROMA_TOLERANCE;

    // Meat: try meatChunk, then meatOrb as fallback
    let meatBlob = await getSharedSprite('meatChunk');
    if (!meatBlob) meatBlob = await getSharedSprite('meatOrb');
    if (meatBlob) {
      const img = new Image();
      const url = URL.createObjectURL(meatBlob);
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const processed = removeBackground(img, tolerance);
          chunkSprites.set('meat', processed);
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

    // Essence: load per essence type (essence_${id})
    for (const et of getAllEssenceTypes()) {
      const blob = await getSharedSprite(`essence_${et.id}`);
      if (blob) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const processed = removeBackground(img, tolerance);
            chunkSprites.set(`essence_${et.id}`, processed);
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

function samplePointInSilhouette(bodyEllipse?: Ellipse, headEllipse?: Ellipse, fallback: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  if (!bodyEllipse && !headEllipse) return fallback;
  if (bodyEllipse && !headEllipse) return samplePointInsideEllipse(bodyEllipse);
  if (!bodyEllipse && headEllipse) return samplePointInsideEllipse(headEllipse);
  // Both: 70% body, 30% head for silhouette shape
  return Math.random() < 0.7
    ? samplePointInsideEllipse(bodyEllipse!)
    : samplePointInsideEllipse(headEllipse!);
}

/**
 * Spawn meat chunks from a dead fish.
 * Returns an array of ChunkEntity with chunkKind 'meat'.
 * Total growth matches pre-refactor eating: fishSize * SIZE_GAIN_RATIO * efficiencyMult, split across chunks.
 * If bodyEllipse (and optionally headEllipse) is provided, chunks spawn inside the fish silhouette.
 */
export function spawnMeatChunksFromFish(
  fishX: number,
  fishY: number,
  fishSize: number,
  eaterSize: number,
  carcassId: string,
  bodyEllipse?: Ellipse,
  headEllipse?: Ellipse
): ChunkEntity[] {
  const chunks: ChunkEntity[] = [];

  const sizeRatio = eaterSize / fishSize;
  const efficiencyMult = Math.max(
    COLLISION.MIN_EFFICIENCY,
    1 / (1 + sizeRatio * COLLISION.EFFICIENCY_RATIO)
  );
  const totalGrowth = fishSize * COLLISION.SIZE_GAIN_RATIO * efficiencyMult * MEAT_CHUNK_GROWTH_MULTIPLIER;
  const count = MEAT_CHUNK_COUNT;
  const growthPerChunk = Math.max(0.1, totalGrowth / count);

  // Hunger: gentler diminishing returns (HUNGER_MIN_EFFICIENCY > MIN_EFFICIENCY)
  const hungerEfficiencyMult = Math.max(
    COLLISION.HUNGER_MIN_EFFICIENCY,
    1 / (1 + sizeRatio * COLLISION.EFFICIENCY_RATIO)
  );
  const hungerPerChunk = (fishSize * HUNGER_RESTORE_MULTIPLIER * hungerEfficiencyMult) / count;

  // Chunk visual size scales with fish size (clamped to min/max)
  const baseChunkSize = Math.max(
    CHUNK_MIN_SIZE,
    Math.min(CHUNK_MAX_SIZE, fishSize * CHUNK_SIZE_FISH_RATIO)
  );
  const chunkSizeVariance = baseChunkSize * 0.2;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = CHUNK_SCATTER_SPEED * (0.8 + Math.random() * 0.4);

    const pos = samplePointInSilhouette(bodyEllipse, headEllipse, {
      x: fishX + (Math.random() - 0.5) * fishSize * CHUNK_SPAWN_OFFSET,
      y: fishY + (Math.random() - 0.5) * fishSize * CHUNK_SPAWN_OFFSET,
    });

    chunks.push({
      chunkId: `chunk-meat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      chunkKind: 'meat',
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      growthAmount: growthPerChunk,
      hungerRestore: hungerPerChunk,
      carcassId,
      spawnTime: performance.now(),
      size: Math.max(CHUNK_MIN_SIZE, Math.min(CHUNK_MAX_SIZE, baseChunkSize + (Math.random() - 0.5) * chunkSizeVariance)),
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  return chunks;
}

/**
 * Spawn essence chunks from a dead fish (only when fish has essenceTypes).
 * Returns an array of ChunkEntity with chunkKind 'essence' — no growth, essence only.
 * If bodyEllipse (and optionally headEllipse) is provided, chunks spawn inside the fish silhouette.
 */
export function spawnEssenceChunksFromFish(
  fishX: number,
  fishY: number,
  fishSize: number,
  essenceTypes: { type: string; baseYield: number }[] | undefined,
  carcassId: string,
  bodyEllipse?: Ellipse,
  headEllipse?: Ellipse
): ChunkEntity[] {
  const chunks: ChunkEntity[] = [];

  if (!essenceTypes || essenceTypes.length === 0) return chunks;

  const baseChunkSize = Math.max(
    CHUNK_MIN_SIZE,
    Math.min(CHUNK_MAX_SIZE, fishSize * CHUNK_SIZE_FISH_RATIO)
  );
  const chunkSizeVariance = baseChunkSize * 0.2;

  for (const et of essenceTypes) {
    const count = Math.max(1, Math.min(3, Math.ceil(et.baseYield / 5)));
    const amountPerChunk = Math.max(1, Math.round(et.baseYield / count));

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = CHUNK_SCATTER_SPEED * (0.8 + Math.random() * 0.4);

      const pos = samplePointInSilhouette(bodyEllipse, headEllipse, {
        x: fishX + (Math.random() - 0.5) * fishSize * CHUNK_SPAWN_OFFSET,
        y: fishY + (Math.random() - 0.5) * fishSize * CHUNK_SPAWN_OFFSET,
      });

      chunks.push({
        chunkId: `chunk-essence-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        chunkKind: 'essence',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        essenceType: et.type,
        essenceAmount: amountPerChunk,
        carcassId,
        spawnTime: performance.now(),
        size: Math.max(CHUNK_MIN_SIZE, Math.min(CHUNK_MAX_SIZE, baseChunkSize + (Math.random() - 0.5) * chunkSizeVariance)),
        bobPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  return chunks;
}

/**
 * Update all chunks: apply friction, slow drift (bob like carcass), handle lifetime/fade.
 * Returns the filtered array (removes expired chunks).
 */
export function updateChunks(chunks: ChunkEntity[], deltaTime: number): ChunkEntity[] {
  const now = performance.now();
  return chunks.filter((chunk) => {
    // Apply friction to scatter velocity
    const friction = Math.pow(CHUNK_FRICTION, deltaTime);
    chunk.vx *= friction;
    chunk.vy *= friction;

    // Move from velocity
    chunk.x += chunk.vx * deltaTime;
    chunk.y += chunk.vy * deltaTime;

    // Sine-based underwater bob ( deterministic from spawnTime + bobPhase)
    const phase = (chunk.bobPhase ?? 0) + (now / 1200) * Math.PI * 2; // ~1.3s period
    const driftScale = (deltaTime / 16.67);
    chunk.x += Math.sin(phase * 0.7) * CHUNK_DRIFT_SPEED * 1.5 * driftScale;
    chunk.y += Math.sin(phase) * CHUNK_DRIFT_SPEED * 2 * driftScale;

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
  const now = performance.now();
  const playerHead = getHeadEllipseResolved(player);
  const playerR = Math.max(playerHead.rx, playerHead.ry) * CHUNK_COLLECTION_RADIUS_MULT;

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    const age = now - chunk.spawnTime;
    if (age < CHUNK_COLLECTION_DELAY_MS) continue; // not yet collectible

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
 * Draw all chunks (meat + essence) with aspect-ratio preservation.
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

    // Slow rotation + subtle bob (underwater float)
    const phase = (chunk.bobPhase ?? 0) + (now / 2000) * Math.PI * 2;
    const rotation = Math.sin(phase * 0.5) * 0.15;
    const bobY = Math.sin(phase * 1.2) * 3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(chunk.x, chunk.y + bobY);
    ctx.rotate(rotation);

    const spriteKey =
      chunk.chunkKind === 'meat'
        ? 'meat'
        : `essence_${chunk.essenceType ?? 'shallow'}`;
    let sprite = chunkSprites.get(spriteKey);
    if (!sprite && chunk.chunkKind === 'essence') {
      sprite = chunkSprites.get('essence_shallow');
    }

    if (sprite) {
      const aspect = sprite.height / sprite.width;
      const w = chunk.size;
      const h = chunk.size * aspect;
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    } else {
      // Placeholder: colored circle
      const color =
        chunk.chunkKind === 'meat'
          ? getChunkColor('meat')
          : getChunkColor(chunk.essenceType ?? 'shallow');

      // Glow
      ctx.beginPath();
      ctx.arc(0, 0, chunk.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = color + '40'; // low alpha glow
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(0, 0, chunk.size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(-chunk.size * 0.1, -chunk.size * 0.1, chunk.size * 0.12, 0, Math.PI * 2);
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
