/**
 * Video Download API
 * Downloads generated video files from Google Gemini API
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
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

    // Download the video file
    // The file object from the operation response should be passed
    // For now, we'll construct it from the file name
    // Note: The actual file object structure may need adjustment based on SDK behavior
    const videoBuffer = await ai.files.download({
      file: { name: fileName } as any,
    });

    // The SDK download method may return a Buffer or Uint8Array
    // Convert to a proper response
    const buffer = videoBuffer instanceof Uint8Array 
      ? Buffer.from(videoBuffer) 
      : videoBuffer;

    // Return the video as a blob
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video-${Date.now()}.mp4"`,
      },
    });
  } catch (error: any) {
    console.error('[VideoDownload] Download error:', error);

    return NextResponse.json(
      {
        error: 'Failed to download video',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
