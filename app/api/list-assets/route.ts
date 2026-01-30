/**
 * List saved fish sprites and backgrounds from Vercel Blob Storage
 * 
 * Query params:
 * - type: 'fish' | 'background' (default: 'fish')
 * - includeMetadata: 'true' to fetch and include full metadata for backgrounds
 */

import { NextRequest, NextResponse } from 'next/server';
import { listAssets } from '@/lib/storage/blob-storage';
import type { BackgroundAsset } from '@/lib/game/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'fish';
    const includeMetadata = searchParams.get('includeMetadata') === 'true';

    const prefix = type === 'background' ? 'backgrounds/' : 'fish/';

    // List assets from Vercel Blob Storage
    const blobAssets = await listAssets(prefix);

    // For backgrounds with metadata, fetch the .json files and merge
    if (type === 'background' && includeMetadata) {
      // Separate image/video files from metadata files
      const imageFiles = blobAssets.filter(blob =>
        !blob.pathname.endsWith('.json')
      );
      const metadataFiles = blobAssets.filter(blob =>
        blob.pathname.endsWith('.json')
      );

      // Create a map of metadata by background ID
      const metadataMap = new Map<string, BackgroundAsset>();

      // Fetch all metadata in parallel
      const metadataPromises = metadataFiles.map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (response.ok) {
            const metadata = await response.json() as BackgroundAsset;
            // Extract ID from filename (e.g., "shallow_bg.json" -> "shallow_bg")
            const id = blob.pathname.split('/').pop()?.replace('.json', '') || '';
            metadataMap.set(id, metadata);
          }
        } catch (err) {
          console.warn('[ListAssets] Failed to fetch metadata:', blob.url, err);
        }
      });

      await Promise.all(metadataPromises);

      // Combine image files with their metadata
      const backgrounds: BackgroundAsset[] = imageFiles.map((blob) => {
        const filename = blob.pathname.split('/').pop() || '';
        const id = filename.replace(/\.(png|jpg|jpeg|mp4|webm)$/i, '');
        const existingMetadata = metadataMap.get(id);

        if (existingMetadata) {
          // Return full metadata with URL updated to current blob URL
          return {
            ...existingMetadata,
            url: blob.url,
          };
        }

        // No metadata found - create minimal BackgroundAsset
        const isVideo = /\.(mp4|webm)$/i.test(filename);
        return {
          id,
          name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          biomeId: extractBiomeFromId(id),
          type: isVideo ? 'video' : 'image',
          url: blob.url,
          createdAt: blob.uploadedAt.toISOString(),
        } as BackgroundAsset;
      });

      // Sort by createdAt (newest first)
      backgrounds.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      return NextResponse.json({
        success: true,
        backgrounds,
      });
    }

    // Default behavior: simple asset list
    const assets = blobAssets
      .filter(blob => !blob.pathname.endsWith('.json')) // Exclude metadata files from simple list
      .map((blob) => {
        const filename = blob.pathname.split('/').pop() || '';
        return {
          filename,
          url: blob.url,
          timestamp: blob.uploadedAt.getTime().toString(),
        };
      });

    // Sort by timestamp (newest first)
    assets.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

    return NextResponse.json({
      success: true,
      assets,
    });
  } catch (error) {
    console.error('[ListAssets] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list assets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract biome ID from background ID.
 * e.g., "shallow_coral_reef" -> "shallow"
 *       "deep_sea_trench" -> "deep_sea"
 */
function extractBiomeFromId(id: string): string {
  const biomePatterns = [
    'shallow_tropical',
    'medium_polluted',
    'deep_sea',
    'shallow',
    'medium',
    'deep',
    'tropical',
    'polluted',
    'abyssal',
  ];

  for (const pattern of biomePatterns) {
    if (id.startsWith(pattern)) {
      return pattern;
    }
  }

  // Default to shallow if no match
  return 'shallow';
}
