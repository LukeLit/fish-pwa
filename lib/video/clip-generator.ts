/**
 * Clip Generator Service
 * 
 * Client-side orchestrator for the full clip generation flow:
 * 1. Generate video via Veo 3.1 (image-to-video)
 * 2. Poll for completion
 * 3. Download video
 * 4. Extract frames with chroma key removal
 * 5. Save video + frames to blob storage
 */

import type { ClipAction, CreatureClip } from '@/lib/game/types';
import { extractFrames, type FrameExtractionOptions } from './frame-extractor';

export interface ClipGenerationProgress {
  stage: 'starting' | 'generating' | 'downloading' | 'extracting' | 'saving' | 'complete' | 'error';
  message: string;
  progress?: number; // 0-100
}

export interface ClipGenerationResult {
  success: boolean;
  clip?: CreatureClip;
  error?: string;
}

export type ProgressCallback = (progress: ClipGenerationProgress) => void;

/**
 * Generate a complete animation clip for a creature
 * 
 * @param creatureId - The creature's ID
 * @param action - The animation action (swimIdle, bite, etc.)
 * @param spriteUrl - URL of the creature's sprite (used as reference image)
 * @param description - Optional description of the creature
 * @param onProgress - Progress callback
 * @returns The generated clip data
 */
export async function generateCreatureClip(
  creatureId: string,
  action: ClipAction,
  spriteUrl: string,
  description?: string,
  onProgress?: ProgressCallback
): Promise<ClipGenerationResult> {
  const report = (stage: ClipGenerationProgress['stage'], message: string, progress?: number) => {
    onProgress?.({ stage, message, progress });
  };

  try {
    // Stage 1: Start generation
    report('starting', `Starting ${action} clip generation...`);

    const genResponse = await fetch('/api/generate-creature-clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatureId,
        action,
        spriteUrl,
        creatureDescription: description,
      }),
    });

    if (!genResponse.ok) {
      const error = await genResponse.json();
      throw new Error(error.message || 'Failed to start clip generation');
    }

    const genData = await genResponse.json();
    if (!genData.operation) {
      throw new Error('No operation ID returned from generation API');
    }

    const operationName = genData.operation;
    const clipMetadata = genData.metadata;

    // Stage 2: Poll for completion
    report('generating', `Generating ${action} animation with Veo 3.1...`, 10);

    let videoUri: string | null = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5s intervals)

    while (attempts < maxAttempts) {
      await sleep(5000); // Wait 5 seconds between polls

      const pollResponse = await fetch(
        `/api/generate-creature-clip?operation=${encodeURIComponent(operationName)}`
      );
      const pollData = await pollResponse.json();

      if (pollData.status === 'completed') {
        if (pollData.video?.uri) {
          videoUri = pollData.video.uri;
          break;
        } else {
          throw new Error('Generation completed but no video URI returned');
        }
      } else if (pollData.status === 'error') {
        throw new Error(pollData.error || 'Video generation failed');
      }

      attempts++;
      const progressPct = Math.min(10 + (attempts / maxAttempts) * 50, 60);
      report('generating', `Generating ${action} animation... (${Math.round(attempts * 5)}s)`, progressPct);
    }

    if (!videoUri) {
      throw new Error('Generation timed out after 10 minutes');
    }

    // Stage 3: Download video
    report('downloading', 'Downloading generated video...', 65);

    const videoDataUrl = await downloadVideoAsDataUrl(videoUri);
    if (!videoDataUrl) {
      throw new Error('Failed to download video');
    }

    report('downloading', 'Video downloaded successfully', 70);

    // Stage 4: Extract frames
    report('extracting', 'Extracting frames with chroma key removal...', 75);

    const extractionOptions: FrameExtractionOptions = {
      fps: 12, // 12 fps for game animations
      chromaTolerance: 50,
      maxFrames: 48, // Max 4 seconds at 12fps
      onProgress: (extractProgress, currentFrame, totalFrames) => {
        const pct = 75 + extractProgress * 15;
        report('extracting', `Extracting frame ${currentFrame}/${totalFrames}...`, pct);
      },
    };

    const extractionResult = await extractFrames(videoDataUrl, extractionOptions);

    if (!extractionResult.frames.length) {
      throw new Error('No frames extracted from video');
    }

    report('extracting', `Extracted ${extractionResult.frames.length} frames`, 90);

    // Stage 5: Save everything
    report('saving', 'Saving clip to storage...', 92);

    const saveResponse = await fetch('/api/save-creature-clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatureId,
        action,
        videoDataUrl,
        frames: extractionResult.frames.map((f) => ({
          index: f.index,
          dataUrl: f.dataUrl,
        })),
        thumbnailDataUrl: extractionResult.thumbnail.dataUrl,
        duration: extractionResult.duration,
        loop: clipMetadata?.loop ?? (action === 'swimIdle' || action === 'swimFast'),
        frameRate: extractionResult.frameRate,
      }),
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      throw new Error(error.message || 'Failed to save clip');
    }

    const saveData = await saveResponse.json();

    if (!saveData.success || !saveData.clip) {
      throw new Error('Save succeeded but no clip data returned');
    }

    report('complete', `${action} clip generated successfully!`, 100);

    return {
      success: true,
      clip: saveData.clip,
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
 * Download a video from URI and convert to data URL
 */
async function downloadVideoAsDataUrl(uri: string): Promise<string> {
  // Use our download API to fetch the video
  const response = await fetch('/api/download-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri }),
  });

  if (!response.ok) {
    // If POST fails, try fetching directly (for already-accessible URIs)
    console.log('[ClipGenerator] POST download failed, trying direct fetch...');
    const directResponse = await fetch(uri);
    if (!directResponse.ok) {
      throw new Error('Failed to download video');
    }
    const blob = await directResponse.blob();
    return blobToDataUrl(blob);
  }

  const data = await response.json();
  
  if (data.url) {
    // Video was saved to blob storage, fetch it as data URL
    const blobResponse = await fetch(data.url);
    const blob = await blobResponse.blob();
    return blobToDataUrl(blob);
  }

  throw new Error('No video URL in download response');
}

/**
 * Convert a blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
