/**
 * Generate Image Variation API
 * 
 * Uses Fal.ai's FLUX Redux model for image-to-image generation.
 * Takes a source image and generates a variation based on a text prompt.
 * Used for generating growth stage sprites (juvenile, elder) from adult sprites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

interface GenerateVariationRequest {
  imageUrl: string;         // Source image URL
  prompt: string;           // Text prompt to guide the variation
  model?: string;           // Model to use (default: flux-redux)
  imageSize?: string;       // Output image size
  strength?: number;        // How much to vary from original (0-1)
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVariationRequest = await request.json();

    if (!body.imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    if (!body.prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    console.log('[GenerateVariation] Starting with:', {
      imageUrl: body.imageUrl.substring(0, 50) + '...',
      prompt: body.prompt.substring(0, 100) + '...',
      strength: body.strength,
    });

    // Use FLUX Redux for image-to-image
    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        image_url: body.imageUrl,
        prompt: body.prompt,
        strength: body.strength ?? 0.75,
        num_inference_steps: 28,
        guidance_scale: 7.5,
        output_format: 'png',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('[GenerateVariation] Progress:', update.logs?.map(l => l.message).join(', '));
        }
      },
    }) as { data: { images: Array<{ url: string }> }; requestId: string };

    // New @fal-ai/client wraps response in data property
    const images = result.data?.images || (result as unknown as { images: Array<{ url: string }> }).images;

    if (!images || images.length === 0) {
      console.error('[GenerateVariation] No images in result:', result);
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    const generatedUrl = images[0].url;
    console.log('[GenerateVariation] Generated:', generatedUrl);

    return NextResponse.json({
      success: true,
      imageUrl: generatedUrl,
    });
  } catch (error) {
    console.error('[GenerateVariation] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate variation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
