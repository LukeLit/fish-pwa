/**
 * Generate Animation Frames API
 * 
 * Uses image-to-image generation to create animation frames from a base sprite.
 * Each frame is a separate image showing the creature in a specific pose.
 * 
 * Much more reliable than video generation for game sprites because:
 * - Each frame is generated individually with precise control
 * - Consistent style since we're transforming the same base image
 * - No timing/segment issues - just discrete poses
 */

import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { uploadAsset, downloadGameData, uploadGameData } from '@/lib/storage/blob-storage';
import type {
  Creature,
  GrowthStage,
  AnimationAction,
  AnimationSequence,
  ANIMATION_CONFIG
} from '@/lib/game/types';
import { ANIMATION_CONFIG as CONFIG } from '@/lib/game/types';
import { generateVersionId, buildAnimationFramePath } from '@/lib/rendering/animation-asset-manager';

// Configure fal client
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

/**
 * Simple, direct prompts for Nano Banana Pro
 * One frame per action (except bite = 2)
 */
const SIMPLE_PROMPTS: Record<AnimationAction, string[]> = {
  idle: ['tilt the fish slightly upward'],
  swim: ['bend the fish tail to the left, curve the body'],
  dash: ['stretch the fish body longer, flatten the fins back'],
  bite: [
    'open the fish mouth wide',
    'close the fish mouth, lunging forward',
  ],
  hurt: ['make the fish recoil backward with fins spread out'],
  death: ['flip the fish upside down, belly up'],
};

/**
 * Frame counts - 1 each except bite
 */
const FRAME_COUNTS: Record<AnimationAction, number> = {
  idle: 1,
  swim: 1,
  dash: 1,
  bite: 2,
  hurt: 1,
  death: 1,
};

/**
 * Build simple prompt for Nano Banana Pro
 */
function buildFramePrompt(action: AnimationAction, frameIndex: number): string {
  const prompts = SIMPLE_PROMPTS[action];
  const prompt = prompts[Math.min(frameIndex, prompts.length - 1)];
  return prompt;
}


/**
 * POST - Generate animation frames for a specific action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creatureId,
      action,
      growthStage = 'adult',
      spriteUrl,
      frameCount, // Optional override
    } = body;

    // Validate inputs
    if (!creatureId || !action || !spriteUrl) {
      return NextResponse.json(
        { error: 'creatureId, action, and spriteUrl are required' },
        { status: 400 }
      );
    }

    // Validate action
    if (!CONFIG[action as AnimationAction]) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid actions: ${Object.keys(CONFIG).join(', ')}` },
        { status: 400 }
      );
    }

    const actionConfig = CONFIG[action as AnimationAction];
    // Use our simplified frame counts
    const numFrames = frameCount || FRAME_COUNTS[action as AnimationAction];

    // Generate a unique version ID for this generation batch
    // This ensures we never overwrite existing frames
    const version = generateVersionId();


    // Generate each frame
    const frameUrls: string[] = [];

    for (let i = 0; i < numFrames; i++) {
      const prompt = buildFramePrompt(action as AnimationAction, i);


      try {
        // Use Nano Banana Pro (Google Gemini 3 Pro Image) - SOTA semantic editing
        // Understands natural language edits without masks or manual selection

        const result = await fal.subscribe('fal-ai/nano-banana-pro/edit', {
          input: {
            prompt,
            image_urls: [spriteUrl], // Array of image URLs
            resolution: '1K',
          },
          logs: true,
        });

        if (!result.data?.images?.[0]?.url) {
          continue;
        }

        // Download and upload to our storage
        const imageResponse = await fetch(result.data.images[0].url);
        if (!imageResponse.ok) {
          continue;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        // Use versioned path - never overwrites, each generation is unique
        const framePath = buildAnimationFramePath(
          creatureId,
          growthStage as GrowthStage,
          action as AnimationAction,
          i,
          version
        );
        const uploadResult = await uploadAsset(framePath, imageBuffer, 'image/png');

        // No cache busting needed - the versioned path is unique
        frameUrls.push(uploadResult.url);

      } catch (frameError: any) {
        // Continue with other frames
      }
    }

    if (frameUrls.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any frames' },
        { status: 500 }
      );
    }

    // Build animation sequence with version tracking
    const sequence: AnimationSequence = {
      action: action as AnimationAction,
      frames: frameUrls,
      loop: actionConfig.loop,
      frameRate: actionConfig.frameRate,
      generatedAt: new Date().toISOString(),
      version,
    };

    // Update creature data
    await updateCreatureAnimations(creatureId, growthStage as GrowthStage, action as AnimationAction, sequence);

    return NextResponse.json({
      success: true,
      action,
      growthStage,
      sequence,
      framesGenerated: frameUrls.length,
      message: `Generated ${frameUrls.length}/${numFrames} frames for ${action} animation`,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate animation frames' },
      { status: 500 }
    );
  }
}

/**
 * Update creature's animation data in storage
 */
async function updateCreatureAnimations(
  creatureId: string,
  stage: GrowthStage,
  action: AnimationAction,
  sequence: AnimationSequence
): Promise<void> {
  try {
    const creatures = await downloadGameData<Record<string, Creature>>('creatures', {});

    if (!creatures[creatureId]) {
      return;
    }

    // Initialize animations if needed
    if (!creatures[creatureId].animations) {
      creatures[creatureId].animations = {};
    }
    if (!creatures[creatureId].animations![stage]) {
      creatures[creatureId].animations![stage] = {};
    }

    // Store the sequence
    creatures[creatureId].animations![stage]![action] = sequence;
    creatures[creatureId].updatedAt = Date.now();

    await uploadGameData('creatures', creatures);
  } catch (error) {
  }
}

/**
 * GET - Get animation data for a creature
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const creatureId = searchParams.get('creatureId');
  const stage = searchParams.get('stage') as GrowthStage | null;
  const action = searchParams.get('action') as AnimationAction | null;

  if (!creatureId) {
    return NextResponse.json(
      { error: 'creatureId is required' },
      { status: 400 }
    );
  }

  try {
    const creatures = await downloadGameData<Record<string, Creature>>('creatures', {});
    const creature = creatures[creatureId];

    if (!creature) {
      return NextResponse.json(
        { error: 'Creature not found' },
        { status: 404 }
      );
    }

    // Return specific animation or all
    if (stage && action && creature.animations?.[stage]?.[action]) {
      return NextResponse.json({
        success: true,
        creatureId,
        stage,
        action,
        sequence: creature.animations[stage][action],
      });
    }

    if (stage && creature.animations?.[stage]) {
      return NextResponse.json({
        success: true,
        creatureId,
        stage,
        animations: creature.animations[stage],
      });
    }

    return NextResponse.json({
      success: true,
      creatureId,
      animations: creature.animations || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get animation data' },
      { status: 500 }
    );
  }
}
