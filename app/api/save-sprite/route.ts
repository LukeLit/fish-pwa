/**
 * Save sprite or background image to local filesystem
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageUrl, filename, type = 'fish' } = await request.json();

    if ((!imageBase64 && !imageUrl) || !filename) {
      return NextResponse.json(
        { error: 'Image data and filename are required' },
        { status: 400 }
      );
    }

    // Define the directory based on type
    let targetDir: string;
    let urlPath: string;

    if (type === 'background') {
      targetDir = join(process.cwd(), 'public', 'backgrounds');
      urlPath = `/backgrounds/${filename}`;
    } else {
      targetDir = join(process.cwd(), 'public', 'sprites', 'fish');
      urlPath = `/sprites/fish/${filename}`;
    }

    // Ensure directory exists
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    const filepath = join(targetDir, filename);

    // Check if file already exists
    if (existsSync(filepath)) {
      return NextResponse.json({
        success: true,
        localPath: urlPath,
        cached: true,
      });
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

    // Save to local file system
    await writeFile(filepath, buffer);

    console.log('[SaveSprite] Saved to:', filepath);

    return NextResponse.json({
      success: true,
      localPath: urlPath,
      cached: false,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('[SaveSprite] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save sprite',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
