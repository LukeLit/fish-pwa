import type { Creature, GrowthSprites, SpriteResolutions, CreatureAnimations, EssenceData } from '../types';
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

function asTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asSpriteResolutions(value: unknown): SpriteResolutions | undefined {
  if (!isRecord(value)) return undefined;
  const high = typeof value.high === 'string' ? value.high : undefined;
  const medium = typeof value.medium === 'string' ? value.medium : undefined;
  const low = typeof value.low === 'string' ? value.low : undefined;
  
  // Only return if we have at least one valid resolution
  if (high || medium || low) {
    return { high: high || '', medium: medium || '', low: low || '' };
  }
  return undefined;
}

function asGrowthSprites(value: unknown): GrowthSprites | undefined {
  if (!isRecord(value)) return undefined;
  
  // GrowthSprites can have juvenile, adult, elder properties
  // Each is a GrowthSpriteData object with sprite, spriteResolutions, sizeRange
  const hasValidStructure =
    (value.juvenile !== undefined && isRecord(value.juvenile)) ||
    (value.adult !== undefined && isRecord(value.adult)) ||
    (value.elder !== undefined && isRecord(value.elder));
  
  if (hasValidStructure) {
    return value as GrowthSprites;
  }
  return undefined;
}

function asCreatureAnimations(value: unknown): CreatureAnimations | undefined {
  if (!isRecord(value)) return undefined;
  
  // CreatureAnimations can have juvenile, adult, elder properties
  // Each can be a Partial<Record<AnimationAction, AnimationSequence>>
  // We'll just pass through the object if it looks valid
  const hasValidStructure = 
    (value.juvenile !== undefined && isRecord(value.juvenile)) ||
    (value.adult !== undefined && isRecord(value.adult)) ||
    (value.elder !== undefined && isRecord(value.elder));
  
  if (hasValidStructure) {
    return value as CreatureAnimations;
  }
  return undefined;
}

function asEssenceData(value: unknown): EssenceData | undefined {
  if (!isRecord(value) || !isRecord(value.primary)) return undefined;
  const primary = value.primary;
  if (typeof primary.type !== 'string' || typeof primary.baseYield !== 'number' || !Number.isFinite(primary.baseYield)) {
    return undefined;
  }
  const result: EssenceData = {
    primary: {
      type: primary.type,
      baseYield: primary.baseYield,
      visualChunks: Array.isArray(primary.visualChunks)
        ? primary.visualChunks.filter((c): c is string => typeof c === 'string')
        : undefined,
    },
  };
  if (Array.isArray(value.secondary)) {
    result.secondary = value.secondary
      .filter((entry): entry is Record<string, unknown> => isRecord(entry) && typeof entry.type === 'string' && typeof entry.baseYield === 'number' && Number.isFinite(entry.baseYield))
      .map((entry) => ({
        type: entry.type as string,
        baseYield: entry.baseYield as number,
        visualChunks: Array.isArray(entry.visualChunks)
          ? entry.visualChunks.filter((c): c is string => typeof c === 'string')
          : undefined,
      }));
  }
  return result;
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

  const growthSprites = asGrowthSprites(raw.growthSprites);
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
    spriteResolutions: asSpriteResolutions(raw.spriteResolutions),
    growthSprites,
    animations: asCreatureAnimations(raw.animations),
    essence: asEssenceData(raw.essence),
    descriptionChunks: Array.isArray(raw.descriptionChunks) ? raw.descriptionChunks : undefined,
    visualMotif: typeof raw.visualMotif === 'string' ? raw.visualMotif : undefined,
    updatedAt: asTimestamp(raw.updatedAt),
    createdAt: asTimestamp(raw.createdAt),
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
