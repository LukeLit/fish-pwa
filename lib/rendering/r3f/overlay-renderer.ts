/**
 * Overlay Renderer - 2D canvas overlay for particles, UI, and world-space overlays
 * Complements R3F scene (background, entities, carcasses, chunks)
 */

import { RENDERING, UI, WORLD_BOUNDS, COMBAT, PLAYER_BASE_MAX_HEALTH } from '@/lib/game/canvas-constants';
import { HUNGER_LOW_THRESHOLD, HUNGER_WARNING_PULSE_FREQUENCY, HUNGER_WARNING_PULSE_BASE, HUNGER_WARNING_INTENSITY } from '@/lib/game/hunger-constants';
import { computeEffectiveMaxStamina } from '@/lib/game/stamina-hunger';
import { getActConfig, getDepthBandRules } from '@/lib/game/data/level-loader';
import { getHeadEllipseResolved, getBodyEllipseResolved } from '@/lib/game/canvas-collision';
import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from '@/lib/game/canvas-state';
import type { MultiEntityDashParticleManager } from '@/lib/rendering/multi-entity-dash-particles';

function drawHitboxDebug(
  ctx: CanvasRenderingContext2D,
  player: PlayerEntity,
  fish: FishEntity[],
  wallNow: number
): void {
  const drawEntityHitbox = (e: PlayerEntity | FishEntity) => {
    const body = getBodyEllipseResolved(e);
    const head = getHeadEllipseResolved(e);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(body.cx, body.cy, body.rx, body.ry, body.rotation, 0, Math.PI * 2);
    ctx.stroke();
    let headColor = '#fff';
    if (e.hitFlashEndTime && wallNow < e.hitFlashEndTime) headColor = '#f00';
    else if (e.attackFlashEndTime && wallNow < e.attackFlashEndTime) headColor = '#ff0';
    ctx.strokeStyle = headColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(head.cx, head.cy, head.rx, head.ry, head.rotation, 0, Math.PI * 2);
    ctx.stroke();
  };
  drawEntityHitbox(player);
  for (const f of fish) {
    if (f.lifecycleState === 'removed') continue;
    drawEntityHitbox(f);
  }
}

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

function renderChompParticles(ctx: CanvasRenderingContext2D, particles: ChompParticle[]): void {
  particles.forEach((p) => {
    ctx.save();
    const yOffset = p.floatUp ? -(1 - Math.max(0, p.life)) * 40 : 0;
    ctx.translate(p.x, p.y + yOffset);
    ctx.globalAlpha = Math.max(0, p.life);
    const totalScale = p.scale * (p.punchScale || 1);
    ctx.font = `bold ${Math.round(16 * totalScale)}px sans-serif`;
    let fillColor = p.color || '#fff';
    if (!p.color) {
      if (p.text === 'CHOMP') fillColor = '#ffcc00';
      else if (p.text.startsWith('+') && !p.text.includes('Shallow') && !p.text.includes('Deep') && !p.text.includes('Tropical') && !p.text.includes('Polluted')) {
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

function formatElapsedTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderGameUI(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  player: PlayerEntity,
  score: number,
  fishCount: number,
  elapsedSeconds: number
): void {
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
  ctx.fillText(`Size: ${Number.isInteger(player.size) ? player.size : player.size.toFixed(1)}`, 20, statsY + 36);
  ctx.fillText(`Time: ${formatElapsedTime(elapsedSeconds)}`, 20, statsY + 54);
  ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
  ctx.fillText(`Fish: ${fishCount}`, 20, statsY + 72);
  ctx.restore();

  const barWidth = Math.min(UI.HUNGER_BAR_WIDTH, width - UI.HUNGER_BAR_MIN_WIDTH);
  const healthBarHeight = 10;
  const healthBarX = (width - barWidth) / 2;
  const healthBarY = UI.HUNGER_BAR_Y;
  const playerHealth = player.health ?? PLAYER_BASE_MAX_HEALTH;
  const playerMaxHealth = player.maxHealth ?? PLAYER_BASE_MAX_HEALTH;
  const healthPct = Math.max(0, playerHealth / playerMaxHealth);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(healthBarX, healthBarY, barWidth, healthBarHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(healthBarX, healthBarY, barWidth, healthBarHeight);
  const hpInnerX = healthBarX + 2;
  const hpInnerW = barWidth - 4;
  const hpInnerH = healthBarHeight - 4;
  const hpInnerY = healthBarY + 2;
  const hpFillW = hpInnerW * healthPct;
  let hpColor: string;
  if (healthPct > 0.6) hpColor = '#22c55e';
  else if (healthPct > 0.3) hpColor = '#eab308';
  else hpColor = '#ef4444';
  ctx.fillStyle = hpColor;
  ctx.fillRect(hpInnerX, hpInnerY, hpFillW, hpInnerH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HP ${Math.ceil(playerHealth)}/${Math.ceil(playerMaxHealth)}`, healthBarX + barWidth / 2, healthBarY + healthBarHeight / 2);
  ctx.restore();

  const barHeight = UI.STAMINA_BAR_HEIGHT;
  const barX = (width - barWidth) / 2;
  const barY = healthBarY + healthBarHeight + 4;
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

  const timerY = barY + barHeight + UI.TIMER_SPACING;
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(formatElapsedTime(elapsedSeconds), width / 2, timerY);
}

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

function renderEditButtons(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  buttonPositions: Map<string, { x: number; y: number; size: number }>,
  camX: number,
  camY: number,
  zoom: number
): void {
  buttonPositions.forEach((pos) => {
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

function renderScreenVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height) * 0.65;
  const gradient = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function renderWaterEffect(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let y = 0; y < height; y += 20) {
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 10) {
      const wave = Math.sin(x * RENDERING.WATER_DISTORTION_WAVE_SCALE + time * RENDERING.WATER_DISTORTION_TIME_SCALE + y * 0.02) * RENDERING.WATER_DISTORTION_AMPLITUDE;
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

function drawFishHealthBar(
  ctx: CanvasRenderingContext2D,
  entity: FishEntity,
  zoom: number,
  wallNow: number
): void {
  if (entity.health === undefined || entity.maxHealth === undefined || !entity.lastDamagedTime) return;
  const timeSinceDamage = wallNow - entity.lastDamagedTime;
  if (timeSinceDamage >= COMBAT.HEALTH_BAR_SHOW_DURATION) return;
  const fadeStart = COMBAT.HEALTH_BAR_SHOW_DURATION * 0.5;
  const fadeAlpha = timeSinceDamage < fadeStart
    ? 1
    : Math.max(0, 1 - (timeSinceDamage - fadeStart) / (COMBAT.HEALTH_BAR_SHOW_DURATION - fadeStart));
  const healthPct = entity.health / entity.maxHealth;
  const hBarWidth = entity.size * 0.7;
  const hBarHeight = 3;
  const hBarX = entity.x - hBarWidth / 2;
  const hBarY = entity.y - entity.size * 0.4 - 8;
  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
  ctx.fillRect(hBarX, hBarY, hBarWidth, hBarHeight);
  ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
  ctx.fillRect(hBarX, hBarY, hBarWidth * healthPct, hBarHeight);
  ctx.restore();
}

export interface OverlayRenderOptions {
  canvas: HTMLCanvasElement;
  player: PlayerEntity;
  fish: FishEntity[];
  camera: CameraState;
  animatedZoom: number;
  chompParticles: ChompParticle[];
  bloodParticles: BloodParticle[];
  dashMultiEntity: MultiEntityDashParticleManager;
  gameMode: boolean;
  isEditMode: boolean;
  isPaused: boolean;
  showEditButtons: boolean;
  gameStartTime: number;
  totalPausedTime: number;
  pauseStartTime: number;
  score: number;
  fishCount: number;
  showBoundaryOverlay?: boolean;
  showDepthBandOverlay?: boolean;
  showHitboxDebug?: boolean;
  runId?: string;
  enableWaterDistortion?: boolean;
  waterTime?: number;
}

export function renderOverlay(options: OverlayRenderOptions): void {
  const {
    canvas,
    player,
    fish,
    camera,
    animatedZoom,
    chompParticles,
    bloodParticles,
    dashMultiEntity,
    gameMode,
    isEditMode,
    isPaused,
    showEditButtons,
    gameStartTime,
    totalPausedTime,
    pauseStartTime,
    score,
    fishCount,
    showBoundaryOverlay = false,
    showDepthBandOverlay = false,
    showHitboxDebug = false,
    runId = 'shallow_act',
    enableWaterDistortion = false,
    waterTime = 0,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const wallNow = performance.now();
  const effectiveCamX = camera.effectiveX;
  const effectiveCamY = camera.effectiveY;

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // World-space transform
  ctx.save();
  ctx.scale(animatedZoom, animatedZoom);
  const scaledWidth = width / animatedZoom;
  const scaledHeight = height / animatedZoom;
  ctx.translate(scaledWidth / 2 - effectiveCamX, scaledHeight / 2 - effectiveCamY);

  // Dash behind
  if (gameMode) {
    const playerDead = player.lifecycleState === 'dead';
    const dashEntityIds = [
      ...(playerDead ? [] : ['player']),
      ...fish.filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed').map((f) => f.id),
    ];
    dashMultiEntity.drawBehind(ctx, dashEntityIds);
  }

  // Dash in front
  if (gameMode) {
    const playerDead = player.lifecycleState === 'dead';
    const dashEntityIdsFront = [
      ...(playerDead ? [] : ['player']),
      ...fish.filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed').map((f) => f.id),
    ];
    dashMultiEntity.drawInFront(ctx, dashEntityIdsFront);
  }

  renderBloodParticles(ctx, bloodParticles);
  renderChompParticles(ctx, chompParticles);

  // Fish health bars and state icons
  fish.forEach((f) => {
    if (f.lifecycleState === 'removed') return;
    ctx.save();
    ctx.globalAlpha = f.opacity ?? 1;
    if (gameMode) drawFishHealthBar(ctx, f, animatedZoom, wallNow);
    drawStateIcon(ctx, f, f.x, f.y, f.size, animatedZoom);
    ctx.restore();
  });

  // Player state icon (when not dead)
  if (player.lifecycleState !== 'dead' && gameMode) {
    drawStateIcon(ctx, player, player.x, player.y, player.size, animatedZoom);
  }

  if (gameMode && showHitboxDebug) {
    drawHitboxDebug(ctx, player, fish, wallNow);
  }

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

  if (showDepthBandOverlay) {
    const b = WORLD_BOUNDS;
    const margin = 100;
    const act = getActConfig(runId);
    const bandIds = act?.steps?.length ? act.steps : ['1-1', '1-2', '1-3'];
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
      const bandColors = ['rgb(150, 220, 255)', 'rgb(100, 180, 255)', 'rgb(80, 140, 255)'];
      const getBandColor = (bandId: string, index: number) => {
        const colorIndex = { '1-1': 0, '1-2': 1, '1-3': 2 }[bandId] ?? Math.min(index, 2);
        return bandColors[colorIndex] ?? 'rgb(200, 230, 255)';
      };
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      for (const y of deduped) {
        const bandStartingHere = bands.find((band) => Math.abs(metersToWorldY(band.rules.min_meters) - y) <= 2);
        const bandEndingHere = bands.find((band) => Math.abs(metersToWorldY(band.rules.max_meters) - y) <= 2);
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

  ctx.restore();

  // Screen-space: water effect overlay
  if (enableWaterDistortion) {
    renderWaterEffect(ctx, width, height, waterTime);
  }

  // Screen-space: subtle vignette (optional polish)
  renderScreenVignette(ctx, width, height);

  // Screen-space: hunger warning
  if (gameMode && player.hunger <= HUNGER_LOW_THRESHOLD) {
    renderHungerWarning(ctx, width, height, player.hunger);
  }

  // Edit buttons (need editButtonPositions - build from entities)
  const editButtonPositions = new Map<string, { x: number; y: number; size: number }>();
  if (showEditButtons && !isEditMode) {
    fish.forEach((f) => {
      if (f.lifecycleState !== 'removed') editButtonPositions.set(f.id, { x: f.x, y: f.y, size: f.size });
    });
    if (player.lifecycleState !== 'dead') editButtonPositions.set(player.id, { x: player.x, y: player.y, size: player.size });
  }
  if (showEditButtons && !isEditMode && editButtonPositions.size > 0) {
    renderEditButtons(ctx, width, height, editButtonPositions, effectiveCamX, effectiveCamY, animatedZoom);
  }

  if (gameMode) {
    const currentPausedTime = isPaused ? Date.now() - pauseStartTime : 0;
    const elapsedMs = gameStartTime > 0 ? Date.now() - gameStartTime - totalPausedTime - currentPausedTime : 0;
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    renderGameUI(ctx, width, height, player, score, fishCount, elapsedSeconds);
  }

  if (isPaused && gameMode) {
    renderPausedIndicator(ctx, width, height);
  }
}
