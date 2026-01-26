/**
 * Video Generation Service
 * Uses Google Veo 3.1 via Gemini API to generate videos
 */

export interface VideoGenerationParams {
  prompt: string;
  model?: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview';
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p' | '4K';
  referenceImages?: string[]; // Base64 or URLs
}

export interface VideoGenerationResult {
  videoUrl?: string;
  operation?: string;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

export class VideoService {
  private pollInterval = 5000; // 5 seconds
  private maxPollAttempts = 60; // 5 minutes max

  /**
   * Generate a video
   */
  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    try {
      console.log(`[VideoService] Generating video with prompt: ${params.prompt.substring(0, 50)}...`);

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: params.prompt,
          model: params.model || 'veo-3.1-generate-preview',
          aspectRatio: params.aspectRatio || '16:9',
          resolution: params.resolution || '720p',
          referenceImages: params.referenceImages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[VideoService] Generation failed:', error);
        return {
          status: 'error',
          error: error.message || 'Failed to generate video',
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          status: 'error',
          error: 'API returned unsuccessful response',
        };
      }

      // If we got a video URL directly, return it
      if (data.videoUrl) {
        return {
          videoUrl: data.videoUrl,
          status: 'completed',
        };
      }

      // If we got an operation, poll for completion
      if (data.operation) {
        const result = await this.pollOperation(data.operation);
        
        // If we got a video file reference, download it
        if (result.videoUrl && result.videoUrl.includes('files/')) {
          // The videoUrl is actually a file name, download it
          const downloadResult = await this.downloadVideo(result.videoUrl);
          return downloadResult;
        }
        
        return result;
      }

      return {
        status: 'error',
        error: 'Unexpected response format',
      };
    } catch (error: any) {
      console.error('[VideoService] Error:', error);
      return {
        status: 'error',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Poll an operation until completion
   */
  private async pollOperation(operation: string): Promise<VideoGenerationResult> {
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      try {
        const response = await fetch(`/api/generate-video?operation=${encodeURIComponent(operation)}`, {
          method: 'GET',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to check operation status');
        }

        const data = await response.json();

        if (data.status === 'completed') {
          console.log('[VideoService] Video generation completed');
          
          // If we have a video object with name/uri, download it
          if (data.video?.name) {
            const downloadResult = await this.downloadVideo(data.video.name);
            return downloadResult;
          }
          
          // If we have a videoUrl, return it
          if (data.videoUrl) {
            return {
              videoUrl: data.videoUrl,
              status: 'completed',
            };
          }
          
          // Fallback: return the video object
          return {
            videoUrl: data.video?.uri || data.video?.name,
            status: 'completed',
          };
        }

        if (data.status === 'processing') {
          attempts++;
          console.log(`[VideoService] Polling operation (attempt ${attempts}/${this.maxPollAttempts})...`);
          await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
          continue;
        }

        // If we get here, something unexpected happened
        return {
          status: 'error',
          error: 'Unexpected operation status',
        };
      } catch (error: any) {
        console.error('[VideoService] Poll error:', error);
        return {
          status: 'error',
          error: error.message || 'Failed to poll operation',
        };
      }
    }

    return {
      status: 'error',
      error: 'Operation timed out',
    };
  }

  /**
   * Download a video file
   */
  private async downloadVideo(fileName: string): Promise<VideoGenerationResult> {
    try {
      const response = await fetch(`/api/download-video?file=${encodeURIComponent(fileName)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download video');
      }

      // Convert the blob to a data URL
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve({
            videoUrl: reader.result as string,
            status: 'completed',
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      console.error('[VideoService] Download error:', error);
      return {
        status: 'error',
        error: error.message || 'Failed to download video',
      };
    }
  }

  /**
   * Generate a fish animation video
   */
  async generateFishVideo(params: {
    type: 'prey' | 'predator' | 'mutant';
    mutations?: string[];
    seed?: string;
  }): Promise<VideoGenerationResult> {
    const prompt = this.buildFishVideoPrompt(params);
    
    return this.generateVideo({
      prompt,
      model: 'veo-3.1-generate-preview',
      aspectRatio: '16:9',
      resolution: '720p',
    });
  }

  /**
   * Build optimized prompt for fish video generation
   */
  private buildFishVideoPrompt(params: {
    type: 'prey' | 'predator' | 'mutant';
    mutations?: string[];
    seed?: string;
  }): string {
    let prompt = '';

    // Base description
    if (params.type === 'prey') {
      prompt = 'A small, swift fish with greenish scales swimming gracefully through clear water';
    } else if (params.type === 'predator') {
      prompt = 'A large, aggressive fish with sharp teeth, reddish tones, swimming menacingly through deep water';
    } else {
      prompt = 'A bizarre mutant fish with twisted fins, glowing eyes, swimming in an otherworldly manner through mysterious waters';
    }

    // Add mutations if provided
    if (params.mutations && params.mutations.length > 0) {
      prompt += `, with ${params.mutations.join(', ')}`;
    }

    // Video-specific instructions
    prompt += ', smooth swimming animation, side view, underwater scene, vibrant colors, detailed scales and fins, natural fish movement, 8 seconds duration';

    return prompt;
  }
}

/**
 * Singleton instance
 */
let videoServiceInstance: VideoService | null = null;

export function getVideoService(): VideoService {
  if (!videoServiceInstance) {
    videoServiceInstance = new VideoService();
  }
  return videoServiceInstance;
}
