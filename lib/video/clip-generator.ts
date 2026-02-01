/**
 * Clip Generator Service
 * 
 * Client-side interface for the clip generation job system.
 * Uses the job API for reliable background processing.
 */

import type { ClipAction, CreatureClip, CreatureClips, GrowthStage, GrowthStageClips, Creature } from '@/lib/game/types';
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
 * Video generation settings from localStorage
 */
export interface VideoGenerationSettings {
  selectedVideoModel: string;
  videoDuration: number;
  videoResolution: string;
  videoAspectRatio: string;
  negativePrompt: string;
  enableDirectMode: boolean;
}

/**
 * Get the provider from a model ID
 */
export function getProviderFromModel(modelId: string): 'fal' | 'veo' {
  return modelId.startsWith('fal/') ? 'fal' : 'veo';
}

/**
 * Get the Fal model key from full model ID (e.g., 'fal/wan-2.1' -> 'wan-2.1')
 */
export function getFalModelKey(modelId: string): string {
  return modelId.replace('fal/', '');
}

/**
 * Get saved video generation settings from localStorage
 */
export function getVideoGenerationSettings(): VideoGenerationSettings {
  const defaults: VideoGenerationSettings = {
    selectedVideoModel: 'fal/wan-2.1', // Default to cheapest Fal model
    videoDuration: 5,
    videoResolution: '720p',
    videoAspectRatio: '1:1', // Square for fish sprites
    negativePrompt: 'blurry, distorted, low quality, text, watermark',
    enableDirectMode: false,
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const savedSettings = localStorage.getItem('generationSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return {
        selectedVideoModel: settings.selectedVideoModel || defaults.selectedVideoModel,
        videoDuration: settings.videoDuration || defaults.videoDuration,
        videoResolution: settings.videoResolution || defaults.videoResolution,
        videoAspectRatio: settings.videoAspectRatio || defaults.videoAspectRatio,
        negativePrompt: settings.negativePrompt ?? defaults.negativePrompt,
        enableDirectMode: settings.enableDirectMode ?? defaults.enableDirectMode,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return defaults;
}

/**
 * Start a clip generation job and poll for completion
 * Uses the job system for reliability across sessions
 * 
 * @param creatureId - The creature's ID
 * @param action - The animation action (swimIdle, bite, etc.)
 * @param spriteUrl - URL of the creature's sprite (used as reference image)
 * @param description - Optional description of the creature
 * @param onProgress - Progress callback
 * @param growthStage - Growth stage for the clip (juvenile, adult, elder) - defaults to 'adult'
 * @returns The generated clip data or job ID for tracking
 */
export async function generateCreatureClip(
  creatureId: string,
  action: ClipAction,
  spriteUrl: string,
  description?: string,
  onProgress?: ProgressCallback,
  growthStage: GrowthStage = 'adult'
): Promise<ClipGenerationResult> {
  const report = (stage: ClipGenerationProgress['stage'], message: string, progress?: number, jobId?: string) => {
    onProgress?.({ stage, message, progress, jobId });
  };

  // Get user's video generation settings
  const videoSettings = getVideoGenerationSettings();
  const provider = getProviderFromModel(videoSettings.selectedVideoModel);

  try {
    // Stage 1: Start the job
    report('starting', `Starting ${action} clip generation job (${provider})...`);

    const startResponse = await fetch('/api/jobs/clip-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatureId,
        action,
        spriteUrl,
        description,
        growthStage, // Which growth stage this clip is for
        // Pass video generation settings
        model: videoSettings.selectedVideoModel,
        provider, // 'fal' or 'veo'
        durationSeconds: videoSettings.videoDuration,
        resolution: videoSettings.videoResolution,
        aspectRatio: videoSettings.videoAspectRatio,
        negativePrompt: videoSettings.negativePrompt,
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
        // Every 3rd poll, trigger processing (every 15 seconds)
        // Other polls are read-only to avoid race conditions
        const shouldProcess = attempts % 3 === 0;
        const url = `/api/jobs/clip-generation?jobId=${encodeURIComponent(jobId)}${shouldProcess ? '&process=true' : ''}`;

        const pollResponse = await fetch(url);

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
              duration: job.result.duration || 4000,
              loop: action === 'swimIdle' || action === 'swimFast',
              frameRate: job.result.frameRate || 24,
              // Optional fields - only include if present
              ...(job.result.thumbnailUrl && { thumbnailUrl: job.result.thumbnailUrl }),
              ...(job.result.frames?.length && { frames: job.result.frames }),
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
 * Get available clip actions that can still be generated for a specific growth stage
 */
export function getMissingClipActions(
  clips: Record<string, CreatureClip> | undefined | null
): ClipAction[] {
  const allActions: ClipAction[] = ['swimIdle', 'swimFast', 'dash', 'bite', 'takeDamage'];
  if (!clips) return allActions;
  return allActions.filter((action) => !clips[action]);
}

/**
 * Get the sprite URL for a specific growth stage
 * Falls back through: growthSprites[stage] -> base sprite
 */
export function getSpriteForGrowthStage(creature: Creature, stage: GrowthStage): string {
  // Check for growth stage sprite
  const growthSprite = creature.growthSprites?.[stage]?.sprite;
  if (growthSprite) {
    return growthSprite;
  }
  
  // For adult stage, use the base sprite
  if (stage === 'adult') {
    return creature.sprite;
  }
  
  // Fallback to base sprite if no growth stage sprite exists
  return creature.sprite;
}

/**
 * Get clips for a specific growth stage
 * Handles backward compatibility with legacy flat clips structure
 */
export function getClipsForGrowthStage(
  clips: GrowthStageClips | undefined | null,
  legacyClips: CreatureClips | undefined | null,
  stage: GrowthStage
): CreatureClips | undefined {
  // Try new structure first
  if (clips?.[stage]) {
    return clips[stage];
  }
  
  // Fall back to legacy clips (treated as 'adult' clips)
  if (stage === 'adult' && legacyClips) {
    return legacyClips;
  }
  
  return undefined;
}

/**
 * Check if a creature has clips for a specific growth stage and action
 */
export function hasClipForStage(
  clips: GrowthStageClips | undefined | null,
  legacyClips: CreatureClips | undefined | null,
  stage: GrowthStage,
  action: ClipAction
): boolean {
  const stageClips = getClipsForGrowthStage(clips, legacyClips, stage);
  return !!stageClips?.[action];
}

/**
 * Get all growth stages that have sprites available
 */
export function getAvailableGrowthStages(creature: Creature): GrowthStage[] {
  const stages: GrowthStage[] = [];
  
  // Always include adult (uses base sprite)
  stages.push('adult');
  
  // Add other stages if they have sprites
  if (creature.growthSprites?.juvenile?.sprite) {
    stages.unshift('juvenile'); // Add at start for order
  }
  if (creature.growthSprites?.elder?.sprite) {
    stages.push('elder');
  }
  
  return stages;
}
