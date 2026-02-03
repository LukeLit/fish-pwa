import type { Creature, GrowthSprites } from '../types';
import { getAllCreaturesFromBlob, getAllCreatures, getCreatureById as getCreatureByIdRaw } from './creatures';
import { loadCreatureFromLocal } from '../../storage/local-fish-storage';
import {
  getClipMode,
  getGrowthStage,
  getGrowthStageSprite,
  getSpriteUrl,
  hasUsableAnimations,
  type RenderContext,
} from '@/lib/rendering/fish-renderer';

const DEFAULT_STATS = {
  size: 60,
  speed: 5,
  health: 20,
  damage: 5,
};

const DEFAULT_RARITY = 'common';
const DEFAULT_BIOME_ID = 'shallow';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function normalizeCreature(raw: unknown): Creature | null {
  if (!isRecord(raw)) return null;

  const id = asString(raw.id, '');
  if (!id) return null;

  const name = asString(raw.name, id);
  const description = asString(raw.description, '');
  const type = asString(raw.type, 'prey') as Creature['type'];
  const rarity = asString(raw.rarity, DEFAULT_RARITY) as Creature['rarity'];

  const rawStats = isRecord(raw.stats) ? raw.stats : {};
  const stats = {
    size: asNumber(rawStats.size, DEFAULT_STATS.size),
    speed: asNumber(rawStats.speed, DEFAULT_STATS.speed),
    health: asNumber(rawStats.health, DEFAULT_STATS.health),
    damage: asNumber(rawStats.damage, DEFAULT_STATS.damage),
  };

  const growthSprites = isRecord(raw.growthSprites) ? (raw.growthSprites as GrowthSprites) : undefined;
  const spriteFromGrowth =
    growthSprites?.adult?.sprite ||
    growthSprites?.juvenile?.sprite ||
    growthSprites?.elder?.sprite ||
    '';
  const sprite = asString(raw.sprite, spriteFromGrowth);

  const biomeId = asString(raw.biomeId, DEFAULT_BIOME_ID);
  const rawSpawnRules = isRecord(raw.spawnRules) ? raw.spawnRules : {};
  const canAppearIn = asStringArray(rawSpawnRules.canAppearIn);
  const spawnRules = {
    canAppearIn: canAppearIn.length > 0 ? canAppearIn : [biomeId],
    spawnWeight: asNumber(rawSpawnRules.spawnWeight, 1),
    minDepth: asNumber(rawSpawnRules.minDepth, 0),
    maxDepth: asNumber(rawSpawnRules.maxDepth, 100),
  };

  const essenceTypes = Array.isArray(raw.essenceTypes)
    ? raw.essenceTypes.filter((entry) => isRecord(entry) && typeof entry.type === 'string')
    : [];

  const grantedAbilities = Array.isArray(raw.grantedAbilities)
    ? raw.grantedAbilities.filter((entry) => typeof entry === 'string')
    : [];

  return {
    id,
    name,
    description,
    type,
    rarity,
    sprite,
    biomeId,
    stats,
    essenceTypes,
    spawnRules,
    grantedAbilities,
    playable: typeof raw.playable === 'boolean' ? raw.playable : false,
    sizeTier: typeof raw.sizeTier === 'string' ? raw.sizeTier : undefined,
    spriteResolutions: isRecord(raw.spriteResolutions) ? raw.spriteResolutions : undefined,
    growthSprites,
    animations: isRecord(raw.animations) ? raw.animations : undefined,
    essence: raw.essence,
    descriptionChunks: Array.isArray(raw.descriptionChunks) ? raw.descriptionChunks : undefined,
    visualMotif: typeof raw.visualMotif === 'string' ? raw.visualMotif : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
  };
}

export async function loadCreatureById(id: string): Promise<Creature | null> {
  if (!id) return null;
  const raw = await getCreatureByIdRaw(id);
  const normalized = raw ? normalizeCreature(raw) : null;
  if (normalized) return normalized;

  if (typeof window !== 'undefined') {
    const localCreature = loadCreatureFromLocal(id);
    if (localCreature) {
      return normalizeCreature(localCreature);
    }
  }

  return null;
}

export async function loadCreaturesByBiome(biomeId: string): Promise<Creature[]> {
  const blobCreatures = await getAllCreaturesFromBlob();
  const normalizedBlob = blobCreatures
    .map(normalizeCreature)
    .filter((creature): creature is Creature => creature != null);

  const filteredBlob = normalizedBlob.filter(
    (creature) =>
      creature.biomeId === biomeId || creature.spawnRules.canAppearIn.includes(biomeId)
  );
  if (filteredBlob.length > 0) return filteredBlob;
  if (normalizedBlob.length > 0) return normalizedBlob;

  const fallbackCreatures = getAllCreatures();
  const normalizedFallback = fallbackCreatures
    .map(normalizeCreature)
    .filter((creature): creature is Creature => creature != null);

  return normalizedFallback.filter(
    (creature) =>
      creature.biomeId === biomeId || creature.spawnRules.canAppearIn.includes(biomeId)
  );
}

export async function loadAllCreatures(): Promise<Creature[]> {
  const blobCreatures = await getAllCreaturesFromBlob();
  const normalizedBlob = blobCreatures
    .map(normalizeCreature)
    .filter((creature): creature is Creature => creature != null);
  if (normalizedBlob.length > 0) return normalizedBlob;

  const fallbackCreatures = getAllCreatures();
  return fallbackCreatures
    .map(normalizeCreature)
    .filter((creature): creature is Creature => creature != null);
}

export function resolveCreatureRenderData(
  creature: Creature,
  size: number,
  screenSize: number,
  context: RenderContext = 'game'
) {
  const growthStage = getGrowthStage(size, creature.growthSprites);
  const stageSprite = getGrowthStageSprite(creature, size, creature.id);
  const spriteUrl = getSpriteUrl(stageSprite, screenSize, creature.id);
  const clipMode = getClipMode(screenSize, hasUsableAnimations(creature.animations), context);

  return {
    spriteUrl,
    spriteResolutions: stageSprite.spriteResolutions,
    growthStage,
    clipMode,
  };
}
