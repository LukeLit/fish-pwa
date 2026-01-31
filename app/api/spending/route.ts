/**
 * Spending Status API
 * 
 * Get current spending status and limits for video generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpendingStatus, getSpendingHistory } from '@/lib/jobs/spending-tracker';

/**
 * GET /api/spending - Get current spending status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';

    const status = await getSpendingStatus();

    if (includeHistory) {
      const history = await getSpendingHistory();
      return NextResponse.json({
        success: true,
        ...status,
        history,
      });
    }

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('[Spending API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get spending status', message: error.message },
      { status: 500 }
    );
  }
}
