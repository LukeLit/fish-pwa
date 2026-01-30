/**
 * Clip Generator Service
 * 
 * Client-side interface for the clip generation job system.
 * Uses the job API for reliable background processing.
 */

import type { ClipAction, CreatureClip } from '@/lib/game/types';
import type { ClipGenerationJob } from '@/lib/jobs/types';

export interface ClipGenerationProgress {
  stage: 'starting' | 'generating' | 'downloading' | 'extracting' | 'saving' | 'complete' | 'error';
  message: string;
  progress?: number; // 0-100
  jobId?: string;
}

export interface ClipGenerationResult {
  success: boolean;
  clip?: CreatureClip;
  jobId?: string;
  error?: string;
}

export type ProgressCallback = (progress: ClipGenerationProgress) => void;

/**
 * Start a clip generation job and poll for completion
 * Uses the job system for reliability across sessions
 * 
 * @param creatureId - The creature's ID
 * @param action - The animation action (swimIdle, bite, etc.)
 * @param spriteUrl - URL of the creature's sprite (used as reference image)
 * @param description - Optional description of the creature
 * @param onProgress - Progress callback
 * @returns The generated clip data or job ID for tracking
 */
export async function generateCreatureClip(
  creatureId: string,
  action: ClipAction,
  spriteUrl: string,
  description?: string,
  onProgress?: ProgressCallback
): Promise<ClipGenerationResult> {
  const report = (stage: ClipGenerationProgress['stage'], message: string, progress?: number, jobId?: string) => {
    onProgress?.({ stage, message, progress, jobId });
  };

  try {
    // Stage 1: Start the job
    report('starting', `Starting ${action} clip generation job...`);

    const startResponse = await fetch('/api/jobs/clip-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatureId,
        action,
        spriteUrl,
        description,
      }),
    });

    if (!startResponse.ok) {
      const error = await startResponse.json();
      throw new Error(error.message || 'Failed to start clip generation job');
    }

    const startData = await startResponse.json();
    const jobId = startData.jobId;

    if (!jobId) {
      throw new Error('No job ID returned');
    }

    console.log(`[ClipGenerator] Job started: ${jobId}`);
    report('generating', `Job started. Generating ${action} animation...`, 10, jobId);

    // Stage 2: Poll job status
    let attempts = 0;
    const maxAttempts = 180; // 15 minutes max (5s intervals)

    while (attempts < maxAttempts) {
      await sleep(5000); // Wait 5 seconds between polls

      try {
        // Poll job status and trigger processing
        const pollResponse = await fetch(`/api/jobs/clip-generation?jobId=${encodeURIComponent(jobId)}`);

        if (!pollResponse.ok) {
          console.error('[ClipGenerator] Poll HTTP error:', pollResponse.status);
          attempts++;
          continue;
        }

        const pollData = await pollResponse.json();
        const job = pollData.job as ClipGenerationJob;

        if (!job) {
          throw new Error('Job not found');
        }

        console.log(`[ClipGenerator] Job ${jobId} status: ${job.status}, progress: ${job.progress}%`);

        if (job.status === 'completed') {
          report('complete', job.progressMessage || 'Clip generation complete!', 100, jobId);

          // Build clip result from job
          if (job.result) {
            const clip: CreatureClip = {
              videoUrl: job.result.videoUrl,
              thumbnailUrl: job.result.thumbnailUrl || '',
              frames: job.result.frames || [],
              duration: job.result.duration || 4000,
              loop: action === 'swimIdle' || action === 'swimFast',
              frameRate: job.result.frameRate || 24,
            };

            return {
              success: true,
              clip,
              jobId,
            };
          }

          return {
            success: true,
            jobId,
          };
        }

        if (job.status === 'failed') {
          throw new Error(job.error || 'Job failed');
        }

        // Update progress
        report('generating', job.progressMessage || `Processing... (${attempts * 5}s)`, job.progress || 0, jobId);
      } catch (pollError: any) {
        if (pollError.message === 'Job not found' || pollError.message === 'Job failed') {
          throw pollError;
        }
        console.error('[ClipGenerator] Poll error (will retry):', pollError.message);
      }

      attempts++;
    }

    // Timed out but job may still be running
    return {
      success: false,
      jobId,
      error: 'Generation timed out. Job may still be processing - check /api/jobs for status.',
    };
  } catch (error: any) {
    console.error('[ClipGenerator] Error:', error);
    report('error', error.message || 'Unknown error');
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}


/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a creature has a specific clip
 */
export function hasClip(
  clips: Record<string, CreatureClip> | undefined | null,
  action: ClipAction
): boolean {
  return !!clips?.[action];
}

/**
 * Get available clip actions that can still be generated
 */
export function getMissingClipActions(
  clips: Record<string, CreatureClip> | undefined | null
): ClipAction[] {
  const allActions: ClipAction[] = ['swimIdle', 'swimFast', 'dash', 'bite', 'takeDamage'];
  if (!clips) return allActions;
  return allActions.filter((action) => !clips[action]);
}
