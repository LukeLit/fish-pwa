/**
 * Save background image and metadata to Vercel Blob Storage
 * Saves both the background image and complete metadata together
 * Mirrors the save-creature pattern for consistency
 * 
 * CACHE FIX: Deletes existing files before uploading to force CDN cache invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset } from '@/lib/storage/blob-storage';
import { put, del, list } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const backgroundId = formData.get('backgroundId') as string;
    const imageFile = formData.get('image') as File | null;
    const metadataJson = formData.get('metadata') as string;

    if (!backgroundId || !metadataJson) {
      return NextResponse.json(
        { error: 'backgroundId and metadata are required' },
        { status: 400 }
      );
    }

    const metadata = JSON.parse(metadataJson);

    let imageUrl: string | undefined;

    // Determine file extension based on type
    const isVideo = metadata.type === 'video';
    const extension = isVideo ? 'mp4' : 'png';

    // CACHE FIX: Delete existing image and metadata files first to invalidate CDN cache
    try {
      // Find and delete existing image (check both png and mp4)
      const existingPng = await list({ prefix: `assets/backgrounds/${backgroundId}.png` });
      for (const blob of existingPng.blobs) {
        console.log('[SaveBackground] Deleting existing image:', blob.url);
        await del(blob.url);
      }

      const existingMp4 = await list({ prefix: `assets/backgrounds/${backgroundId}.mp4` });
      for (const blob of existingMp4.blobs) {
        console.log('[SaveBackground] Deleting existing video:', blob.url);
        await del(blob.url);
      }

      // Find and delete existing metadata
      const existingMetadata = await list({ prefix: `assets/backgrounds/${backgroundId}.json` });
      for (const blob of existingMetadata.blobs) {
        console.log('[SaveBackground] Deleting existing metadata:', blob.url);
        await del(blob.url);
      }
    } catch (deleteErr) {
      // Continue even if delete fails - file might not exist
      console.log('[SaveBackground] Delete step (non-fatal):', deleteErr);
    }

    // Upload image if provided
    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const imagePath = `backgrounds/${backgroundId}.${extension}`;
      const contentType = isVideo ? 'video/mp4' : 'image/png';
      const result = await uploadAsset(imagePath, buffer, contentType);
      imageUrl = result.url;

      // Update metadata with image URL BEFORE saving metadata
      metadata.url = imageUrl;
    } else if (metadata.url && metadata.url.startsWith('data:')) {
      // Handle base64 data URL - extract and upload
      const base64Match = metadata.url.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const contentType = base64Match[1];
        const base64Data = base64Match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const imagePath = `backgrounds/${backgroundId}.${extension}`;
        const result = await uploadAsset(imagePath, buffer, contentType);
        imageUrl = result.url;
        metadata.url = imageUrl;
      }
    } else {
      // No image file provided - keep existing URL from metadata if present
      imageUrl = metadata.url;
    }

    // Upload metadata - ensure URL is set
    const metadataPath = `assets/backgrounds/${backgroundId}.json`;

    // Double-check URL is in metadata
    if (imageUrl && metadata.url !== imageUrl) {
      console.warn('[SaveBackground] WARNING: metadata.url does not match imageUrl, fixing...');
      metadata.url = imageUrl;
    }

    // Add timestamp if not present
    if (!metadata.createdAt) {
      metadata.createdAt = new Date().toISOString();
    }

    const metadataJsonString = JSON.stringify(metadata);

    const metadataBlob = await put(metadataPath, metadataJsonString, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });

    // Verify what was actually saved by fetching it back
    const verifyResponse = await fetch(metadataBlob.url);
    const savedMetadata = await verifyResponse.json();

    if (savedMetadata.url !== imageUrl) {
      console.error('[SaveBackground] ERROR: Saved metadata url does not match uploaded image URL!', {
        expected: imageUrl,
        got: savedMetadata.url,
      });
      // Still return success but include warning
      return NextResponse.json({
        success: true,
        backgroundId,
        imageUrl,
        metadataUrl: metadataBlob.url,
        metadata: savedMetadata,
        warning: 'Metadata URL mismatch detected',
      });
    }

    return NextResponse.json({
      success: true,
      backgroundId,
      imageUrl,
      metadataUrl: metadataBlob.url,
      metadata: savedMetadata,
    });
  } catch (error) {
    console.error('[SaveBackground] Error:', error);

    // Check if error is due to missing BLOB_READ_WRITE_TOKEN
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isBlobTokenError = errorMessage.includes('No token found') || errorMessage.includes('BLOB_READ_WRITE_TOKEN');

    return NextResponse.json(
      {
        error: 'Failed to save background',
        message: isBlobTokenError
          ? 'Blob storage token not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.'
          : errorMessage,
        requiresToken: isBlobTokenError,
      },
      { status: 500 }
    );
  }
}
