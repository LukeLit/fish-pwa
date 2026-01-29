/**
 * Prompt builder utilities for modular fish art generation.
 *
 * This composes the final text prompt from:
 * - shared style / formatting / tech-art chunks
 * - biome / essence visual chunks
 * - fish-specific descriptionChunks and visualMotif
 * - optional upgrade / ability chunks
 */

import {
  getAbilityVisualChunks,
  getBaseStyleChunks,
  getBiomeChunks,
  getEssenceVisualChunks,
} from './prompt-chunks';

/**
 * Minimal shape we expect from batch fish data (from docs/FISH_DATA_STRUCTURE_BATCH.md).
 * We keep it loose so callers can pass richer objects (e.g. CreatureData).
 */
export interface BasicFishPromptData {
  id?: string;
  name?: string;
  biome?: string;
  biomeId?: string;
  rarity?: string;
  sizeTier?: 'prey' | 'mid' | 'predator' | 'boss' | string;

  // Essence as object with all types, or any other map-like structure.
  essence?: Record<string, number | undefined>;

  // Modular prompt fields
  descriptionChunks?: string[];
  visualMotif?: string;

  // Optional metadata used for future fusions / mutations
  fusionParentIds?: string[];
  mutationSource?: unknown;

  // Optional ability ids (for visual chunks)
  grantedAbilities?: string[];
  abilityPromptChunks?: string[];
}

export interface ComposePromptOptions {
  /**
   * If true, joins chunks with semicolons instead of commas.
   * Useful when targeting models that like more separated clauses.
   */
  useSemicolons?: boolean;
}

export interface ComposedPromptResult {
  prompt: string;
  /**
   * The raw chunk list used to build the prompt.
   */
  chunks: string[];
  /**
   * A deterministic cache key based on the chunks.
   * Can be used to avoid regenerating the same sprite.
   */
  cacheKey: string;
}

/**
 * Compose a fish art prompt from modular chunks.
 */
export function composeFishPrompt(
  fish: BasicFishPromptData,
  options: ComposePromptOptions = {}
): ComposedPromptResult {
  const chunks: string[] = [];

  // 1. Global style / formatting / tech-art chunks
  chunks.push(...getBaseStyleChunks());

  // 2. Biome / essence visual flavor
  const biomeId = fish.biomeId ?? fish.biome;
  chunks.push(...getBiomeChunks(biomeId));

  if (fish.essence) {
    chunks.push(...getEssenceVisualChunks(fish.essence));
  }

  // 3. Ability / upgrade chunks
  chunks.push(...getAbilityVisualChunks(fish.grantedAbilities));
  if (fish.abilityPromptChunks && fish.abilityPromptChunks.length > 0) {
    chunks.push(...fish.abilityPromptChunks);
  }

  // 4. Fish-specific description and motif
  if (fish.descriptionChunks && fish.descriptionChunks.length > 0) {
    chunks.push(...fish.descriptionChunks);
  }
  if (fish.visualMotif) {
    chunks.push(fish.visualMotif);
  }

  // 5. Cleanup & dedupe
  const cleanedChunks = Array.from(
    new Set(
      chunks
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  const separator = options.useSemicolons ? '; ' : ', ';
  const prompt = cleanedChunks.join(separator);

  const cacheKey = buildPromptCacheKey(fish, cleanedChunks);

  return {
    prompt,
    chunks: cleanedChunks,
    cacheKey,
  };
}

/**
 * Simple deterministic cache key based on fish id/name + chunk contents.
 */
function buildPromptCacheKey(
  fish: BasicFishPromptData,
  chunks: string[]
): string {
  const baseId = fish.id || fish.name || 'unknown_fish';
  const raw = `${baseId}::${chunks.join('|')}`;
  // Cheap hash – not cryptographic, just stable enough for caching keys.
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `fish_prompt_${baseId}_${Math.abs(hash)}`;
}

