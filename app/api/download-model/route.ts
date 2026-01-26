/**
 * Download and save 3D model from Tencent Cloud to local storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { url, filename } = await request.json();

    if (!url || !filename) {
      return NextResponse.json(
        { error: 'URL and filename are required' },
        { status: 400 }
      );
    }

    // Define the public models directory
    const modelsDir = join(process.cwd(), 'public', 'models', 'fish');

    // Ensure directory exists
    if (!existsSync(modelsDir)) {
      await mkdir(modelsDir, { recursive: true });
    }

    const filepath = join(modelsDir, filename);

    // Check if file already exists
    if (existsSync(filepath)) {
      return NextResponse.json({
        success: true,
        localPath: `/models/fish/${filename}`,
        cached: true,
      });
    }

    // Download the model from Tencent Cloud
    console.log('[DownloadModel] Downloading from:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local file system
    await writeFile(filepath, buffer);

    console.log('[DownloadModel] Saved to:', filepath);

    return NextResponse.json({
      success: true,
      localPath: `/models/fish/${filename}`,
      cached: false,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('[DownloadModel] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to download model',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
