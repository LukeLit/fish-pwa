/**
 * Prompt builder utilities for modular background art generation.
 *
 * This composes the final text prompt from:
 * - shared style / formatting chunks
 * - depth-based lighting/atmosphere chunks
 * - biome-specific visual chunks
 * - background-specific descriptionChunks and visualMotif
 * - optional essence-influenced atmosphere
 */

import {
  getBackgroundBaseChunks,
  getBackgroundDepthChunks,
  getBackgroundBiomeChunks,
  getBackgroundEssenceChunks,
  getBiomeBaseDepth,
} from './background-chunks';

/**
 * Minimal shape we expect from background data.
 * Matches the BackgroundAsset interface pattern.
 */
export interface BasicBackgroundPromptData {
  id?: string;
  name?: string;
  biomeId?: string;

  // Modular prompt fields (matches creature pattern)
  descriptionChunks?: string[];
  visualMotif?: string;

  // Optional overrides
  depth?: 'shallow' | 'medium' | 'deep' | 'abyssal';
  essenceTypes?: string[] | Record<string, number | undefined>;

  // Resolution hint (for prompt context)
  resolution?: { width: number; height: number };
}

export interface ComposeBackgroundPromptOptions {
  /**
   * If true, joins chunks with semicolons instead of commas.
   * Useful when targeting models that like more separated clauses.
   */
  useSemicolons?: boolean;

  /**
   * If true, adds resolution hints to the prompt.
   */
  includeResolutionHints?: boolean;
}

export interface ComposedBackgroundPromptResult {
  prompt: string;
  /**
   * The raw chunk list used to build the prompt.
   */
  chunks: string[];
  /**
   * A deterministic cache key based on the chunks.
   * Can be used to avoid regenerating the same background.
   */
  cacheKey: string;
}

/**
 * Compose a background art prompt from modular chunks.
 * 
 * Composition order:
 * 1. Base style/formatting chunks
 * 2. Depth-based lighting/atmosphere
 * 3. Biome-specific environment details
 * 4. Essence-influenced atmosphere (optional)
 * 5. Background-specific descriptionChunks
 * 6. Visual motif
 */
export function composeBackgroundPrompt(
  background: BasicBackgroundPromptData,
  options: ComposeBackgroundPromptOptions = {}
): ComposedBackgroundPromptResult {
  const chunks: string[] = [];

  // 1. Global style / formatting chunks
  chunks.push(...getBackgroundBaseChunks());

  // 2. Depth-based lighting/atmosphere
  const depth = background.depth ?? getBiomeBaseDepth(background.biomeId ?? 'shallow');
  chunks.push(...getBackgroundDepthChunks(depth));

  // 3. Biome-specific visual chunks
  if (background.biomeId) {
    chunks.push(...getBackgroundBiomeChunks(background.biomeId));
  }

  // 4. Essence-influenced atmosphere (optional)
  if (background.essenceTypes) {
    chunks.push(...getBackgroundEssenceChunks(background.essenceTypes));
  }

  // 5. Background-specific description chunks
  if (background.descriptionChunks && background.descriptionChunks.length > 0) {
    chunks.push(...background.descriptionChunks);
  }

  // 6. Visual motif
  if (background.visualMotif) {
    chunks.push(background.visualMotif);
  }

  // 7. Optional resolution hints
  if (options.includeResolutionHints && background.resolution) {
    chunks.push(`${background.resolution.width}x${background.resolution.height} resolution`);
  }

  // Cleanup & dedupe
  const cleanedChunks = Array.from(
    new Set(
      chunks
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  const separator = options.useSemicolons ? '; ' : ', ';
  const prompt = cleanedChunks.join(separator);

  const cacheKey = buildBackgroundPromptCacheKey(background, cleanedChunks);

  return {
    prompt,
    chunks: cleanedChunks,
    cacheKey,
  };
}

/**
 * Simple deterministic cache key based on background id/name + chunk contents.
 */
function buildBackgroundPromptCacheKey(
  background: BasicBackgroundPromptData,
  chunks: string[]
): string {
  const baseId = background.id || background.name || background.biomeId || 'unknown_bg';
  const raw = `${baseId}::${chunks.join('|')}`;
  // Cheap hash – not cryptographic, just stable enough for caching keys.
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `bg_prompt_${baseId}_${Math.abs(hash)}`;
}

/**
 * Utility to generate a simple preview of what the composed prompt would look like.
 * Useful for displaying in the UI before generation.
 */
export function previewBackgroundPrompt(background: BasicBackgroundPromptData): string {
  const { prompt } = composeBackgroundPrompt(background);
  // Truncate for preview if too long
  if (prompt.length > 500) {
    return prompt.substring(0, 500) + '...';
  }
  return prompt;
}
