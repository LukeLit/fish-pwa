# Implementation Plan - Combat System Overhaul

Based on `MASTER_DESIGN_DOCUMENT.md`, this plan breaks down implementation into logical phases with specific tasks.

---

## Phase 1: Core Health-Based Combat System

### Task 1.1: Add Health Properties to Entities
- [ ] Add `health?: number` and `maxHealth?: number` to `FishEntity` interface
- [ ] Add `health?: number` and `maxHealth?: number` to `PlayerEntity` interface
- [ ] Add `PLAYER_BASE_MAX_HEALTH = 30` constant to `canvas-constants.ts`
- [ ] Initialize player health in `CanvasGameState` constructor: `health: PLAYER_BASE_MAX_HEALTH, maxHealth: PLAYER_BASE_MAX_HEALTH`
- [ ] Initialize player health in `resetPlayer()`: same values
- [ ] Initialize fish health in `canvas-spawn-sync.ts`: `health: creature.stats?.health ?? 20, maxHealth: same`

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-spawn-sync.ts`

---

### Task 1.2: Create Combat Resolution Module
- [ ] Create `lib/game/combat.ts`
- [ ] Implement `sizeRatioDamageMultiplier(sizeRatio: number): number` function
- [ ] Implement `computeHealthDamage(attacker, target, options): number` function
- [ ] Implement `resolveAttack(attacker, target, options): { damage: number; died: boolean }` function
- [ ] Ensure health is always written back (no conditional checks)
- [ ] Return `died: newHealth <= 0`

**Files**: `lib/game/combat.ts` (new)

---

### Task 1.3: Replace Stamina Combat with Health Combat
- [ ] Import `resolveAttack` from `./combat` in `canvas-game-loop.ts`
- [ ] Replace fish-vs-fish stamina combat with `resolveAttack()` calls
- [ ] Replace player-vs-fish stamina combat with `resolveAttack()` calls
- [ ] Remove all size-based instant-remove logic
- [ ] Remove all `eatenIds.add()` calls based solely on size
- [ ] Check `result.died` to determine if entity should be removed

**Files**: `lib/game/canvas-game-loop.ts`

---

### Task 1.4: Add Attack Cooldowns
- [ ] Add `lastBiteTime?: number` to `PlayerEntity`
- [ ] Check cooldown before attack: `now - player.lastBiteTime > COMBAT.ATTACK_COOLDOWN_MS`
- [ ] Set `player.lastBiteTime = now` after attack
- [ ] Add `ATTACK_COOLDOWN_MS = 400` to `COMBAT` constants

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`

---

## Phase 2: Death Sequence (Carcass & Chunks)

### Task 2.1: Create Carcass Module
- [ ] Create `lib/game/carcass.ts`
- [ ] Define `CarcassEntity` interface
- [ ] Implement `spawnCarcass(state, position, options)` function
- [ ] Implement `updateCarcasses(state, now)` function (decay/fade logic)
- [ ] Implement `drawCarcasses(ctx, carcasses, ...)` function
- [ ] Implement `preloadCarcassSprite()` function (load from Sprite Lab)
- [ ] Implement `setCarcassRemainingChunks(state, carcassId, count)` function
- [ ] Implement `decrementCarcassChunks(state, carcassId)` function
- [ ] Export `CanvasStateWithCarcasses` type

**Files**: `lib/game/carcass.ts` (new)

---

### Task 2.2: Create Essence Chunks Module
- [ ] Create `lib/game/essence-chunks.ts`
- [ ] Define `ChunkEntity` interface
- [ ] Implement `spawnChunksFromFish(state, deadFish, position)` function
- [ ] Implement `updateChunks(state, now)` function
- [ ] Implement `checkChunkCollection(state, player, callbacks)` function
- [ ] Implement `drawChunks(ctx, chunks, ...)` function
- [ ] Implement `preloadChunkSprites()` function
- [ ] Apply `removeBackground()` to chunk sprites (fix magenta)

**Files**: `lib/game/essence-chunks.ts` (new)

---

### Task 2.3: Integrate Death Sequence
- [ ] Add `carcasses: CarcassEntity[]` to `CanvasGameState`
- [ ] Add `chunks: ChunkEntity[]` to `CanvasGameState`
- [ ] Initialize arrays in constructor and `resetForRun()`
- [ ] When `resolveAttack()` returns `died: true`:
  - [ ] Remove fish from `state.fish`
  - [ ] Call `spawnCarcass(state, { x, y }, { ... })`
  - [ ] Call `spawnChunksFromFish(state, deadFish, { x, y })`
- [ ] Each frame: call `updateCarcasses(state, now)`
- [ ] Each frame: call `updateChunks(state, now)`
- [ ] Each frame: call `checkChunkCollection(state, player, callbacks)`

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-game-loop.ts`

---

### Task 2.4: Render Carcasses & Chunks
- [ ] Import `drawCarcasses` and `drawChunks` in `canvas-renderer.ts`
- [ ] Call `drawCarcasses(ctx, state.carcasses, ...)` in render loop
- [ ] Call `drawChunks(ctx, state.chunks, ...)` in render loop
- [ ] Pass carcasses/chunks from `FishEditorCanvas.tsx` to renderer

**Files**: `lib/game/canvas-renderer.ts`, `components/FishEditorCanvas.tsx`

---

### Task 2.5: Sprite Loading & Refresh
- [ ] Call `preloadCarcassAndChunkSprites()` at level start
- [ ] Add `useEffect` listener for `refreshSharedSprites` event in `FishEditorCanvas.tsx`
- [ ] Invalidate sprite caches and reload on event
- [ ] Add "Save" buttons to Carcass & Meat Chunks section in `SpriteGenerationLab.tsx`
- [ ] Add "Save" buttons to Essence Type Chunks section
- [ ] Save sprites to IndexedDB and dispatch refresh event

**Files**: `components/FishEditorCanvas.tsx`, `components/SpriteGenerationLab.tsx`

---

### Task 2.6: Player Growth from Chunks
- [ ] Calculate growth amount in `checkChunkCollection()` callback
- [ ] Apply growth: `player.size += growthAmount`
- [ ] Clamp to `PLAYER_MAX_SIZE`
- [ ] Update `player.maxHealth` if health scales with size
- [ ] Trigger growth particle/VFX

**Files**: `lib/game/essence-chunks.ts`, `lib/game/canvas-game-loop.ts`

---

## Phase 3: Visual Combat Feedback

### Task 3.1: Hit Flash (Red Tint)
- [ ] Add `hitFlashEndTime?: number` to `FishEntity` and `PlayerEntity`
- [ ] Set on target when hit: `target.hitFlashEndTime = performance.now() + COMBAT.HIT_FLASH_DURATION`
- [ ] Add `HIT_FLASH_DURATION = 200` to `COMBAT` constants
- [ ] In renderer: check `wallNow < entity.hitFlashEndTime`
- [ ] Apply `ctx.globalCompositeOperation = 'multiply'`
- [ ] Fill red color over entity bounds: `rgba(255, 80, 80, 0.85)`
- [ ] Restore `ctx.globalCompositeOperation = 'source-over'`

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

### Task 3.2: Attack Flash (White Tint)
- [ ] Add `attackFlashEndTime?: number` to entities
- [ ] Set on attacker when attack connects: `attacker.attackFlashEndTime = performance.now() + COMBAT.ATTACK_FLASH_DURATION`
- [ ] Add `ATTACK_FLASH_DURATION = 150` to `COMBAT` constants
- [ ] In renderer: check `wallNow < entity.attackFlashEndTime`
- [ ] Apply `ctx.globalCompositeOperation = 'screen'`
- [ ] Fill white color over entity bounds: `rgba(255, 255, 255, 0.9)`
- [ ] Restore composite operation

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

### Task 3.3: Hit Punch (Squash Animation)
- [ ] Add `hitPunchScaleEndTime?: number` to entities
- [ ] Set on target when hit: `target.hitPunchScaleEndTime = performance.now() + COMBAT.HIT_PUNCH_DURATION`
- [ ] Add `HIT_PUNCH_DURATION = 150` and squash scale constants to `COMBAT`
- [ ] In renderer: check `wallNow < entity.hitPunchScaleEndTime`
- [ ] Calculate angle from velocity (or facing)
- [ ] Apply squash transform: `scale(0.9, 1.1)` along angle
- [ ] Draw entity with transform
- [ ] Restore transform

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

### Task 3.4: Lunge Stretch (Attack Animation)
- [ ] Add `lungeStartTime?: number`, `lungeVx?: number`, `lungeVy?: number` to entities
- [ ] Set when attack starts: `attacker.lungeStartTime = performance.now()`
- [ ] Apply velocity burst: `attacker.vx += dx * COMBAT.LUNGE_STRENGTH`
- [ ] Decay each frame: `lungeVx *= COMBAT.LUNGE_DECAY`
- [ ] Clear when decayed: `if (Math.abs(lungeVx) < 0.1) lungeStartTime = undefined`
- [ ] Add lunge constants to `COMBAT`
- [ ] In renderer: check `wallNow < (entity.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS`
- [ ] Apply stretch transform: `scale(1.2, 0.85)` along angle
- [ ] Draw entity with transform
- [ ] Restore transform
- [ ] Ensure only ONE transform per frame (prefer hit squash over lunge stretch)

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

### Task 3.5: Time Base Consistency
- [ ] Ensure all combat timers use `performance.now()` in game loop
- [ ] Use `performance.now()` (as `wallNow`) in renderer for all combat checks
- [ ] Never mix `currentTime` (game-relative) with `performance.now()`

**Files**: `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

## Phase 4: Body Collision & Separation

### Task 4.1: Body Radius Constant
- [ ] Add `BODY_RADIUS_RATIO = 0.4` to `COLLISION` constants

**Files**: `lib/game/canvas-constants.ts`

---

### Task 4.2: Separation Functions
- [ ] Add `getBodyRadius(size: number): number` function
- [ ] Add `BodyEntity` interface
- [ ] Add `resolveBodyOverlap(a: BodyEntity, b: BodyEntity): void` function

**Files**: `lib/game/canvas-collision.ts`

---

### Task 4.3: Separation Pass
- [ ] Import `resolveBodyOverlap` in `canvas-game-loop.ts`
- [ ] Add separation pass AFTER movement, BEFORE combat:
  - [ ] Player vs all fish
  - [ ] Fish vs fish (all pairs)
- [ ] Skip entities with `opacity < 1` or `lifecycleState === 'removed'`

**Files**: `lib/game/canvas-game-loop.ts`

---

## Phase 5: Targeting & Homing

### Task 5.1: Player Homing (Facing-Based)
- [ ] In player movement section, when `player.isDashing`:
  - [ ] Find nearest fish where:
    - [ ] `dist <= closeRange` (`AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fishHeadR)`)
    - [ ] `facingDot > 0.2` (`dx * (player.facingRight ? 1 : -1)`)
    - [ ] `f.size < player.size`
  - [ ] Blend velocity: `60% toward target, 40% current`
  - [ ] Snap facing when very close: `if (nearestDist < playerHeadR * 2) player.facingRight = nearestDx > 0`
- [ ] Add `AUTO_AIM_CLOSE_RANGE_MULT = 1.5` to `COMBAT` constants

**Files**: `lib/game/canvas-game-loop.ts`, `lib/game/canvas-constants.ts`

---

### Task 5.2: Bite-Time Lock-On
- [ ] When attack connects in `resolveAttack()`:
  - [ ] Set `attacker.facingRight = (target.x - attacker.x) > 0`

**Files**: `lib/game/canvas-game-loop.ts`

---

### Task 5.3: AI Homing
- [ ] Predators: When chasing and `distToTarget <= closeRange`, snap facing
- [ ] Prey: When fleeing and `nearestThreatDist <= closeRange`, snap facing to match velocity

**Files**: `lib/game/canvas-game-loop.ts`

---

## Phase 6: AI Behavior

### Task 6.1: Prey Flee Logic
- [ ] Add `fleeFromId?: string` and `fleeFromUntil?: number` to `FishEntity`
- [ ] Add `PREY_FLEE_AFTER_HIT_MS = 5000` to `AI` constants
- [ ] Prey flees when:
  - [ ] `player.size > fish.size * 1.2`, OR
  - [ ] `now < fish.fleeFromUntil && fish.fleeFromId === attackerId`
- [ ] Set `fleeFromId` and `fleeFromUntil` when prey takes damage

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`

---

### Task 6.2: Larger Prey Counterattack Prevention
- [ ] When both dashing and `fish.type === 'prey' && player.size < fish.size`:
  - [ ] Apply player's attack
  - [ ] Skip fish's attack (`playerResult = null`)
  - [ ] Set `fleeFromId` when hit

**Files**: `lib/game/canvas-game-loop.ts`

---

## Phase 7: Chunk Collection Polish

### Task 7.1: Chunk Eating Animation
- [ ] Add `chunkEatEndTime?: number` and `lastChunkEatTime?: number` to `PlayerEntity`
- [ ] Add chunk eat constants to `COMBAT`
- [ ] In `checkChunkCollection()` callback:
  - [ ] Check cooldown
  - [ ] Set `chunkEatEndTime`
  - [ ] Apply small lunge toward chunk
- [ ] In renderer: apply scale transform during chunk eat

**Files**: `lib/game/canvas-state.ts`, `lib/game/canvas-constants.ts`, `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

### Task 7.2: Damage & Essence Numbers
- [ ] Push `ChompParticle` with `floatUp: true` when attack connects (damage number)
- [ ] Push `ChompParticle` with essence info when chunk collected (essence number)
- [ ] Ensure particles render with rise animation and fade

**Files**: `lib/game/canvas-game-loop.ts`, `lib/game/canvas-renderer.ts`

---

## Phase 8: Health Bars

### Task 8.1: AI Fish Health Bars
- [ ] Show health bar when:
  - [ ] `fish.health < fish.maxHealth`, OR
  - [ ] `wallNow < fish.hitFlashEndTime`
- [ ] Position: Above fish (offset by size)
- [ ] Render: Red background, green health fill
- [ ] Fade out after 3-5 seconds of no damage

**Files**: `lib/game/canvas-renderer.ts`

---

### Task 8.2: Player Health Bar
- [ ] Add health bar above stamina bar in HUD
- [ ] Position: Above stamina bar
- [ ] Style: Match stamina bar
- [ ] Show: Always visible in game mode
- [ ] Render: Red background, green health fill, label

**Files**: `lib/game/canvas-renderer.ts` or UI component

---

## Phase 9: Cleanup & Polish

### Task 9.1: Collision Module Cleanup
- [ ] Remove size-based "eat" branches from `canvas-collision.ts`
- [ ] Remove `SWALLOW_SIZE_RATIO` import
- [ ] Add comment: "In game mode, combat and death are handled by the game loop"
- [ ] Document `SWALLOW_SIZE_RATIO` as unused in `dash-constants.ts`

**Files**: `lib/game/canvas-collision.ts`, `lib/game/dash-constants.ts`

---

### Task 9.2: Combat States
- [ ] Add `'dying'` to `FishLifecycleState` enum (if needed for delayed removal)

**Files**: `lib/game/combat-states.ts`

---

### Task 9.3: Testing & Bug Fixes
- [ ] Test all features from testing checklist
- [ ] Fix any bugs discovered
- [ ] Tune constants for balance
- [ ] Verify sprite loading works correctly

---

## Constants Checklist

Ensure all constants are added to `lib/game/canvas-constants.ts`:

- [ ] `PLAYER_BASE_MAX_HEALTH = 30`
- [ ] `COLLISION.BODY_RADIUS_RATIO = 0.4`
- [ ] `COMBAT.HIT_FLASH_DURATION = 200`
- [ ] `COMBAT.HIT_PUNCH_SCALE = 1.15`
- [ ] `COMBAT.HIT_PUNCH_DURATION = 150`
- [ ] `COMBAT.ATTACK_FLASH_DURATION = 150`
- [ ] `COMBAT.ATTACK_COOLDOWN_MS = 400`
- [ ] `COMBAT.LUNGE_STRENGTH = 0.8`
- [ ] `COMBAT.LUNGE_DECAY = 0.85`
- [ ] `COMBAT.LUNGE_STRETCH_DURATION_MS = 120`
- [ ] `COMBAT.LUNGE_STRETCH_SCALE_X = 1.2`
- [ ] `COMBAT.LUNGE_STRETCH_SCALE_Y = 0.85`
- [ ] `COMBAT.LUNGE_SQUASH_SCALE_X = 0.9`
- [ ] `COMBAT.LUNGE_SQUASH_SCALE_Y = 1.1`
- [ ] `COMBAT.AUTO_AIM_CLOSE_RANGE_MULT = 1.5`
- [ ] `COMBAT.CHUNK_EAT_DURATION_MS = 300`
- [ ] `COMBAT.CHUNK_LUNGE_STRENGTH = 0.3`
- [ ] `COMBAT.CHUNK_EAT_COOLDOWN_MS = 400`
- [ ] `AI.PREY_FLEE_AFTER_HIT_MS = 5000`

---

## Notes

- Implement in order: each phase builds on the previous
- Test after each phase before moving to the next
- Use `performance.now()` consistently for all combat timers
- Keep transforms mutually exclusive (one per frame)
- Body separation runs after movement, before combat
- Death sequence: health ≤ 0 → remove → spawn carcass → spawn chunks
- Essence only from collecting chunks
- Player growth from chunks is a new requirement
