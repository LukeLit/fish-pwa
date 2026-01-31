/**
 * Clip Generation Job API
 * 
 * Start and process clip generation jobs using the job system.
 * This provides better reliability than direct polling from the client.
 * 
 * Supports multiple providers:
 * - Google Veo (veo-3.1-*)
 * - Fal.ai (fal/wan-2.1, fal/kling-*)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { fal } from '@fal-ai/client';
import { put } from '@vercel/blob';
import { createJob, updateJob, getJob, generateJobId, getJobsByStatus } from '@/lib/jobs/job-store';
import { uploadAsset } from '@/lib/storage/blob-storage';
import { canGenerateVideo, recordVideoGeneration } from '@/lib/jobs/spending-tracker';
import type { ClipGenerationJob } from '@/lib/jobs/types';
import type { ClipAction } from '@/lib/game/types';

// Fal model configurations
const FAL_MODELS: Record<string, { id: string; name: string }> = {
  'wan-2.1': { id: 'fal-ai/wan-i2v', name: 'Wan 2.1' },
  'kling-2.1-standard': { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', name: 'Kling 2.1 Std' },
  'kling-2.1-pro': { id: 'fal-ai/kling-video/v2.1/pro/image-to-video', name: 'Kling 2.1 Pro' },
};

/**
 * Immediately backup operation ID to blob storage
 * This ensures we can recover even if everything else fails
 */
async function backupOperationId(
  operationId: string,
  jobId: string,
  creatureId: string,
  action: string,
  spriteUrl: string
): Promise<void> {
  try {
    const backup = {
      operationId,
      jobId,
      creatureId,
      action,
      spriteUrl,
      timestamp: new Date().toISOString(),
      recovered: false,
    };

    const backupPath = `operations/${jobId}.json`;
    await put(backupPath, JSON.stringify(backup, null, 2), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    });

    console.log(`[ClipJob] BACKUP: Operation ID saved to ${backupPath}`);
    console.log(`[ClipJob] BACKUP: operationId=${operationId}`);
  } catch (backupError) {
    // Log but don't fail - this is a safety net
    console.error(`[ClipJob] BACKUP FAILED:`, backupError);
    // Still log the operation ID to stdout as last resort
    console.log(`[ClipJob] CRITICAL BACKUP - operationId=${operationId}, jobId=${jobId}, creatureId=${creatureId}, action=${action}`);
  }
}

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
    const {
      creatureId,
      action,
      spriteUrl,
      description,
      // Video generation settings (with defaults)
      model = 'fal/wan-2.1',
      provider: providedProvider,
      durationSeconds = 5,
      resolution = '720p',
      aspectRatio = '1:1',
      negativePrompt = 'blurry, distorted, low quality, text, watermark',
    } = body;

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

    // Determine provider from model ID
    const isFalModel = model.startsWith('fal/');
    const provider = providedProvider || (isFalModel ? 'fal' : 'veo');
    const falModelKey = isFalModel ? model.replace('fal/', '') : null;

    // Model-specific configurations
    const MODEL_CONFIG: Record<string, {
      validDurations: number[];
      validResolutions: string[];
      validAspectRatios: string[];
      defaultDuration: number;
      defaultAspectRatio: string;
    }> = {
      'wan-2.1': {
        validDurations: [5, 6],
        validResolutions: ['480p', '720p'],
        validAspectRatios: ['auto', '1:1', '16:9', '9:16'],
        defaultDuration: 5,
        defaultAspectRatio: '1:1',
      },
      'kling-2.1-standard': {
        validDurations: [5, 10],
        validResolutions: ['480p', '720p'],
        validAspectRatios: [], // Uses input image aspect
        defaultDuration: 5,
        defaultAspectRatio: 'auto',
      },
      'kling-2.1-pro': {
        validDurations: [5, 10],
        validResolutions: ['480p', '720p'],
        validAspectRatios: ['1:1', '16:9', '9:16'],
        defaultDuration: 5,
        defaultAspectRatio: '1:1',
      },
    };

    // Validate video settings based on provider and model
    let finalDuration: number;
    let finalResolution: string;
    let finalAspectRatio: string;

    if (provider === 'fal') {
      const config = MODEL_CONFIG[falModelKey || 'wan-2.1'];

      // Duration validation
      if (config.validDurations.includes(durationSeconds)) {
        finalDuration = durationSeconds;
      } else {
        // Find closest valid duration
        finalDuration = config.validDurations.reduce((prev, curr) =>
          Math.abs(curr - durationSeconds) < Math.abs(prev - durationSeconds) ? curr : prev
        );
      }

      finalResolution = config.validResolutions.includes(resolution) ? resolution : '720p';

      // Aspect ratio: only set if model supports it
      if (config.validAspectRatios.length === 0) {
        finalAspectRatio = 'auto'; // Model uses input image aspect
      } else if (config.validAspectRatios.includes(aspectRatio)) {
        finalAspectRatio = aspectRatio;
      } else {
        finalAspectRatio = config.defaultAspectRatio;
      }
    } else {
      // Veo settings: no 1:1, 4-8s duration
      const validDurations = [4, 6, 8];
      const validResolutions = ['720p', '1080p'];
      const validAspectRatios = ['16:9', '9:16'];

      finalDuration = validDurations.includes(durationSeconds) ? durationSeconds : 4;
      finalResolution = validResolutions.includes(resolution) ? resolution : '720p';
      finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';

      // 1080p only available for 8s videos on Veo
      if (finalResolution === '1080p' && finalDuration !== 8) {
        finalResolution = '720p';
      }
    }

    console.log(`[ClipJob] Provider: ${provider}, Model: ${model}`);
    console.log(`[ClipJob] Video settings: duration=${finalDuration}s, resolution=${finalResolution}, aspectRatio=${finalAspectRatio}`);

    // Check API keys based on provider
    if (provider === 'fal') {
      const falApiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
      if (!falApiKey) {
        return NextResponse.json(
          { error: 'FAL_KEY not configured. Add FAL_KEY to your environment variables.' },
          { status: 500 }
        );
      }
      // Configure Fal client
      fal.config({ credentials: falApiKey });
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'GEMINI_API_KEY not configured' },
          { status: 500 }
        );
      }
    }

    // CHECK 1: Prevent duplicate jobs for same creature+action
    const existingJobs = await getJobsByStatus('processing');
    const duplicateJob = existingJobs.find(
      (job) =>
        job.type === 'clip_generation' &&
        (job as ClipGenerationJob).input.creatureId === creatureId &&
        (job as ClipGenerationJob).input.action === action
    );

    if (duplicateJob) {
      console.log(`[ClipJob] Duplicate job detected for ${creatureId}/${action}, returning existing job ${duplicateJob.id}`);
      return NextResponse.json({
        success: true,
        jobId: duplicateJob.id,
        status: 'processing',
        message: 'Job already in progress for this creature/action. Returning existing job.',
        duplicate: true,
      });
    }

    // CHECK 2: Enforce daily spending limit
    const spendingCheck = await canGenerateVideo();
    if (!spendingCheck.allowed) {
      console.log(`[ClipJob] Daily spending limit reached: ${spendingCheck.reason}`);
      return NextResponse.json(
        {
          error: 'Daily limit reached',
          message: spendingCheck.reason,
          remaining: spendingCheck.remaining,
        },
        { status: 429 }
      );
    }

    console.log(`[ClipJob] Spending check passed. ${spendingCheck.remaining} videos remaining today.`);

    // Build the prompt first (before creating job)
    const actionConfig = ACTION_PROMPTS[action];
    let prompt = actionConfig.prompt;
    if (description) {
      prompt = `${description}, ${prompt}`;
    }
    prompt += ', solid bright magenta background (#FF00FF), isolated on magenta, no other background elements, game sprite animation, clean edges';

    const jobId = generateJobId();
    console.log(`[ClipJob] Starting job ${jobId} for ${creatureId}/${action}`);
    console.log(`[ClipJob] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[ClipJob] Sprite URL: ${spriteUrl.substring(0, 100)}...`);

    // Download the sprite image and convert to bytes for the API
    let imageBytes: string;
    let imageMimeType: string = 'image/png';

    try {
      console.log(`[ClipJob] Downloading sprite from: ${spriteUrl.substring(0, 100)}...`);
      const spriteResponse = await fetch(spriteUrl);
      if (!spriteResponse.ok) {
        throw new Error(`Sprite URL not accessible: ${spriteResponse.status}`);
      }

      // Get the content type
      const contentType = spriteResponse.headers.get('content-type');
      if (contentType) {
        imageMimeType = contentType.split(';')[0].trim();
      }

      // Convert to base64
      const arrayBuffer = await spriteResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBytes = buffer.toString('base64');

      console.log(`[ClipJob] Sprite downloaded: ${buffer.length} bytes, type: ${imageMimeType}`);
    } catch (spriteError: any) {
      console.error(`[ClipJob] Sprite download failed:`, spriteError.message);
      return NextResponse.json({
        success: false,
        jobId,
        error: `Failed to download sprite: ${spriteError.message}`,
      }, { status: 400 });
    }

    // Start video generation based on provider
    try {
      let operationId: string;
      let videoUrl: string | null = null;

      if (provider === 'fal') {
        // ========== FAL.AI VIDEO GENERATION ==========
        console.log(`[ClipJob] Using Fal.ai provider with model: ${falModelKey}`);

        const falModel = falModelKey ? FAL_MODELS[falModelKey] : null;
        if (!falModel) {
          throw new Error(`Unknown Fal model: ${falModelKey}`);
        }

        // For Fal, we can use the sprite URL directly (no need to convert to base64)
        let falInput: any;

        if (falModelKey === 'wan-2.1') {
          // Wan 2.1 specific parameters
          // Duration is controlled by num_frames (81-100 at 16fps = ~5-6s)
          const numFrames = Math.min(100, Math.max(81, finalDuration * 16));
          falInput = {
            prompt,
            image_url: spriteUrl,
            negative_prompt: negativePrompt,
            aspect_ratio: finalAspectRatio, // Wan supports: auto, 1:1, 16:9, 9:16
            resolution: finalResolution,
            num_frames: numFrames,
            frames_per_second: 16,
            enable_safety_checker: true,
            acceleration: 'regular',
          };
        } else if (falModelKey === 'kling-2.1-standard') {
          // Kling 2.1 Standard - does NOT support aspect_ratio for image-to-video
          // It uses the input image's aspect ratio
          falInput = {
            prompt,
            image_url: spriteUrl,
            negative_prompt: negativePrompt,
            duration: String(finalDuration <= 5 ? 5 : 10) as '5' | '10',
            cfg_scale: 0.5,
          };
        } else {
          // Kling 2.1 Pro - supports aspect_ratio
          falInput = {
            prompt,
            image_url: spriteUrl,
            negative_prompt: negativePrompt,
            duration: String(finalDuration <= 5 ? 5 : 10) as '5' | '10',
            aspect_ratio: finalAspectRatio as '1:1' | '16:9' | '9:16',
            cfg_scale: 0.5,
          };
        }

        console.log(`[ClipJob] Calling Fal API: ${falModel.id}...`);

        const result = await fal.subscribe(falModel.id, {
          input: falInput,
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              console.log(`[ClipJob] Fal progress: ${update.logs?.map((log: any) => log.message).join(', ') || 'generating...'}`);
            }
          },
        });

        if (!result?.data?.video?.url) {
          throw new Error('Fal API did not return a video URL');
        }

        // For Fal, we get the video URL directly (no polling needed)
        videoUrl = result.data.video.url;
        operationId = `fal-${result.requestId}`;
        console.log(`[ClipJob] Fal video generated: ${videoUrl}`);

        // Record spending
        await recordVideoGeneration();

        // Download the video from Fal and upload to our blob storage
        console.log(`[ClipJob] Downloading Fal video and uploading to blob storage...`);
        const videoResponse = await fetch(videoUrl!);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download Fal video: ${videoResponse.status}`);
        }
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        const videoPath = `creatures/${creatureId}/clips/${action}.mp4`;
        const videoResult = await uploadAsset(videoPath, videoBuffer, 'video/mp4');
        console.log(`[ClipJob] Video uploaded to: ${videoResult.url}`);

        // Create completed job directly (Fal is synchronous)
        const job = await createJob<ClipGenerationJob>({
          id: jobId,
          type: 'clip_generation',
          status: 'completed',
          progress: 100,
          progressMessage: 'Clip generation complete!',
          input: {
            creatureId,
            action,
            spriteUrl,
            description,
          },
          operationId,
          result: {
            videoUrl: videoResult.url,
            duration: finalDuration * 1000,
            frameRate: 24,
          },
          metadata: {
            durationSeconds: finalDuration,
            resolution: finalResolution,
            aspectRatio: finalAspectRatio,
            model: model,
            provider: 'fal',
          },
        } as any);

        return NextResponse.json({
          success: true,
          jobId,
          status: 'completed',
          videoUrl: videoResult.url,
          message: `Clip generated successfully with ${falModel.name}`,
        });

      } else {
        // ========== GOOGLE VEO VIDEO GENERATION ==========
        const apiKey = process.env.GEMINI_API_KEY!;
        const ai = new GoogleGenAI({ apiKey });

        // Use image-to-video: pass the sprite as the starting frame
        const requestConfig: any = {
          model: model,
          prompt,
          image: {
            imageBytes: imageBytes,
            mimeType: imageMimeType,
          },
          config: {
            aspectRatio: finalAspectRatio,
            durationSeconds: finalDuration,
            resolution: finalResolution,
            ...(negativePrompt && { negativePrompt }),
          },
        };

        console.log(`[ClipJob] Calling Gemini video API with image-to-video (${finalDuration}s, ${finalResolution}, ${finalAspectRatio})...`);
        const operation = await ai.models.generateVideos(requestConfig);
        console.log(`[ClipJob] Gemini response: operation name=${operation?.name}`);

        if (!operation?.name) {
          throw new Error('Gemini API did not return an operation name');
        }

        operationId = operation.name;

        // CRITICAL: Immediately backup the operation ID
        await backupOperationId(operationId, jobId, creatureId, action, spriteUrl);

        // Record this video generation for spending tracking
        await recordVideoGeneration();
      }

      // Create job record for Veo (async polling required)
      const job = await createJob<ClipGenerationJob>({
        id: jobId,
        type: 'clip_generation',
        status: 'processing',
        progress: 10,
        progressMessage: `Video generation started (${finalDuration}s, ${finalResolution})...`,
        input: {
          creatureId,
          action,
          spriteUrl,
          description,
        },
        operationId,
        // Store video settings for result
        metadata: {
          durationSeconds: finalDuration,
          resolution: finalResolution,
          aspectRatio: finalAspectRatio,
          model: model,
          provider: 'veo',
        },
      } as any);

      console.log(`[ClipJob] Job ${jobId} created with operation: ${operationId}`);

      return NextResponse.json({
        success: true,
        jobId,
        status: 'processing',
        message: 'Clip generation job started. Poll /api/jobs?id=JOB_ID for status.',
      });
    } catch (genError: any) {
      console.error(`[ClipJob] Video generation failed for ${jobId}:`, genError);
      console.error(`[ClipJob] Error details:`, JSON.stringify(genError, null, 2));

      // Create job record in failed state (single write)
      await createJob<ClipGenerationJob>({
        id: jobId,
        type: 'clip_generation',
        status: 'failed',
        progress: 0,
        progressMessage: 'Video generation failed',
        input: {
          creatureId,
          action,
          spriteUrl,
          description,
        },
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

      // Download and save the video using direct fetch with API key
      try {
        const apiKey = process.env.GEMINI_API_KEY;

        console.log(`[ClipJob] Downloading video...`);
        let videoBuffer: Buffer | null = null;

        const downloadUrls = [
          videoUri.includes('?') ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`,
          videoUri.includes('?') ? `${videoUri}&alt=media&key=${apiKey}` : `${videoUri}?alt=media&key=${apiKey}`,
        ];

        for (const downloadUrl of downloadUrls) {
          console.log(`[ClipJob] Trying download from: ${downloadUrl.substring(0, 100)}...`);
          try {
            const videoResponse = await fetch(downloadUrl, {
              headers: {
                'x-goog-api-key': apiKey!,
              },
            });

            if (videoResponse.ok) {
              videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
              console.log(`[ClipJob] Download succeeded: ${videoBuffer.length} bytes`);
              break;
            } else {
              const errorText = await videoResponse.text().catch(() => '');
              console.log(`[ClipJob] Download attempt failed: ${videoResponse.status} - ${errorText.substring(0, 100)}`);
            }
          } catch (fetchError: unknown) {
            const errMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
            console.log(`[ClipJob] Fetch error: ${errMsg}`);
          }
        }

        if (!videoBuffer || videoBuffer.length === 0) {
          throw new Error('Failed to download video after all attempts');
        }

        const videoPath = `creatures/${job.input.creatureId}/clips/${job.input.action}.mp4`;
        const videoResult = await uploadAsset(videoPath, videoBuffer, 'video/mp4');

        console.log(`[ClipJob] Video saved for ${job.id}: ${videoResult.url}`);

        // TODO: Extract frames (would need client-side or different server-side approach)
        // For now, just save the video and mark complete

        // Get duration from job metadata or default to 4 seconds
        const jobMetadata = (job as any).metadata;
        const durationMs = (jobMetadata?.durationSeconds || 4) * 1000;

        const result = await updateJob<ClipGenerationJob>(job.id, {
          status: 'completed',
          progress: 100,
          progressMessage: 'Clip generation complete!',
          result: {
            videoUrl: videoResult.url,
            duration: durationMs,
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
