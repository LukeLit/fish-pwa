/**
 * API endpoint to delete saved assets from Vercel Blob Storage
 */
import { NextRequest, NextResponse } from 'next/server';
import { deleteAsset } from '@/lib/storage/blob-storage';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Delete from Vercel Blob Storage
    await deleteAsset(url);

    return NextResponse.json({
      success: true,
      message: `Deleted asset from Blob Storage`
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
