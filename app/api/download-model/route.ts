/**
 * Download and save 3D model to Vercel Blob Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, listAssets } from '@/lib/storage/blob-storage';

export async function POST(request: NextRequest) {
  try {
    const { url, filename } = await request.json();

    if (!url || !filename) {
      return NextResponse.json(
        { error: 'URL and filename are required' },
        { status: 400 }
      );
    }

    const blobPath = `models/${filename}`;

    // Check if file already exists in blob storage
    const existingAssets = await listAssets(blobPath);
    if (existingAssets.length > 0) {
      console.log('[DownloadModel] Model already exists:', existingAssets[0].url);
      return NextResponse.json({
        success: true,
        localPath: existingAssets[0].url,
        cached: true,
      });
    }

    // Download the model
    console.log('[DownloadModel] Downloading from:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Vercel Blob Storage
    const result = await uploadAsset(blobPath, buffer, 'model/gltf-binary');

    console.log('[DownloadModel] Saved to Vercel Blob:', result.url);

    return NextResponse.json({
      success: true,
      localPath: result.url,
      cached: false,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[DownloadModel] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to download model',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
