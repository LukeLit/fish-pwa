/**
 * Video Generation API
 * Uses Google Veo 3.1 via Gemini API for video generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'veo-3.1-generate-preview', aspectRatio = '16:9', resolution = '720p', referenceImages } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
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

    console.log('[VideoGen] Generating video with', model, ':', prompt.substring(0, 50) + '...');

    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Prepare the request
    const requestConfig: any = {
      model: model,
      prompt: prompt,
    };

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      requestConfig.referenceImages = referenceImages.slice(0, 3); // Max 3 images
    }

    // Start video generation (this returns an operation)
    const operation = await ai.models.generateVideos(requestConfig);

    console.log('[VideoGen] Video generation started, operation:', operation.name);

    // Return the operation name for polling
    return NextResponse.json({
      success: true,
      operation: operation.name,
      status: 'processing',
    });
  } catch (error: any) {
    console.error('[VideoGen] Generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate video',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Poll operation status
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
    // Create an operation object with the name for polling
    const operation = await ai.operations.getVideosOperation({ 
      operation: { name: operationName } as any 
    });

    // Check if operation is complete
    if (operation.done) {
      if (operation.response?.generatedVideos && operation.response.generatedVideos.length > 0) {
        const video = operation.response.generatedVideos[0].video;
        
        // The video object contains a URI that can be used to download the file
        // Return the video information to the client
        return NextResponse.json({
          success: true,
          status: 'completed',
          video: video ? {
            uri: video.uri,
            mimeType: video.mimeType,
          } : undefined,
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
    console.error('[VideoGen] Poll error:', error);

    return NextResponse.json(
      {
        error: 'Failed to check operation status',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
