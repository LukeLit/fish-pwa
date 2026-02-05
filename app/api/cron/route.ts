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

    const results: Record<string, any> = {};

    // Process clip generation jobs directly (no HTTP call)
    try {
      const processed = await processClipGenerationJobs();
      results.clipGeneration = processed;
    } catch (error: any) {
      results.clipGeneration = { error: error.message };
    }

    // Cleanup old completed jobs (older than 24 hours)
    try {
      const cleaned = await cleanupOldJobs(24);
      results.cleanup = { deleted: cleaned };
    } catch (error: any) {
      results.cleanup = { error: error.message };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Cron job failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Maximum number of jobs to process per cron run
 * This prevents runaway API calls
 */
const MAX_JOBS_PER_CRON = 2;

/**
 * Delay between processing jobs (ms) to avoid rate limiting
 */
const DELAY_BETWEEN_JOBS_MS = 2000;

/**
 * Process pending clip generation jobs SEQUENTIALLY with limits
 * This prevents the burst of parallel API calls that caused rate limiting
 */
async function processClipGenerationJobs(): Promise<{ processed: number; jobs: any[]; skipped: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { processed: 0, jobs: [], skipped: 0 };
  }

  const ai = new GoogleGenAI({ apiKey });

  // Get all processing jobs
  const processingJobs = await getJobsByStatus('processing');
  const clipJobs = processingJobs.filter(j => j.type === 'clip_generation') as ClipGenerationJob[];

  if (clipJobs.length === 0) {
    return { processed: 0, jobs: [], skipped: 0 };
  }

  // Limit to MAX_JOBS_PER_CRON to prevent burst API calls
  const jobsToProcess = clipJobs.slice(0, MAX_JOBS_PER_CRON);
  const skipped = clipJobs.length - jobsToProcess.length;

  // Process jobs SEQUENTIALLY (not in parallel) to avoid rate limits
  const results: ClipGenerationJob[] = [];
  for (let i = 0; i < jobsToProcess.length; i++) {
    const job = jobsToProcess[i];

    try {
      const result = await processClipJob(ai, job);
      results.push(result);
    } catch (err: any) {
      results.push(job);
    }

    // Add delay between jobs to avoid rate limiting (except after last job)
    if (i < jobsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_JOBS_MS));
    }
  }

  return {
    processed: results.length,
    jobs: results.map(j => ({ id: j.id, status: j.status })),
    skipped,
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

    if (operation.done) {
      // Check for errors
      if (operation.error) {
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: operation.error.message || 'Video generation failed',
        }) || job;
      }

      // Get the video URI - handle different response formats
      let videoUri: string | undefined;

      // Try different paths in the response (Google API format varies)
      const generatedSamples = operation.response?.generateVideoResponse?.generatedSamples;
      if (generatedSamples?.[0]?.video?.uri) {
        videoUri = generatedSamples[0].video.uri;
      } else if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        videoUri = operation.response.generatedVideos[0].video.uri;
      } else if (operation.result?.videos?.[0]?.uri) {
        // Alternative path some APIs use
        videoUri = operation.result.videos[0].uri;
      }

      if (!videoUri) {
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: 'Video generation completed but no video URI returned. Check logs for response format.',
        }) || job;
      }

      // Update progress
      await updateJob<ClipGenerationJob>(job.id, {
        progress: 60,
        progressMessage: 'Video generated, downloading...',
      });

      // Download and save the video
      try {
        const videoResponse = await fetch(videoUri);
        if (!videoResponse.ok) {
          const errorText = await videoResponse.text().catch(() => 'Could not read error body');
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const videoPath = `creatures/${job.input.creatureId}/clips/${job.input.action}.mp4`;
        const videoResult = await uploadAsset(videoPath, videoBuffer, 'video/mp4');

        const result = await updateJob<ClipGenerationJob>(job.id, {
          status: 'completed',
          progress: 100,
          progressMessage: 'Clip generation complete!',
          result: {
            videoUrl: videoResult.url,
            duration: 4000,
            frameRate: 24,
          },
        });

        return result || job;
      } catch (downloadError: any) {
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
