# Master Design Document - Combat System Overhaul

## Overview

This document provides a clean, consolidated design for implementing the health-based combat system with carcass/chunk death sequence, visual feedback, and improved movement/targeting. This is the **source of truth** for implementation.

---

## Core Principles

1. **Health-Based Combat**: All combat resolves through health damage. No instant "eat whole" mechanics.
2. **Physical Death Sequence**: Death spawns carcass and essence chunks. Essence only from collecting chunks.
3. **Visual Feedback**: Hit flashes, attack flashes, squash/stretch animations provide clear combat feedback.
4. **Body Separation**: Fish/player bodies don't overlap. Head colliders remain for combat detection.
5. **Intuitive Targeting**: Homing only on targets you're facing. Bite-time lock-on for feel.

---

## System 1: Health-Based Combat

### 1.1 Entity Health Properties

**State Extensions**:
```typescript
// FishEntity & PlayerEntity
health?: number;
maxHealth?: number;
```

**Initialization**:
- **Fish**: `health = maxHealth = creature.stats.health ?? 20` (from creature data)
- **Player**: `health = maxHealth = PLAYER_BASE_MAX_HEALTH` (30, tunable constant)

**Files**:
- `lib/game/canvas-state.ts` - Add properties
- `lib/game/canvas-spawn-sync.ts` - Initialize fish health
- `lib/game/canvas-state.ts` - Initialize player health

---

### 1.2 Combat Resolution Module

**New File**: `lib/game/combat.ts`

**Core Function**:
```typescript
resolveAttack(
  attacker: { size: number; ... },
  target: { health?: number; maxHealth?: number; size: number; ... },
  options: { attackerDamage?: number; ... }
): { damage: number; died: boolean }
```

**Damage Formula**:
1. Base: `attackerDamage * (attacker.size / 40)`
2. Size ratio multiplier:
   - `sizeRatio ≥ 1.5`: ramps from 1.5 to 3.0 (linear: `1.5 + min(sizeRatio - 1.5, 1.5)`)
   - `sizeRatio ≥ 1.2`: 1.2x
   - `sizeRatio < 0.8`: 0.5x
3. Final: `Math.max(1, Math.floor(base * multiplier))`

**Health Update**:
- Always write: `target.health = Math.max(0, target.health - damage)`
- Return `died: target.health <= 0`

**Integration**:
- Replace all stamina-based combat calls with `resolveAttack()`
- Remove all size-based instant-remove logic
- Death check: `if (result.died) { /* spawn carcass/chunks */ }`

---

### 1.3 Attack Cooldowns

**State**:
```typescript
// PlayerEntity
lastBiteTime?: number;
```

**Logic**:
- Check before attack: `now - player.lastBiteTime > COMBAT.ATTACK_COOLDOWN_MS`
- Set after attack: `player.lastBiteTime = now`
- Cooldown: `ATTACK_COOLDOWN_MS = 400`

---

## System 2: Death Sequence (Carcass & Chunks)

### 2.1 Carcass Module

**New File**: `lib/game/carcass.ts`

**Entity Type**:
```typescript
interface CarcassEntity {
  carcassId: string;
  x: number;
  y: number;
  spawnTime: number;
  opacity: number;
  remainingChunks: number;
}
```

**Functions**:
- `spawnCarcass(state, position, options)` - Creates carcass at death position
- `updateCarcasses(state, now)` - Decay/fade logic, remove when chunks gone or time elapsed
- `drawCarcasses(ctx, carcasses, ...)` - Rendering
- `preloadCarcassSprite()` - Load shared sprite from Sprite Lab
- `setCarcassRemainingChunks(state, carcassId, count)` - Update chunk count
- `decrementCarcassChunks(state, carcassId)` - Decrement on chunk collect

**State**:
- Add `carcasses: CarcassEntity[]` to `CanvasGameState`

**Constants**:
- `CARCASS_DECAY_TIME` (from dash-constants.ts, 45s)
- Fade duration: 1-2 seconds when removing

---

### 2.2 Essence Chunks Module

**New File**: `lib/game/essence-chunks.ts`

**Entity Type**:
```typescript
interface ChunkEntity {
  chunkId: string;
  x: number;
  y: number;
  essenceType: string;
  essenceAmount: number;
  carcassId?: string;
  spawnTime: number;
}
```

**Functions**:
- `spawnChunksFromFish(state, deadFish, position)` - Creates chunks from fish essence data
- `updateChunks(state, now)` - Lifetime updates
- `checkChunkCollection(state, player, callbacks)` - Overlap detection, collection, essence grant
- `drawChunks(ctx, chunks, ...)` - Rendering
- `preloadChunkSprites()` - Load shared sprites

**Collection Callbacks**:
```typescript
{
  onPushChomp?: (particle: ChompParticleLike) => void;
  onChunkCollected?: (chunk: ChunkEntity) => void;
}
```

**State**:
- Add `chunks: ChunkEntity[]` to `CanvasGameState`

**Constants**:
- `CHUNKS_PER_ESSENCE` (from dash-constants.ts, 1)
- `MEAT_ORB_LIFETIME` (from dash-constants.ts, 20s)

---

### 2.3 Death Flow Integration

**Game Loop** (`canvas-game-loop.ts`):
1. When `resolveAttack()` returns `died: true`:
   - Remove fish from `state.fish` array
   - Call `spawnCarcass(state, { x: deadFish.x, y: deadFish.y }, { ... })`
   - Call `spawnChunksFromFish(state, deadFish, { x, y })`
   - Link chunks to carcass via `carcassId`
2. Each frame:
   - Call `updateCarcasses(state, now)`
   - Call `updateChunks(state, now)`
   - Call `checkChunkCollection(state, player, { onPushChomp, onChunkCollected })`

**Renderer** (`canvas-renderer.ts`):
- Call `drawCarcasses(ctx, state.carcasses, ...)`
- Call `drawChunks(ctx, state.chunks, ...)`

**Sprite Loading**:
- Call `preloadCarcassAndChunkSprites()` at level start
- Listen for `refreshSharedSprites` event to reload sprites

---

### 2.4 Player Growth from Chunks

**NEW REQUIREMENT**: Player should grow when collecting chunks

**Implementation**:
- In `checkChunkCollection()` callback `onChunkCollected`:
  - Calculate growth amount based on chunk essence type/amount
  - Apply growth to player: `player.size += growthAmount`
  - Clamp to `PLAYER_MAX_SIZE`
  - Update player max health if health scales with size
  - Trigger growth particle/VFX

**Files**:
- `lib/game/essence-chunks.ts` - Growth calculation
- `lib/game/canvas-game-loop.ts` - Apply growth in callback

---

## System 3: Visual Combat Feedback

### 3.1 Hit Flash (Red Tint)

**State**:
```typescript
hitFlashEndTime?: number;
```

**Logic**:
- Set on target when hit: `target.hitFlashEndTime = now + COMBAT.HIT_FLASH_DURATION`
- Duration: `HIT_FLASH_DURATION = 200ms`

**Renderer**:
- Check: `wallNow < entity.hitFlashEndTime`
- Apply: `ctx.globalCompositeOperation = 'multiply'`
- Color: `rgba(255, 80, 80, 0.85)`
- Draw: Fill over entity bounds (not ellipse, use rect or entity shape)
- Restore: `ctx.globalCompositeOperation = 'source-over'`

---

### 3.2 Attack Flash (White Tint)

**State**:
```typescript
attackFlashEndTime?: number;
```

**Logic**:
- Set on attacker when attack connects: `attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION`
- Duration: `ATTACK_FLASH_DURATION = 150ms`

**Renderer**:
- Check: `wallNow < entity.attackFlashEndTime`
- Apply: `ctx.globalCompositeOperation = 'screen'`
- Color: `rgba(255, 255, 255, 0.9)`
- Draw: Fill over entity bounds
- Restore: `ctx.globalCompositeOperation = 'source-over'`

---

### 3.3 Hit Punch (Squash Animation)

**State**:
```typescript
hitPunchScaleEndTime?: number;
```

**Logic**:
- Set on target when hit: `target.hitPunchScaleEndTime = now + COMBAT.HIT_PUNCH_DURATION`
- Duration: `HIT_PUNCH_DURATION = 150ms`

**Renderer**:
- Check: `wallNow < entity.hitPunchScaleEndTime`
- Calculate angle: `Math.atan2(entity.vy, entity.vx)` (or use facing if speed < threshold)
- Transform:
  ```typescript
  ctx.translate(entity.x, entity.y);
  ctx.rotate(angle);
  ctx.scale(LUNGE_SQUASH_SCALE_X, LUNGE_SQUASH_SCALE_Y); // 0.9, 1.1
  ctx.rotate(-angle);
  ctx.translate(-entity.x, -entity.y);
  ```
- Draw entity with transform
- Restore transform

---

### 3.4 Lunge Stretch (Attack Animation)

**State**:
```typescript
lungeStartTime?: number;
lungeVx?: number;
lungeVy?: number;
```

**Logic**:
- Set when attack starts: `attacker.lungeStartTime = now`
- Apply velocity burst: `attacker.vx += dx * COMBAT.LUNGE_STRENGTH`, same for `vy`
- Decay each frame: `lungeVx *= COMBAT.LUNGE_DECAY` (0.85)
- Clear when decayed: `if (Math.abs(lungeVx) < 0.1) lungeStartTime = undefined`
- Duration: `LUNGE_STRETCH_DURATION_MS = 120ms`

**Renderer**:
- Check: `wallNow < (entity.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS`
- Calculate angle from velocity
- Transform:
  ```typescript
  ctx.translate(entity.x, entity.y);
  ctx.rotate(angle);
  ctx.scale(LUNGE_STRETCH_SCALE_X, LUNGE_STRETCH_SCALE_Y); // 1.2, 0.85
  ctx.rotate(-angle);
  ctx.translate(-entity.x, -entity.y);
  ```
- Draw entity with transform
- Restore transform

**State Machine**:
- Only apply ONE transform per frame: prefer hit squash over lunge stretch
- Ensure transforms are mutually exclusive

---

### 3.5 Time Base Consistency

**Critical**: All combat animation timers use `performance.now()` consistently

- Game loop: Set timers with `performance.now()`
- Renderer: Check timers with `performance.now()` (store as `wallNow`)
- Never mix `currentTime` (game-relative) with `performance.now()` (wall-clock)

---

## System 4: Body Collision & Separation

### 4.1 Body Radius

**Constant**:
```typescript
COLLISION.BODY_RADIUS_RATIO = 0.4; // 40% of size
```

**Function** (`canvas-collision.ts`):
```typescript
getBodyRadius(size: number): number {
  return size * COLLISION.BODY_RADIUS_RATIO;
}
```

---

### 4.2 Separation Function

**Interface** (`canvas-collision.ts`):
```typescript
interface BodyEntity {
  x: number;
  y: number;
  size: number;
}
```

**Function** (`canvas-collision.ts`):
```typescript
resolveBodyOverlap(a: BodyEntity, b: BodyEntity): void {
  const aR = getBodyRadius(a.size);
  const bR = getBodyRadius(b.size);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = aR + bR;
  
  if (dist >= minDist || dist < 1e-6) return;
  
  const overlap = minDist - dist;
  const axisX = dx / dist;
  const axisY = dy / dist;
  const half = overlap * 0.5;
  
  a.x -= axisX * half;
  a.y -= axisY * half;
  b.x += axisX * half;
  b.y += axisY * half;
}
```

---

### 4.3 Separation Pass

**Game Loop** (`canvas-game-loop.ts`):
- Run AFTER all movement updates, BEFORE combat
- Player vs all fish:
  ```typescript
  const bodyPlayer = { x: player.x, y: player.y, size: player.size };
  for (const fish of state.fish) {
    if (fish.opacity < 1 || fish.lifecycleState === 'removed') continue;
    resolveBodyOverlap(bodyPlayer, fish);
  }
  player.x = bodyPlayer.x;
  player.y = bodyPlayer.y;
  ```
- Fish vs fish (all pairs):
  ```typescript
  for (let i = 0; i < state.fish.length; i++) {
    const fishA = state.fish[i];
    if (fishA.opacity < 1 || fishA.lifecycleState === 'removed') continue;
    for (let j = i + 1; j < state.fish.length; j++) {
      const fishB = state.fish[j];
      if (fishB.opacity < 1 || fishB.lifecycleState === 'removed') continue;
      resolveBodyOverlap(fishA, fishB);
    }
  }
  ```

---

## System 5: Targeting & Homing

### 5.1 Player Homing (Facing-Based)

**Logic** (`canvas-game-loop.ts`):
- Only when `player.isDashing`
- Find nearest fish where:
  - `dist <= closeRange` (`AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fishHeadR)`)
  - `facingDot > 0.2` (player facing fish: `dx * (player.facingRight ? 1 : -1)`)
  - `f.size < player.size` (only smaller prey)
- Blend velocity: `60% toward target, 40% current direction`
- Snap facing when very close: `if (nearestDist < playerHeadR * 2) player.facingRight = nearestDx > 0`

**Constant**:
```typescript
COMBAT.AUTO_AIM_CLOSE_RANGE_MULT = 1.5;
```

---

### 5.2 Bite-Time Lock-On

**Logic** (`canvas-game-loop.ts`):
- When attack connects in `resolveAttack()`:
  ```typescript
  attacker.facingRight = (target.x - attacker.x) > 0;
  ```
- Provides Hungry Shark-style bite assist
- No continuous steering, just one-time snap

---

### 5.3 AI Homing

**Predators**:
- When chasing target and `distToTarget <= closeRange`:
  - `fish.facingRight = (targetX - fish.x) > 0`

**Prey**:
- When fleeing and `nearestThreatDist <= closeRange`:
  - `fish.facingRight = fish.vx > 0` (match flee direction)

---

## System 6: AI Behavior

### 6.1 Prey Flee Logic

**State** (`FishEntity`):
```typescript
fleeFromId?: string;      // Entity ID or 'player'
fleeFromUntil?: number;   // Timestamp
```

**Logic**:
- Prey flees when:
  - `player.size > fish.size * 1.2` (larger predator), OR
  - `now < fish.fleeFromUntil && fish.fleeFromId === attackerId` (hit by attacker)
- Set on hit:
  ```typescript
  if (target.type === 'prey') {
    target.fleeFromId = attacker.id; // or 'player'
    target.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;
  }
  ```

**Constant**:
```typescript
AI.PREY_FLEE_AFTER_HIT_MS = 5000; // 5 seconds
```

---

### 6.2 Larger Prey Counterattack Prevention

**Logic** (`canvas-game-loop.ts`):
- When both player and larger prey are dashing:
  ```typescript
  if (bothDashing && fish.type === 'prey' && player.size < fish.size) {
    const fishResult = applyPlayerFishAttack(player, fish, ...);
    // Skip fish's attack on player
    const playerResult = null;
    if (fishResult && fish.type === 'prey') {
      fish.fleeFromId = 'player';
      fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;
    }
  }
  ```

---

## System 7: Chunk Collection

### 7.1 Chunk Eating Animation

**State** (`PlayerEntity`):
```typescript
chunkEatEndTime?: number;
lastChunkEatTime?: number;
```

**Logic** (`canvas-game-loop.ts`):
- In `checkChunkCollection()` callback:
  ```typescript
  onChunkCollected: (chunk) => {
    // Cooldown check
    if (now - (player.lastChunkEatTime ?? 0) < COMBAT.CHUNK_EAT_COOLDOWN_MS) return;
    
    player.chunkEatEndTime = performance.now() + COMBAT.CHUNK_EAT_DURATION_MS;
    player.lastChunkEatTime = now;
    
    // Small lunge toward chunk
    const dx = chunk.x - player.x;
    const dy = chunk.y - player.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    player.vx += (dx / d) * COMBAT.CHUNK_LUNGE_STRENGTH;
    player.vy += (dy / d) * COMBAT.CHUNK_LUNGE_STRENGTH;
  }
  ```

**Renderer**:
- Check: `wallNow < player.chunkEatEndTime`
- Apply scale: `1.05x` during chunk eat

**Constants**:
```typescript
COMBAT.CHUNK_EAT_DURATION_MS = 300;
COMBAT.CHUNK_LUNGE_STRENGTH = 0.3;
COMBAT.CHUNK_EAT_COOLDOWN_MS = 400;
```

---

### 7.2 Damage & Essence Numbers

**Particles**:
- Damage numbers: Push `ChompParticle` with `floatUp: true` when attack connects
- Essence numbers: Push `ChompParticle` with `"+N EssenceType"` when chunk collected
- Format: `{ x, y, life, scale, text, color, floatUp: true }`

---

## System 8: Health Bars

### 8.1 AI Fish Health Bars

**NEW REQUIREMENT**: Show health bars on AI fish when they take damage

**Logic**:
- Show health bar when:
  - `fish.health < fish.maxHealth` (has taken damage), OR
  - `wallNow < fish.hitFlashEndTime` (recently hit)
- Position: Above fish (offset by size)
- Size: Width scales with `fish.size`, height fixed
- Color: Red (damaged), green (full health)
- Fade out after: 3-5 seconds of no damage

**Renderer** (`canvas-renderer.ts`):
- After drawing fish, if health bar should show:
  ```typescript
  const healthPercent = fish.health / fish.maxHealth;
  const barWidth = fish.size * 0.8;
  const barHeight = 4;
  const barX = fish.x - barWidth / 2;
  const barY = fish.y - fish.size / 2 - 10;
  
  // Background (red)
  ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Health (green)
  ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
  ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  ```

---

### 8.2 Player Health Bar

**NEW REQUIREMENT**: Show player health bar above stamina bar

**UI Component**:
- Add health bar above existing stamina bar
- Position: Above stamina bar in HUD
- Style: Match stamina bar style
- Show: Always visible in game mode

**Renderer** (`canvas-renderer.ts` or UI component):
```typescript
const healthPercent = player.health / player.maxHealth;
const barWidth = 200; // Match stamina bar
const barHeight = 8;
const barX = 20; // Match stamina bar
const barY = 60; // Above stamina bar

// Background
ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
ctx.fillRect(barX, barY, barWidth, barHeight);

// Health
ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

// Label
ctx.fillStyle = 'white';
ctx.font = '12px sans-serif';
ctx.fillText('Health', barX, barY - 2);
```

---

## System 9: Constants Summary

**File**: `lib/game/canvas-constants.ts`

```typescript
// Player
export const PLAYER_BASE_MAX_HEALTH = 30;

// Collision
export const COLLISION = {
  HEAD_RADIUS_RATIO: 0.25,
  BODY_RADIUS_RATIO: 0.4,
  // ...
};

// Combat
export const COMBAT = {
  HIT_FLASH_DURATION: 200,
  HIT_PUNCH_SCALE: 1.15,
  HIT_PUNCH_DURATION: 150,
  ATTACK_FLASH_DURATION: 150,
  ATTACK_COOLDOWN_MS: 400,
  LUNGE_STRENGTH: 0.8,
  LUNGE_DECAY: 0.85,
  LUNGE_STRETCH_DURATION_MS: 120,
  LUNGE_STRETCH_SCALE_X: 1.2,
  LUNGE_STRETCH_SCALE_Y: 0.85,
  LUNGE_SQUASH_SCALE_X: 0.9,
  LUNGE_SQUASH_SCALE_Y: 1.1,
  AUTO_AIM_CLOSE_RANGE_MULT: 1.5,
  CHUNK_EAT_DURATION_MS: 300,
  CHUNK_LUNGE_STRENGTH: 0.3,
  CHUNK_EAT_COOLDOWN_MS: 400,
} as const;

// AI
export const AI = {
  PREY_FLEE_AFTER_HIT_MS: 5000,
  // ...
} as const;
```

---

## Implementation Order

1. **Phase 1: Core Combat**
   - Add health properties to entities
   - Create `combat.ts` module
   - Replace stamina combat with health combat
   - Add attack cooldowns

2. **Phase 2: Death Sequence**
   - Create `carcass.ts` module
   - Create `essence-chunks.ts` module
   - Integrate death flow (spawn carcass/chunks)
   - Add sprite loading

3. **Phase 3: Visual Feedback**
   - Implement hit flash (red tint)
   - Implement attack flash (white tint)
   - Implement hit punch (squash)
   - Implement lunge stretch
   - Fix time base consistency

4. **Phase 4: Body Collision**
   - Add body radius constant
   - Implement separation function
   - Add separation pass to game loop

5. **Phase 5: Targeting**
   - Implement facing-based player homing
   - Add bite-time lock-on
   - Update AI homing

6. **Phase 6: AI Behavior**
   - Implement prey flee-on-hit
   - Prevent larger prey counterattack

7. **Phase 7: Chunk Collection**
   - Add chunk eating animation
   - Add damage/essence numbers
   - Implement player growth from chunks

8. **Phase 8: Health Bars**
   - Add AI fish health bars
   - Add player health bar UI

9. **Phase 9: Polish**
   - Fix sprite magenta issues
   - Add sprite refresh listeners
   - Balance tuning

---

## File Structure

```
lib/game/
├── combat.ts                    # NEW: Combat resolution
├── carcass.ts                   # NEW: Carcass system
├── essence-chunks.ts            # NEW: Essence chunks system
├── canvas-state.ts              # MODIFY: Add health, carcass/chunk arrays
├── canvas-constants.ts           # MODIFY: Add combat constants
├── canvas-game-loop.ts           # MODIFY: Health combat, carcass/chunks, separation
├── canvas-renderer.ts            # MODIFY: Visual feedback, carcass/chunks, health bars
├── canvas-collision.ts           # MODIFY: Add body separation
├── canvas-spawn-sync.ts          # MODIFY: Initialize fish health
└── combat-states.ts              # MODIFY: Add 'dying' state

components/
├── FishEditorCanvas.tsx          # MODIFY: Sprite refresh listener
└── SpriteGenerationLab.tsx       # MODIFY: Save buttons for carcass/chunks

scripts/
├── analyze-creature-stats.ts    # NEW: Stats analysis
└── patch-creature-stats.ts      # NEW: Stats patching
```

---

## Testing Checklist

- [ ] Health-based combat works (fish die when health ≤ 0)
- [ ] Carcass spawns on death
- [ ] Chunks spawn from fish essence
- [ ] Chunks can be collected
- [ ] Player grows when collecting chunks
- [ ] Carcass fades when chunks collected
- [ ] Hit flash (red tint) appears on damage
- [ ] Attack flash (white tint) appears on attack
- [ ] Hit punch (squash) animation works
- [ ] Lunge stretch animation works
- [ ] Body separation prevents overlap
- [ ] Player homing only on facing targets
- [ ] Bite-time lock-on works
- [ ] Prey flee after being hit
- [ ] Larger prey don't counterattack
- [ ] Attack cooldowns prevent spam
- [ ] Damage numbers show on hit
- [ ] Essence numbers show on chunk collect
- [ ] AI health bars show when damaged
- [ ] Player health bar displays correctly
- [ ] Sprites load correctly (no magenta)
- [ ] Sprite refresh works

---

## Notes

- All combat timers use `performance.now()` for consistency
- Transforms are mutually exclusive (one per frame)
- Body separation runs after movement, before combat
- Death sequence: health ≤ 0 → remove → spawn carcass → spawn chunks
- Essence only from collecting chunks, not instant on death
- Player growth from chunks is a new requirement to implement
