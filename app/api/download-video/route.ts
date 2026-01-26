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

    // Get the file metadata to retrieve the download URI
    // The fileName should be in the format "files/xyz123"
    const fileMetadata = await ai.files.get({ name: fileName });

    if (!fileMetadata.downloadUri) {
      return NextResponse.json(
        { error: 'File is not downloadable or not ready yet' },
        { status: 400 }
      );
    }

    // Fetch the video file from the download URI
    const response = await fetch(fileMetadata.downloadUri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file ${fileName}: ${response.status} ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();

    // Return the video as a blob
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': fileMetadata.mimeType || 'video/mp4',
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
