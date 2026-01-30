/**
 * Fish Image Generation API
 * Supports multiple models via Vercel AI Gateway: Flux 2 Pro and Google Imagen
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'bfl/flux-2-pro', aspectRatio = '1:1' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('[FishImage] Generating image with', model, 'aspect:', aspectRatio, ':', prompt.substring(0, 100) + '...');

    const requestBody: any = {
      model: model,
      prompt: prompt,
      n: 1,
      response_format: 'b64_json',
    };

    // Add provider-specific options for Imagen
    // Supported aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9
    if (model.startsWith('google/imagen')) {
      requestBody.providerOptions = {
        googleVertex: {
          aspectRatio: aspectRatio,
          safetyFilterLevel: 'block_some',
        },
      };
    }

    // Use Vercel AI Gateway
    const response = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[FishImage] Vercel AI Gateway error:', error);
      throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    console.log('[FishImage] Image generated successfully');

    // Get the base64 image
    const imageBase64 = data.data[0]?.b64_json;

    if (!imageBase64) {
      throw new Error('No image data in response');
    }

    return NextResponse.json({
      success: true,
      imageBase64: imageBase64,
      model: model,
    });
  } catch (error: any) {
    console.error('[FishImage] Generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate image',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
