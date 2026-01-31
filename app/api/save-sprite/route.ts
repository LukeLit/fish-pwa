/**
 * Save sprite or background image to Vercel Blob Storage
 * 
 * For fish sprites, generates multi-resolution variants (512, 256, 128)
 * to optimize rendering at different screen sizes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, listAssets, assetExists } from '@/lib/storage/blob-storage';
import {
  generateResolutionVariants,
  getVariantFilename,
  type ResolutionUrls
} from '@/lib/assets/image-processor';

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
    const { imageBase64, imageUrl, filename, type = 'fish', generateVariants = true } = await request.json();

    if ((!imageBase64 && !imageUrl) || !filename) {
      return NextResponse.json(
        { error: 'Image data and filename are required' },
        { status: 400 }
      );
    }

    // Define the blob path based on type
    const directory = type === 'background' ? 'backgrounds'
      : type === 'creature' ? 'creatures'
        : 'fish';
    const baseBlobPath = `${directory}/${filename}`;

    // For fish and creature sprites, check if all resolution variants exist
    const isSpriteWithVariants = type === 'fish' || type === 'creature';

    if (isSpriteWithVariants && generateVariants) {
      // Check if all variants exist
      const highPath = baseBlobPath;
      const mediumPath = `${directory}/${getVariantFilename(filename, 'medium')}`;
      const lowPath = `${directory}/${getVariantFilename(filename, 'low')}`;

      const [highExists, mediumExists, lowExists] = await Promise.all([
        assetExists(highPath),
        assetExists(mediumPath),
        assetExists(lowPath),
      ]);

      // If all variants exist, return cached response with all URLs
      if (highExists && mediumExists && lowExists) {
        const [highAssets, mediumAssets, lowAssets] = await Promise.all([
          listAssets(highPath),
          listAssets(mediumPath),
          listAssets(lowPath),
        ]);

        if (highAssets.length > 0 && mediumAssets.length > 0 && lowAssets.length > 0) {
          console.log('[SaveSprite] All resolution variants exist:', highAssets[0].url);
          return NextResponse.json({
            success: true,
            localPath: highAssets[0].url,
            cached: true,
            spriteResolutions: {
              high: highAssets[0].url,
              medium: mediumAssets[0].url,
              low: lowAssets[0].url,
            } as ResolutionUrls,
          });
        }
      }
    } else {
      // For backgrounds or when variants disabled, use simple existence check
      const exists = await assetExists(baseBlobPath);
      if (exists) {
        const assets = await listAssets(baseBlobPath);
        if (assets.length > 0) {
          console.log('[SaveSprite] Asset already exists:', assets[0].url);
          return NextResponse.json({
            success: true,
            localPath: assets[0].url,
            cached: true,
          });
        }
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

    // For fish/creature sprites, generate and upload resolution variants
    if (isSpriteWithVariants && generateVariants) {
      console.log('[SaveSprite] Generating resolution variants for:', filename);

      const variants = await generateResolutionVariants(buffer);

      // Upload all variants in parallel
      const [highResult, mediumResult, lowResult] = await Promise.all([
        uploadAsset(`${directory}/${filename}`, variants.high, 'image/png'),
        uploadAsset(`${directory}/${getVariantFilename(filename, 'medium')}`, variants.medium, 'image/png'),
        uploadAsset(`${directory}/${getVariantFilename(filename, 'low')}`, variants.low, 'image/png'),
      ]);

      console.log('[SaveSprite] Saved all variants to Vercel Blob:', {
        high: highResult.url,
        medium: mediumResult.url,
        low: lowResult.url,
      });

      return NextResponse.json({
        success: true,
        localPath: highResult.url,
        cached: false,
        size: variants.high.length,
        spriteResolutions: {
          high: highResult.url,
          medium: mediumResult.url,
          low: lowResult.url,
        } as ResolutionUrls,
      });
    }

    // Upload single file (backgrounds or variants disabled)
    const result = await uploadAsset(baseBlobPath, buffer, 'image/png');

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
