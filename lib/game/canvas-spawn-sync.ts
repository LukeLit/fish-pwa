/**
 * Canvas spawn sync – keeps canvas fish list and spawn pool in sync with editor spawns.
 * Syncs add/remove/update of fish and sprites (growth stage, resolution) when spawnedFish changes.
 */

'use client';

import { useEffect } from 'react';
import type { Creature } from './types';
import type { CanvasGameState, FishLifecycleState } from './canvas-state';
import { SPAWN, AI } from './canvas-constants';
import { initHungerStamina } from './stamina-hunger';
import { getSpawnPositionInBand } from './spawn-position';
import {
  getGrowthStage,
  getGrowthStageSprite,
  getSpriteUrl,
  getResolutionKey,
  removeBackground,
  hasUsableAnimations,
} from '@/lib/rendering/fish-renderer';
import { cacheBust } from '@/lib/utils/cache-bust';
import type { SpriteResolutions } from './types';
import type { AnimationSprite } from '@/lib/rendering/animation-sprite';
import type { CreatureAnimations } from './types';

/** Full creature from editor (stats, growthSprites, etc.) */
export type SpawnedCreature = Creature & { creatureId?: string };

/** Legacy spawn item – id, sprite, type, creatureId */
export type LegacySpawnItem = { id: string; sprite: string; type: string; creatureId?: string };

/** Minimal fish data for resolving creature (stats, growthSprites, type, etc.) */
export interface FishDataLike {
  creatureId?: string;
  stats?: { size?: number; speed?: number };
  type?: string;
  growthSprites?: unknown;
  animations?: CreatureAnimations;
  spriteResolutions?: SpriteResolutions;
  [key: string]: unknown;
}

export interface UseCanvasSpawnSyncRefs {
  gameStateRef: React.MutableRefObject<CanvasGameState>;
  fishSpriteUrlsRef: React.MutableRefObject<Map<string, string>>;
  spriteVersionRef: React.MutableRefObject<Map<string, number>>;
  zoomRef: React.MutableRefObject<number>;
  chromaToleranceRef: React.MutableRefObject<number>;
  fishDataRef: React.MutableRefObject<Map<string, FishDataLike>>;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

/**
 * Syncs canvas game state fish list and spawn pool with the editor's spawnedFish list.
 * Adds new fish, updates sprites when URL/size changes, removes fish no longer in spawnedFish.
 * Run when spawnedFish changes. When canvasReady is true, sync runs even if canvas ref was
 * null on a previous run (fixes "no fish / no intro" when spawnedFish is set before canvas mounts).
 * When runId and currentLevel are provided (game mode), fish spawn within their depth band
 * at least MIN_DISTANCE from the player; otherwise fish spawn in a ring around the player (editor).
 */
export function useCanvasSpawnSync(
  spawnedFish: SpawnedCreature[] | LegacySpawnItem[],
  refs: UseCanvasSpawnSyncRefs,
  canvasReady?: boolean,
  runId?: string,
  currentLevel?: string,
  onAllNewFishLoaded?: () => void
): void {
  const {
    gameStateRef,
    fishSpriteUrlsRef,
    spriteVersionRef,
    zoomRef,
    chromaToleranceRef,
    fishDataRef,
    canvasRef,
  } = refs;

  useEffect(() => {
    if (canvasRef != null && canvasRef.current == null) return;

    const isSpawnedCreature = (item: SpawnedCreature | LegacySpawnItem): item is SpawnedCreature =>
      'stats' in item && 'rarity' in item;

    gameStateRef.current.spawnPool = spawnedFish.length
      ? (spawnedFish.filter(isSpawnedCreature) as SpawnedCreature[])
      : [];

    const newFishItems = spawnedFish.filter(
      (f) => !gameStateRef.current.eatenIds.has(f.id) && !gameStateRef.current.fish.some((e) => e.id === f.id)
    );
    const pending = { count: newFishItems.length };
    if (pending.count === 0 && onAllNewFishLoaded) onAllNewFishLoaded();

    const loadSprite = (
      spriteUrl: string,
      fishId: string,
      onLoaded: (processedSprite: HTMLCanvasElement) => void,
      options?: { spriteResolutions?: SpriteResolutions; fishSize?: number }
    ) => {
      const fishSize = options?.fishSize ?? SPAWN.DEFAULT_CREATURE_SIZE;
      const currentZoom = zoomRef.current;
      const screenSize = fishSize * currentZoom;
      let finalUrl = spriteUrl;
      if (options?.spriteResolutions) {
        finalUrl = getSpriteUrl(
          { sprite: spriteUrl, spriteResolutions: options.spriteResolutions },
          screenSize,
          fishId
        );
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onLoaded(removeBackground(img, chromaToleranceRef.current));
      };
      img.onerror = () => { };
      img.src = cacheBust(finalUrl);
    };

    spawnedFish.forEach((fishItem) => {
      if (gameStateRef.current.eatenIds.has(fishItem.id)) return;

      const existingFish = gameStateRef.current.fish.find((f) => f.id === fishItem.id);
      const previousSpriteUrl = fishSpriteUrlsRef.current.get(fishItem.id);

      const hasFullCreature = fishItem && 'stats' in fishItem && fishItem.stats != null;
      const creatureForSprite: Creature | undefined = hasFullCreature
        ? (fishItem as Creature)
        : (fishDataRef.current.get((fishItem as LegacySpawnItem).creatureId ?? fishItem.id) as Creature | undefined);

      const instanceSize =
        (fishItem as { size?: number }).size ??
        (fishItem as { stats?: { size?: number } }).stats?.size;
      const fishSizeForSprite =
        typeof instanceSize === 'number'
          ? instanceSize
          : creatureForSprite?.stats?.size ?? (fishItem.type === 'prey' ? SPAWN.PREY_DEFAULT_SIZE : fishItem.type === 'predator' ? SPAWN.PREDATOR_DEFAULT_SIZE : SPAWN.DEFAULT_CREATURE_SIZE);

      const fishSizeForResolution = fishSizeForSprite;
      const screenSize = fishSizeForResolution * zoomRef.current;
      const stageSprite = creatureForSprite
        ? getGrowthStageSprite(creatureForSprite, fishSizeForSprite, fishItem.id)
        : null;
      const currentSpriteUrl = stageSprite
        ? getSpriteUrl(stageSprite, screenSize, fishItem.id)
        : (fishItem as LegacySpawnItem).sprite ?? '';
      const initialGrowthStage = creatureForSprite?.growthSprites
        ? getGrowthStage(fishSizeForSprite, creatureForSprite.growthSprites)
        : undefined;

      const wasDataUrl = previousSpriteUrl?.startsWith('data:') ?? false;
      const isNowBlobUrl = Boolean(currentSpriteUrl && !currentSpriteUrl.startsWith('data:'));
      const urlChanged = previousSpriteUrl !== currentSpriteUrl;
      const savedToBlobAfterRegenerate = wasDataUrl && isNowBlobUrl;
      const spriteChanged = urlChanged || savedToBlobAfterRegenerate;

      fishSpriteUrlsRef.current.set(fishItem.id, currentSpriteUrl);

      const spriteResolutions = stageSprite?.spriteResolutions;
      const resolution = getResolutionKey(screenSize);
      const cacheKey = `${fishItem.id}:${resolution}`;

      const sizeMismatch = existingFish && existingFish.size !== fishSizeForSprite;
      if (existingFish && sizeMismatch) {
        existingFish.size = fishSizeForSprite;
        if (creatureForSprite?.growthSprites) {
          existingFish.currentGrowthStage = getGrowthStage(fishSizeForSprite, creatureForSprite.growthSprites);
        }
      }

      if (existingFish && (spriteChanged || sizeMismatch)) {
        const newVersion = (spriteVersionRef.current.get(fishItem.id) ?? 0) + 1;
        spriteVersionRef.current.set(fishItem.id, newVersion);
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          existingFish.sprite = processedSprite;
          gameStateRef.current.spriteCache.set(cacheKey, processedSprite);
        }, { spriteResolutions, fishSize: fishSizeForResolution });
      } else if (!existingFish) {
        loadSprite(currentSpriteUrl, fishItem.id, (processedSprite) => {
          gameStateRef.current.spriteCache.set(cacheKey, processedSprite);

          const szMult = SPAWN.FISH_SIZE_MIN + Math.random() * (SPAWN.FISH_SIZE_MAX - SPAWN.FISH_SIZE_MIN);
          const fishSize = fishSizeForSprite * szMult;
          const baseSpeed = creatureForSprite?.stats?.speed ?? 2;
          const fishType = creatureForSprite?.type ?? (fishItem as LegacySpawnItem).type ?? 'prey';

          const vx = (Math.random() - 0.5) * baseSpeed * AI.SPEED_SCALE;
          const vy = (Math.random() - 0.5) * baseSpeed * AI.SPEED_SCALE;

          const playerPos = gameStateRef.current.player;
          const bounds = gameStateRef.current.worldBounds;
          let spawnX: number;
          let spawnY: number;
          if (runId != null && currentLevel != null) {
            const pos = getSpawnPositionInBand(
              runId,
              currentLevel,
              playerPos,
              SPAWN.MIN_DISTANCE
            );
            spawnX = pos.x;
            spawnY = pos.y;
          } else {
            const angle = Math.random() * Math.PI * 2;
            const distance = SPAWN.MIN_DISTANCE + Math.random() * SPAWN.MAX_DISTANCE_OFFSET;
            spawnX = playerPos.x + Math.cos(angle) * distance;
            spawnY = playerPos.y + Math.sin(angle) * distance;
            spawnX = Math.max(bounds.minX, Math.min(bounds.maxX, spawnX));
            spawnY = Math.max(bounds.minY, Math.min(bounds.maxY, spawnY));
          }

          const spawnIndex = gameStateRef.current.fish.length;
          const staggerDelay = spawnIndex * (SPAWN.STAGGER_DELAY_MIN + Math.random() * (SPAWN.STAGGER_DELAY_MAX - SPAWN.STAGGER_DELAY_MIN));

          const animations = creatureForSprite?.animations;
          let animationSprite: AnimationSprite | undefined;
          if (animations && hasUsableAnimations(animations)) {
            animationSprite = gameStateRef.current.animationSpriteManager.getSprite(fishItem.id, animations);
          }

          const newFish = {
            id: fishItem.id,
            x: spawnX,
            y: spawnY,
            vx,
            vy,
            size: fishSize,
            sprite: processedSprite,
            type: fishType,
            facingRight: vx >= 0,
            verticalTilt: 0,
            animTime: Math.random() * Math.PI * 2,
            creatureData: creatureForSprite,
            currentGrowthStage: initialGrowthStage,
            spawnTime: performance.now() + staggerDelay,
            despawnTime: undefined,
            opacity: 0,
            lifecycleState: 'spawning' as FishLifecycleState,
            animations,
            animationSprite,
            isDashing: false,
          };
          initHungerStamina(newFish, { hungerDrainRate: 2.5 });
          gameStateRef.current.fish.push(newFish);
          pending.count--;
          if (pending.count === 0 && onAllNewFishLoaded) onAllNewFishLoaded();
        }, { spriteResolutions, fishSize: fishSizeForResolution });
      }
    });

    gameStateRef.current.fish = gameStateRef.current.fish.filter(
      (fish) => spawnedFish.some((f) => f.id === fish.id) || fish.id.includes('-r-')
    );
    if (spawnedFish.length === 0) gameStateRef.current.eatenIds.clear();
  }, [spawnedFish, canvasReady, runId, currentLevel, onAllNewFishLoaded]);
}
