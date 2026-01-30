/**
 * Cron Job Handler
 * 
 * Called by Vercel Cron to process background jobs.
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for cron

/**
 * GET /api/cron - Process all pending jobs
 * 
 * This endpoint is called by Vercel Cron on a schedule.
 * It processes all pending clip generation jobs and cleans up old completed jobs.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In development, allow without auth
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[Cron] Starting job processing...');

    const results: Record<string, any> = {};

    // Process clip generation jobs
    try {
      const clipResponse = await fetch(
        `${getBaseUrl(request)}/api/jobs/clip-generation?processAll=true`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const clipData = await clipResponse.json();
      results.clipGeneration = {
        processed: clipData.processed || 0,
        jobs: clipData.jobs?.map((j: any) => ({ id: j.id, status: j.status })) || [],
      };
      console.log(`[Cron] Processed ${results.clipGeneration.processed} clip generation jobs`);
    } catch (error: any) {
      console.error('[Cron] Clip generation error:', error);
      results.clipGeneration = { error: error.message };
    }

    // Cleanup old completed jobs (older than 24 hours)
    try {
      const { cleanupOldJobs } = await import('@/lib/jobs/job-store');
      const cleaned = await cleanupOldJobs(24);
      results.cleanup = { deleted: cleaned };
      if (cleaned > 0) {
        console.log(`[Cron] Cleaned up ${cleaned} old jobs`);
      }
    } catch (error: any) {
      console.error('[Cron] Cleanup error:', error);
      results.cleanup = { error: error.message };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get the base URL for internal API calls
 */
function getBaseUrl(request: NextRequest): string {
  // In production, use the Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // In development, construct from request
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
