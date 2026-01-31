/**
 * Image Processing Utility for Multi-Resolution Sprite System
 * 
 * Generates multiple resolution variants of fish sprites for optimal
 * rendering at different screen sizes (mipmap-like system for web).
 */

import sharp from 'sharp';

/** Resolution variant sizes in pixels */
export const RESOLUTION_SIZES = {
  high: 512,
  medium: 256,
  low: 128,
} as const;

/** Resolution variant type */
export type ResolutionVariant = keyof typeof RESOLUTION_SIZES;

/** Result of generating resolution variants */
export interface ResolutionVariants {
  high: Buffer;    // 512x512
  medium: Buffer;  // 256x256
  low: Buffer;     // 128x128
}

/** URL result for uploaded variants */
export interface ResolutionUrls {
  high: string;
  medium: string;
  low: string;
}

/**
 * Generate multiple resolution variants of an image
 * 
 * @param buffer - Original image buffer (any size)
 * @returns Object containing buffers for each resolution variant
 */
export async function generateResolutionVariants(buffer: Buffer): Promise<ResolutionVariants> {
  // First, get the original image metadata
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Determine if we need to resize for high-res (cap at 512)
  const originalWidth = metadata.width || 512;
  const originalHeight = metadata.height || 512;
  const maxDimension = Math.max(originalWidth, originalHeight);

  // Generate all three variants in parallel
  const [high, medium, low] = await Promise.all([
    // High resolution (512x512)
    resizeImage(buffer, RESOLUTION_SIZES.high, maxDimension),
    // Medium resolution (256x256)
    resizeImage(buffer, RESOLUTION_SIZES.medium, maxDimension),
    // Low resolution (128x128)
    resizeImage(buffer, RESOLUTION_SIZES.low, maxDimension),
  ]);

  return { high, medium, low };
}

/**
 * Resize an image to a target size while maintaining aspect ratio
 * 
 * @param buffer - Original image buffer
 * @param targetSize - Target dimension (both width and height)
 * @param originalMaxDimension - Largest dimension of original image
 * @returns Resized image buffer as PNG
 */
async function resizeImage(
  buffer: Buffer,
  targetSize: number,
  originalMaxDimension: number
): Promise<Buffer> {
  // If original is smaller than target, don't upscale for medium/low variants
  // but do ensure high is at a consistent size
  const effectiveSize = Math.min(targetSize, originalMaxDimension);

  // For the high variant, we want to ensure it's exactly 512 or the original size
  // For medium/low, we downscale from the original
  const finalSize = targetSize === RESOLUTION_SIZES.high
    ? Math.min(RESOLUTION_SIZES.high, originalMaxDimension)
    : effectiveSize;

  return sharp(buffer)
    .resize(finalSize, finalSize, {
      fit: 'contain',
      background: { r: 255, g: 0, b: 255, alpha: 1 }, // Magenta background for chroma key
      kernel: 'lanczos3', // High-quality resampling
    })
    .png({
      compressionLevel: 6,
      adaptiveFiltering: true,
    })
    .toBuffer();
}

/**
 * Generate filename for a resolution variant
 * 
 * @param baseFilename - Original filename (e.g., "fish-123.png")
 * @param variant - Resolution variant type
 * @returns Filename with variant suffix (e.g., "fish-123@256.png")
 */
export function getVariantFilename(baseFilename: string, variant: ResolutionVariant): string {
  // High variant uses the original filename
  if (variant === 'high') {
    return baseFilename;
  }

  // Remove extension, add variant suffix, re-add extension
  const extIndex = baseFilename.lastIndexOf('.');
  if (extIndex === -1) {
    return `${baseFilename}@${RESOLUTION_SIZES[variant]}`;
  }

  const name = baseFilename.substring(0, extIndex);
  const ext = baseFilename.substring(extIndex);
  return `${name}@${RESOLUTION_SIZES[variant]}${ext}`;
}

/**
 * Parse a variant filename to get the base filename and variant
 * 
 * @param filename - Filename potentially with variant suffix
 * @returns Base filename and detected variant
 */
export function parseVariantFilename(filename: string): {
  baseFilename: string;
  variant: ResolutionVariant;
} {
  // Check for @256 or @128 suffix
  const match = filename.match(/^(.+)@(256|128)(\.png)?$/);

  if (match) {
    const size = parseInt(match[2], 10);
    const variant: ResolutionVariant = size === 256 ? 'medium' : 'low';
    const ext = match[3] || '';
    return {
      baseFilename: `${match[1]}${ext}`,
      variant,
    };
  }

  // No suffix means high variant
  return {
    baseFilename: filename,
    variant: 'high',
  };
}
