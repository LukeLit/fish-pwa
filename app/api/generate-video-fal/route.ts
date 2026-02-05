/**
 * Fal.ai Video Generation API Route
 * 
 * Supports multiple models with image-to-video generation:
 * - Wan 2.1: Cheapest, supports 1:1 square
 * - Kling 2.1 Standard: Good quality, supports 1:1 square
 * - Kling 2.1 Pro: Higher quality
 * - Grok Imagine: xAI model, wide aspect ratio support
 */

import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { canGenerateVideo, recordVideoGeneration } from '@/lib/jobs/spending-tracker';

// Configure Fal client
const falApiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;

// Model configurations
const FAL_MODELS = {
  'wan-2.1': {
    id: 'fal-ai/wan-i2v',
    name: 'Wan 2.1',
    costPerSecond: 0.05,
    supportedAspectRatios: ['auto', '16:9', '9:16', '1:1'],
    supportedResolutions: ['480p', '720p'],
    defaultDuration: 5, // ~81 frames at 16fps
  },
  'kling-2.1-standard': {
    id: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    name: 'Kling 2.1 Standard',
    costPerSecond: 0.07,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5, 10],
    defaultDuration: 5,
  },
  'kling-2.1-pro': {
    id: 'fal-ai/kling-video/v2.1/pro/image-to-video',
    name: 'Kling 2.1 Pro',
    costPerSecond: 0.115,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5, 10],
    defaultDuration: 5,
  },
  'grok-imagine': {
    id: 'xai/grok-imagine-video/image-to-video',
    name: 'Grok Imagine Video',
    costPerSecond: 0.05, // + $0.002 image input
    supportedAspectRatios: ['auto', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16'],
    supportedResolutions: ['480p', '720p'],
    defaultDuration: 6,
  },
} as const;

type FalModelKey = keyof typeof FAL_MODELS;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!falApiKey) {
      return NextResponse.json(
        { error: 'FAL_KEY or FAL_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Configure Fal client with API key
    fal.config({ credentials: falApiKey });

    const body = await request.json();
    const {
      prompt,
      imageUrl,
      model = 'wan-2.1',
      aspectRatio = '1:1',
      duration = 5,
      negativePrompt = 'blurry, distorted, low quality, text, watermark',
      resolution = '720p',
    } = body;

    // Validate inputs
    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: 'prompt and imageUrl are required' },
        { status: 400 }
      );
    }

    // Get model config
    const modelConfig = FAL_MODELS[model as FalModelKey];
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Invalid model: ${model}. Valid options: ${Object.keys(FAL_MODELS).join(', ')}` },
        { status: 400 }
      );
    }

    // Enforce daily spending limit
    const spendingCheck = await canGenerateVideo();
    if (!spendingCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily limit reached',
          message: spendingCheck.reason,
          remaining: spendingCheck.remaining,
        },
        { status: 429 }
      );
    }


    // Build request based on model
    let result: any;

    if (model === 'wan-2.1') {
      // Wan 2.1 specific parameters
      const numFrames = Math.min(100, Math.max(81, duration * 16)); // 16 fps

      result = await fal.subscribe(modelConfig.id, {
        input: {
          prompt,
          image_url: imageUrl,
          negative_prompt: negativePrompt,
          aspect_ratio: aspectRatio,
          resolution: resolution,
          num_frames: numFrames,
          frames_per_second: 16,
          enable_safety_checker: true,
          acceleration: 'regular',
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
          }
        },
      });
    } else if (model === 'grok-imagine') {
      // Grok Imagine Video parameters (no negative_prompt support)
      result = await fal.subscribe(modelConfig.id, {
        input: {
          prompt,
          image_url: imageUrl,
          duration: duration || 6,
          aspect_ratio: aspectRatio || 'auto',
          resolution: resolution || '720p',
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
          }
        },
      });
    } else {
      // Kling models
      const validDuration = duration >= 10 ? '10' : '5';

      result = await fal.subscribe(modelConfig.id, {
        input: {
          prompt,
          image_url: imageUrl,
          negative_prompt: negativePrompt,
          duration: validDuration as '5' | '10',
          cfg_scale: 0.5,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
          }
        },
      });
    }

    // Record this video generation for spending tracking
    await recordVideoGeneration();

    const elapsed = Date.now() - startTime;

    if (!result?.data?.video?.url) {
      // Handle missing video URL silently
      return NextResponse.json(
        { error: 'No video generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.data.video.url,
      duration: duration * 1000, // Convert to ms
      model: modelConfig.name,
      requestId: result.requestId,
      elapsed,
    });

  } catch (error: any) {
    // Handle generation error silently
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
