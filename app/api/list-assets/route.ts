/**
 * List saved fish sprites and backgrounds
 */

import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'fish';

    let directory: string;
    let urlPrefix: string;

    if (type === 'background') {
      directory = join(process.cwd(), 'public', 'backgrounds');
      urlPrefix = '/backgrounds/';
    } else {
      directory = join(process.cwd(), 'public', 'sprites', 'fish');
      urlPrefix = '/sprites/fish/';
    }

    // Check if directory exists
    if (!existsSync(directory)) {
      return NextResponse.json({
        success: true,
        assets: [],
      });
    }

    // Read directory
    const files = await readdir(directory);

    // Filter for image files and exclude README
    const imageFiles = files.filter((file) => {
      const lower = file.toLowerCase();
      return (
        (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) &&
        !lower.includes('readme')
      );
    });

    // Create asset objects with metadata
    const assets = imageFiles.map((file) => ({
      filename: file,
      url: urlPrefix + file,
      timestamp: file.match(/\d+/)?.[0] || '0',
    }));

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
