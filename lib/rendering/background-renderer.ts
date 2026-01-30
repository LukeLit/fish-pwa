/**
 * Background Rendering Utilities
 * 
 * Shared module for rendering background images consistently
 * across the game, editor, and selection screens.
 * 
 * All background display should use these functions to ensure:
 * - Consistent aspect ratio handling (cover mode)
 * - Consistent effects (blur, parallax, water distortion)
 * - Single source of truth for future visual enhancements
 */

// =============================================================================
// Types
// =============================================================================

export interface BackgroundRenderOptions {
  /** Blur amount in pixels (0 = no blur) */
  blur?: number;
  /** Parallax factor for camera movement (0 = fixed, 1 = moves with camera) */
  parallaxFactor?: number;
  /** Camera offset for parallax effect */
  cameraOffset?: { x: number; y: number };
  /** Overlay color (e.g., 'rgba(0,0,0,0.2)' for darkening) */
  overlay?: string;
  /** Scale multiplier for the background (1.0 = exact fit, 1.2 = 20% larger) */
  scale?: number;
}

export interface LoadedBackground {
  image: HTMLImageElement;
  width: number;
  height: number;
  aspectRatio: number;
}

// =============================================================================
// Background Loading
// =============================================================================

/** Cache for loaded background images */
const backgroundCache = new Map<string, LoadedBackground>();

/**
 * Load a background image and cache it.
 * Returns a promise that resolves when the image is ready.
 * 
 * @param url - URL of the background image
 * @returns Promise resolving to the loaded background
 */
export async function loadBackground(url: string): Promise<LoadedBackground> {
  // Check cache first
  const cached = backgroundCache.get(url);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const loaded: LoadedBackground = {
        image: img,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
      };
      backgroundCache.set(url, loaded);
      resolve(loaded);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load background: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Clear the background cache (useful when backgrounds are regenerated)
 */
export function clearBackgroundCache(): void {
  backgroundCache.clear();
}

/**
 * Remove a specific background from cache
 */
export function invalidateBackground(url: string): void {
  backgroundCache.delete(url);
}

// =============================================================================
// Background Drawing
// =============================================================================

/**
 * Calculate draw dimensions for cover mode (fill container, crop if needed)
 * 
 * @param imgWidth - Image width
 * @param imgHeight - Image height
 * @param containerWidth - Container width
 * @param containerHeight - Container height
 * @param scale - Scale multiplier (default 1.0)
 * @returns { width, height, x, y } for drawing
 */
export function calculateCoverDimensions(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
  scale: number = 1.0
): { width: number; height: number; x: number; y: number } {
  const imgAspect = imgWidth / imgHeight;
  const containerAspect = containerWidth / containerHeight;

  let drawWidth: number;
  let drawHeight: number;

  // Cover mode: scale to fill, may crop
  if (imgAspect > containerAspect) {
    // Image is wider than container - fit height, crop width
    drawHeight = containerHeight * scale;
    drawWidth = drawHeight * imgAspect;
  } else {
    // Image is taller than container - fit width, crop height
    drawWidth = containerWidth * scale;
    drawHeight = drawWidth / imgAspect;
  }

  // Center the image
  const x = (containerWidth - drawWidth) / 2;
  const y = (containerHeight - drawHeight) / 2;

  return { width: drawWidth, height: drawHeight, x, y };
}

/**
 * Draw a background image with consistent rendering across the app.
 * Uses cover mode to fill the container.
 * 
 * @param ctx - Canvas 2D context
 * @param background - Loaded background (from loadBackground) or HTMLImageElement
 * @param containerWidth - Width of the drawing area
 * @param containerHeight - Height of the drawing area
 * @param options - Rendering options (blur, parallax, overlay, etc.)
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: LoadedBackground | HTMLImageElement,
  containerWidth: number,
  containerHeight: number,
  options: BackgroundRenderOptions = {}
): void {
  const {
    blur = 0,
    parallaxFactor = 0,
    cameraOffset = { x: 0, y: 0 },
    overlay,
    scale = 1.0,
  } = options;

  // Get image reference
  const img = 'image' in background ? background.image : background;
  const imgWidth = img.width;
  const imgHeight = img.height;

  // Calculate dimensions for cover mode
  const { width: drawWidth, height: drawHeight, x: baseX, y: baseY } = calculateCoverDimensions(
    imgWidth,
    imgHeight,
    containerWidth,
    containerHeight,
    scale
  );

  // Apply parallax offset (negative because bg moves opposite to camera)
  const parallaxX = -cameraOffset.x * parallaxFactor;
  const parallaxY = -cameraOffset.y * parallaxFactor;
  const drawX = baseX + parallaxX;
  const drawY = baseY + parallaxY;

  ctx.save();

  // Apply blur if specified
  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
  }

  // Draw the background image
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  // Reset filter before overlay
  ctx.filter = 'none';

  // Apply overlay if specified
  if (overlay) {
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, containerWidth, containerHeight);
  }

  ctx.restore();
}

/**
 * Draw a fallback gradient background when no image is available.
 * 
 * @param ctx - Canvas 2D context
 * @param containerWidth - Width of the drawing area
 * @param containerHeight - Height of the drawing area
 * @param topColor - Gradient top color
 * @param bottomColor - Gradient bottom color
 */
export function drawFallbackGradient(
  ctx: CanvasRenderingContext2D,
  containerWidth: number,
  containerHeight: number,
  topColor: string,
  bottomColor: string
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, containerHeight);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, containerWidth, containerHeight);
}

// =============================================================================
// Biome Fallback Colors
// =============================================================================

/** Biome to gradient color mapping (fallback when no background image) */
export const BIOME_FALLBACK_COLORS: Record<string, { top: string; bottom: string }> = {
  shallow: { top: '#1e90ff', bottom: '#006994' },
  shallow_tropical: { top: '#06b6d4', bottom: '#0e7490' },
  tropical: { top: '#06b6d4', bottom: '#0e7490' },
  medium: { top: '#1e3a5f', bottom: '#0f1f3d' },
  medium_polluted: { top: '#3d4f3d', bottom: '#1a2a1a' },
  deep: { top: '#1a365d', bottom: '#0d1b2a' },
  deep_sea: { top: '#0f172a', bottom: '#020617' },
  abyssal: { top: '#0c0a1d', bottom: '#000000' },
  polluted: { top: '#4a5568', bottom: '#1a202c' },
};

/**
 * Get fallback gradient colors for a biome
 * 
 * @param biomeId - Biome identifier
 * @returns { top, bottom } gradient colors
 */
export function getBiomeFallbackColors(biomeId: string): { top: string; bottom: string } {
  return BIOME_FALLBACK_COLORS[biomeId] || BIOME_FALLBACK_COLORS.shallow;
}

/**
 * Draw a biome-appropriate fallback gradient
 * 
 * @param ctx - Canvas 2D context
 * @param containerWidth - Width of the drawing area
 * @param containerHeight - Height of the drawing area
 * @param biomeId - Biome identifier
 */
export function drawBiomeFallback(
  ctx: CanvasRenderingContext2D,
  containerWidth: number,
  containerHeight: number,
  biomeId: string
): void {
  const colors = getBiomeFallbackColors(biomeId);
  drawFallbackGradient(ctx, containerWidth, containerHeight, colors.top, colors.bottom);
}

// =============================================================================
// Water Effects (for future enhancement)
// =============================================================================

/**
 * Draw a simple water shimmer overlay effect
 * 
 * @param ctx - Canvas 2D context
 * @param containerWidth - Width of the drawing area
 * @param containerHeight - Height of the drawing area
 * @param time - Animation time (increments for animation)
 * @param intensity - Effect intensity (0-1)
 */
export function drawWaterShimmer(
  ctx: CanvasRenderingContext2D,
  containerWidth: number,
  containerHeight: number,
  time: number,
  intensity: number = 0.3
): void {
  // Simple animated gradient overlay for water shimmer effect
  const shimmerY = Math.sin(time * 0.5) * 20;

  ctx.save();
  ctx.globalAlpha = intensity * 0.15;

  const gradient = ctx.createLinearGradient(
    0, shimmerY,
    containerWidth, containerHeight + shimmerY
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.3, 'rgba(100, 200, 255, 0.05)');
  gradient.addColorStop(0.7, 'rgba(100, 200, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, containerWidth, containerHeight);

  ctx.restore();
}

/**
 * Draw caustic light rays effect (sunlight through water)
 * 
 * @param ctx - Canvas 2D context
 * @param containerWidth - Width of the drawing area
 * @param containerHeight - Height of the drawing area
 * @param time - Animation time
 * @param intensity - Effect intensity (0-1)
 */
export function drawCaustics(
  ctx: CanvasRenderingContext2D,
  containerWidth: number,
  containerHeight: number,
  time: number,
  intensity: number = 0.2
): void {
  ctx.save();
  ctx.globalAlpha = intensity;

  // Draw several animated light rays
  const rayCount = 5;
  for (let i = 0; i < rayCount; i++) {
    const baseX = (containerWidth / rayCount) * i + (containerWidth / rayCount / 2);
    const offset = Math.sin(time * 0.3 + i * 1.5) * 30;

    const gradient = ctx.createLinearGradient(
      baseX + offset, 0,
      baseX + offset + 50, containerHeight
    );
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(baseX + offset - 20, 0);
    ctx.lineTo(baseX + offset + 80, 0);
    ctx.lineTo(baseX + offset + 150, containerHeight);
    ctx.lineTo(baseX + offset - 50, containerHeight);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
