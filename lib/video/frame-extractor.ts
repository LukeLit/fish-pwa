/**
 * Video Frame Extractor
 * 
 * Client-side frame extraction from video using HTML5 video and canvas APIs.
 * Extracts frames at specified intervals and applies chroma key removal.
 * 
 * Note: This runs in the browser because Vercel serverless has ffmpeg limitations.
 * Frames are extracted and processed client-side, then uploaded to blob storage.
 */

import { removeBackground } from '@/lib/rendering/fish-renderer';

export interface ExtractedFrame {
  index: number;
  timestamp: number;  // Time in seconds
  canvas: HTMLCanvasElement;
  dataUrl?: string;   // Optional data URL for upload
}

export interface FrameExtractionOptions {
  /** Target frames per second (default: 12) */
  fps?: number;
  /** Chroma key tolerance (default: 50) */
  chromaTolerance?: number;
  /** Maximum frames to extract (default: unlimited) */
  maxFrames?: number;
  /** Start time in seconds (default: 0) */
  startTime?: number;
  /** End time in seconds (default: video duration) */
  endTime?: number;
  /** Output format for data URLs (default: 'image/png') */
  outputFormat?: 'image/png' | 'image/webp';
  /** Output quality for lossy formats (default: 0.9) */
  outputQuality?: number;
  /** Progress callback */
  onProgress?: (progress: number, currentFrame: number, totalFrames: number) => void;
}

export interface FrameExtractionResult {
  frames: ExtractedFrame[];
  thumbnail: ExtractedFrame;  // First frame as thumbnail
  duration: number;           // Video duration in ms
  frameRate: number;          // Actual extraction frame rate
  width: number;
  height: number;
}

/**
 * Extract frames from a video URL/data URL
 * 
 * @param videoSource - Video URL or data URL
 * @param options - Extraction options
 * @returns Promise resolving to extraction result
 */
export async function extractFrames(
  videoSource: string,
  options: FrameExtractionOptions = {}
): Promise<FrameExtractionResult> {
  const {
    fps = 12,
    chromaTolerance = 50,
    maxFrames,
    startTime = 0,
    endTime,
    outputFormat = 'image/png',
    outputQuality = 0.9,
    onProgress,
  } = options;

  return new Promise((resolve, reject) => {
    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    // Create canvas for frame extraction
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let currentTime = startTime;
    let frameIndex = 0;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const videoDuration = video.duration;
      const actualEndTime = endTime ?? videoDuration;
      const frameInterval = 1 / fps;
      const totalFrames = maxFrames ?? Math.floor((actualEndTime - startTime) * fps);

      console.log(`[FrameExtractor] Video: ${video.videoWidth}x${video.videoHeight}, duration: ${videoDuration}s`);
      console.log(`[FrameExtractor] Extracting ${totalFrames} frames at ${fps} fps`);

      const extractNextFrame = () => {
        if (currentTime > actualEndTime || (maxFrames && frameIndex >= maxFrames)) {
          // Done extracting
          if (frames.length === 0) {
            reject(new Error('No frames extracted'));
            return;
          }

          resolve({
            frames,
            thumbnail: frames[0],
            duration: videoDuration * 1000,
            frameRate: fps,
            width: video.videoWidth,
            height: video.videoHeight,
          });
          return;
        }

        // Seek to current time
        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0);

        // Create a copy of the canvas for this frame
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = canvas.width;
        frameCanvas.height = canvas.height;
        const frameCtx = frameCanvas.getContext('2d');

        if (frameCtx) {
          frameCtx.drawImage(canvas, 0, 0);

          // Apply chroma key removal
          const processedCanvas = removeBackground(
            createImageFromCanvas(frameCanvas),
            chromaTolerance
          );

          // Create extracted frame object
          const frame: ExtractedFrame = {
            index: frameIndex,
            timestamp: currentTime,
            canvas: processedCanvas,
          };

          // Generate data URL if needed for upload
          frame.dataUrl = processedCanvas.toDataURL(outputFormat, outputQuality);

          frames.push(frame);

          // Report progress
          if (onProgress) {
            const progress = (frameIndex + 1) / totalFrames;
            onProgress(progress, frameIndex + 1, totalFrames);
          }
        }

        // Move to next frame
        frameIndex++;
        currentTime += frameInterval;
        extractNextFrame();
      };

      // Start extraction
      extractNextFrame();
    };

    video.onerror = () => {
      reject(new Error(`Failed to load video: ${video.error?.message || 'Unknown error'}`));
    };

    video.src = videoSource;
    video.load();
  });
}

/**
 * Helper to create an HTMLImageElement from a canvas
 */
function createImageFromCanvas(canvas: HTMLCanvasElement): HTMLImageElement {
  // The removeBackground function draws the image to canvas first using ctx.drawImage(),
  // which accepts CanvasImageSource (includes HTMLCanvasElement).
  // We can pass the canvas directly by duck-typing as HTMLImageElement
  // since drawImage works with both.
  return canvas as unknown as HTMLImageElement;
}

/**
 * Extract a single frame at a specific timestamp
 * Useful for thumbnail extraction
 */
export async function extractSingleFrame(
  videoSource: string,
  timestamp: number = 0,
  chromaTolerance: number = 50
): Promise<ExtractedFrame> {
  const result = await extractFrames(videoSource, {
    startTime: timestamp,
    maxFrames: 1,
    chromaTolerance,
  });
  return result.frames[0];
}

/**
 * Extract key frames for a clip (first, middle, last)
 * Useful for preview thumbnails at different states
 */
export async function extractKeyFrames(
  videoSource: string,
  chromaTolerance: number = 50
): Promise<{
  first: ExtractedFrame;
  middle: ExtractedFrame;
  last: ExtractedFrame;
}> {
  // First, get video duration
  const duration = await getVideoDuration(videoSource);

  const [first, middle, last] = await Promise.all([
    extractSingleFrame(videoSource, 0, chromaTolerance),
    extractSingleFrame(videoSource, duration / 2, chromaTolerance),
    extractSingleFrame(videoSource, Math.max(0, duration - 0.1), chromaTolerance),
  ]);

  return { first, middle, last };
}

/**
 * Get video duration without extracting frames
 */
export function getVideoDuration(videoSource: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;

    video.onloadedmetadata = () => {
      resolve(video.duration);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for duration'));
    };

    video.src = videoSource;
    video.load();
  });
}

/**
 * Convert extracted frames to uploadable format
 * Returns array of { filename, dataUrl } for bulk upload
 */
export function prepareFramesForUpload(
  frames: ExtractedFrame[],
  creatureId: string,
  action: string
): Array<{ filename: string; dataUrl: string }> {
  return frames.map((frame) => ({
    filename: `assets/creatures/${creatureId}/clips/${action}_frames/frame_${String(frame.index).padStart(4, '0')}.png`,
    dataUrl: frame.dataUrl || frame.canvas.toDataURL('image/png'),
  }));
}
