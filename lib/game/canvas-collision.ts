/**
 * Collision System for Canvas Game
 * Handles fish-fish and player-fish collision detection and resolution
 */

import { ATTACK_SIZE_RATIO, SWALLOW_SIZE_RATIO, BATTLE_SIZE_THRESHOLD, DASH_ATTACK_STAMINA_COST, ATTACK_LARGER_STAMINA_MULTIPLIER } from './dash-constants';
import { COLLISION } from './canvas-constants';
import { PLAYER_MAX_SIZE } from './spawn-fish';
import { HUNGER_MAX, HUNGER_RESTORE_MULTIPLIER } from './hunger-constants';
import { ESSENCE_TYPES } from './data/essence-types';
import type { AnimationSprite } from '@/lib/rendering/animation-sprite';
import type { Creature } from './types';

export interface CollisionEntity {
  id: string;
  x: number;
  y: number;
  size: number;
  facingRight: boolean;
  type?: string;
  lifecycleState?: string;
  opacity?: number;
  stamina?: number;
  maxStamina?: number;
  isDashing?: boolean;
  vx?: number;
  vy?: number;
  animationSprite?: AnimationSprite;
  creatureData?: Creature;
}

export interface PlayerEntity extends CollisionEntity {
  hunger: number;
  chompPhase: number;
  chompEndTime: number;
  animations?: any;
}

export interface CollisionResult {
  type: 'eat' | 'knockout' | 'stamina_battle' | 'none';
  eatenIds: Set<string>;
  bloodParticles: Array<{ x: number; y: number; life: number; radius: number }>;
  chompParticles: Array<{
    x: number;
    y: number;
    life: number;
    scale: number;
    text: string;
    color?: string;
    punchScale?: number;
  }>;
  playerUpdates?: {
    size?: number;
    hunger?: number;
    chompPhase?: number;
    chompEndTime?: number;
    stamina?: number;
  };
  fishUpdates?: Map<string, {
    size?: number;
    lifecycleState?: string;
    stamina?: number;
    vx?: number;
    vy?: number;
  }>;
  gameOver?: boolean;
}

/**
 * Get head position for collision detection
 */
export function getHeadPosition(entity: { x: number; y: number; size: number; facingRight: boolean }): { x: number; y: number } {
  const headOffset = entity.size * COLLISION.HEAD_OFFSET_RATIO;
  return {
    x: entity.x + (entity.facingRight ? headOffset : -headOffset),
    y: entity.y,
  };
}

/**
 * Get head radius for collision detection
 */
export function getHeadRadius(size: number): number {
  return size * COLLISION.HEAD_RADIUS_RATIO;
}

/**
 * Detect and resolve fish-fish collisions
 */
export function detectFishFishCollisions(
  fishList: CollisionEntity[],
  now: number
): CollisionResult {
  const eatenIds = new Set<string>();
  const bloodParticles: Array<{ x: number; y: number; life: number; radius: number }> = [];
  const fishUpdates = new Map<string, {
    size?: number;
    lifecycleState?: string;
    stamina?: number;
    vx?: number;
    vy?: number;
  }>();

  for (let i = 0; i < fishList.length; i++) {
    const fishA = fishList[i];
    if (eatenIds.has(fishA.id) || (fishA.opacity ?? 1) < 1) continue;

    const aHead = getHeadPosition(fishA);
    const aR = getHeadRadius(fishA.size);

    for (let j = i + 1; j < fishList.length; j++) {
      const fishB = fishList[j];
      if (eatenIds.has(fishB.id) || (fishB.opacity ?? 1) < 1) continue;

      const bHead = getHeadPosition(fishB);
      const bR = getHeadRadius(fishB.size);
      const dx = bHead.x - aHead.x;
      const dy = bHead.y - aHead.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= aR + bR) continue;

      const aIsPredator = fishA.type === 'predator' || fishA.type === 'mutant';
      const bIsPredator = fishB.type === 'predator' || fishB.type === 'mutant';
      const aIsPrey = fishA.type === 'prey';
      const bIsPrey = fishB.type === 'prey';
      const aKo = fishA.lifecycleState === 'knocked_out';
      const bKo = fishB.lifecycleState === 'knocked_out';

      // Predator can eat KO prey
      if (aKo && bIsPredator && fishB.isDashing) {
        eatenIds.add(fishA.id);
        const eatX = (fishA.x + fishB.x) * 0.5;
        const eatY = (fishA.y + fishB.y) * 0.5;
        const effMult = Math.max(0.05, 1 / (1 + (fishB.size / fishA.size) * 0.4));
        const newSize = Math.min(PLAYER_MAX_SIZE, fishB.size + fishA.size * 0.15 * effMult);
        fishUpdates.set(fishB.id, { size: newSize });
        if (fishB.animationSprite?.hasAction?.('bite')) {
          fishB.animationSprite.triggerAction('bite');
        }
        for (let b = 0; b < 12; b++) {
          bloodParticles.push({
            x: eatX + (Math.random() - 0.5) * fishA.size * 1.2,
            y: eatY + (Math.random() - 0.5) * fishA.size * 1.2,
            life: 1,
            radius: 4 + Math.random() * 8,
          });
        }
        continue;
      }
      if (bKo && aIsPredator && fishA.isDashing) {
        eatenIds.add(fishB.id);
        const eatX = (fishA.x + fishB.x) * 0.5;
        const eatY = (fishA.y + fishB.y) * 0.5;
        const effMult = Math.max(0.05, 1 / (1 + (fishA.size / fishB.size) * 0.4));
        const newSize = Math.min(PLAYER_MAX_SIZE, fishA.size + fishB.size * 0.15 * effMult);
        fishUpdates.set(fishA.id, { size: newSize });
        if (fishA.animationSprite?.hasAction?.('bite')) {
          fishA.animationSprite.triggerAction('bite');
        }
        for (let b = 0; b < 12; b++) {
          bloodParticles.push({
            x: eatX + (Math.random() - 0.5) * fishB.size * 1.2,
            y: eatY + (Math.random() - 0.5) * fishB.size * 1.2,
            life: 1,
            radius: 4 + Math.random() * 8,
          });
        }
        continue;
      }

      if (!((aIsPredator && bIsPrey) || (aIsPrey && bIsPredator))) continue;
      const predator = aIsPredator ? fishA : fishB;
      const prey = aIsPredator ? fishB : fishA;
      const bothDashing = predator.isDashing && prey.isDashing;

      if (!predator.isDashing && !prey.isDashing) continue;

      const sizeRatio = predator.size / prey.size;
      const evenlyMatched = sizeRatio >= 1 - BATTLE_SIZE_THRESHOLD && sizeRatio <= 1 + BATTLE_SIZE_THRESHOLD;
      const oneSided = evenlyMatched && (predator.isDashing !== prey.isDashing);

      if (oneSided) {
        const attacker = predator.isDashing ? predator : prey;
        const target = predator.isDashing ? prey : predator;
        const targetSizeRatio = attacker.size / target.size;
        const staminaMult = targetSizeRatio < 1 ? ATTACK_LARGER_STAMINA_MULTIPLIER : 1;
        const newStamina = Math.max(0, (target.stamina ?? 100) - DASH_ATTACK_STAMINA_COST * staminaMult);
        fishUpdates.set(target.id, { stamina: newStamina });
        if (newStamina <= 0) {
          fishUpdates.set(target.id, {
            stamina: 0,
            lifecycleState: 'knocked_out',
            vx: (target.vx ?? 0) * 0.3,
            vy: (target.vy ?? 0) * 0.3,
          });
        }
      } else if (sizeRatio >= ATTACK_SIZE_RATIO) {
        // Predator eats prey
        eatenIds.add(prey.id);
        const eatX = (predator.x + prey.x) * 0.5;
        const eatY = (predator.y + prey.y) * 0.5;
        const effMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
        const newSize = Math.min(PLAYER_MAX_SIZE, predator.size + prey.size * 0.15 * effMult);
        fishUpdates.set(predator.id, { size: newSize });
        if (predator.animationSprite?.hasAction?.('bite')) {
          predator.animationSprite.triggerAction('bite');
        }
        for (let b = 0; b < 12; b++) {
          bloodParticles.push({
            x: eatX + (Math.random() - 0.5) * prey.size * 1.2,
            y: eatY + (Math.random() - 0.5) * prey.size * 1.2,
            life: 1,
            radius: 4 + Math.random() * 8,
          });
        }
      } else if (sizeRatio <= 1 / ATTACK_SIZE_RATIO) {
        // Prey eats predator
        eatenIds.add(predator.id);
        const eatX = (predator.x + prey.x) * 0.5;
        const eatY = (predator.y + prey.y) * 0.5;
        const invRatio = prey.size / predator.size;
        const effMult = Math.max(0.05, 1 / (1 + invRatio * 0.4));
        const newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.15 * effMult);
        fishUpdates.set(prey.id, { size: newSize });
        if (prey.animationSprite?.hasAction?.('bite')) {
          prey.animationSprite.triggerAction('bite');
        }
        for (let b = 0; b < 12; b++) {
          bloodParticles.push({
            x: eatX + (Math.random() - 0.5) * predator.size * 1.2,
            y: eatY + (Math.random() - 0.5) * predator.size * 1.2,
            life: 1,
            radius: 4 + Math.random() * 8,
          });
        }
      } else if (bothDashing && evenlyMatched) {
        // Stamina battle
        const predStamina = Math.max(0, (predator.stamina ?? 100) - DASH_ATTACK_STAMINA_COST);
        const preyStamina = Math.max(0, (prey.stamina ?? 100) - DASH_ATTACK_STAMINA_COST);
        fishUpdates.set(predator.id, { stamina: predStamina });
        fishUpdates.set(prey.id, { stamina: preyStamina });

        const predKo = predStamina <= 0;
        const preyKo = preyStamina <= 0;

        if (predKo) {
          eatenIds.add(predator.id);
          const eatX = (predator.x + prey.x) * 0.5;
          const eatY = (predator.y + prey.y) * 0.5;
          const newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);
          fishUpdates.set(prey.id, { size: newSize });
          if (prey.animationSprite?.hasAction?.('bite')) {
            prey.animationSprite.triggerAction('bite');
          }
          for (let b = 0; b < 10; b++) {
            bloodParticles.push({
              x: eatX + (Math.random() - 0.5) * 20,
              y: eatY + (Math.random() - 0.5) * 20,
              life: 1,
              radius: 4 + Math.random() * 6,
            });
          }
        } else if (preyKo) {
          fishUpdates.set(prey.id, {
            stamina: 0,
            lifecycleState: 'knocked_out',
            vx: (prey.vx ?? 0) * 0.3,
            vy: (prey.vy ?? 0) * 0.3,
          });
        }
      }
      break;
    }
  }

  return {
    type: eatenIds.size > 0 ? 'eat' : 'none',
    eatenIds,
    bloodParticles,
    chompParticles: [],
    fishUpdates,
  };
}

/**
 * Detect and resolve player-fish collisions
 */
export function detectPlayerFishCollision(
  player: PlayerEntity,
  fish: CollisionEntity,
  now: number,
  gameMode: boolean,
  onGameOver?: (stats: any) => void,
  gameStartTime?: number,
  totalPausedTime?: number,
  score?: number,
  fishEaten?: number,
  essenceCollected?: number,
  triggerAnimationAction?: (action: string) => void
): CollisionResult | null {
  const playerHead = getHeadPosition(player);
  const playerHeadR = getHeadRadius(player.size);
  const fishHead = getHeadPosition(fish);
  const fishHeadR = getHeadRadius(fish.size);

  const dx = fishHead.x - playerHead.x;
  const dy = fishHead.y - playerHead.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= playerHeadR + fishHeadR) return null;

  const bloodParticles: Array<{ x: number; y: number; life: number; radius: number }> = [];
  const chompParticles: Array<{
    x: number;
    y: number;
    life: number;
    scale: number;
    text: string;
    color?: string;
    punchScale?: number;
  }> = [];

  if (gameMode) {
    // KO fish can be eaten (dash required)
    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {
      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      const sizeRatio = player.size / fish.size;
      const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
      const sizeGain = fish.size * 0.15 * efficiencyMult;
      const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);

      for (let b = 0; b < 10; b++) {
        bloodParticles.push({
          x: eatX + (Math.random() - 0.5) * 20,
          y: eatY + (Math.random() - 0.5) * 20,
          life: 1,
          radius: 4 + Math.random() * 6,
        });
      }

      if (fish.creatureData?.essenceTypes) {
        fish.creatureData.essenceTypes.forEach((ec: { type: string; baseYield: number }, i: number) => {
          const et = ESSENCE_TYPES[ec.type];
          if (et) {
            chompParticles.push({
              x: eatX + (Math.random() - 0.5) * 24,
              y: eatY - 20 - (i * 18),
              life: 1.5,
              scale: 1.4,
              text: `+${ec.baseYield} ${et.name}`,
              color: et.color,
              punchScale: 1.8,
            });
          }
        });
      }

      return {
        type: 'eat',
        eatenIds: new Set([fish.id]),
        bloodParticles,
        chompParticles,
        playerUpdates: {
          size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),
          hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),
          chompPhase: 1,
          chompEndTime: now + 280,
        },
      };
    }

    const canSwallow = player.size >= fish.size * SWALLOW_SIZE_RATIO;
    const canAttack = player.size > fish.size * ATTACK_SIZE_RATIO;
    const playerAttacking = player.isDashing && (canAttack || canSwallow);
    const fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;
    const sizeRatio = player.size / fish.size;
    const evenlyMatched = sizeRatio >= 1 - BATTLE_SIZE_THRESHOLD && sizeRatio <= 1 + BATTLE_SIZE_THRESHOLD;
    const bothDashing = player.isDashing && fish.isDashing;
    const oneSidedAttack = evenlyMatched && (player.isDashing !== fish.isDashing);

    if (!playerAttacking && !fishAttacking && !(evenlyMatched && bothDashing) && !oneSidedAttack) {
      return null;
    }

    if (oneSidedAttack) {
      const attacker = player.isDashing ? player : fish;
      const target = player.isDashing ? fish : player;
      const targetSizeRatio = attacker.size / target.size;
      const staminaMult = targetSizeRatio < 1 ? ATTACK_LARGER_STAMINA_MULTIPLIER : 1;
      const newStamina = Math.max(0, (target.stamina ?? 100) - DASH_ATTACK_STAMINA_COST * staminaMult);

      if (target === fish) {
        if (newStamina <= 0) {
          return {
            type: 'knockout',
            eatenIds: new Set(),
            bloodParticles: [],
            chompParticles: [],
            fishUpdates: new Map([[fish.id, {
              stamina: 0,
              lifecycleState: 'knocked_out',
              vx: (fish.vx ?? 0) * 0.3,
              vy: (fish.vy ?? 0) * 0.3,
            }]]),
          };
        }
        return {
          type: 'stamina_battle',
          eatenIds: new Set(),
          bloodParticles: [],
          chompParticles: [],
          fishUpdates: new Map([[fish.id, { stamina: newStamina }]]),
        };
      } else {
        // Player KO'd
        if (newStamina <= 0 && onGameOver && gameStartTime !== undefined && totalPausedTime !== undefined) {
          triggerAnimationAction?.('death');
          const timeSurvived = Math.floor((now - gameStartTime - totalPausedTime) / 1000);
          onGameOver({
            score: score ?? 0,
            cause: 'eaten',
            size: player.size,
            fishEaten: fishEaten ?? 0,
            essenceCollected: essenceCollected ?? 0,
            timeSurvived,
          });
          return {
            type: 'stamina_battle',
            eatenIds: new Set(),
            bloodParticles: [],
            chompParticles: [],
            playerUpdates: { stamina: 0 },
            gameOver: true,
          };
        }
        return {
          type: 'stamina_battle',
          eatenIds: new Set(),
          bloodParticles: [],
          chompParticles: [],
          playerUpdates: { stamina: newStamina },
        };
      }
    } else if (evenlyMatched && bothDashing) {
      // Stamina battle
      const playerStamina = Math.max(0, (player.stamina ?? 0) - DASH_ATTACK_STAMINA_COST);
      const fishStamina = Math.max(0, (fish.stamina ?? 100) - DASH_ATTACK_STAMINA_COST);
      const playerKo = playerStamina <= 0;
      const fishKo = fishStamina <= 0;

      if (fishKo) {
        return {
          type: 'knockout',
          eatenIds: new Set(),
          bloodParticles: [],
          chompParticles: [],
          fishUpdates: new Map([[fish.id, {
            stamina: 0,
            lifecycleState: 'knocked_out',
            vx: (fish.vx ?? 0) * 0.3,
            vy: (fish.vy ?? 0) * 0.3,
          }]]),
          playerUpdates: { stamina: playerStamina },
        };
      } else if (playerKo && onGameOver && gameStartTime !== undefined && totalPausedTime !== undefined) {
        triggerAnimationAction?.('death');
        const timeSurvived = Math.floor((now - gameStartTime - totalPausedTime) / 1000);
        onGameOver({
          score: score ?? 0,
          cause: 'eaten',
          size: player.size,
          fishEaten: fishEaten ?? 0,
          essenceCollected: essenceCollected ?? 0,
          timeSurvived,
        });
        return {
          type: 'stamina_battle',
          eatenIds: new Set(),
          bloodParticles: [],
          chompParticles: [],
          playerUpdates: { stamina: 0 },
          gameOver: true,
        };
      }
      return {
        type: 'stamina_battle',
        eatenIds: new Set(),
        bloodParticles: [],
        chompParticles: [],
        playerUpdates: { stamina: playerStamina },
        fishUpdates: new Map([[fish.id, { stamina: fishStamina }]]),
      };
    } else if (fishAttacking) {
      // Fish eats player - GAME OVER
      if (onGameOver && gameStartTime !== undefined && totalPausedTime !== undefined) {
        triggerAnimationAction?.('death');
        const timeSurvived = Math.floor((now - gameStartTime - totalPausedTime) / 1000);
        onGameOver({
          score: score ?? 0,
          cause: 'eaten',
          size: player.size,
          fishEaten: fishEaten ?? 0,
          essenceCollected: essenceCollected ?? 0,
          timeSurvived,
        });
      }
      return {
        type: 'eat',
        eatenIds: new Set(),
        bloodParticles: [],
        chompParticles: [],
        gameOver: true,
      };
    } else if (playerAttacking) {
      // Player eats fish
      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      const sizeRatio = player.size / fish.size;
      const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
      const sizeGain = fish.size * 0.15 * efficiencyMult;
      const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);

      triggerAnimationAction?.('bite');

      // Chomp particles
      for (let k = 0; k < 5; k++) {
        chompParticles.push({
          x: eatX + (Math.random() - 0.5) * 16,
          y: eatY + (Math.random() - 0.5) * 16,
          life: 1,
          scale: 1 + Math.random() * 0.5,
          text: k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4],
          punchScale: 1.5,
        });
      }

      // Essence particles
      if (fish.creatureData?.essenceTypes) {
        fish.creatureData.essenceTypes.forEach((essenceConfig: { type: string; baseYield: number }, idx: number) => {
          const essenceType = ESSENCE_TYPES[essenceConfig.type];
          if (essenceType) {
            chompParticles.push({
              x: eatX + (Math.random() - 0.5) * 24,
              y: eatY - 20 - (idx * 18),
              life: 1.5,
              scale: 1.4,
              text: `+${essenceConfig.baseYield} ${essenceType.name}`,
              color: essenceType.color,
              punchScale: 1.8,
            });
          }
        });
      }

      // Hunger restore notification
      if (hungerRestore > 0) {
        chompParticles.push({
          x: player.x,
          y: player.y - player.size * 0.6,
          life: 1.5,
          scale: 1.2,
          text: `+${Math.ceil(hungerRestore)}`,
          color: '#4ade80',
          punchScale: 1.6,
        });
      }

      // Blood particles
      for (let b = 0; b < 22; b++) {
        bloodParticles.push({
          x: eatX + (Math.random() - 0.5) * fish.size * 1.2,
          y: eatY + (Math.random() - 0.5) * fish.size * 1.2,
          life: 1,
          radius: 4 + Math.random() * 10,
        });
      }

      return {
        type: 'eat',
        eatenIds: new Set([fish.id]),
        bloodParticles,
        chompParticles,
        playerUpdates: {
          size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),
          hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),
          chompPhase: 1,
          chompEndTime: now + 280,
        },
      };
    }
  } else {
    // Editor mode - only eat prey type
    if (fish.type !== 'prey') return null;
    const eatX = (fish.x + player.x) * 0.5;
    const eatY = (fish.y + player.y) * 0.5;
    const sizeRatio = player.size / fish.size;
    const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
    const sizeGain = fish.size * 0.15 * efficiencyMult;

    triggerAnimationAction?.('bite');

    // Chomp particles
    for (let k = 0; k < 5; k++) {
      chompParticles.push({
        x: eatX + (Math.random() - 0.5) * 16,
        y: eatY + (Math.random() - 0.5) * 16,
        life: 1,
        scale: 1 + Math.random() * 0.5,
        text: k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4],
        punchScale: 1.5,
      });
    }

    return {
      type: 'eat',
      eatenIds: new Set([fish.id]),
      bloodParticles: [],
      chompParticles,
      playerUpdates: {
        size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),
        chompPhase: 1,
        chompEndTime: now + 280,
      },
    };
  }

  return null;
}
