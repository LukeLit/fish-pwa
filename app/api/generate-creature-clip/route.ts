/**
 * Creature Clip Generation API
 * Generates animation clips for creatures using Veo 3.1 image-to-video
 * Uses the creature's existing sprite as a reference image for character consistency
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import type { ClipAction } from '@/lib/game/types';

/**
 * Action-specific prompts for different animations
 * Each prompt describes the motion while the reference image maintains appearance
 */
const ACTION_PROMPTS: Record<ClipAction, { prompt: string; loop: boolean; duration: string }> = {
  swimIdle: {
    prompt: 'Fish swimming slowly and gracefully, gentle undulating body motion, subtle fin movements, relaxed swimming, side view',
    loop: true,
    duration: '4s',
  },
  swimFast: {
    prompt: 'Fish swimming rapidly, powerful tail strokes, dynamic body wave, urgent swimming motion, side view',
    loop: true,
    duration: '4s',
  },
  dash: {
    prompt: 'Fish performing quick burst of speed, explosive acceleration, streamlined body, speed lines effect, side view',
    loop: false,
    duration: '4s',
  },
  bite: {
    prompt: 'Fish biting and chomping, quick snapping jaw motion, mouth opening and closing aggressively, predatory strike, side view',
    loop: false,
    duration: '4s',
  },
  takeDamage: {
    prompt: 'Fish recoiling from impact, flinching motion, brief shake and recovery, hurt reaction, side view',
    loop: false,
    duration: '4s',
  },
  death: {
    prompt: 'Fish floating lifelessly, slow descent, fading motion, belly up, side view',
    loop: false,
    duration: '4s',
  },
  special: {
    prompt: 'Fish performing special ability, glowing effect, magical aura, powerful energy, side view',
    loop: false,
    duration: '4s',
  },
};

/**
 * Build the full prompt for video generation
 */
function buildClipPrompt(action: ClipAction, creatureDescription?: string): string {
  const actionConfig = ACTION_PROMPTS[action];

  let prompt = actionConfig.prompt;

  // Add creature-specific details if provided
  if (creatureDescription) {
    prompt = `${creatureDescription}, ${prompt}`;
  }

  // Add chroma key background requirement
  prompt += ', solid bright magenta background (#FF00FF), isolated on magenta, no other background elements, game sprite animation, clean edges';

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creatureId,
      action,
      spriteUrl,
      creatureDescription,
      model = 'veo-3.1-generate-preview',
      aspectRatio = '16:9',
      resolution = '720p',
    } = body;

    // Validate required fields
    if (!creatureId) {
      return NextResponse.json(
        { error: 'creatureId is required' },
        { status: 400 }
      );
    }

    if (!action || !ACTION_PROMPTS[action as ClipAction]) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${Object.keys(ACTION_PROMPTS).join(', ')}` },
        { status: 400 }
      );
    }

    if (!spriteUrl) {
      return NextResponse.json(
        { error: 'spriteUrl is required as reference image' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build the prompt
    const prompt = buildClipPrompt(action as ClipAction, creatureDescription);
    const actionConfig = ACTION_PROMPTS[action as ClipAction];

    console.log(`[ClipGen] Generating ${action} clip for creature ${creatureId}`);
    console.log(`[ClipGen] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[ClipGen] Reference image: ${spriteUrl.substring(0, 50)}...`);

    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Prepare the request with reference image
    const requestConfig: any = {
      model: model,
      prompt: prompt,
      // Pass the creature's sprite as reference image for character consistency
      referenceImages: [spriteUrl],
    };

    // Start video generation
    const operation = await ai.models.generateVideos(requestConfig);

    console.log(`[ClipGen] Video generation started, operation: ${operation.name}`);

    // Return the operation info for polling
    return NextResponse.json({
      success: true,
      operation: operation.name,
      status: 'processing',
      metadata: {
        creatureId,
        action,
        loop: actionConfig.loop,
        expectedDuration: actionConfig.duration,
      },
    });
  } catch (error: any) {
    console.error('[ClipGen] Generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate creature clip',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Poll operation status (reuses pattern from generate-video)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get('operation');

    if (!operationName) {
      return NextResponse.json(
        { error: 'Operation name is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Get the operation status
    const operationInput: Partial<GenerateVideosOperation> = { name: operationName };
    const operation = await ai.operations.getVideosOperation({
      operation: operationInput as GenerateVideosOperation,
    });

    // Check if operation is complete
    if (operation.done) {
      if (operation.response?.generatedVideos && operation.response.generatedVideos.length > 0) {
        const generatedVideo = operation.response.generatedVideos[0];
        const video = generatedVideo?.video;

        return NextResponse.json({
          success: true,
          status: 'completed',
          video: video
            ? {
              uri: video.uri,
              mimeType: video.mimeType,
            }
            : undefined,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'completed',
        response: operation.response,
      });
    }

    // Operation is still processing
    return NextResponse.json({
      success: true,
      status: 'processing',
      operation: operationName,
    });
  } catch (error: any) {
    console.error('[ClipGen] Poll error:', error);

    return NextResponse.json(
      {
        error: 'Failed to check operation status',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
