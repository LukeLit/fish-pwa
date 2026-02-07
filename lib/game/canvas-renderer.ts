/**
 * Canvas Renderer for Canvas Game
 * Handles all rendering: background, fish, particles, UI overlays
 */

import {
  drawFishWithDeformation,
  getSegmentsSmooth,
  PLAYER_SEGMENT_MULTIPLIER,
  getClipMode,
  hasUsableAnimations,
  type RenderContext,
} from '@/lib/rendering/fish-renderer';
import { HUNGER_LOW_THRESHOLD, HUNGER_WARNING_PULSE_FREQUENCY, HUNGER_WARNING_PULSE_BASE, HUNGER_WARNING_INTENSITY } from './hunger-constants';
import { computeEffectiveMaxStamina } from './stamina-hunger';
import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';
import { getRunConfig, getDepthBandRules } from './data/level-loader';
import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';
import type { MultiEntityDashParticleManager } from '@/lib/rendering/multi-entity-dash-particles';
import type { AnimationSprite } from '@/lib/rendering/animation-sprite';

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: PlayerEntity;
  fish: FishEntity[];
  camera: CameraState;
  zoom: number;
  animatedZoom: number;
  background?: HTMLImageElement;
  enableWaterDistortion: boolean;
  waterTime: number;
  deformationIntensity: number;
  gameMode: boolean;
  isEditMode: boolean;
  isPaused: boolean;
  selectedFishId: string | null;
  showEditButtons: boolean;
  editButtonPositions: Map<string, { x: number; y: number; size: number }>;
  chompParticles: ChompParticle[];
  bloodParticles: BloodParticle[];
  dashMultiEntity: MultiEntityDashParticleManager;
  animationSpriteManager: ReturnType<typeof import('@/lib/rendering/animation-sprite').getAnimationSpriteManager>;
  lastPlayerAnimAction: string | null;
  levelDuration: number;
  gameStartTime: number;
  totalPausedTime: number;
  pauseStartTime: number;
  score: number;
  fishCount: number;
  showBoundaryOverlay?: boolean;
  showDepthBandOverlay?: boolean;
  runId?: string;
  onEditFish?: (fishId: string) => void;
  setLastPlayerAnimAction: (action: string | null) => void;
}

/**
 * Render the complete game scene
 */
export function renderGame(options: RenderOptions): void {
  const {
    canvas,
    ctx,
    player,
    fish,
    camera,
    zoom,
    animatedZoom,
    background,
    enableWaterDistortion,
    waterTime,
    deformationIntensity,
    gameMode,
    isEditMode,
    isPaused,
    selectedFishId,
    showEditButtons,
    editButtonPositions,
    chompParticles,
    bloodParticles,
    dashMultiEntity,
    animationSpriteManager,
    lastPlayerAnimAction,
    levelDuration,
    gameStartTime,
    totalPausedTime,
    pauseStartTime,
    score,
    fishCount,
    showBoundaryOverlay = false,
    showDepthBandOverlay = false,
    runId = 'shallow_run',
    onEditFish,
    setLastPlayerAnimAction,
  } = options;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Calculate effective camera position
  let effectiveCamX = 0;
  let effectiveCamY = 0;

  if (isEditMode || isPaused) {
    if (selectedFishId) {
      // Follow selected fish
      const isPlayerSelected = selectedFishId === player.id;
      const selectedFish = isPlayerSelected ? null : fish.find((f) => f.id === selectedFishId);
      const selectedX = isPlayerSelected ? player.x : selectedFish?.x ?? 0;
      const selectedY = isPlayerSelected ? player.y : selectedFish?.y ?? 0;
      effectiveCamX = selectedX;
      effectiveCamY = selectedY;
    } else {
      // Free pan mode
      effectiveCamX = camera.panX;
      effectiveCamY = camera.panY;
    }
  } else {
    // Play mode: follow player
    effectiveCamX = camera.x;
    effectiveCamY = camera.y;
  }

  // Update camera effective position
  camera.effectiveX = effectiveCamX;
  camera.effectiveY = effectiveCamY;

  // Apply zoom
  ctx.save();
  ctx.scale(animatedZoom, animatedZoom);
  const scaledWidth = canvas.width / animatedZoom;
  const scaledHeight = canvas.height / animatedZoom;

  // Draw background
  renderBackground(ctx, scaledWidth, scaledHeight, effectiveCamX, effectiveCamY, background, enableWaterDistortion, waterTime);

  // Apply camera transform
  if (isEditMode || isPaused) {
    ctx.translate(scaledWidth / 2 - effectiveCamX, scaledHeight / 2 - effectiveCamY);
  } else {
    ctx.translate(scaledWidth / 2 - effectiveCamX, scaledHeight / 2 - effectiveCamY);
  }

  // Draw AI fish
  const renderContext: RenderContext = isEditMode ? 'edit' : gameMode ? 'game' : 'game';
  editButtonPositions.clear();

  fish.forEach((fishEntity) => {
    if (fishEntity.lifecycleState === 'removed') return;

    const fishOpacity = fishEntity.opacity ?? 1;
    const fishSpeed = Math.min(1, Math.sqrt(fishEntity.vx ** 2 + fishEntity.vy ** 2) / 1.5);
    const screenSize = fishEntity.size * animatedZoom;
    const fishHasAnimations = hasUsableAnimations(fishEntity.animations);
    const clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);

    ctx.save();
    ctx.globalAlpha = fishOpacity;

    let rendered = false;

    // Try animation sprite rendering
    if (clipMode === 'video' && fishEntity.animations && fishEntity.animationSprite) {
      const isKo = fishEntity.lifecycleState === 'knocked_out';
      const desiredAction = isKo && fishEntity.animationSprite.hasAction('hurt')
        ? 'hurt'
        : (fishEntity.isDashing && fishEntity.animationSprite.hasAction('dash')
          ? 'dash'
          : (fishSpeed < 0.15 ? 'idle' : 'swim'));
      fishEntity.animationSprite.playAction(desiredAction);
      fishEntity.animationSprite.update();

      const baseRotation = fishEntity.facingRight ? fishEntity.verticalTilt : -fishEntity.verticalTilt;
      const rotation = isKo ? baseRotation + Math.PI / 2 : baseRotation;
      ctx.globalAlpha = isKo ? fishOpacity * RENDERING.KO_OPACITY_MULTIPLIER : fishOpacity;

      rendered = fishEntity.animationSprite.drawToContext(
        ctx,
        fishEntity.x,
        fishEntity.y,
        fishEntity.size,
        fishEntity.size,
        {
          flipX: !fishEntity.facingRight,
          rotation,
        }
      );
    }

    // Fallback to deformation rendering
    if (!rendered && fishEntity.sprite) {
      const segments = getSegmentsSmooth(screenSize);
      const koTilt = fishEntity.lifecycleState === 'knocked_out' ? Math.PI / 2 : 0;
      drawFishWithDeformation(
        ctx,
        fishEntity.sprite,
        fishEntity.x,
        fishEntity.y,
        fishEntity.size,
        fishEntity.animTime,
        fishEntity.facingRight,
        {
          speed: fishSpeed,
          intensity: deformationIntensity,
          verticalTilt: fishEntity.verticalTilt + koTilt,
          segments,
        }
      );
    } else if (!rendered && !fishEntity.sprite) {
      // Fallback to colored circle
      ctx.fillStyle = fishEntity.type === 'prey' ? '#4ade80' : fishEntity.type === 'predator' ? '#f87171' : '#a78bfa';
      if (fishEntity.lifecycleState === 'knocked_out') {
        ctx.globalAlpha = (fishOpacity ?? 1) * RENDERING.KO_OPACITY_MULTIPLIER;
      }
      ctx.beginPath();
      ctx.arc(fishEntity.x, fishEntity.y, fishEntity.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);
    ctx.restore();
    editButtonPositions.set(fishEntity.id, { x: fishEntity.x, y: fishEntity.y, size: fishEntity.size });
  });

  // Draw dash particles behind fish
  if (gameMode) {
    const dashEntityIds = [
      'player',
      ...fish.filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed').map((f) => f.id),
    ];
    dashMultiEntity.drawBehind(ctx, dashEntityIds);
  }

  // Draw player
  const playerSpeed = Math.min(1, Math.sqrt(player.vx ** 2 + player.vy ** 2) / 1.5);
  const playerScreenSize = player.size * animatedZoom;
  const playerHasAnimations = hasUsableAnimations(player.animations);
  const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);

  let playerRendered = false;

  // Try animation sprite rendering
  if (playerClipMode === 'video' && playerHasAnimations && animationSpriteManager.hasSprite('player')) {
    const animSprite = animationSpriteManager.getSprite('player', player.animations || {});
    const desiredAction = player.isDashing && animSprite.hasAction('dash')
      ? 'dash'
      : (playerSpeed < 0.2 ? 'idle' : 'swim');
    if (lastPlayerAnimAction !== desiredAction) {
      setLastPlayerAnimAction(desiredAction);
      animSprite.playAction(desiredAction);
    }
    animSprite.update();
    playerRendered = animSprite.drawToContext(
      ctx,
      player.x,
      player.y,
      player.size,
      player.size,
      {
        flipX: !player.facingRight,
        rotation: player.facingRight ? player.verticalTilt : -player.verticalTilt,
      }
    );
  }

  // Fallback to deformation rendering
  if (!playerRendered && player.sprite) {
    const playerSegments = Math.round(getSegmentsSmooth(playerScreenSize) * PLAYER_SEGMENT_MULTIPLIER);
    drawFishWithDeformation(
      ctx,
      player.sprite,
      player.x,
      player.y,
      player.size,
      player.animTime,
      player.facingRight,
      {
        speed: playerSpeed,
        chompPhase: player.chompPhase,
        intensity: deformationIntensity,
        verticalTilt: player.verticalTilt,
        segments: playerSegments,
      }
    );
    playerRendered = true;
  }

  if (!playerRendered) {
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (gameMode) {
    drawStateIcon(ctx, player, player.x, player.y, player.size, animatedZoom);
  }
  editButtonPositions.set(player.id, { x: player.x, y: player.y, size: player.size });

  // Draw dash particles in front
  if (gameMode) {
    const dashEntityIds = [
      'player',
      ...fish.filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed').map((f) => f.id),
    ];
    dashMultiEntity.drawInFront(ctx, dashEntityIds);
  }

  // Draw particles
  renderBloodParticles(ctx, bloodParticles);
  renderChompParticles(ctx, chompParticles);

  // Draw boundary overlay when player is near world edges (before restore - still in world coords)
  if (showBoundaryOverlay) {
    const BOUNDARY_THRESHOLD = 65;
    const OVERLAY_THICKNESS = 80;
    const b = WORLD_BOUNDS;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = 'rgb(255, 0, 0)';
    if (player.y >= b.maxY - BOUNDARY_THRESHOLD) {
      ctx.fillRect(b.minX - 100, b.maxY - OVERLAY_THICKNESS, b.maxX - b.minX + 200, OVERLAY_THICKNESS + 50);
    }
    if (player.y <= b.minY + BOUNDARY_THRESHOLD) {
      ctx.fillRect(b.minX - 100, b.minY - 50, b.maxX - b.minX + 200, OVERLAY_THICKNESS + 50);
    }
    if (player.x >= b.maxX - BOUNDARY_THRESHOLD) {
      ctx.fillRect(b.maxX - OVERLAY_THICKNESS, b.minY - 100, OVERLAY_THICKNESS + 50, b.maxY - b.minY + 200);
    }
    if (player.x <= b.minX + BOUNDARY_THRESHOLD) {
      ctx.fillRect(b.minX - 50, b.minY - 100, OVERLAY_THICKNESS + 50, b.maxY - b.minY + 200);
    }
    ctx.restore();
  }

  // Draw depth band overlay in world space so bands mark actual depth and move with the camera.
  // Map the current run's depth range (e.g. 0.2–1.2 m) to full world Y so bands span the playable area.
  if (showDepthBandOverlay) {
    const b = WORLD_BOUNDS;
    const margin = 100;
    const run = getRunConfig(runId);
    const bandIds = run?.steps?.length ? run.steps : ['1-1', '1-2', '1-3'];
    const bands = bandIds
      .map((id, i) => ({ id, rules: getDepthBandRules(id, i + 1) }))
      .filter(({ rules }) => typeof rules.min_meters === 'number' && typeof rules.max_meters === 'number');
    if (bands.length > 0) {
      const runMinMeters = Math.min(...bands.map(({ rules }) => rules.min_meters));
      const runMaxMeters = Math.max(...bands.map(({ rules }) => rules.max_meters));
      const runDepthSpan = Math.max(runMaxMeters - runMinMeters, 0.1);
      const worldHeight = b.maxY - b.minY;
      const metersToWorldY = (meters: number) =>
        b.minY + ((meters - runMinMeters) / runDepthSpan) * worldHeight;

      const bandAlphaById: Record<string, number> = { '1-1': 0.05, '1-2': 0.08, '1-3': 0.14 };
      const bandAlphaByIndex = [0.05, 0.08, 0.14];
      const getAlpha = (id: string, index: number) => bandAlphaById[id] ?? bandAlphaByIndex[Math.min(index, 2)] ?? 0.08;

      ctx.save();
      for (let i = 0; i < bands.length; i++) {
        const { id, rules } = bands[i];
        const yMin = metersToWorldY(rules.min_meters);
        const yMax = metersToWorldY(rules.max_meters);
        const bandHeight = yMax - yMin;
        if (bandHeight <= 0) continue;
        const gradient = ctx.createLinearGradient(b.minX - margin, yMin, b.minX - margin, yMax);
        const alpha = getAlpha(id, i);
        gradient.addColorStop(0, `rgba(0, 30, 60, 0)`);
        gradient.addColorStop(0.15, `rgba(0, 30, 60, ${alpha * 0.6})`);
        gradient.addColorStop(0.5, `rgba(0, 30, 60, ${alpha})`);
        gradient.addColorStop(0.85, `rgba(0, 30, 60, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(0, 30, 60, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(b.minX - margin, yMin, b.maxX - b.minX + 2 * margin, bandHeight);
      }
      const boundaryYs = Array.from(
        new Set(bands.flatMap(({ rules }) => [metersToWorldY(rules.min_meters), metersToWorldY(rules.max_meters)]))
      ).sort((a, b) => a - b);
      const eps = 1;
      const deduped = boundaryYs.filter((y, i) => i === 0 || y - boundaryYs[i - 1] > eps);
      const bandColors = [
        'rgb(150, 220, 255)', // Band 1-1: light cyan
        'rgb(100, 180, 255)', // Band 1-2: medium blue
        'rgb(80, 140, 255)',  // Band 1-3: darker blue
      ];
      const getBandColor = (bandId: string, index: number) => {
        const bandAlphaById: Record<string, number> = { '1-1': 0, '1-2': 1, '1-3': 2 };
        const colorIndex = bandAlphaById[bandId] ?? Math.min(index, 2);
        return bandColors[colorIndex] ?? 'rgb(200, 230, 255)';
      };
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      for (const y of deduped) {
        const yTolerance = 2;
        const bandStartingHere = bands.find((band, idx) =>
          Math.abs(metersToWorldY(band.rules.min_meters) - y) <= yTolerance
        );
        const bandEndingHere = bands.find((band, idx) =>
          Math.abs(metersToWorldY(band.rules.max_meters) - y) <= yTolerance
        );
        const band = bandStartingHere ?? bandEndingHere;
        const bandIndex = band ? bands.findIndex((b) => b.id === band.id) : 0;
        const color = band ? getBandColor(band.id, bandIndex) : 'rgb(200, 230, 255)';
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(b.minX - margin, y);
        ctx.lineTo(b.maxX + margin, y);
        ctx.stroke();
      }
      const centerX = (b.minX + b.maxX) / 2;
      const labelOffset = 15;
      const lineHeight = 14;
      const yTolerance = 2;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < deduped.length; i++) {
        const y = deduped[i];
        const bandStartingHere = bands.find((band) =>
          Math.abs(metersToWorldY(band.rules.min_meters) - y) <= yTolerance
        );
        const bandEndingHere = bands.find((band) =>
          Math.abs(metersToWorldY(band.rules.max_meters) - y) <= yTolerance
        );
        const band = bandStartingHere ?? bandEndingHere;
        if (!band) continue;
        const bandIndex = bands.findIndex((b) => b.id === band.id);
        const color = getBandColor(band.id, bandIndex);
        const slash = band.id.replace('-', '/');
        const minM = band.rules.min_meters;
        const maxM = band.rules.max_meters;
        const depthStr = typeof minM === 'number' && typeof maxM === 'number'
          ? `${minM}–${maxM} m`
          : `Depth ${slash}`;
        const levelLabel = bandStartingHere ? `Start ${slash}` : `End ${slash}`;
        const depthLabel = depthStr;
        const labelY = y - labelOffset;
        ctx.fillStyle = color;
        ctx.fillText(levelLabel, centerX, labelY - lineHeight / 2);
        ctx.fillText(depthLabel, centerX, labelY + lineHeight / 2);
      }
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = 'rgb(200, 230, 255)';
      ctx.beginPath();
      ctx.moveTo(b.minX, b.minY);
      ctx.lineTo(b.minX, b.maxY);
      ctx.moveTo(b.maxX, b.minY);
      ctx.lineTo(b.maxX, b.maxY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Restore zoom transform (now in screen space)
  ctx.restore();

  // Draw water effect overlay
  if (enableWaterDistortion) {
    renderWaterEffect(ctx, canvas.width, canvas.height, waterTime);
  }

  // Draw low hunger warning
  if (gameMode && player.hunger <= HUNGER_LOW_THRESHOLD) {
    renderHungerWarning(ctx, canvas.width, canvas.height, player.hunger);
  }

  // Draw edit buttons
  if (showEditButtons && !isEditMode && onEditFish) {
    renderEditButtons(ctx, canvas.width, canvas.height, editButtonPositions, effectiveCamX, effectiveCamY, animatedZoom, onEditFish);
  }

  // Draw game mode UI
  if (gameMode) {
    const effectiveLevelDuration =
      typeof levelDuration === 'number' && Number.isFinite(levelDuration) && levelDuration > 0
        ? levelDuration
        : GAME.DEFAULT_LEVEL_DURATION_MS;
    const currentPausedTime = isPaused ? (Date.now() - pauseStartTime) : 0;
    const elapsed =
      gameStartTime > 0
        ? Date.now() - gameStartTime - totalPausedTime - currentPausedTime
        : 0;
    const timeLeft = Math.max(0, Math.ceil((effectiveLevelDuration - elapsed) / 1000));
    renderGameUI(ctx, canvas.width, canvas.height, player, score, fishCount, timeLeft);
  }

  // Draw paused indicator
  if (isPaused && gameMode) {
    renderPausedIndicator(ctx, canvas.width, canvas.height);
  }
}

/**
 * Render background with parallax
 */
function renderBackground(
  ctx: CanvasRenderingContext2D,
  scaledWidth: number,
  scaledHeight: number,
  camX: number,
  camY: number,
  background: HTMLImageElement | undefined,
  enableWaterDistortion: boolean,
  waterTime: number
): void {
  if (background) {
    ctx.save();
    ctx.filter = 'blur(6px)';

    const parallaxFactor = RENDERING.BACKGROUND_PARALLAX_FACTOR;
    const bgScale = RENDERING.BACKGROUND_SCALE;

    const imgAspect = background.width / background.height;
    const screenAspect = scaledWidth / scaledHeight;

    let drawWidth, drawHeight;
    if (imgAspect > screenAspect) {
      drawHeight = scaledHeight * bgScale;
      drawWidth = drawHeight * imgAspect;
    } else {
      drawWidth = scaledWidth * bgScale;
      drawHeight = drawWidth / imgAspect;
    }

    const maxOffsetX = (drawWidth - scaledWidth) / 2;
    const maxOffsetY = (drawHeight - scaledHeight) / 2;
    const rawOffsetX = camX * parallaxFactor;
    const rawOffsetY = camY * parallaxFactor;
    const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
    const clampedOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));

    const bgX = (scaledWidth - drawWidth) / 2 - clampedOffsetX;
    const bgY = (scaledHeight - drawHeight) / 2 - clampedOffsetY;

    ctx.drawImage(background, bgX, bgY, drawWidth, drawHeight);
    ctx.restore();

    // Vignette effect
    ctx.save();
    const vignetteGradient = ctx.createRadialGradient(
      scaledWidth / 2, scaledHeight / 2, scaledHeight * 0.3,
      scaledWidth / 2, scaledHeight / 2, scaledHeight * 0.8
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    ctx.restore();

    // Water shimmer overlay
    if (enableWaterDistortion) {
      ctx.save();
      ctx.globalAlpha = 0.03;
      const time = waterTime;
      for (let y = 0; y < scaledHeight; y += 30) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < scaledWidth; x += 10) {
          const wave = Math.sin(x * RENDERING.WATER_DISTORTION_WAVE_SCALE + time * RENDERING.WATER_DISTORTION_TIME_SCALE + y * 0.02) * RENDERING.WATER_DISTORTION_AMPLITUDE;
          if (x === 0) {
            ctx.moveTo(x, y + wave);
          } else {
            ctx.lineTo(x, y + wave);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // Default gradient background
    const offsetX = scaledWidth / 2 - camX;
    const offsetY = scaledHeight / 2 - camY;
    const gradient = ctx.createLinearGradient(-offsetX, -offsetY, -offsetX, scaledHeight - offsetY);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = gradient;
    ctx.fillRect(-offsetX - scaledWidth, -offsetY - scaledHeight, scaledWidth * 3, scaledHeight * 3);
  }
}

/**
 * Render blood particles
 */
function renderBloodParticles(ctx: CanvasRenderingContext2D, particles: BloodParticle[]): void {
  particles.forEach((b) => {
    const alpha = Math.max(0, b.life) * RENDERING.BLOOD_PARTICLE_ALPHA;
    const r = Math.max(RENDERING.BLOOD_PARTICLE_MIN_RADIUS, b.radius * b.life);
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    g.addColorStop(0, `rgba(180, 40, 50, ${alpha})`);
    g.addColorStop(0.5, `rgba(140, 30, 40, ${alpha * 0.35})`);
    g.addColorStop(1, 'rgba(100, 20, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Render chomp particles
 */
function renderChompParticles(ctx: CanvasRenderingContext2D, particles: ChompParticle[]): void {
  particles.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life);

    const totalScale = p.scale * (p.punchScale || 1);
    ctx.font = `bold ${Math.round(16 * totalScale)}px sans-serif`;

    let fillColor = p.color || '#fff';
    if (!p.color) {
      if (p.text === 'CHOMP') {
        fillColor = '#ffcc00';
      } else if (p.text.startsWith('+') && !p.text.includes('Shallow') && !p.text.includes('Deep') && !p.text.includes('Tropical') && !p.text.includes('Polluted')) {
        fillColor = '#4ade80';
      }
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  });
}

/**
 * Render water effect overlay
 */
function renderWaterEffect(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let y = 0; y < height; y += 20) {
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 10) {
      const wave = Math.sin(x * RENDERING.WATER_DISTORTION_WAVE_SCALE + time + y * 0.02) * RENDERING.WATER_DISTORTION_AMPLITUDE;
      if (x === 0) {
        ctx.moveTo(x, y + wave);
      } else {
        ctx.lineTo(x, y + wave);
      }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.02;
  const rayCount = RENDERING.SUNRAY_COUNT;
  for (let i = 0; i < rayCount; i++) {
    const xPos = (i / rayCount) * width + Math.sin(time + i) * RENDERING.SUNRAY_OFFSET;
    const gradient = ctx.createLinearGradient(xPos, 0, xPos, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(xPos - 30, 0, 60, height);
  }
  ctx.restore();
}

/**
 * Render hunger warning overlay
 */
function renderHungerWarning(ctx: CanvasRenderingContext2D, width: number, height: number, hunger: number): void {
  ctx.save();
  const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
  const intensity = (1 - hunger / HUNGER_LOW_THRESHOLD) * HUNGER_WARNING_INTENSITY * pulse;

  ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.6
  );
  vignette.addColorStop(0, 'rgba(139, 0, 0, 0)');
  vignette.addColorStop(1, `rgba(139, 0, 0, ${intensity * 0.6})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Render edit buttons
 */
function renderEditButtons(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  buttonPositions: Map<string, { x: number; y: number; size: number }>,
  camX: number,
  camY: number,
  zoom: number,
  onEditFish: (fishId: string) => void
): void {
  buttonPositions.forEach((pos, fishId) => {
    const screenX = (pos.x - camX) * zoom + width / 2;
    const screenY = (pos.y - camY) * zoom + height / 2;
    const buttonSize = UI.EDIT_BUTTON_SIZE;
    const buttonY = screenY - pos.size * zoom / 2 - buttonSize - UI.EDIT_BUTTON_OFFSET;

    ctx.save();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, buttonY, buttonSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✎', screenX, buttonY);
    ctx.restore();
  });
}

/**
 * Draw state icon above entity (KO, exhausted, or despawning).
 */
function drawStateIcon(
  ctx: CanvasRenderingContext2D,
  entity: { lifecycleState?: string; stamina?: number; isExhausted?: boolean },
  x: number,
  y: number,
  size: number,
  zoom: number
): void {
  const iconY = y - size * 0.75;
  const iconSize = Math.max(12, Math.min(24, size * 0.5 * zoom));
  ctx.save();

  const ko = entity.lifecycleState === 'knocked_out';
  const exhausted = entity.lifecycleState === 'exhausted' || (entity as { isExhausted?: boolean }).isExhausted || ((entity.stamina ?? 1) <= 0 && !ko);

  if (ko) {
    ctx.fillStyle = 'rgba(255, 200, 0, 0.95)';
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', x, iconY);
  } else if (exhausted) {
    ctx.fillStyle = 'rgba(100, 180, 255, 0.95)';
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('…', x, iconY);
  } else if (entity.lifecycleState === 'despawning') {
    ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', x, iconY);
  }

  ctx.restore();
}

/**
 * Render game UI (stats, combined stamina bar, timer)
 */
function renderGameUI(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  player: PlayerEntity,
  score: number,
  fishCount: number,
  timeLeft: number
): void {
  // Stats panel
  const statsY = height - UI.STATS_Y_OFFSET;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, statsY, 130, 80);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, statsY, 130, 80);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`Score: ${score}`, 20, statsY + 18);
  ctx.fillText(`Size: ${Math.floor(player.size)}`, 20, statsY + 36);
  ctx.fillText(`Time: ${timeLeft}s`, 20, statsY + 54);
  ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
  ctx.fillText(`Fish: ${fishCount}`, 20, statsY + 72);
  ctx.restore();

  // Combined stamina bar (hunger = capacity, stamina = fill) - Monster Hunter style
  const barWidth = Math.min(UI.HUNGER_BAR_WIDTH, width - UI.HUNGER_BAR_MIN_WIDTH);
  const barHeight = UI.STAMINA_BAR_HEIGHT;
  const barX = (width - barWidth) / 2;
  const barY = UI.HUNGER_BAR_Y;
  const baseMax = player.baseMaxStamina ?? 100;
  const effectiveMax = Math.max(0.01, computeEffectiveMaxStamina(baseMax, player.hunger));
  const capacityPercent = player.hunger / 100;
  const staminaPercent = effectiveMax > 0 ? player.stamina / effectiveMax : 0;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  const innerW = barWidth - UI.HUNGER_BAR_PADDING * 2;
  const innerH = barHeight - UI.HUNGER_BAR_PADDING * 2;
  const innerX = barX + UI.HUNGER_BAR_PADDING;
  const innerY = barY + UI.HUNGER_BAR_PADDING;

  const capacityWidth = innerW * capacityPercent;
  let capacityColor = '#f59e0b';
  if (capacityPercent <= 0.25) capacityColor = '#ef4444';
  else if (capacityPercent <= 0.5) capacityColor = '#fbbf24';
  ctx.fillStyle = capacityColor;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(innerX, innerY, capacityWidth, innerH);
  ctx.globalAlpha = 1;

  const staminaColor = staminaPercent > UI.STAMINA_LOW_THRESHOLD ? '#22d3ee' : '#ef4444';
  ctx.fillStyle = staminaColor;
  const staminaFillWidth = capacityWidth * Math.min(1, staminaPercent);
  ctx.fillRect(innerX, innerY, staminaFillWidth, innerH);

  if (capacityPercent <= 0.25) {
    const pulse = Math.sin(Date.now() * HUNGER_WARNING_PULSE_FREQUENCY) * HUNGER_WARNING_PULSE_BASE + HUNGER_WARNING_PULSE_BASE;
    ctx.shadowColor = capacityColor;
    ctx.shadowBlur = 15 * pulse;
    ctx.strokeStyle = capacityColor;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`STAMINA ${Math.ceil(player.stamina)} / ${Math.ceil(effectiveMax)}  (Hunger ${Math.ceil(player.hunger)}%)`, barX + barWidth / 2, barY + barHeight / 2);
  ctx.restore();

  // Timer
  const timerY = barY + barHeight + UI.TIMER_SPACING;
  ctx.font = 'bold 20px monospace';
  if (timeLeft <= 10) {
    const flash = Math.sin(Date.now() * 0.01) > 0;
    ctx.fillStyle = flash ? '#fbbf24' : '#ffffff';
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  }
  ctx.fillText(`${timeLeft}s`, width / 2, timerY);
}

/**
 * Render paused indicator
 */
function renderPausedIndicator(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏸ PAUSED', width / 2, height / 2);
  ctx.restore();
}
