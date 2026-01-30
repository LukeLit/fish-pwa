/**
 * Video Module - Frame extraction and processing utilities
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
  generateCreatureClip,
  hasClip,
  getMissingClipActions,
  type ClipGenerationProgress,
  type ClipGenerationResult,
  type ProgressCallback,
} from './clip-generator';
