/**
 * Save sprite or background image to Vercel Blob Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, listAssets, assetExists } from '@/lib/storage/blob-storage';

export async function POST(request: NextRequest) {
  try {
    // Check if this is a FormData request (for video files)
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle video/file upload
      const formData = await request.formData();
      const videoFile = formData.get('video') as File | null;
      const filename = formData.get('filename') as string;

      if (!videoFile || !filename) {
        return NextResponse.json(
          { error: 'Video file and filename are required' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await videoFile.arrayBuffer());
      const blobPath = `backgrounds/${filename}`;

      // Upload to Vercel Blob Storage
      const result = await uploadAsset(blobPath, buffer, videoFile.type);

      console.log('[SaveSprite] Saved video to Vercel Blob:', result.url);

      return NextResponse.json({
        success: true,
        localPath: result.url,
        cached: false,
        size: buffer.length,
      });
    }

    // Handle image upload (existing logic)
    const { imageBase64, imageUrl, filename, type = 'fish' } = await request.json();

    if ((!imageBase64 && !imageUrl) || !filename) {
      return NextResponse.json(
        { error: 'Image data and filename are required' },
        { status: 400 }
      );
    }

    // Define the blob path based on type
    const blobPath = type === 'background' 
      ? `backgrounds/${filename}` 
      : `fish/${filename}`;

    // Check if file already exists in blob storage
    const exists = await assetExists(blobPath);
    if (exists) {
      // Need to get the full URL - list with specific prefix
      const assets = await listAssets(blobPath);
      if (assets.length > 0) {
        console.log('[SaveSprite] Asset already exists:', assets[0].url);
        return NextResponse.json({
          success: true,
          localPath: assets[0].url,
          cached: true,
        });
      }
    }

    let buffer: Buffer;

    if (imageBase64) {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (imageUrl) {
      // Download from URL
      console.log('[SaveSprite] Downloading from:', imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('No valid image data provided');
    }

    // Upload to Vercel Blob Storage
    const result = await uploadAsset(blobPath, buffer, 'image/png');

    console.log('[SaveSprite] Saved to Vercel Blob:', result.url);

    return NextResponse.json({
      success: true,
      localPath: result.url,
      cached: false,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[SaveSprite] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save sprite',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
