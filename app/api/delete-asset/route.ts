/**
 * API endpoint to delete saved assets (fish sprites or backgrounds)
 */
import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const type = searchParams.get('type') || 'fish';

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Determine directory based on type
    const directory = type === 'background'
      ? join(process.cwd(), 'public', 'backgrounds')
      : join(process.cwd(), 'public', 'sprites', 'fish');

    const filePath = join(directory, filename);

    // Security check - ensure path is within the expected directory
    if (!filePath.startsWith(directory)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Delete the file
    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: `Deleted ${filename}`
    });
  } catch (error: unknown) {
    console.error('Delete asset error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete asset'
      },
      { status: 500 }
    );
  }
}
