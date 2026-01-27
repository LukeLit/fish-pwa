/**
 * Video Download API
 * Downloads generated video files from Google Gemini API
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { uploadAsset } from '@/lib/storage/blob-storage';

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

/**
 * POST method to download and save video to blob storage
 */
export async function POST(request: NextRequest) {
  try {
    const { uri } = await request.json();

    if (!uri) {
      return NextResponse.json(
        { error: 'Video URI is required' },
        { status: 400 }
      );
    }

    console.log('[VideoDownload] Downloading video from URI:', uri);

    // Fetch the video from the URI
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }

    const videoBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to blob storage
    const filename = `backgrounds/video_${Date.now()}.mp4`;
    const result = await uploadAsset(filename, videoBuffer, 'video/mp4');

    console.log('[VideoDownload] Video saved to blob storage:', result.url);

    return NextResponse.json({
      success: true,
      url: result.url,
      filename,
    });
  } catch (error: any) {
    console.error('[VideoDownload] POST error:', error);

    return NextResponse.json(
      {
        error: 'Failed to download and save video',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
