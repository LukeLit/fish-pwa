/**
 * Fish Sprite Generation Service
 * Uses Black Forest Labs Flux 2 Pro via Vercel AI Gateway to generate high-quality 2D fish sprites
 */

import type { BasicFishPromptData, ComposedPromptResult } from './prompt-builder';
import { composeFishPrompt } from './prompt-builder';

export interface FishSpriteParams {
  /**
   * Legacy type flag used by the original hardcoded prompts.
   * Still supported for backward compatibility.
   */
  type: 'prey' | 'predator' | 'mutant';
  mutations?: string[];
  seed?: string;
  model?: 'bfl/flux-2-pro' | 'google/imagen-4.0-generate-001' | 'google/imagen-4.0-fast-generate-001';
  /**
   * If provided, overrides all modular prompt composition.
   */
  customPrompt?: string;
  /**
   * Optional rich fish data used for modular prompt composition.
   * When present (and customPrompt is not), the modular system is used.
   */
  fishData?: BasicFishPromptData;
}

export interface FishSpriteResult {
  imageUrl?: string;
  imageBase64?: string;
  cacheKey: string;
  error?: string;
}

export class FishSpriteService {
  private cache = new Map<string, FishSpriteResult>();

  /**
   * Generate a fish sprite
   */
  async generateFishSprite(params: FishSpriteParams): Promise<FishSpriteResult | null> {
    // Decide cache key and prompt source up front
    let composed: ComposedPromptResult | null = null;
    let cacheKey: string;

    if (params.fishData && !params.customPrompt) {
      composed = composeFishPrompt(params.fishData);
      cacheKey = composed.cacheKey;
    } else {
      cacheKey = `fish_sprite_${params.type}_${params.seed || 'default'}`;
    }

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`[FishSprite] Using cached sprite: ${cacheKey}`);
      return cached;
    }

    // Build prompt
    const prompt =
      params.customPrompt ||
      composed?.prompt ||
      this.buildFishPrompt(params);
    const model = params.model || 'bfl/flux-2-pro';

    try {
      console.log(`[FishSprite] Generating: ${cacheKey} with ${model}`);

      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, model }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[FishSprite] Generation failed:', error);
        return {
          cacheKey,
          error: error.message || 'Failed to generate sprite',
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          cacheKey,
          error: 'API returned unsuccessful response',
        };
      }

      const result: FishSpriteResult = {
        imageUrl: data.imageUrl,
        imageBase64: data.imageBase64,
        cacheKey,
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      console.log(`[FishSprite] Generated successfully: ${cacheKey}`);
      return result;
    } catch (error: any) {
      console.error('[FishSprite] Error:', error);
      return {
        cacheKey,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Build optimized prompt for fish sprite generation
   */
  private buildFishPrompt(params: FishSpriteParams): string {
    let prompt = '';

    // Base description
    if (params.type === 'prey') {
      prompt = 'A small, swift fish with greenish scales and streamlined body';
    } else if (params.type === 'predator') {
      prompt = 'A large, aggressive fish with sharp teeth, reddish tones, and menacing appearance';
    } else {
      prompt = 'A bizarre mutant fish with twisted fins, glowing eyes, and surreal features';
    }

    // Add mutations if provided
    if (params.mutations && params.mutations.length > 0) {
      prompt += `, with ${params.mutations.join(', ')}`;
    }

    // Style instructions for game sprites with chroma key background
    prompt += ', isolated on solid bright magenta background (#FF00FF), no other background elements, digital illustration, side view right-facing, game sprite, vibrant colors, detailed scales and fins';

    return prompt;
  }

  /**
   * Expose modular prompt composition for callers that only need the text / cache key.
   */
  buildModularPrompt(fishData: BasicFishPromptData): ComposedPromptResult {
    return composeFishPrompt(fishData);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance
 */
let fishSpriteInstance: FishSpriteService | null = null;

export function getFishSpriteService(): FishSpriteService {
  if (!fishSpriteInstance) {
    fishSpriteInstance = new FishSpriteService();
  }
  return fishSpriteInstance;
}
