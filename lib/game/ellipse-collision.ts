/**
 * Ellipse collision utilities.
 * Used for head/body hitbox overlap and body separation.
 */

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
}

/**
 * Test if a point lies inside an ellipse.
 * Transforms point to ellipse local space and checks (x/rx)² + (y/ry)² ≤ 1.
 */
export function pointInEllipse(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const t = (lx / rx) * (lx / rx) + (ly / ry) * (ly / ry);
  return t <= 1;
}

/**
 * Sample a random point uniformly inside an ellipse.
 * Uses sqrt(random) for uniform area distribution.
 */
export function samplePointInsideEllipse(ellipse: Ellipse): { x: number; y: number } {
  const { cx, cy, rx, ry, rotation } = ellipse;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()); // sqrt for uniform distribution
  const lx = r * rx * Math.cos(angle);
  const ly = r * ry * Math.sin(angle);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  };
}

/**
 * Sample points on the boundary of an ellipse (for overlap testing).
 */
function sampleEllipseBoundary(ellipse: Ellipse, numPoints: number): { x: number; y: number }[] {
  const { cx, cy, rx, ry, rotation } = ellipse;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 2;
    const lx = rx * Math.cos(t);
    const ly = ry * Math.sin(t);
    points.push({
      x: cx + lx * cos - ly * sin,
      y: cy + lx * sin + ly * cos,
    });
  }
  return points;
}

/**
 * Check if two ellipses overlap.
 * Uses point-in-ellipse: if either center is inside the other, or any boundary point
 * of one ellipse lies inside the other, they overlap.
 */
export function ellipseOverlapsEllipse(e1: Ellipse, e2: Ellipse): boolean {
  if (pointInEllipse(e1.cx, e1.cy, e2.cx, e2.cy, e2.rx, e2.ry, e2.rotation)) return true;
  if (pointInEllipse(e2.cx, e2.cy, e1.cx, e1.cy, e1.rx, e1.ry, e1.rotation)) return true;
  const boundary = sampleEllipseBoundary(e1, 12);
  for (const p of boundary) {
    if (pointInEllipse(p.x, p.y, e2.cx, e2.cy, e2.rx, e2.ry, e2.rotation)) return true;
  }
  const boundary2 = sampleEllipseBoundary(e2, 12);
  for (const p of boundary2) {
    if (pointInEllipse(p.x, p.y, e1.cx, e1.cy, e1.rx, e1.ry, e1.rotation)) return true;
  }
  return false;
}
