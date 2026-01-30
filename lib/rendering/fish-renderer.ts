/**
 * Fish Rendering Utilities
 * 
 * Shared module for rendering animated fish sprites consistently
 * across the game, editor, and selection screens.
 * 
 * All fish display should use these functions to ensure:
 * - Consistent chroma key removal
 * - Consistent animation/deformation
 * - Single source of truth for future animation enhancements
 */

// Default chroma key tolerance
export const DEFAULT_CHROMA_TOLERANCE = 50;

export interface DrawFishOptions {
  /** Speed 0–1+; boosts tail motion when moving */
  speed?: number;
  /** 0–1 chomp phase; bulges front (head) when > 0 */
  chompPhase?: number;
  /** Deformation intensity multiplier (default 1) */
  intensity?: number;
  /** Vertical tilt in radians */
  verticalTilt?: number;
}

/**
 * Remove background color from sprite (chroma key removal)
 * Detects corner colors and removes them with edge feathering.
 * 
 * @param img - Source image element
 * @param tolerance - Color difference tolerance (default 50)
 * @returns Processed canvas with transparent background
 */
export function removeBackground(img: HTMLImageElement, tolerance: number = DEFAULT_CHROMA_TOLERANCE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample corner colors to detect background
  const corners = [
    { x: 0, y: 0 },
    { x: canvas.width - 1, y: 0 },
    { x: 0, y: canvas.height - 1 },
    { x: canvas.width - 1, y: canvas.height - 1 },
  ];

  // Get average corner color (likely the background - usually magenta #FF00FF)
  let totalR = 0, totalG = 0, totalB = 0;
  corners.forEach(corner => {
    const idx = (corner.y * canvas.width + corner.x) * 4;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
  });

  const bgColor = {
    r: Math.round(totalR / corners.length),
    g: Math.round(totalG / corners.length),
    b: Math.round(totalB / corners.length),
  };

  // Remove background color
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate color difference from detected background
    const diff = Math.sqrt(
      Math.pow(r - bgColor.r, 2) +
      Math.pow(g - bgColor.g, 2) +
      Math.pow(b - bgColor.b, 2)
    );

    // If pixel is close to background color, make it transparent
    if (diff < tolerance) {
      data[i + 3] = 0;
    } else if (diff < tolerance * 1.5) {
      // Feather edges for smoother transitions
      const alpha = ((diff - tolerance) / (tolerance * 0.5)) * 255;
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Load and process a fish sprite with chroma key removal
 * 
 * @param spriteUrl - URL of the sprite image
 * @param tolerance - Chroma key tolerance
 * @returns Promise resolving to processed canvas
 */
export function loadFishSprite(spriteUrl: string, tolerance: number = DEFAULT_CHROMA_TOLERANCE): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processed = removeBackground(img, tolerance);
      resolve(processed);
    };
    img.onerror = () => reject(new Error(`Failed to load sprite: ${spriteUrl}`));
    img.src = spriteUrl;
  });
}

/**
 * Draw fish with spine-based wave deformation animation
 * 
 * This is the canonical fish rendering function used across the entire game.
 * Any animation enhancements should be made here to affect all fish displays.
 * 
 * @param ctx - Canvas 2D rendering context
 * @param sprite - Pre-processed sprite canvas (use removeBackground first)
 * @param x - Center X position
 * @param y - Center Y position
 * @param size - Fish size (width)
 * @param animTime - Animation time (increment each frame for animation)
 * @param facingRight - Direction fish is facing
 * @param options - Additional drawing options
 */
export function drawFishWithDeformation(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  animTime: number,
  facingRight: boolean,
  options: DrawFishOptions = {}
): void {
  const {
    speed = 0,
    chompPhase = 0,
    intensity = 1,
    verticalTilt = 0
  } = options;

  // Movement-based animation: more tail motion when swimming
  const speedBoost = 1 + Math.min(1, speed) * 0.6;
  const effectiveIntensity = intensity * speedBoost;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facingRight ? verticalTilt : -verticalTilt);
  ctx.scale(facingRight ? 1 : -1, 1);

  const segments = 8;
  const segmentWidth = size / segments;

  for (let i = 0; i < segments; i++) {
    const waveStrength = 1 - i / segments; // 1 at tail, 0 at head
    const wave = Math.sin(animTime + i * 0.3) * 1.5 * waveStrength * effectiveIntensity;

    ctx.save();

    const segX = -size / 2 + i * segmentWidth;
    ctx.translate(segX, wave);

    const rotation = Math.sin(animTime + i * 0.3) * 0.025 * waveStrength * effectiveIntensity;
    ctx.rotate(rotation);

    // Chomp bulge: stretch front segments (head) horizontally
    let drawW = segmentWidth;
    let drawX = 0;
    if (chompPhase > 0) {
      const headAmount = i / segments; // 0 at tail, 1 at head
      const bulge = 1 + chompPhase * 0.4 * headAmount; // up to 40% wider at peak
      drawW = segmentWidth * bulge;
      drawX = facingRight ? -segmentWidth * (bulge - 1) * 0.5 : segmentWidth * (bulge - 1) * 0.5;
    }
    ctx.translate(drawX, 0);

    ctx.drawImage(
      sprite,
      (i / segments) * sprite.width,
      0,
      sprite.width / segments,
      sprite.height,
      0,
      -size / 2,
      drawW,
      size
    );

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Calculate animation time increment based on speed
 * Use this for consistent animation speed across components
 * 
 * @param currentAnimTime - Current animation time
 * @param speed - Movement speed (0-1 normalized)
 * @param baseRate - Base animation rate (default 0.05)
 * @returns New animation time
 */
export function updateAnimTime(
  currentAnimTime: number,
  speed: number = 0,
  baseRate: number = 0.05
): number {
  const normalizedSpeed = Math.min(1, speed);
  return currentAnimTime + baseRate + normalizedSpeed * 0.06;
}
