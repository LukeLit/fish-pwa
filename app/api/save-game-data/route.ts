/**
 * API endpoint for saving game data to Vercel Blob Storage
 */
import { NextRequest, NextResponse } from 'next/server';
import { uploadGameData } from '@/lib/storage/blob-storage';

export async function POST(request: NextRequest) {
  try {
    const { key, data } = await request.json();

    if (!key || data === undefined) {
      return NextResponse.json(
        { success: false, error: 'Key and data are required' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob Storage
    const url = await uploadGameData(key, data);

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error: unknown) {
    console.error('Save game data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save game data'
      },
      { status: 500 }
    );
  }
}
