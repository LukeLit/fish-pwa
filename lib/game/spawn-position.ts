/**
 * Default player spawn position – top of current level band in world space.
 * Uses the same meters→world Y mapping as the depth overlay so spawn aligns with depth bands.
 */

import { getActConfig, getDepthBandRules } from './data/level-loader';
import { WORLD_BOUNDS } from './canvas-constants';

/** Depth in meters offset from top of band (shallow end). */
const SPAWN_DEPTH_OFFSET_METERS = 0.05;

/**
 * Returns world { x, y } for the default player spawn: top of the given level band.
 * Uses run's depth range and the same meters→worldY formula as the depth overlay.
 *
 * @param runId - Act id (e.g. 'shallow_act'). Defaults to 'shallow_act'.
 * @param currentLevel - Depth band id (e.g. '1-1'). Defaults to '1-1'.
 */
export function getDefaultPlayerSpawnPosition(
  runId?: string,
  currentLevel?: string
): { x: number; y: number } {
  const act = getActConfig(runId ?? 'shallow_act');
  const bandId = currentLevel ?? '1-1';
  const band = getDepthBandRules(bandId, 1);

  const b = WORLD_BOUNDS;
  const worldHeight = b.maxY - b.minY;

  let runMinMeters: number;
  let runMaxMeters: number;

  if (act?.steps?.length) {
    const bands = act.steps.map((id, i) => getDepthBandRules(id, i + 1));
    runMinMeters = Math.min(...bands.map((r) => r.min_meters));
    runMaxMeters = Math.max(...bands.map((r) => r.max_meters));
  } else {
    runMinMeters = band.min_meters;
    runMaxMeters = band.max_meters;
  }

  const runDepthSpan = Math.max(runMaxMeters - runMinMeters, 0.1);
  const depthMeters = band.min_meters + SPAWN_DEPTH_OFFSET_METERS;
  const worldY =
    b.minY + ((depthMeters - runMinMeters) / runDepthSpan) * worldHeight;

  const worldX = (b.minX + b.maxX) / 2;

  return { x: worldX, y: worldY };
}

/** Max attempts to find a spawn point at least minDistance from the player. */
const SPAWN_POSITION_RETRIES = 20;

/**
 * Returns world { x, y } for spawning a fish within its depth band, at least minDistance from the player.
 * Y is random within the band's world Y range; X is random in world X. Retries if too close to player.
 *
 * @param runId - Act id (e.g. 'shallow_act'). Defaults to 'shallow_act'.
 * @param depthBandId - Depth band id (e.g. '1-1') – fish spawn in this band's Y range.
 * @param playerPos - Current player position (used to enforce min distance).
 * @param minDistance - Minimum world-space distance from player (e.g. SPAWN.MIN_DISTANCE).
 */
export function getSpawnPositionInBand(
  runId: string | undefined,
  depthBandId: string | undefined,
  playerPos: { x: number; y: number },
  minDistance: number
): { x: number; y: number } {
  const act = getActConfig(runId ?? 'shallow_act');
  const bandId = depthBandId ?? '1-1';
  const band = getDepthBandRules(bandId, 1);
  const b = WORLD_BOUNDS;
  const worldHeight = b.maxY - b.minY;

  let runMinMeters: number;
  let runMaxMeters: number;

  if (act?.steps?.length) {
    const bands = act.steps.map((id, i) => getDepthBandRules(id, i + 1));
    runMinMeters = Math.min(...bands.map((r) => r.min_meters));
    runMaxMeters = Math.max(...bands.map((r) => r.max_meters));
  } else {
    runMinMeters = band.min_meters;
    runMaxMeters = band.max_meters;
  }

  const runDepthSpan = Math.max(runMaxMeters - runMinMeters, 0.1);
  const metersToWorldY = (meters: number) =>
    b.minY + ((meters - runMinMeters) / runDepthSpan) * worldHeight;

  const bandYMin = metersToWorldY(band.min_meters);
  const bandYMax = metersToWorldY(band.max_meters);
  const bandHeight = Math.max(bandYMax - bandYMin, 50);

  const minDistSq = minDistance * minDistance;

  for (let attempt = 0; attempt < SPAWN_POSITION_RETRIES; attempt++) {
    const y = bandYMin + Math.random() * bandHeight;
    const x = b.minX + Math.random() * (b.maxX - b.minX);
    const dx = x - playerPos.x;
    const dy = y - playerPos.y;
    if (dx * dx + dy * dy >= minDistSq) {
      return {
        x: Math.max(b.minX, Math.min(b.maxX, x)),
        y: Math.max(b.minY, Math.min(b.maxY, y)),
      };
    }
  }

  // Fallback: push away from player along a random angle, clamped to band Y
  const angle = Math.random() * Math.PI * 2;
  const x = playerPos.x + Math.cos(angle) * minDistance;
  const y = Math.max(bandYMin, Math.min(bandYMax, playerPos.y + Math.sin(angle) * minDistance));
  return {
    x: Math.max(b.minX, Math.min(b.maxX, x)),
    y: Math.max(b.minY, Math.min(b.maxY, y)),
  };
}

/**
 * Returns world Y range { min, max } for the given depth bands (for player clamping).
 */
export function getWorldYRangeForBands(
  runId: string | undefined,
  bandIds: string[]
): { min: number; max: number } {
  const act = getActConfig(runId ?? 'shallow_act');
  const b = WORLD_BOUNDS;
  const worldHeight = b.maxY - b.minY;

  if (!act?.steps?.length || bandIds.length === 0) {
    return { min: b.minY, max: b.maxY };
  }

  const bands = act.steps.map((id, i) => getDepthBandRules(id, i + 1));
  const runMinMeters = Math.min(...bands.map((r) => r.min_meters));
  const runMaxMeters = Math.max(...bands.map((r) => r.max_meters));
  const runDepthSpan = Math.max(runMaxMeters - runMinMeters, 0.1);
  const metersToWorldY = (meters: number) =>
    b.minY + ((meters - runMinMeters) / runDepthSpan) * worldHeight;

  let yMin: number = b.maxY;
  let yMax: number = b.minY;
  for (const bandId of bandIds) {
    const band = getDepthBandRules(bandId, 1);
    const byMin = metersToWorldY(band.min_meters);
    const byMax = metersToWorldY(band.max_meters);
    yMin = Math.min(yMin, byMin);
    yMax = Math.max(yMax, byMax);
  }

  return { min: Math.max(b.minY, yMin), max: Math.min(b.maxY, yMax) };
}
