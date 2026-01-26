/**
 * List saved fish sprites and backgrounds from Vercel Blob Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { listAssets } from '@/lib/storage/blob-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'fish';

    const prefix = type === 'background' ? 'backgrounds/' : 'fish/';

    // List assets from Vercel Blob Storage
    const blobAssets = await listAssets(prefix);

    // Transform to match expected format
    const assets = blobAssets.map((blob) => {
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
  } catch (error: any) {
    console.error('[ListAssets] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list assets',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
