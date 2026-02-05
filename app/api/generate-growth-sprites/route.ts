/**
 * Generate Growth Sprites API
 * 
 * Generates juvenile and elder sprite variations from an adult sprite.
 * Uses image-to-image generation to maintain visual consistency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import type { GrowthSprites, GrowthStage, SpriteResolutions } from '@/lib/game/types';
import { DEFAULT_GROWTH_RANGES } from '@/lib/rendering/fish-renderer';

// Use same growth ranges as game/editor (20-300 scale)
const DEFAULT_SIZE_RANGES = DEFAULT_GROWTH_RANGES;

// Growth stage prompts
const GROWTH_STAGE_PROMPTS: Record<GrowthStage, string> = {
  juvenile: 'young, juvenile version, smaller, rounder, cuter proportions, bigger eyes relative to body',
  adult: '', // Adult uses the base sprite
  elder: 'mature, elder version, larger, more weathered, experienced, battle-scarred, ancient',
};

interface GenerateGrowthSpritesRequest {
  creatureId: string;
  spriteUrl: string;           // Adult sprite URL
  creatureName: string;
  descriptionChunks?: string[];
  biomeId?: string;
}

/**
 * Generate a variation of the sprite for a specific growth stage
 */
async function generateVariation(
  spriteUrl: string,
  stage: GrowthStage,
  creatureName: string,
  descriptionChunks?: string[]
): Promise<string | null> {
  if (stage === 'adult') {
    // Adult uses the base sprite
    return spriteUrl;
  }

  const stagePrompt = GROWTH_STAGE_PROMPTS[stage];
  const baseDescription = descriptionChunks?.join(', ') || creatureName;

  const prompt = `${stagePrompt}, ${baseDescription}, isolated on solid bright magenta background (#FF00FF), game sprite, side view right-facing, detailed scales and fins, consistent art style`;

  try {
    // Call the image variation API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-image-variation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: spriteUrl,
        prompt,
        strength: stage === 'juvenile' ? 0.65 : 0.55, // Less variation for elder to maintain identity
        negativePrompt: 'blurry, low quality, distorted, deformed, wrong colors, inconsistent style',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.imageUrl;
  } catch (error) {
    return null;
  }
}

/**
 * Download image and create resolution variants
 */
async function uploadGrowthSprite(
  imageUrl: string,
  creatureId: string,
  stage: GrowthStage
): Promise<{ sprite: string; spriteResolutions: SpriteResolutions } | null> {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Generate resolution variants
    const resolutions = {
      high: 512,
      medium: 256,
      low: 128,
    };

    const uploadPromises: Promise<{ key: keyof SpriteResolutions; url: string }>[] = [];

    for (const [key, size] of Object.entries(resolutions)) {
      const resizedBuffer = await sharp(imageBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 0, b: 255, alpha: 1 } })
        .png()
        .toBuffer();

      const suffix = key === 'high' ? '' : `@${size}`;
      const filename = `assets/creatures/${creatureId}_${stage}${suffix}.png`;

      uploadPromises.push(
        put(filename, resizedBuffer, {
          access: 'public',
          contentType: 'image/png',
          allowOverwrite: true, // Allow regeneration of growth sprites
        }).then((result) => ({
          key: key as keyof SpriteResolutions,
          url: result.url,
        }))
      );
    }

    const results = await Promise.all(uploadPromises);

    const spriteResolutions: SpriteResolutions = {
      high: '',
      medium: '',
      low: '',
    };

    let mainSpriteUrl = '';
    for (const result of results) {
      spriteResolutions[result.key] = result.url;
      if (result.key === 'high') {
        mainSpriteUrl = result.url;
      }
    }


    return {
      sprite: mainSpriteUrl,
      spriteResolutions,
    };
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateGrowthSpritesRequest = await request.json();

    if (!body.creatureId || !body.spriteUrl) {
      return NextResponse.json(
        { error: 'creatureId and spriteUrl are required' },
        { status: 400 }
      );
    }


    const growthSprites: GrowthSprites = {};

    // Generate juvenile sprite
    const juvenileUrl = await generateVariation(
      body.spriteUrl,
      'juvenile',
      body.creatureName,
      body.descriptionChunks
    );

    if (juvenileUrl) {
      const juvenileData = await uploadGrowthSprite(juvenileUrl, body.creatureId, 'juvenile');
      if (juvenileData) {
        growthSprites.juvenile = {
          ...juvenileData,
          sizeRange: DEFAULT_SIZE_RANGES.juvenile,
        };
      }
    }

    // Generate elder sprite
    const elderUrl = await generateVariation(
      body.spriteUrl,
      'elder',
      body.creatureName,
      body.descriptionChunks
    );

    if (elderUrl) {
      const elderData = await uploadGrowthSprite(elderUrl, body.creatureId, 'elder');
      if (elderData) {
        growthSprites.elder = {
          ...elderData,
          sizeRange: DEFAULT_SIZE_RANGES.elder,
        };
      }
    }

    {
      hasJuvenile: !!growthSprites.juvenile,
      hasElder: !!growthSprites.elder,
    });

    return NextResponse.json({
      success: true,
      growthSprites,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate growth sprites',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
