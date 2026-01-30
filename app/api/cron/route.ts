/**
 * Cron Job Handler
 * 
 * Called by Vercel Cron to process background jobs.
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getJobsByStatus, cleanupOldJobs, updateJob, getJob } from '@/lib/jobs/job-store';
import { uploadAsset } from '@/lib/storage/blob-storage';
import type { ClipGenerationJob } from '@/lib/jobs/types';

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

    // Process clip generation jobs directly (no HTTP call)
    try {
      const processed = await processClipGenerationJobs();
      results.clipGeneration = processed;
      console.log(`[Cron] Processed ${processed.processed} clip generation jobs`);
    } catch (error: any) {
      console.error('[Cron] Clip generation error:', error);
      results.clipGeneration = { error: error.message };
    }

    // Cleanup old completed jobs (older than 24 hours)
    try {
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
 * Process all pending clip generation jobs
 */
async function processClipGenerationJobs(): Promise<{ processed: number; jobs: any[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[Cron] GEMINI_API_KEY not configured, skipping clip processing');
    return { processed: 0, jobs: [] };
  }

  const ai = new GoogleGenAI({ apiKey });

  // Get all processing jobs
  const processingJobs = await getJobsByStatus('processing');
  const clipJobs = processingJobs.filter(j => j.type === 'clip_generation') as ClipGenerationJob[];

  if (clipJobs.length === 0) {
    return { processed: 0, jobs: [] };
  }

  console.log(`[Cron] Found ${clipJobs.length} clip generation jobs to process`);

  const results = await Promise.all(
    clipJobs.map(job => processClipJob(ai, job).catch(err => {
      console.error(`[Cron] Error processing job ${job.id}:`, err);
      return job;
    }))
  );

  return {
    processed: results.length,
    jobs: results.map(j => ({ id: j.id, status: j.status })),
  };
}

/**
 * Process a single clip generation job
 */
async function processClipJob(
  ai: GoogleGenAI,
  job: ClipGenerationJob
): Promise<ClipGenerationJob> {
  // Skip if already completed or failed
  if (job.status === 'completed' || job.status === 'failed') {
    return job;
  }

  // Need operation ID to poll
  if (!job.operationId) {
    return await updateJob<ClipGenerationJob>(job.id, {
      status: 'failed',
      error: 'No operation ID - job may not have started correctly',
    }) || job;
  }

  try {
    // Poll the operation status using REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${job.operationId}?key=${process.env.GEMINI_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Cron] Poll error for ${job.id}:`, errorText);
      
      // Don't fail immediately - might be transient
      const elapsedMinutes = (Date.now() - new Date(job.createdAt).getTime()) / 60000;
      if (elapsedMinutes > 15) {
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: `Generation timed out after ${Math.round(elapsedMinutes)} minutes`,
        }) || job;
      }
      
      return job;
    }

    const operation = await response.json();
    console.log(`[Cron] Operation status for ${job.id}: done=${operation.done}`);

    if (operation.done) {
      // Check for errors
      if (operation.error) {
        console.error(`[Cron] Operation error for ${job.id}:`, operation.error);
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: operation.error.message || 'Video generation failed',
        }) || job;
      }

      // Log the full response structure for debugging
      console.log(`[Cron] Full response for ${job.id}:`, JSON.stringify(operation.response || operation).substring(0, 1000));

      // Get the video URI - handle different response formats
      let videoUri: string | undefined;
      
      // Try different paths in the response (Google API format varies)
      const generatedSamples = operation.response?.generateVideoResponse?.generatedSamples;
      if (generatedSamples?.[0]?.video?.uri) {
        videoUri = generatedSamples[0].video.uri;
        console.log(`[Cron] Found video URI via generatedSamples path`);
      } else if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        videoUri = operation.response.generatedVideos[0].video.uri;
        console.log(`[Cron] Found video URI via generatedVideos path`);
      } else if (operation.result?.videos?.[0]?.uri) {
        // Alternative path some APIs use
        videoUri = operation.result.videos[0].uri;
        console.log(`[Cron] Found video URI via result.videos path`);
      }

      if (!videoUri) {
        console.error('[Cron] No video URI found. Response keys:', Object.keys(operation.response || operation));
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: 'Video generation completed but no video URI returned. Check logs for response format.',
        }) || job;
      }

      console.log(`[Cron] Video URI for ${job.id}: ${videoUri.substring(0, 100)}...`);

      // Update progress
      await updateJob<ClipGenerationJob>(job.id, {
        progress: 60,
        progressMessage: 'Video generated, downloading...',
      });

      // Download and save the video
      try {
        console.log(`[Cron] Downloading video for ${job.id}...`);
        const videoResponse = await fetch(videoUri);
        if (!videoResponse.ok) {
          const errorText = await videoResponse.text().catch(() => 'Could not read error body');
          console.error(`[Cron] Download failed for ${job.id}: ${videoResponse.status}`, errorText.substring(0, 200));
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        console.log(`[Cron] Downloaded ${videoBuffer.length} bytes for ${job.id}`);
        const videoPath = `creatures/${job.input.creatureId}/clips/${job.input.action}.mp4`;
        const videoResult = await uploadAsset(videoPath, videoBuffer, 'video/mp4');

        console.log(`[Cron] Video saved for ${job.id}: ${videoResult.url}`);

        const result = await updateJob<ClipGenerationJob>(job.id, {
          status: 'completed',
          progress: 100,
          progressMessage: 'Clip generation complete!',
          result: {
            videoUrl: videoResult.url,
            thumbnailUrl: '',
            frames: [],
            duration: 4000,
            frameRate: 24,
          },
        });

        return result || job;
      } catch (downloadError: any) {
        console.error(`[Cron] Download/save error for ${job.id}:`, downloadError.message, downloadError.stack);
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: `Failed to download video: ${downloadError.message}`,
        }) || job;
      }
    }

    // Still processing - update progress based on elapsed time
    const elapsedSeconds = (Date.now() - new Date(job.createdAt).getTime()) / 1000;
    const estimatedProgress = Math.min(10 + (elapsedSeconds / 120) * 50, 55);

    return await updateJob<ClipGenerationJob>(job.id, {
      progress: Math.round(estimatedProgress),
      progressMessage: `Generating video... (${Math.round(elapsedSeconds)}s)`,
    }) || job;
  } catch (error: any) {
    console.error(`[Cron] Process error for ${job.id}:`, error);
    
    const elapsedMinutes = (Date.now() - new Date(job.createdAt).getTime()) / 60000;
    if (elapsedMinutes > 15) {
      return await updateJob<ClipGenerationJob>(job.id, {
        status: 'failed',
        error: error.message || 'Unknown error during processing',
      }) || job;
    }

    return job;
  }
}
