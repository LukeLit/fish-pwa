/**
 * Sprite-derived hitbox computation
 * Analyzes opaque pixels from chroma-processed sprites to compute head and body ellipses.
 * Baked at load time for performance.
 */

/** Ellipse params normalized to sprite 0-1 (cx, cy = center; rx, ry = radii) */
export interface BakedEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
}

export interface BakedHitbox {
  head: BakedEllipse;
  body: BakedEllipse;
}

const ALPHA_THRESHOLD = 64;

/**
 * Compute head and body ellipses from sprite pixel data.
 * Splits the sprite along its long axis; front half = head, back half = body.
 * Returns normalized coords (0-1) relative to sprite dimensions.
 */
export function computeSpriteHitbox(sprite: HTMLCanvasElement): BakedHitbox {
  const w = sprite.width;
  const h = sprite.height;
  const ctx = sprite.getContext('2d');
  if (!ctx) return getFallbackHitbox();

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const headPixels: { x: number; y: number }[] = [];
  const bodyPixels: { x: number; y: number }[] = [];
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > ALPHA_THRESHOLD) {
        const px = x + 0.5;
        const py = y + 0.5;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
        const midX = w / 2;
        if (px >= midX) headPixels.push({ x: px, y: py });
        else bodyPixels.push({ x: px, y: py });
      }
    }
  }

  // If too few pixels, use fallback
  if (headPixels.length < 4 && bodyPixels.length < 4) return getFallbackHitbox();
  if (headPixels.length === 0) headPixels.push(...bodyPixels.splice(0, Math.ceil(bodyPixels.length / 2)));
  if (bodyPixels.length === 0) bodyPixels.push(...headPixels.splice(0, Math.ceil(headPixels.length / 2)));

  const head = fitEllipseToPixels(headPixels, w, h);
  const body = fitEllipseToPixels(bodyPixels, w, h);

  return { head, body };
}

/**
 * Fit an ellipse to pixel coordinates using PCA (principal component analysis).
 * Yields center, semi-axes (rx, ry), and rotation from chroma-processed pixel data.
 */
function fitEllipseToPixels(
  pixels: { x: number; y: number }[],
  spriteW: number,
  spriteH: number
): BakedEllipse {
  if (pixels.length === 0) {
    return { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.15, rotation: 0 };
  }
  const n = pixels.length;
  let sumX = 0;
  let sumY = 0;
  for (const p of pixels) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;
  for (const p of pixels) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }
  covXX /= n;
  covYY /= n;
  covXY /= n;

  const trace = covXX + covYY;
  const det = covXX * covYY - covXY * covXY;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
  const lambda1 = (trace + disc) / 2;
  const lambda2 = (trace - disc) / 2;

  const rxRaw = Math.sqrt(Math.max(0, lambda1)) * 2;
  const ryRaw = Math.sqrt(Math.max(0, lambda2)) * 2;

  const rx = Math.max(0.05, rxRaw / spriteW);
  const ry = Math.max(0.05, ryRaw / spriteH);

  const cx = meanX / spriteW;
  const cy = meanY / spriteH;

  let rotation = 0;
  if (Math.abs(covXY) > 1e-10) {
    rotation = Math.atan2(2 * covXY, covXX - covYY) / 2;
  }

  return { cx, cy, rx, ry, rotation };
}

/** Fallback hitbox when sprite analysis fails - full-body ellipses */
export function getFallbackHitbox(): BakedHitbox {
  return {
    head: {
      cx: 0.72,
      cy: 0.5,
      rx: 0.22,
      ry: 0.18,
      rotation: 0,
    },
    body: {
      cx: 0.5,
      cy: 0.5,
      rx: 0.35,
      ry: 0.25,
      rotation: 0,
    },
  };
}
