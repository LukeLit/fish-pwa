/**
 * Clip Generation Job API
 * 
 * Start and process clip generation jobs using the job system.
 * This provides better reliability than direct polling from the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createJob, updateJob, getJob, generateJobId } from '@/lib/jobs/job-store';
import { uploadAsset } from '@/lib/storage/blob-storage';
import type { ClipGenerationJob } from '@/lib/jobs/types';
import type { ClipAction } from '@/lib/game/types';

// Simple in-memory lock to prevent concurrent processing of the same job
// Note: This only works within a single serverless instance, but helps reduce race conditions
const processingJobs = new Set<string>();

/**
 * Action-specific prompts for different animations
 */
const ACTION_PROMPTS: Record<string, { prompt: string; loop: boolean }> = {
  swimIdle: {
    prompt: 'Fish swimming slowly and gracefully, gentle undulating body motion, subtle fin movements, relaxed swimming, side view',
    loop: true,
  },
  swimFast: {
    prompt: 'Fish swimming rapidly, powerful tail strokes, dynamic body wave, urgent swimming motion, side view',
    loop: true,
  },
  dash: {
    prompt: 'Fish performing quick burst of speed, explosive acceleration, streamlined body, side view',
    loop: false,
  },
  bite: {
    prompt: 'Fish biting and chomping, quick snapping jaw motion, mouth opening and closing aggressively, predatory strike, side view',
    loop: false,
  },
  takeDamage: {
    prompt: 'Fish recoiling from impact, flinching motion, brief shake and recovery, hurt reaction, side view',
    loop: false,
  },
  death: {
    prompt: 'Fish floating lifelessly, slow descent, fading motion, belly up, side view',
    loop: false,
  },
};

/**
 * POST - Start a new clip generation job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatureId, action, spriteUrl, description } = body;

    // Validate inputs
    if (!creatureId || !action || !spriteUrl) {
      return NextResponse.json(
        { error: 'creatureId, action, and spriteUrl are required' },
        { status: 400 }
      );
    }

    if (!ACTION_PROMPTS[action]) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Create the job record
    const jobId = generateJobId();
    const job = await createJob<ClipGenerationJob>({
      id: jobId,
      type: 'clip_generation',
      status: 'pending',
      progress: 0,
      progressMessage: 'Initializing video generation...',
      input: {
        creatureId,
        action,
        spriteUrl,
        description,
      },
    });

    // Build the prompt
    const actionConfig = ACTION_PROMPTS[action];
    let prompt = actionConfig.prompt;
    if (description) {
      prompt = `${description}, ${prompt}`;
    }
    prompt += ', solid bright magenta background (#FF00FF), isolated on magenta, no other background elements, game sprite animation, clean edges';

    console.log(`[ClipJob] Starting job ${jobId} for ${creatureId}/${action}`);
    console.log(`[ClipJob] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[ClipJob] Sprite URL: ${spriteUrl.substring(0, 100)}...`);

    // Validate sprite URL is accessible
    try {
      const spriteCheck = await fetch(spriteUrl, { method: 'HEAD' });
      if (!spriteCheck.ok) {
        throw new Error(`Sprite URL not accessible: ${spriteCheck.status}`);
      }
      console.log(`[ClipJob] Sprite URL validated`);
    } catch (spriteError: any) {
      console.error(`[ClipJob] Sprite validation failed:`, spriteError.message);
      await updateJob<ClipGenerationJob>(jobId, {
        status: 'failed',
        error: `Invalid sprite URL: ${spriteError.message}`,
      });
      return NextResponse.json({
        success: false,
        jobId,
        error: `Sprite URL not accessible: ${spriteError.message}`,
      }, { status: 400 });
    }

    // Start video generation
    const ai = new GoogleGenAI({ apiKey });

    try {
      // Use any type to bypass SDK type limitations
      const requestConfig: any = {
        model: 'veo-3.1-generate-preview',
        prompt,
        referenceImages: [spriteUrl],
      };
      console.log(`[ClipJob] Calling Gemini video API...`);
      const operation = await ai.models.generateVideos(requestConfig);
      console.log(`[ClipJob] Gemini response: operation name=${operation?.name}`);

      // Update job with operation ID
      await updateJob<ClipGenerationJob>(jobId, {
        status: 'processing',
        progress: 10,
        progressMessage: 'Video generation started...',
        operationId: operation.name,
      });

      console.log(`[ClipJob] Job ${jobId} started with operation: ${operation.name}`);

      return NextResponse.json({
        success: true,
        jobId,
        status: 'processing',
        message: 'Clip generation job started. Poll /api/jobs?id=JOB_ID for status.',
      });
    } catch (genError: any) {
      console.error(`[ClipJob] Video generation failed for ${jobId}:`, genError);
      console.error(`[ClipJob] Error details:`, JSON.stringify(genError, null, 2));

      // Update job as failed
      await updateJob<ClipGenerationJob>(jobId, {
        status: 'failed',
        error: genError.message || 'Failed to start video generation',
      });

      return NextResponse.json({
        success: false,
        jobId,
        error: genError.message || 'Failed to start video generation',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[ClipJob] Start error:', error);
    return NextResponse.json(
      { error: 'Failed to start clip generation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Poll job status or process jobs
 * 
 * Query params:
 * - jobId: Get status of a specific job (read-only by default)
 * - process=true: Also process the job (poll Google API, download video, etc.)
 * - processAll=true: Process all pending jobs (for cron)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const shouldProcess = searchParams.get('process') === 'true';
    const processAll = searchParams.get('processAll') === 'true';

    // Poll a specific job's status (read-only unless process=true)
    if (jobId) {
      const job = await getJob(jobId);
      if (!job || job.type !== 'clip_generation') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      // If process=true, also process the job
      if (shouldProcess) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return NextResponse.json(
            { error: 'GEMINI_API_KEY not configured' },
            { status: 500 }
          );
        }
        const ai = new GoogleGenAI({ apiKey });
        const result = await processClipJob(ai, job as ClipGenerationJob);
        return NextResponse.json({ success: true, job: result });
      }

      // Read-only: just return current status
      return NextResponse.json({ success: true, job });
    }

    // Process all pending/processing jobs (for cron)
    if (processAll) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'GEMINI_API_KEY not configured' },
          { status: 500 }
        );
      }
      const ai = new GoogleGenAI({ apiKey });

      const { getJobsByStatus } = await import('@/lib/jobs/job-store');
      const processingJobs = await getJobsByStatus('processing');
      const clipJobs = processingJobs.filter(j => j.type === 'clip_generation') as ClipGenerationJob[];

      console.log(`[ClipJob] Processing ${clipJobs.length} jobs`);

      const results = await Promise.all(
        clipJobs.map(job => processClipJob(ai, job).catch(err => {
          console.error(`[ClipJob] Error processing ${job.id}:`, err);
          return job;
        }))
      );

      return NextResponse.json({
        success: true,
        processed: results.length,
        jobs: results,
      });
    }

    return NextResponse.json(
      { error: 'jobId or processAll=true is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[ClipJob] Process error:', error);
    return NextResponse.json(
      { error: 'Failed to process job', message: error.message },
      { status: 500 }
    );
  }
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

  // Check if this job is already being processed (in-memory lock)
  if (processingJobs.has(job.id)) {
    console.log(`[ClipJob] Job ${job.id} is already being processed, skipping`);
    return job;
  }

  // Acquire lock
  processingJobs.add(job.id);

  try {
    return await doProcessClipJob(ai, job);
  } finally {
    // Release lock
    processingJobs.delete(job.id);
  }
}

/**
 * Internal processing logic (called with lock held)
 */
async function doProcessClipJob(
  ai: GoogleGenAI,
  job: ClipGenerationJob
): Promise<ClipGenerationJob> {

  // Need operation ID to poll
  if (!job.operationId) {
    return await updateJob<ClipGenerationJob>(job.id, {
      status: 'failed',
      error: 'No operation ID - job may not have started correctly',
    }) || job;
  }

  try {
    // Poll the operation status
    // Note: We need to use the low-level API since getVideosOperation has issues
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${job.operationId}?key=${process.env.GEMINI_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ClipJob] Poll error for ${job.id}:`, errorText);

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
    console.log(`[ClipJob] Operation status for ${job.id}: done=${operation.done}`);

    if (operation.done) {
      // Check for errors
      if (operation.error) {
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: operation.error.message || 'Video generation failed',
        }) || job;
      }

      // Get the video URI
      const generatedVideo = operation.response?.generateVideoResponse?.generatedSamples?.[0];
      const videoUri = generatedVideo?.video?.uri;

      if (!videoUri) {
        console.error('[ClipJob] No video URI in response:', JSON.stringify(operation.response));
        return await updateJob<ClipGenerationJob>(job.id, {
          status: 'failed',
          error: 'Video generation completed but no video URI returned',
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
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const videoPath = `creatures/${job.input.creatureId}/clips/${job.input.action}.mp4`;
        const videoResult = await uploadAsset(videoPath, videoBuffer, 'video/mp4');

        console.log(`[ClipJob] Video saved for ${job.id}: ${videoResult.url}`);

        // TODO: Extract frames (would need client-side or different server-side approach)
        // For now, just save the video and mark complete

        const result = await updateJob<ClipGenerationJob>(job.id, {
          status: 'completed',
          progress: 100,
          progressMessage: 'Clip generation complete!',
          result: {
            videoUrl: videoResult.url,
            thumbnailUrl: '', // TODO: Generate thumbnail
            frames: [], // TODO: Extract frames
            duration: 4000, // Default 4 seconds
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
    const estimatedProgress = Math.min(10 + (elapsedSeconds / 120) * 50, 55); // Estimate 2 min total

    return await updateJob<ClipGenerationJob>(job.id, {
      progress: Math.round(estimatedProgress),
      progressMessage: `Generating video... (${Math.round(elapsedSeconds)}s)`,
    }) || job;
  } catch (error: any) {
    console.error(`[ClipJob] Process error for ${job.id}:`, error);

    // Don't fail immediately on transient errors
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
