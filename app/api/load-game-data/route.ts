/**
 * API endpoint for loading game data from Vercel Blob Storage
 */
import { NextRequest, NextResponse } from 'next/server';
import { downloadGameData } from '@/lib/storage/blob-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const defaultValue = searchParams.get('default');

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      );
    }

    // Parse default value if provided
    let parsedDefault = null;
    if (defaultValue) {
      parsedDefault = JSON.parse(defaultValue);
    }

    // Download from Vercel Blob Storage
    const data = await downloadGameData(key, parsedDefault);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Load game data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load game data'
      },
      { status: 500 }
    );
  }
}
