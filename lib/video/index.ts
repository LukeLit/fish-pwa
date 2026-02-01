/**
 * Video Module - Frame extraction and animation utilities
 * 
 * Note: Video generation for fish has been removed.
 * Use /api/generate-animation-frames for fish animation frames.
 * Video generation is still available for backgrounds via /api/generate-video-fal
 */

export {
  extractFrames,
  extractSingleFrame,
  extractKeyFrames,
  getVideoDuration,
  prepareFramesForUpload,
  type ExtractedFrame,
  type FrameExtractionOptions,
  type FrameExtractionResult,
} from './frame-extractor';

export {
  getVideoGenerationSettings,
  getProviderFromModel,
  getFalModelKey,
  getSpriteForGrowthStage,
  getAvailableGrowthStages,
  hasAnimation,
  getAnimationSequence,
  countAnimations,
  getAvailableActions,
  type VideoGenerationSettings,
} from './clip-generator';
