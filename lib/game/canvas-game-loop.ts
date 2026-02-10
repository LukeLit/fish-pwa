/**
 * Canvas Game Loop
 * One-frame game logic: time, dash, movement, hunger, collision, AI, respawn, camera target.
 * Used by FishEditorCanvas each requestAnimationFrame before renderGame().
 */

import type { InputState } from './canvas-input';
import type { CanvasGameState } from './canvas-state';
import type { PlayerEntity, FishEntity, FishLifecycleState } from './canvas-state';
import type { Creature } from './types';
import { getHeadPositionResolved, getHeadEllipseResolved, getBodyEllipseResolved } from './canvas-collision';
import { ellipseOverlapsEllipse } from './ellipse-collision';
import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME, COMBAT } from './canvas-constants';
import {
  updateStamina,
  updateHunger,
  canDash,
  isStarved,
  restoreHunger,
  initHungerStamina,
} from './stamina-hunger';
import { loadRunState, saveRunState, addEssenceToRun } from './run-state';
import { PLAYER_MAX_SIZE } from './spawn-fish';
import {
  HUNGER_MAX,
  HUNGER_RESTORE_MULTIPLIER,
  HUNGER_DRAIN_RATE,
} from './hunger-constants';
import {
  DASH_STAMINA_RAMP_PER_SECOND,
  DASH_STAMINA_RAMP_CAP,
  PREY_FLEE_STAMINA_MULTIPLIER,
  EXHAUSTED_SPEED_MULTIPLIER,
  FLEEING_RECOVERY_MULTIPLIER,
  EXHAUSTED_REGEN_MULTIPLIER,
  AI_DASH_STAMINA_DRAIN_RATE,
  KO_STAMINA_REGEN_MULTIPLIER,
  KO_WAKE_THRESHOLD,
  KO_DRIFT_SPEED,
} from './dash-constants';
import { ESSENCE_TYPES } from './data/essence-types';
import { resolveAttack } from './combat';
import { spawnCarcass, updateCarcasses, decrementCarcassChunks } from './carcass';
import {
  spawnMeatChunksFromFish,
  spawnEssenceChunksFromFish,
  updateChunks,
  checkChunkCollection,
} from './essence-chunks';
import { resolveBodyOverlap } from './canvas-collision';
import { computeSpriteHitbox } from './sprite-hitbox';
import {
  getGrowthStage,
  getGrowthStageSprite,
  getGrowthAwareSpriteUrl,
  getResolutionKey,
  removeBackground,
  hasUsableAnimations,
} from '@/lib/rendering/fish-renderer';
import { cacheBust } from '@/lib/utils/cache-bust';
import { getSpawnPositionInBand } from './spawn-position';

export interface GameTickCallbacks {
  onLevelComplete?: (score: number, stats?: { size: number; fishEaten: number; timeSurvived: number }) => void;
  onGameOver?: (stats: {
    score: number;
    cause: 'starved' | 'eaten';
    size: number;
    fishEaten: number;
    essenceCollected: number;
    timeSurvived: number;
  }) => void;
  onStatsUpdate?: (stats: { size: number; hunger: number; score: number; fishEaten: number; timeSurvived: number }) => void;
  onReloadPlayerSprite?: (spriteUrl: string, onLoaded: (canvas: HTMLCanvasElement) => void) => void;
}

export interface GameTickHelpers {
  getRespawnInterval: () => number;
  getMaxFish: () => number;
  spawnFadeDuration: number;
}

export interface GameTickParams {
  state: CanvasGameState;
  input: InputState;
  options: {
    gameMode: boolean;
    levelDuration: number;
    isPaused: boolean;
    currentEditMode: boolean;
    zoom: number;
    dashFromControls: boolean;
    chromaTolerance: number;
    selectedFishId: string | null;
    runId?: string;
    currentLevel?: string;
    loading?: boolean;
  };
  playerCreature: Creature | undefined;
  callbacks: GameTickCallbacks;
  helpers: GameTickHelpers;
}

/**
 * Run one frame of game logic. Mutates state.
 * @returns false if the game loop should stop (game over or level complete), true otherwise.
 */
export function tickGameState(params: GameTickParams): boolean {
  const { state, input, options, playerCreature, callbacks, helpers } = params;
  const { gameMode, levelDuration, isPaused, currentEditMode, zoom, dashFromControls } = options;
  const player = state.player;
  const MAX_SPEED = PHYSICS.MAX_SPEED;
  const ACCELERATION = PHYSICS.ACCELERATION;
  const FRICTION = PHYSICS.FRICTION;
  const deltaTime = state.calculateDeltaTime();

  state.updatePauseTracking(isPaused);

  // Start timer on first game-mode frame so it always counts down
  if (gameMode && state.gameMode.startTime === 0) {
    state.gameMode.startTime = Date.now();
    state.gameMode.fishEaten = 0;
    state.gameMode.score = 0;
    state.gameMode.totalPausedTime = 0;
    const runState = loadRunState();
    state.gameMode.essenceCollected = runState
      ? Object.values(runState.collectedEssence).reduce((sum, val) => sum + val, 0)
      : 0;
  }

  if (gameMode && !state.gameMode.levelCompleteFired && !state.gameMode.gameOverFired && !isPaused) {
    const effectiveLevelDuration =
      typeof levelDuration === 'number' && Number.isFinite(levelDuration) && levelDuration > 0
        ? levelDuration
        : GAME.DEFAULT_LEVEL_DURATION_MS;
    const elapsed = state.getElapsedGameTime();
    if (elapsed >= effectiveLevelDuration) {
      state.gameMode.levelCompleteFired = true;
      callbacks.onLevelComplete?.(state.gameMode.score, {
        size: player.size,
        fishEaten: state.gameMode.fishEaten,
        timeSurvived: Math.floor(elapsed / 1000),
      });
      return false;
    }
    const runState = loadRunState();
    if (runState) {
      state.gameMode.essenceCollected = Object.values(runState.collectedEssence).reduce((sum, val) => sum + val, 0);
    }
  }

  const wantsDash = input.wantsDash || dashFromControls;
  if (gameMode) {
    player.isDashing = wantsDash && canDash(player);
    if (player.isDashing) {
      const frameMs = (deltaTime / 60) * 1000;
      state.dashHoldDurationMs += frameMs;
      const holdSeconds = state.dashHoldDurationMs / 1000;
      const rampMultiplier = Math.min(1 + holdSeconds * DASH_STAMINA_RAMP_PER_SECOND, DASH_STAMINA_RAMP_CAP);
      updateStamina(player, deltaTime, { rampMultiplier, isPlayer: true });
    } else {
      state.dashHoldDurationMs = 0;
      updateStamina(player, deltaTime, { isPlayer: true });
    }
    if (player.stamina <= 0) player.isDashing = false;
    player.isExhausted = player.stamina <= 0;
    if (player.stamina >= player.maxStamina) player.isExhausted = false;
  } else {
    player.isDashing = false;
    state.dashHoldDurationMs = 0;
  }

  let effectiveMaxSpeed = MAX_SPEED;
  if (gameMode) {
    if (player.isExhausted) {
      effectiveMaxSpeed = MAX_SPEED * EXHAUSTED_SPEED_MULTIPLIER;
    } else if (player.isDashing) {
      effectiveMaxSpeed = MAX_SPEED * PHYSICS.DASH_SPEED_MULTIPLIER;
    }
  }
  if (gameMode && player.isExhausted) {
    const sp = Math.sqrt(player.vx ** 2 + player.vy ** 2);
    if (sp > effectiveMaxSpeed && sp > 0) {
      player.vx = (player.vx / sp) * effectiveMaxSpeed;
      player.vy = (player.vy / sp) * effectiveMaxSpeed;
    }
  }

  if (!currentEditMode && !isPaused) {
    if (input.joystick.active) {
      player.vx = input.joystick.x * effectiveMaxSpeed;
      player.vy = input.joystick.y * effectiveMaxSpeed;
    } else {
      const hasKey = (k: string) => input.keys.has(k.toLowerCase());
      const accelMult = (gameMode && player.isDashing && !player.isExhausted) ? 1.3 : 1;
      const accel = ACCELERATION * deltaTime * accelMult;
      const friction = Math.pow(FRICTION, deltaTime);
      if (hasKey('w') || hasKey('arrowup')) player.vy -= accel;
      if (hasKey('s') || hasKey('arrowdown')) player.vy += accel;
      if (hasKey('a') || hasKey('arrowleft')) player.vx -= accel;
      if (hasKey('d') || hasKey('arrowright')) player.vx += accel;
      player.vx *= friction;
      player.vy *= friction;
    }
    let speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
    if (speed > effectiveMaxSpeed) {
      player.vx = (player.vx / speed) * effectiveMaxSpeed;
      player.vy = (player.vy / speed) * effectiveMaxSpeed;
      speed = effectiveMaxSpeed;
    }
    player.x += player.vx * deltaTime;
    player.y += player.vy * deltaTime;
  } else {
    player.vx = 0;
    player.vy = 0;
  }

  if (Math.abs(player.vx) > COLLISION.FACING_SPEED_THRESHOLD) player.facingRight = player.vx > 0;
  const maxTilt = PHYSICS.MAX_TILT;
  const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, player.vy * PHYSICS.TILT_SENSITIVITY));
  player.verticalTilt += (targetTilt - player.verticalTilt) * PHYSICS.TILT_SMOOTHING;

  const rawPlayerSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  const normalizedSpeed = Math.min(1, rawPlayerSpeed / MAX_SPEED);
  player.animTime += ANIMATION.ANIM_TIME_BASE + normalizedSpeed * ANIMATION.ANIM_TIME_SPEED_MULT;

  if (gameMode) {
    const showDashParticles = !player.isExhausted && player.isDashing;
    const animationAction = showDashParticles ? 'dash' : (rawPlayerSpeed < COLLISION.IDLE_SPEED_THRESHOLD ? 'idle' : 'swim');
    state.particles.dashPlayer.update(
      { x: player.x, y: player.y, vx: player.vx, vy: player.vy, size: player.size, animationAction },
      deltaTime
    );
  }

  const now = performance.now();
  if (player.chompEndTime > now) {
    player.chompPhase = (player.chompEndTime - now) / 280;
  } else {
    player.chompPhase = 0;
  }

  if (gameMode && !isPaused) {
    const movementFactor = Math.min(COLLISION.NON_DASH_MOVEMENT_DRAIN_CAP, Math.max(COLLISION.STATIONARY_DRAIN_FRACTION, normalizedSpeed));
    updateHunger(player, deltaTime, { movementFactor });
    if (isStarved(player) && !state.gameMode.gameOverFired) {
      if (state.animationSpriteManager.hasSprite('player')) {
        const sprite = state.animationSpriteManager.getSprite('player', player.animations || {});
        sprite.triggerAction('death');
      }
      state.gameMode.gameOverFired = true;
      callbacks.onGameOver?.({
        score: state.gameMode.score,
        cause: 'starved',
        size: player.size,
        fishEaten: state.gameMode.fishEaten,
        essenceCollected: state.gameMode.essenceCollected,
        timeSurvived: Math.floor((now - state.gameMode.startTime - state.gameMode.totalPausedTime) / 1000),
      });
      return false;
    }
  }

  // --- Body separation pass (push entities apart before combat) ---
  if (gameMode) {
    // Player vs each fish
    for (const fish of state.fish) {
      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed' || fish.lifecycleState === 'dying') continue;
      resolveBodyOverlap(player, fish);
    }
    // Fish vs fish
    for (let i = 0; i < state.fish.length; i++) {
      const a = state.fish[i];
      if ((a.opacity ?? 1) < 1 || a.lifecycleState === 'removed' || a.lifecycleState === 'dying') continue;
      for (let j = i + 1; j < state.fish.length; j++) {
        const b = state.fish[j];
        if ((b.opacity ?? 1) < 1 || b.lifecycleState === 'removed' || b.lifecycleState === 'dying') continue;
        resolveBodyOverlap(a, b);
      }
    }
  }

  // --- Apply lunge velocity (from combat hits) ---
  if (player.lungeVx !== undefined && player.lungeVy !== undefined && player.lungeStartTime) {
    player.vx += player.lungeVx;
    player.vy += player.lungeVy;
    player.lungeVx *= COMBAT.LUNGE_DECAY;
    player.lungeVy *= COMBAT.LUNGE_DECAY;
    if (Math.abs(player.lungeVx) < 0.01 && Math.abs(player.lungeVy) < 0.01) {
      player.lungeVx = 0;
      player.lungeVy = 0;
      player.lungeStartTime = 0;
    }
  }
  for (const fish of state.fish) {
    if (fish.lungeVx !== undefined && fish.lungeVy !== undefined && fish.lungeStartTime) {
      fish.vx += fish.lungeVx;
      fish.vy += fish.lungeVy;
      fish.lungeVx *= COMBAT.LUNGE_DECAY;
      fish.lungeVy *= COMBAT.LUNGE_DECAY;
      if (Math.abs(fish.lungeVx) < 0.01 && Math.abs(fish.lungeVy) < 0.01) {
        fish.lungeVx = 0;
        fish.lungeVy = 0;
        fish.lungeStartTime = 0;
      }
    }
  }

  // --- Fish-fish combat (health-based) ---
  if (gameMode) {
    const fishList = state.fish;
    for (let i = 0; i < fishList.length; i++) {
      const fishA = fishList[i];
      if ((fishA.opacity ?? 1) < 1 || fishA.lifecycleState === 'dying' || fishA.lifecycleState === 'removed') continue;
      if (!fishA.isDashing) continue; // attacker must be dashing
      const aHeadEllipse = getHeadEllipseResolved(fishA);
      for (let j = 0; j < fishList.length; j++) {
        if (i === j) continue;
        const fishB = fishList[j];
        if ((fishB.opacity ?? 1) < 1 || fishB.lifecycleState === 'dying' || fishB.lifecycleState === 'removed') continue;
        const bBodyEllipse = getBodyEllipseResolved(fishB);
        const bHeadEllipse = getHeadEllipseResolved(fishB);
        if (!ellipseOverlapsEllipse(aHeadEllipse, bBodyEllipse)) continue;

        const dx = bBodyEllipse.cx - aHeadEllipse.cx;
        const dy = bBodyEllipse.cy - aHeadEllipse.cy;

        // Fleeing prey never deal damage - their dash is escape only
        const fishAIsFleeing = fishA.fleeFromId && fishA.fleeFromUntil && now < fishA.fleeFromUntil;
        if (fishAIsFleeing && fishA.type === 'prey') continue;

        // Cooldown: use attackFlashEndTime as implicit cooldown (already set by resolveAttack)
        if (fishA.attackFlashEndTime && now < (fishA.attackFlashEndTime - COMBAT.ATTACK_FLASH_DURATION + COMBAT.ATTACK_COOLDOWN_MS)) continue;

        // Attack! resolveAttack handles damage + flash timers
        const result = resolveAttack(fishA, fishB, {
          attackerDamage: fishA.creatureData?.stats?.damage ?? 10,
        });

        // Bite-time lock-on: snap facing + lunge
        fishA.facingRight = dx > 0;
        const lungeLen = Math.sqrt(dx * dx + dy * dy) || 1;
        fishA.lungeVx = (dx / lungeLen) * COMBAT.LUNGE_STRENGTH;
        fishA.lungeVy = (dy / lungeLen) * COMBAT.LUNGE_STRENGTH;
        fishA.lungeStartTime = now;
        fishA.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION;

        // Damage number
        state.particles.chomp.push({
          x: fishB.x,
          y: fishB.y - fishB.size * 0.3,
          life: 1.2,
          scale: 1.0,
          text: `-${result.damage}`,
          color: '#ff4444',
          punchScale: 1.3,
          floatUp: true,
        });

        pushBloodAt(state, (fishA.x + fishB.x) * 0.5, (fishA.y + fishB.y) * 0.5, fishB.size * 0.6);
        fishA.animationSprite?.hasAction?.('bite') && fishA.animationSprite.triggerAction('bite');

        const impactX = (fishA.x + fishB.x) * 0.5;
        const impactY = (fishA.y + fishB.y) * 0.5;
        state.particles.dashMultiEntity.spawnBurstAt(impactX, impactY, 14, Math.max(0.8, fishA.size * 0.02));

        if (result.died) {
          // Death: predator consumes the kill directly — no chunks for player to steal
          fishB.lifecycleState = 'dying';
          const carcass = spawnCarcass(fishB.x, fishB.y, fishB.size, 0);
          state.carcasses.push(carcass);

          // Predator gets growth + hunger (same as chunks would have); cap growth
          const sizeRatio = fishA.size / fishB.size;
          const efficiencyMult = Math.max(
            COLLISION.MIN_EFFICIENCY,
            1 / (1 + sizeRatio * COLLISION.EFFICIENCY_RATIO)
          );
          const hungerEfficiencyMult = Math.max(
            COLLISION.HUNGER_MIN_EFFICIENCY,
            1 / (1 + sizeRatio * COLLISION.EFFICIENCY_RATIO)
          );
          const growthGain = fishB.size * COLLISION.SIZE_GAIN_RATIO * efficiencyMult;
          fishA.size = Math.min(PLAYER_MAX_SIZE, fishA.size + growthGain);
          restoreHunger(fishA, fishB.size * HUNGER_RESTORE_MULTIPLIER * hungerEfficiencyMult);
        } else {
          // Prey flee-on-hit
          fishB.fleeFromId = fishA.id;
          fishB.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;
        }
        break; // one attack per frame per fish
      }
    }
    // Remove dying fish
    state.fish = state.fish.filter((f) => f.lifecycleState !== 'dying');
  }

  // --- Player-fish combat (health-based) ---
  const playerHeadEllipse = getHeadEllipseResolved(player);
  const playerBodyEllipse = getBodyEllipseResolved(player);

  for (let idx = state.fish.length - 1; idx >= 0; idx--) {
    const fish = state.fish[idx];
    if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'dying' || fish.lifecycleState === 'removed') continue;
    const fishHeadEllipse = getHeadEllipseResolved(fish);
    const fishBodyEllipse = getBodyEllipseResolved(fish);
    const playerHeadHitsFishBody = ellipseOverlapsEllipse(playerHeadEllipse, fishBodyEllipse);
    const fishHeadHitsPlayerBody = ellipseOverlapsEllipse(fishHeadEllipse, playerBodyEllipse);
    if (!playerHeadHitsFishBody && !fishHeadHitsPlayerBody) continue;

    const dx = fishBodyEllipse.cx - playerHeadEllipse.cx;
    const dy = fishBodyEllipse.cy - playerHeadEllipse.cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (gameMode) {
      const playerAttacking = player.isDashing;
      const fishAttacking = fish.isDashing && fish.size > player.size * 0.8;

      // Cooldown check for player attack
      const playerOnCooldown = player.lastBiteTime !== undefined && (now - player.lastBiteTime) < COMBAT.ATTACK_COOLDOWN_MS;

      // Larger prey counterattack prevention: if fish is prey and player attacks, only player's attack applies
      const fishIsPrey = fish.type === 'prey';
      const playerAttackOnly = fishIsPrey && playerAttacking && fish.size > player.size;

      // Player: damage only when dashing toward target (direction check)
      const dxToFish = fishBodyEllipse.cx - player.x;
      const dyToFish = fishBodyEllipse.cy - player.y;
      const playerMovingTowardFish = (player.vx * dxToFish + player.vy * dyToFish) > 0;
      if (playerAttacking && !playerOnCooldown && playerHeadHitsFishBody && playerMovingTowardFish) {
        // Player attacks fish
        const result = resolveAttack(player, fish, {
          attackerDamage: playerCreature?.stats?.damage ?? 10,
        });
        player.lastBiteTime = now;

        // Bite-time lock-on
        player.facingRight = dx > 0;
        player.lungeVx = (dx / (dist || 1)) * COMBAT.LUNGE_STRENGTH;
        player.lungeVy = (dy / (dist || 1)) * COMBAT.LUNGE_STRENGTH;
        player.lungeStartTime = now;
        player.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION;

        // Chomp animation
        player.chompPhase = 1;
        player.chompEndTime = now + ANIMATION.CHOMP_DECAY_TIME;
        if (state.animationSpriteManager.hasSprite('player')) {
          state.animationSpriteManager.getSprite('player', player.animations || {}).triggerAction('bite');
        }

        // Damage number
        state.particles.chomp.push({
          x: fish.x,
          y: fish.y - fish.size * 0.3,
          life: 1.2,
          scale: 1.2,
          text: `-${result.damage}`,
          color: '#ff4444',
          punchScale: 1.5,
          floatUp: true,
        });

        pushBloodAt(state, (fish.x + player.x) * 0.5, (fish.y + player.y) * 0.5, fish.size * 0.8);

        const impactXPlayerFish = (player.x + fish.x) * 0.5;
        const impactYPlayerFish = (player.y + fish.y) * 0.5;
        state.particles.dashMultiEntity.spawnBurstAt(impactXPlayerFish, impactYPlayerFish, 16, Math.max(0.8, player.size * 0.02));

        if (result.died) {
          // Death: spawn carcass + meat + essence chunks
          state.gameMode.fishEaten += 1;
          state.eatenIds.add(fish.id);

          const carcass = spawnCarcass(fish.x, fish.y, fish.size, 0);
          const meatChunks = spawnMeatChunksFromFish(
            fish.x,
            fish.y,
            fish.size,
            player.size,
            carcass.carcassId,
            fishBodyEllipse,
            fishHeadEllipse
          );
          const essenceChunks = spawnEssenceChunksFromFish(
            fish.x,
            fish.y,
            fish.size,
            fish.creatureData?.essenceTypes,
            carcass.carcassId,
            fishBodyEllipse,
            fishHeadEllipse
          );
          carcass.remainingChunks = meatChunks.length + essenceChunks.length;
          state.carcasses.push(carcass);
          state.chunks.push(...meatChunks, ...essenceChunks);

          state.fish.splice(idx, 1);
          continue;
        } else {
          // Prey flee-on-hit
          fish.fleeFromId = 'player';
          fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;
        }
      }

      // Fish attacks player (skip if fleeing - fleeing fish never deal damage)
      const fishIsFleeing = fish.fleeFromId && fish.fleeFromUntil && now < fish.fleeFromUntil;
      if (fishAttacking && !playerAttackOnly && fishHeadHitsPlayerBody && !fishIsFleeing) {
        const fishCooldown = fish.attackFlashEndTime && now < (fish.attackFlashEndTime - COMBAT.ATTACK_FLASH_DURATION + COMBAT.ATTACK_COOLDOWN_MS);
        if (!fishCooldown) {
          const result = resolveAttack(fish, player, {
            attackerDamage: fish.creatureData?.stats?.damage ?? 10,
          });
          fish.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION;

          // Damage number on player
          state.particles.chomp.push({
            x: player.x,
            y: player.y - player.size * 0.3,
            life: 1.2,
            scale: 1.2,
            text: `-${result.damage}`,
            color: '#ff6666',
            punchScale: 1.5,
            floatUp: true,
          });

          pushBloodAt(state, (fish.x + player.x) * 0.5, (fish.y + player.y) * 0.5, player.size * 0.5);

          const impactXFishPlayer = (fish.x + player.x) * 0.5;
          const impactYFishPlayer = (fish.y + player.y) * 0.5;
          state.particles.dashMultiEntity.spawnBurstAt(impactXFishPlayer, impactYFishPlayer, 14, Math.max(0.8, fish.size * 0.02));

          if (result.died) {
            // Player died
            state.animationSpriteManager.hasSprite('player') &&
              state.animationSpriteManager.getSprite('player', player.animations || {}).triggerAction('death');
            if (!state.gameMode.gameOverFired) {
              state.gameMode.gameOverFired = true;
              callbacks.onGameOver?.({
                score: state.gameMode.score,
                cause: 'eaten',
                size: player.size,
                fishEaten: state.gameMode.fishEaten,
                essenceCollected: state.gameMode.essenceCollected,
                timeSurvived: Math.floor((now - state.gameMode.startTime - state.gameMode.totalPausedTime) / 1000),
              });
            }
            return false;
          }
        }
      }
    } else {
      // Editor mode: simple eating of prey
      if (fish.type !== 'prey') continue;
      state.eatenIds.add(fish.id);
      state.fish.splice(idx, 1);
      const sizeRatio = player.size / fish.size;
      const efficiencyMult = Math.max(COLLISION.MIN_EFFICIENCY, 1 / (1 + sizeRatio * COLLISION.EFFICIENCY_RATIO));
      const sizeGain = fish.size * COLLISION.SIZE_GAIN_RATIO * efficiencyMult;
      const oldPlayerSize = player.size;
      player.size = Math.min(PLAYER_MAX_SIZE, player.size + sizeGain);
      if (playerCreature?.growthSprites) {
        const oldStage = getGrowthStage(oldPlayerSize, playerCreature.growthSprites);
        const newStage = getGrowthStage(player.size, playerCreature.growthSprites);
        if (oldStage !== newStage) {
          const { sprite: spriteUrl } = getGrowthStageSprite(playerCreature, player.size, 'player');
          callbacks.onReloadPlayerSprite?.(spriteUrl, (canvas) => {
            player.sprite = canvas;
            player.hitbox = computeSpriteHitbox(canvas);
          });
          if (state.animationSpriteManager.hasSprite('player')) {
            const animSprite = state.animationSpriteManager.getSprite('player', player.animations || {});
            animSprite.setGrowthStage(newStage);
          }
        }
      }
      player.chompPhase = 1;
      player.chompEndTime = now + 280;
      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      if (state.animationSpriteManager.hasSprite('player')) {
        state.animationSpriteManager.getSprite('player', player.animations || {}).triggerAction('bite');
      }
      for (let k = 0; k < 5; k++) {
        state.particles.chomp.push({
          x: eatX + (Math.random() - 0.5) * 16,
          y: eatY + (Math.random() - 0.5) * 16,
          life: 1,
          scale: 1 + Math.random() * 0.5,
          text: k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4],
          punchScale: 1.5,
        });
      }
      pushBloodAt(state, eatX, eatY, fish.size * 1.2);
    }
  }

  // --- Update carcasses and chunks ---
  if (gameMode) {
    state.carcasses = updateCarcasses(state.carcasses);
    state.chunks = updateChunks(state.chunks, deltaTime);

    // Check chunk collection by player (cooldown prevents spam; all overlapping chunks granted in one batch)
    const canCollect = !player.lastChunkEatTime || (now - player.lastChunkEatTime) >= COMBAT.CHUNK_EAT_COOLDOWN_MS;
    const collected = canCollect ? checkChunkCollection(state.chunks, player) : [];
    if (collected.length > 0) {
      player.lastChunkEatTime = now;
      player.chunkEatEndTime = now + COMBAT.CHUNK_EAT_DURATION_MS;
    }

    let totalGrowth = 0;
    let totalHunger = 0;
    let lastChunkX = 0;
    let lastChunkY = 0;

    for (const chunk of collected) {
      if (chunk.chunkKind === 'meat') {
        totalGrowth += chunk.growthAmount ?? 0;
        totalHunger += chunk.hungerRestore ?? 0;
      } else {
        // Essence: persist essence only, no growth
        let runState = loadRunState();
        if (runState && chunk.essenceType != null && chunk.essenceAmount != null) {
          runState = addEssenceToRun(runState, chunk.essenceType, chunk.essenceAmount);
          saveRunState(runState);
        }

        const essenceType = ESSENCE_TYPES[chunk.essenceType ?? ''];
        state.particles.chomp.push({
          x: chunk.x,
          y: chunk.y - 10,
          life: 1.5,
          scale: 1.0,
          text: `+${chunk.essenceAmount ?? 0} ${essenceType?.name ?? 'Essence'}`,
          color: essenceType?.color ?? '#ccaa44',
          punchScale: 1.4,
          floatUp: true,
        });
      }
      lastChunkX = chunk.x;
      lastChunkY = chunk.y;

      if (chunk.carcassId) {
        decrementCarcassChunks(state.carcasses, chunk.carcassId);
      }
    }

    if (totalGrowth > 0 || totalHunger > 0) {
      const oldPlayerSize = player.size;
      player.size = Math.min(PLAYER_MAX_SIZE, player.size + totalGrowth);

      if (playerCreature?.growthSprites) {
        const oldStage = getGrowthStage(oldPlayerSize, playerCreature.growthSprites);
        const newStage = getGrowthStage(player.size, playerCreature.growthSprites);
        if (oldStage !== newStage) {
          const { sprite: spriteUrl } = getGrowthStageSprite(playerCreature, player.size, 'player');
          callbacks.onReloadPlayerSprite?.(spriteUrl, (canvas) => {
            player.sprite = canvas;
            player.hitbox = computeSpriteHitbox(canvas);
          });
          if (state.animationSpriteManager.hasSprite('player')) {
            const animSprite = state.animationSpriteManager.getSprite('player', player.animations || {});
            animSprite.setGrowthStage(newStage);
          }
        }
      }

      restoreHunger(player, totalHunger);

      state.particles.chomp.push({
        x: lastChunkX,
        y: lastChunkY - 10,
        life: 1.5,
        scale: 1.0,
        text: `+${totalGrowth.toFixed(1)} size`,
        color: '#e06050',
        punchScale: 1.4,
        floatUp: true,
      });
    }

    if (collected.length > 0) {
      const cdx = lastChunkX - player.x;
      const cdy = lastChunkY - player.y;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      player.lungeVx = (cdx / cdist) * COMBAT.CHUNK_LUNGE_STRENGTH;
      player.lungeVy = (cdy / cdist) * COMBAT.CHUNK_LUNGE_STRENGTH;
      player.lungeStartTime = now;
      player.chompPhase = 1;
      player.chompEndTime = now + ANIMATION.CHOMP_DECAY_TIME;
    }
  }

  state.particles.chomp = state.particles.chomp.filter((p) => {
    p.life -= 0.01;
    if (p.punchScale !== undefined && p.punchScale > 1) p.punchScale = Math.max(1, p.punchScale - 0.08);
    return p.life > 0;
  });
  state.particles.blood = state.particles.blood.filter((b) => {
    b.life -= 0.007;
    return b.life > 0;
  });

  // Respawn (game mode): allow extra cap and faster respawn for small prey so the player has enough food
  if (gameMode && state.spawnPool.length > 0) {
    const pool = state.spawnPool as Creature[];
    const baseMax = helpers.getMaxFish();
    const extraCap = SPAWN.SMALL_PREY_EXTRA_CAP;
    const smallPreyPool = pool.filter((c) => {
      const size = c.stats?.size ?? SPAWN.DEFAULT_CREATURE_SIZE;
      return c.type === 'prey' && size < SPAWN.SMALL_PREY_SIZE_THRESHOLD;
    });

    let creature: Creature | null = null;
    let useSmallPreyTimer = false;

    if (
      smallPreyPool.length > 0 &&
      state.fish.length < baseMax + extraCap &&
      now - state.lastSmallPreyRespawnTime >= SPAWN.SMALL_PREY_RESPAWN_INTERVAL_MS
    ) {
      creature = smallPreyPool[Math.floor(Math.random() * smallPreyPool.length)];
      useSmallPreyTimer = true;
    } else if (
      now - state.lastRespawnTime >= helpers.getRespawnInterval() &&
      state.fish.length < baseMax
    ) {
      const weightedPool: Creature[] = [];
      pool.forEach((c) => {
        const size = c.stats?.size ?? SPAWN.DEFAULT_CREATURE_SIZE;
        const isSmallPrey = c.type === 'prey' && size < SPAWN.SMALL_PREY_SIZE_THRESHOLD;
        const isPrey = c.type === 'prey' && size < SPAWN.PREY_SIZE_THRESHOLD;
        const copies = isSmallPrey ? 14 : isPrey ? 4 : 1;
        for (let i = 0; i < copies; i++) weightedPool.push(c);
      });
      creature = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    }

    if (creature) {
      const isSmallPrey =
        creature.type === 'prey' &&
        (creature.stats?.size ?? SPAWN.DEFAULT_CREATURE_SIZE) < SPAWN.SMALL_PREY_SIZE_THRESHOLD;
      const cap = useSmallPreyTimer ? baseMax + extraCap : baseMax;
      const rawSchoolSize = isSmallPrey
        ? SPAWN.SCHOOL_SIZE_MIN +
        Math.floor(Math.random() * (SPAWN.SCHOOL_SIZE_MAX - SPAWN.SCHOOL_SIZE_MIN + 1))
        : 1;
      const schoolSize = Math.min(rawSchoolSize, Math.max(0, cap - state.fish.length));

      if (schoolSize > 0) {
        const sizeMult = SPAWN.FISH_SIZE_MIN + Math.random() * (SPAWN.FISH_SIZE_MAX - SPAWN.FISH_SIZE_MIN);
        const fishSize = (creature.stats?.size ?? SPAWN.DEFAULT_CREATURE_SIZE) * sizeMult;
        const screenSize = fishSize * zoom;
        const resolution = getResolutionKey(screenSize);
        const cacheId = (creature as { creatureId?: string }).creatureId ?? creature.id;
        const cacheKey = `${cacheId}:${resolution}`;
        let sprite = state.spriteCache.get(cacheKey) || state.spriteCache.get(cacheId);

        const schoolPositions: { x: number; y: number }[] = [];
        if (schoolSize > 1 && options.runId != null && options.currentLevel != null) {
          const anchor = getSpawnPositionInBand(
            options.runId,
            options.currentLevel,
            { x: player.x, y: player.y },
            SPAWN.MIN_DISTANCE
          );
          const r = SPAWN.SCHOOL_RADIUS;
          for (let i = 0; i < schoolSize; i++) {
            schoolPositions.push({
              x: anchor.x + (Math.random() - 0.5) * 2 * r,
              y: anchor.y + (Math.random() - 0.5) * 2 * r,
            });
          }
        }

        const doSpawn = (processedSprite: HTMLCanvasElement) => {
          for (let i = 0; i < schoolSize; i++) {
            const posOverride = schoolSize > 1 ? schoolPositions[i] : undefined;
            const suffix = schoolSize > 1 ? `s${i}` : undefined;
            spawnRespawnFish(
              state,
              creature,
              fishSize,
              processedSprite,
              player,
              now,
              options.runId,
              options.currentLevel,
              posOverride,
              suffix
            );
          }
        };

        if (!sprite) {
          const chromaTol = options.chromaTolerance;
          const spriteUrl = getGrowthAwareSpriteUrl(creature, fishSize, screenSize, creature.id);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const processedSprite = removeBackground(img, chromaTol);
            state.spriteCache.set(cacheKey, processedSprite);
            doSpawn(processedSprite);
          };
          img.onerror = () => { };
          img.src = cacheBust(spriteUrl);
        } else {
          doSpawn(sprite);
        }

        if (useSmallPreyTimer) {
          state.lastSmallPreyRespawnTime = now;
        } else {
          state.lastRespawnTime = now;
        }
      }
    }
  }

  const bounds = state.worldBounds;
  player.x = Math.max(bounds.minX, Math.min(bounds.maxX, player.x));
  player.y = Math.max(bounds.minY, Math.min(bounds.maxY, player.y));

  if (gameMode) {
    state.gameMode.score = Math.floor((player.size - player.baseSize) * GAME.SCORE_PER_SIZE_UNIT);
    if (callbacks.onStatsUpdate && Math.random() < GAME.STATS_UPDATE_CHANCE) {
      const timeSurvived = Math.floor((Date.now() - state.gameMode.startTime - state.gameMode.totalPausedTime) / 1000);
      callbacks.onStatsUpdate({
        size: player.size,
        hunger: player.hunger,
        score: state.gameMode.score,
        fishEaten: state.gameMode.fishEaten,
        timeSurvived,
      });
    }
  }

  const SPAWN_FADE_DURATION = helpers.spawnFadeDuration;
  const AI_BASE_SPEED = AI.BASE_SPEED;
  const AI_PREDATOR_CHASE_SPEED = AI.PREDATOR_CHASE_SPEED;
  const AI_PREY_FLEE_SPEED = AI.PREY_FLEE_SPEED;
  const AI_DETECTION_RANGE = AI.DETECTION_RANGE;
  const AI_CHASE_TIMEOUT_MS = AI.CHASE_TIMEOUT_MS;

  state.fish.forEach((fish) => {
    if (fish.hunger === undefined || fish.baseMaxStamina === undefined) {
      initHungerStamina(fish, { hungerDrainRate: HUNGER_DRAIN_RATE });
    }
    if (fish.isDashing === undefined) fish.isDashing = false;

    if (gameMode && !isPaused && (fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant')) {
      const fishSpeed = Math.sqrt((fish.vx ?? 0) ** 2 + (fish.vy ?? 0) ** 2);
      const movementFactor = Math.min(COLLISION.NON_DASH_MOVEMENT_DRAIN_CAP, Math.max(COLLISION.STATIONARY_DRAIN_FRACTION, Math.min(1, fishSpeed / 1.5)));
      updateHunger(fish, deltaTime, { movementFactor });
    }

    if (fish.despawnTime !== undefined) {
      const elapsed = now - fish.despawnTime;
      fish.opacity = Math.max(0, 1 - elapsed / SPAWN_FADE_DURATION);
      if (fish.opacity <= 0) fish.lifecycleState = 'removed';
    } else if (fish.spawnTime !== undefined) {
      const elapsed = now - fish.spawnTime;
      fish.opacity = Math.max(0, Math.min(1, elapsed / SPAWN_FADE_DURATION));
      if (fish.opacity >= 1 && fish.lifecycleState === 'spawning') fish.lifecycleState = 'active';
    } else {
      fish.opacity = 1;
      if (!fish.lifecycleState) fish.lifecycleState = 'active';
    }

    if (!currentEditMode && !isPaused) {
      if (gameMode && fish.lifecycleState === 'exhausted') {
        fish.isDashing = false;
        const recoveringFromFlee = fish.recoveringFromExhausted && fish.type === 'prey';
        const fleeRecoveryMult = EXHAUSTED_REGEN_MULTIPLIER * FLEEING_RECOVERY_MULTIPLIER;
        updateStamina(fish, deltaTime, { regenMultiplier: recoveringFromFlee ? fleeRecoveryMult : undefined });
        fish.vx = (fish.vx ?? 0) + (Math.random() - 0.5) * AI.WANDER_JITTER;
        fish.vy = (fish.vy ?? 0) + (Math.random() - 0.5) * AI.WANDER_JITTER;
        const exhaustedMaxSpeed = AI_BASE_SPEED * EXHAUSTED_SPEED_MULTIPLIER * (fish.type === 'prey' ? AI_PREY_FLEE_SPEED : AI_PREDATOR_CHASE_SPEED);
        const sp = Math.sqrt((fish.vx ?? 0) ** 2 + (fish.vy ?? 0) ** 2);
        if (sp > exhaustedMaxSpeed && sp > 0) {
          fish.vx = (fish.vx! / sp) * exhaustedMaxSpeed;
          fish.vy = (fish.vy! / sp) * exhaustedMaxSpeed;
        }
        if ((fish.stamina ?? 0) >= (fish.maxStamina ?? 0)) {
          fish.lifecycleState = 'active';
          fish.recoveringFromExhausted = false;
        }
      } else if (gameMode && fish.lifecycleState === 'knocked_out') {
        updateStamina(fish, deltaTime, { regenRate: 50 * KO_STAMINA_REGEN_MULTIPLIER });
        if ((fish.stamina ?? 0) >= (fish.maxStamina ?? 0) * KO_WAKE_THRESHOLD) fish.lifecycleState = 'active';
        fish.vx = (fish.vx ?? 0) * 0.98 + (Math.random() - 0.5) * KO_DRIFT_SPEED * 0.02;
        fish.vy = (fish.vy ?? 0) * 0.98 + (Math.random() - 0.5) * KO_DRIFT_SPEED * 0.02;
        const driftMag = Math.sqrt((fish.vx ?? 0) ** 2 + (fish.vy ?? 0) ** 2);
        if (driftMag > KO_DRIFT_SPEED) {
          fish.vx = (fish.vx! / driftMag) * KO_DRIFT_SPEED;
          fish.vy = (fish.vy! / driftMag) * KO_DRIFT_SPEED;
        }
      } else if (gameMode && (fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant') && fish.lifecycleState === 'active') {
        const others = state.fish.filter(
          (f) => f.id !== fish.id && (f.lifecycleState === 'active' || f.lifecycleState === 'exhausted' || f.lifecycleState === 'knocked_out') && (f.opacity ?? 1) >= 1
        );
        const speedMult = (fish.isDashing && (fish.stamina ?? 0) > 0) ? PHYSICS.DASH_SPEED_MULTIPLIER : 1;
        const baseSpeed = AI_BASE_SPEED * speedMult;

        if (fish.type === 'predator' || fish.type === 'mutant') {
          let targetX: number | null = null;
          let targetY: number | null = null;
          let targetId: string | null = null;
          let distToTarget = Infinity;
          const chaseElapsed = fish.chaseStartTime != null ? now - fish.chaseStartTime : 0;
          if (fish.chaseTargetId != null && chaseElapsed > AI_CHASE_TIMEOUT_MS) {
            fish.chaseTargetId = undefined;
            fish.chaseStartTime = undefined;
          }
          if (chaseElapsed <= AI_CHASE_TIMEOUT_MS) {
            for (const other of others) {
              if (other.size < fish.size * 0.8 && (other.type === 'prey' || other.lifecycleState === 'knocked_out')) {
                const dx = other.x - fish.x;
                const dy = other.y - fish.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < AI_DETECTION_RANGE && d < distToTarget) {
                  distToTarget = d;
                  targetX = other.x;
                  targetY = other.y;
                  targetId = other.id;
                }
              }
            }
            if (player.size < fish.size * AI.PREDATOR_TARGET_SIZE_RATIO) {
              const pdx = player.x - fish.x;
              const pdy = player.y - fish.y;
              const pd = Math.sqrt(pdx * pdx + pdy * pdy);
              if (pd < AI_DETECTION_RANGE && pd < distToTarget) {
                distToTarget = pd;
                targetX = player.x;
                targetY = player.y;
                targetId = 'player';
              }
            }
          }
          const maxSpeed = baseSpeed * AI_PREDATOR_CHASE_SPEED;
          if (targetX != null && targetY != null && distToTarget > 5) {
            fish.chaseTargetId = targetId ?? undefined;
            if (fish.chaseStartTime == null) fish.chaseStartTime = now;
            const dx = targetX - fish.x;
            const dy = targetY - fish.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            fish.vx = (dx / len) * maxSpeed;
            fish.vy = (dy / len) * maxSpeed;
            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
          } else {
            fish.chaseTargetId = undefined;
            fish.chaseStartTime = undefined;
            fish.vx += (Math.random() - 0.5) * AI.WANDER_JITTER;
            fish.vy += (Math.random() - 0.5) * AI.WANDER_JITTER;
            fish.isDashing = false;
          }
          updateStamina(fish, deltaTime, { drainRate: AI_DASH_STAMINA_DRAIN_RATE });
          const stam = fish.stamina ?? 0;
          if (stam <= 0) {
            fish.isDashing = false;
            fish.lifecycleState = 'exhausted';
            fish.recoveringFromExhausted = true;
          } else if (stam <= AI.DASH_STAMINA_MIN) {
            fish.isDashing = false;
            fish.recoveringFromExhausted = true;
          }
          if (stam <= 0) {
            const exhaustedMaxSpeed = AI_BASE_SPEED * EXHAUSTED_SPEED_MULTIPLIER * AI_PREDATOR_CHASE_SPEED;
            const sp = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
            if (sp > exhaustedMaxSpeed && sp > 0) {
              fish.vx = (fish.vx / sp) * exhaustedMaxSpeed;
              fish.vy = (fish.vy / sp) * exhaustedMaxSpeed;
            }
          }
          if (fish.recoveringFromExhausted && (fish.stamina ?? 0) >= (fish.maxStamina ?? 0)) fish.recoveringFromExhausted = false;
        } else if (fish.type === 'prey') {
          let fleeX = 0;
          let fleeY = 0;
          let nearestThreatDist = Infinity;
          // Clear expired flee state
          if (fish.fleeFromUntil && now > fish.fleeFromUntil) {
            fish.fleeFromId = undefined;
            fish.fleeFromUntil = undefined;
          }
          for (const other of others) {
            // Flee from larger predators OR from any attacker that hit us (fleeFromId)
            const isLargerPredator = other.size > fish.size * 1.2 && (other.type === 'predator' || other.type === 'mutant');
            const isFleeTarget = fish.fleeFromId === other.id && fish.fleeFromUntil && now < fish.fleeFromUntil;
            if (isLargerPredator || isFleeTarget) {
              const dx = fish.x - other.x;
              const dy = fish.y - other.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < AI_DETECTION_RANGE) {
                if (d < nearestThreatDist) nearestThreatDist = d;
                if (d > 0) {
                  fleeX += dx / d;
                  fleeY += dy / d;
                }
              }
            }
          }
          // Flee from player: larger OR was attacked by player
          const fleeFromPlayer = player.size > fish.size * 1.2 ||
            (fish.fleeFromId === 'player' && fish.fleeFromUntil && now < fish.fleeFromUntil);
          if (fleeFromPlayer) {
            const pdx = fish.x - player.x;
            const pdy = fish.y - player.y;
            const pd = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pd < AI_DETECTION_RANGE) {
              if (pd < nearestThreatDist) nearestThreatDist = pd;
              if (pd > 0) {
                fleeX += pdx / pd;
                fleeY += pdy / pd;
              }
            }
          }
          const maxSpeed = baseSpeed * AI_PREY_FLEE_SPEED;
          const threatened = fleeX !== 0 || fleeY !== 0;
          if (threatened) {
            const mag = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
            fish.vx = (fleeX / mag) * maxSpeed;
            fish.vy = (fleeY / mag) * maxSpeed;
            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
          } else {
            fish.vx += (Math.random() - 0.5) * AI.WANDER_JITTER;
            fish.vy += (Math.random() - 0.5) * AI.WANDER_JITTER;
            fish.isDashing = false;
          }
          updateStamina(fish, deltaTime, {
            drainRate: AI_DASH_STAMINA_DRAIN_RATE,
            fleeMultiplier: fish.isDashing ? PREY_FLEE_STAMINA_MULTIPLIER : 1,
          });
          const stam = fish.stamina ?? 0;
          if (stam <= 0) {
            fish.isDashing = false;
            fish.lifecycleState = 'exhausted';
            fish.recoveringFromExhausted = true;
          } else if (stam <= AI.DASH_STAMINA_MIN) {
            fish.isDashing = false;
            fish.recoveringFromExhausted = true;
          }
          if (stam <= 0) {
            const exhaustedMaxSpeed = AI_BASE_SPEED * EXHAUSTED_SPEED_MULTIPLIER * AI_PREY_FLEE_SPEED;
            const sp = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
            if (sp > exhaustedMaxSpeed && sp > 0) {
              fish.vx = (fish.vx / sp) * exhaustedMaxSpeed;
              fish.vy = (fish.vy / sp) * exhaustedMaxSpeed;
            }
          }
          if (fish.recoveringFromExhausted && (fish.stamina ?? 0) >= (fish.maxStamina ?? 0)) fish.recoveringFromExhausted = false;
        }

        if (fish.lifecycleState === 'active') {
          const effectiveMax = (fish.type === 'predator' || fish.type === 'mutant')
            ? baseSpeed * AI_PREDATOR_CHASE_SPEED
            : baseSpeed * AI_PREY_FLEE_SPEED;
          const sp = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
          if (sp > effectiveMax && sp > 0) {
            fish.vx = (fish.vx / sp) * effectiveMax;
            fish.vy = (fish.vy / sp) * effectiveMax;
          }
        }
      } else if (!gameMode || (fish.type !== 'prey' && fish.type !== 'predator')) {
        if (Math.random() < AI.RANDOM_DIRECTION_CHANCE) {
          fish.vx = (Math.random() - 0.5) * AI.WANDER_SPEED;
          fish.vy = (Math.random() - 0.5) * AI.WANDER_SPEED;
        }
      }

      fish.x += fish.vx * deltaTime;
      fish.y += fish.vy * deltaTime;
    } else {
      fish.vx = 0;
      fish.vy = 0;
      if (fish.type === 'prey' || fish.type === 'predator' || fish.type === 'mutant') fish.isDashing = false;
    }

    if (Math.abs(fish.vx) > 0.1) fish.facingRight = fish.vx > 0;
    const maxTilt = Math.PI / 6;
    const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, fish.vy * 0.3));
    fish.verticalTilt += (targetTilt - fish.verticalTilt) * 0.1;
    const fishSpeed = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
    fish.animTime += 0.04 + Math.min(0.04, (fishSpeed / 1.5) * 0.04);

    const b = state.worldBounds;
    if (fish.x < b.minX || fish.x > b.maxX) {
      fish.vx = -fish.vx;
      fish.x = Math.max(b.minX, Math.min(b.maxX, fish.x));
    }
    if (fish.y < b.minY || fish.y > b.maxY) {
      fish.vy = -fish.vy;
      fish.y = Math.max(b.minY, Math.min(b.maxY, fish.y));
    }
  });

  if (gameMode) {
    const dashEntities = [
      {
        id: 'player',
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        size: player.size,
        isDashing: !player.isExhausted && player.isDashing,
      },
      ...state.fish
        .filter((f) => (f.opacity ?? 1) >= 1 && f.lifecycleState !== 'removed')
        .map((f) => ({
          id: f.id,
          x: f.x,
          y: f.y,
          vx: f.vx ?? 0,
          vy: f.vy ?? 0,
          size: f.size,
          isDashing: f.lifecycleState !== 'exhausted' && !!(f.isDashing && (f.stamina ?? 0) > 0),
        })),
    ];
    state.particles.dashMultiEntity.update(dashEntities, deltaTime);
  }

  if (!currentEditMode) {
    state.fish = state.fish.filter((f) => f.lifecycleState !== 'removed');
  }

  let targetCameraX = 0;
  let targetCameraY = 0;
  if (!currentEditMode && !isPaused) {
    targetCameraX = player.x;
    targetCameraY = player.y;
  } else if ((currentEditMode || isPaused) && options.selectedFishId) {
    const isPlayerSelected = options.selectedFishId === player.id;
    const selectedFish = isPlayerSelected ? null : state.fish.find((f) => f.id === options.selectedFishId);
    if (isPlayerSelected) {
      targetCameraX = player.x;
      targetCameraY = player.y;
    } else if (selectedFish) {
      targetCameraX = selectedFish.x;
      targetCameraY = selectedFish.y;
    }
  } else if (currentEditMode || isPaused) {
    targetCameraX = state.camera.x;
    targetCameraY = state.camera.y;
  }
  state.camera.x = targetCameraX;
  state.camera.y = targetCameraY;

  return true;
}

function effMult(sizeA: number, sizeB: number): number {
  return Math.max(COLLISION.MIN_EFFICIENCY, 1 / (1 + (sizeA / sizeB) * COLLISION.EFFICIENCY_RATIO));
}

function pushBloodAt(state: CanvasGameState, x: number, y: number, sizeScale: number): void {
  const n = sizeScale > PARTICLES.BLOOD_SIZE_THRESHOLD ? PARTICLES.BLOOD_COUNT_LARGE : PARTICLES.BLOOD_COUNT_SMALL;
  const radiusMax = sizeScale > PARTICLES.BLOOD_SIZE_THRESHOLD ? PARTICLES.BLOOD_RADIUS_MAX_LARGE : PARTICLES.BLOOD_RADIUS_MAX_SMALL;
  for (let b = 0; b < n; b++) {
    state.particles.blood.push({
      x: x + (Math.random() - 0.5) * sizeScale,
      y: y + (Math.random() - 0.5) * sizeScale,
      life: 1,
      radius: 4 + Math.random() * radiusMax,
    });
  }
}

function spawnRespawnFish(
  state: CanvasGameState,
  creature: Creature,
  fishSize: number,
  sprite: HTMLCanvasElement,
  player: PlayerEntity,
  now: number,
  runId?: string,
  currentLevel?: string,
  positionOverride?: { x: number; y: number },
  idSuffix?: string
): void {
  const baseSpeed = creature.stats?.speed ?? 2;
  const speedScale = AI.SPEED_SCALE;
  const vx = (Math.random() - 0.5) * baseSpeed * speedScale;
  const vy = (Math.random() - 0.5) * baseSpeed * speedScale;
  const bounds = state.worldBounds;
  let spawnX: number;
  let spawnY: number;
  if (positionOverride) {
    spawnX = Math.max(bounds.minX, Math.min(bounds.maxX, positionOverride.x));
    spawnY = Math.max(bounds.minY, Math.min(bounds.maxY, positionOverride.y));
  } else if (runId != null && currentLevel != null) {
    const pos = getSpawnPositionInBand(runId, currentLevel, { x: player.x, y: player.y }, SPAWN.MIN_DISTANCE);
    spawnX = pos.x;
    spawnY = pos.y;
  } else {
    const angle = Math.random() * Math.PI * 2;
    const distance = SPAWN.MIN_DISTANCE + Math.random() * SPAWN.MAX_DISTANCE_OFFSET;
    spawnX = player.x + Math.cos(angle) * distance;
    spawnY = player.y + Math.sin(angle) * distance;
    spawnX = Math.max(bounds.minX, Math.min(bounds.maxX, spawnX));
    spawnY = Math.max(bounds.minY, Math.min(bounds.maxY, spawnY));
  }
  const cacheId = (creature as { creatureId?: string }).creatureId ?? creature.id;
  const newId = `${cacheId}-r-${Date.now()}-${idSuffix ?? Math.random().toString(36).slice(2, 9)}`;
  const anims = creature.animations;
  const animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;
  const baseHealth = creature.stats?.health ?? 20;
  const newFish: FishEntity = {
    id: newId,
    x: spawnX,
    y: spawnY,
    vx,
    vy,
    size: fishSize,
    sprite,
    type: creature.type ?? 'prey',
    facingRight: vx >= 0,
    verticalTilt: 0,
    animTime: Math.random() * Math.PI * 2,
    creatureData: creature,
    spawnTime: now,
    despawnTime: undefined,
    opacity: 0,
    lifecycleState: 'spawning' as FishLifecycleState,
    isDashing: false,
    animations: anims,
    animationSprite: animSprite,
    health: baseHealth,
    maxHealth: baseHealth,
  };
  initHungerStamina(newFish, { hungerDrainRate: HUNGER_DRAIN_RATE });
  state.fish.push(newFish);
}
