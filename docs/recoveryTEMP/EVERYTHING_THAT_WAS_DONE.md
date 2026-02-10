# Everything That Was Done - Combat System Overhaul

## Overview

This document catalogs every feature, change, and iteration that occurred during the combat system overhaul conversation. This is a comprehensive record for reference, not a clean implementation guide.

---

## Phase 1: Core Combat System Transition

### 1.1 Health-Based Combat System

**Goal**: Transition from stamina-only combat to health-based combat where "attack lowers health → health ≤ 0 means death"

**Changes Made**:
- Added `health` and `maxHealth` properties to `FishEntity` and `PlayerEntity` in `canvas-state.ts`
- Created `lib/game/combat.ts` module with:
  - `resolveAttack(attacker, target, options)` function
  - `computeHealthDamage()` function with size-based scaling
  - Damage formula: `baseDamage * (attacker.size / 40) * sizeRatioMultiplier`
  - Size ratio multipliers:
    - `≥ 1.5`: ramps from 1.5 to 3.0 (linear: 1.5 + min(sizeRatio - 1.5, 1.5))
    - `≥ 1.2`: 1.2x multiplier
    - `< 0.8`: 0.5x multiplier
- Removed all instant "eat whole" logic based solely on size ratios
- All combat now goes through `resolveAttack()` → health damage → death check

**Files Modified**:
- `lib/game/canvas-state.ts` - Added health properties
- `lib/game/combat.ts` - New file with combat resolution
- `lib/game/canvas-game-loop.ts` - Replaced stamina-based combat with health-based
- `lib/game/canvas-spawn-sync.ts` - Initialize health when spawning fish

**Constants Added**:
- `PLAYER_BASE_MAX_HEALTH = 30` in `canvas-constants.ts`
- `COMBAT` object with various timing constants

---

### 1.2 Death Sequence: Carcass & Essence Chunks

**Goal**: Replace instant "eaten" with physical carcass and collectible chunks

**Changes Made**:
- Created `lib/game/carcass.ts` module:
  - `CarcassEntity` type with position, spawnTime, opacity, carcassId
  - `spawnCarcass(state, position, options)` function
  - `updateCarcasses(state, now)` - handles decay and fade
  - `drawCarcasses(ctx, carcasses, ...)` - rendering
  - `preloadCarcassSprite()` - loads shared sprite from Sprite Lab
  - `setCarcassRemainingChunks()` / `decrementCarcassChunks()` - tracks chunk count
- Created `lib/game/essence-chunks.ts` module:
  - `ChunkEntity` type with position, essenceType, carcassId, spawnTime
  - `spawnChunksFromFish(state, deadFish, ...)` - creates chunks from fish essence
  - `updateChunks(state, now)` - updates chunk lifetime
  - `checkChunkCollection(state, player, callbacks)` - handles collection
  - `drawChunks(ctx, chunks, ...)` - rendering
  - `preloadChunkSprites()` - loads shared sprites
- Added `carcasses: CarcassEntity[]` and `chunks: ChunkEntity[]` to `CanvasGameState`
- Death flow: health ≤ 0 → remove fish → spawn carcass → spawn chunks → collect chunks → carcass fades when chunks gone

**Files Created**:
- `lib/game/carcass.ts`
- `lib/game/essence-chunks.ts`

**Files Modified**:
- `lib/game/canvas-state.ts` - Added carcass/chunk arrays
- `lib/game/canvas-game-loop.ts` - Spawn carcass/chunks on death, update/check each frame
- `lib/game/canvas-renderer.ts` - Draw carcasses and chunks
- `components/FishEditorCanvas.tsx` - Pass carcasses/chunks to renderer, sprite refresh listener

**Sprite Lab Integration**:
- Added "Save" buttons to Carcass & Meat Chunks and Essence Type Chunks sections in `SpriteGenerationLab.tsx`
- Sprites saved to IndexedDB as shared sprites (`'carcass'`, `'meatOrb'`, `'essence_${essenceId}'`)
- Event listener for `refreshSharedSprites` event to invalidate caches and reload sprites

---

### 1.3 Visual Combat Feedback

**Goal**: Add visual impact to hits, attacks, and death without relying on sprite swap system

**Changes Made**:

#### Hit Flash (Red Tint)
- Added `hitFlashEndTime?: number` to `FishEntity` and `PlayerEntity`
- Set on target when taking damage: `target.hitFlashEndTime = now + COMBAT.HIT_FLASH_DURATION`
- Renderer: Uses `ctx.globalCompositeOperation = 'multiply'` with red color for tint effect
- Duration: 200ms

#### Attack Flash (White Tint)
- Added `attackFlashEndTime?: number` to entities
- Set on attacker when attack connects: `attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION`
- Renderer: Uses `ctx.globalCompositeOperation = 'screen'` with white color
- Duration: 150ms

#### Hit Punch (Squash Animation)
- Added `hitPunchScaleEndTime?: number` to entities
- Set on target when hit: `target.hitPunchScaleEndTime = now + COMBAT.HIT_PUNCH_DURATION`
- Renderer: Applies squash transform (scale X: 0.9, Y: 1.1) along movement angle
- Duration: 150ms
- Scale: `LUNGE_SQUASH_SCALE_X: 0.9`, `LUNGE_SQUASH_SCALE_Y: 1.1`

#### Lunge Stretch (Attack Animation)
- Added `lungeStartTime?: number`, `lungeVx?: number`, `lungeVy?: number` to entities
- Set when attack starts: `attacker.lungeStartTime = now`, velocity burst applied
- Renderer: Applies stretch transform (scale X: 1.2, Y: 0.85) along movement angle
- Duration: 120ms
- Scale: `LUNGE_STRETCH_SCALE_X: 1.2`, `LUNGE_STRETCH_SCALE_Y: 0.85`
- Lunge velocity decays over time: `lungeVx *= COMBAT.LUNGE_DECAY` (0.85 per frame)

#### State Machine Fixes
- Fixed time base mismatch: combat timers use `performance.now()` in both game loop and renderer
- Made transforms mutually exclusive: only one transform per frame (prefer hit squash over lunge stretch)
- Clear `lungeStartTime` when lunge ends to prevent stale state

**Constants Added**:
```typescript
COMBAT = {
  HIT_FLASH_DURATION: 200,
  HIT_PUNCH_SCALE: 1.15,
  HIT_PUNCH_DURATION: 150,
  ATTACK_FLASH_DURATION: 150,
  LUNGE_STRENGTH: 0.8,
  LUNGE_DECAY: 0.85,
  LUNGE_STRETCH_DURATION_MS: 120,
  LUNGE_STRETCH_SCALE_X: 1.2,
  LUNGE_STRETCH_SCALE_Y: 0.85,
  LUNGE_SQUASH_SCALE_X: 0.9,
  LUNGE_SQUASH_SCALE_Y: 1.1,
  // ... more constants
}
```

---

### 1.4 Attack Cooldowns

**Goal**: Prevent all attacks from being calculated in one frame

**Changes Made**:
- Added `lastBiteTime?: number` to `PlayerEntity`
- Attack cooldown: `COMBAT.ATTACK_COOLDOWN_MS = 400`
- Check before attack: `now - player.lastBiteTime > COMBAT.ATTACK_COOLDOWN_MS`
- Set after attack: `player.lastBiteTime = now`

---

### 1.5 Damage & Essence Numbers

**Goal**: Show floating damage numbers on hits and essence amounts on chunk collection

**Changes Made**:
- Damage numbers: Push `ChompParticle` with `floatUp: true` when attack connects
- Essence numbers: Push `ChompParticle` with essence type and amount when chunk collected
- Particles render with rise animation and fade out
- Format: `"+N EssenceType"` for chunks, damage number for hits

---

## Phase 2: Movement & Targeting Improvements

### 2.1 Body Collision & Separation

**Goal**: Prevent fish/player bodies from overlapping (Unity-style body colliders)

**Changes Made**:
- Added `BODY_RADIUS_RATIO: 0.4` to `COLLISION` constants (40% of size)
- Created `getBodyRadius(size)` function in `canvas-collision.ts`
- Created `BodyEntity` interface and `resolveBodyOverlap(a, b)` function
- Separation runs after movement each frame:
  - Player vs all fish
  - Fish vs fish (all pairs)
- Head colliders remain unchanged for combat detection

**Files Modified**:
- `lib/game/canvas-constants.ts` - Added `BODY_RADIUS_RATIO`
- `lib/game/canvas-collision.ts` - Added body separation functions
- `lib/game/canvas-game-loop.ts` - Added separation pass after movement

---

### 2.2 Homing & Auto-Aim

**Goal**: Improve targeting feel, prevent getting stuck, allow escaping predators

**Changes Made**:

#### Player Homing
- Only home onto targets the player is facing: `facingDot = dx * (player.facingRight ? 1 : -1)`
- Only home onto smaller prey: `f.size < player.size`
- Close range multiplier: `AUTO_AIM_CLOSE_RANGE_MULT = 1.5`
- Blend velocity 60% toward target when in range
- Snap facing when very close: `nearestDist < playerHeadR * 2`

#### AI Homing
- Predators: Snap facing toward target when in close range
- Prey: Snap facing to match flee direction when threatened and in close range

#### Bite-Time Lock-On
- When attack connects, snap attacker facing toward target: `attacker.facingRight = (target.x - attacker.x) > 0`
- Provides Hungry Shark-style bite assist without continuous steering

**Constants Added**:
- `COMBAT.AUTO_AIM_CLOSE_RANGE_MULT: 1.5`

---

### 2.3 Attack Size Restrictions Removed

**Goal**: Remove size-based restrictions that prevented attacking

**Changes Made**:
- Removed `ATTACK_SIZE_RATIO` check for player attacks
- Changed from `player.size > fish.size * ATTACK_SIZE_RATIO` to `player.size > fish.size`
- Fish-vs-player still uses size ratio to prevent slightly-larger fish from attacking player

---

## Phase 3: AI Behavior Refinements

### 3.1 Prey Flee Logic

**Goal**: Prey should flee when attacked, not just when predator is nearby

**Changes Made**:
- Added `fleeFromId?: string` and `fleeFromUntil?: number` to `FishEntity`
- Prey only flees when:
  - Player is larger (`player.size > fish.size * 1.2`), OR
  - Prey has been hit by attacker (`fleeFromId` matches and `now < fleeFromUntil`)
- Set `fleeFromId` and `fleeFromUntil` when prey takes damage
- Duration: `AI.PREY_FLEE_AFTER_HIT_MS = 5000` (5 seconds)

**Constants Added**:
- `AI.PREY_FLEE_AFTER_HIT_MS: 5000`

**Files Modified**:
- `lib/game/canvas-state.ts` - Added flee fields
- `lib/game/canvas-game-loop.ts` - Set flee state on hit, check in prey AI

---

### 3.2 Larger Prey Counterattack Prevention

**Goal**: Prevent larger fleeing prey from killing the player

**Changes Made**:
- When both player and larger prey are dashing:
  - Apply player's attack on prey
  - Skip prey's attack on player (`playerResult = null`)
  - Set prey's `fleeFromId` when hit

---

## Phase 4: Chunk Collection Improvements

### 4.1 Chunk Eating Animation

**Goal**: Add impact and agency to chunk collection

**Changes Made**:
- Added `chunkEatEndTime?: number` and `lastChunkEatTime?: number` to `PlayerEntity`
- Chunk collection triggers:
  - `chunkEatEndTime = now + COMBAT.CHUNK_EAT_DURATION_MS`
  - Small lunge toward chunk: `player.vx += (dx/d) * COMBAT.CHUNK_LUNGE_STRENGTH`
  - Cooldown: `COMBAT.CHUNK_EAT_COOLDOWN_MS = 400`
- Renderer: Apply scale transform during chunk eat (1.05x)

**Constants Added**:
- `COMBAT.CHUNK_EAT_DURATION_MS: 300`
- `COMBAT.CHUNK_LUNGE_STRENGTH: 0.3`
- `COMBAT.CHUNK_EAT_COOLDOWN_MS: 400`

---

## Phase 5: Bug Fixes & Polish

### 5.1 Fish Health Initialization Bug

**Problem**: Fish created via `canvas-spawn-sync.ts` had no health, making them immortal

**Fix**:
- Added `health` and `maxHealth` initialization in `canvas-spawn-sync.ts`
- Changed combat to always write health back (removed `'health' in target` check)

---

### 5.2 Squash/Stretch Warping Bug

**Problem**: Fish stayed warped after animations due to time base mismatch

**Fix**:
- Use `performance.now()` consistently in both game loop and renderer
- Made transforms mutually exclusive (only one per frame)
- Clear `lungeStartTime` when lunge ends

---

### 5.3 Flash Blob Visual Issue

**Problem**: Hit/attack flashes appeared as gray/white blobs instead of sprite tints

**Fix**:
- Changed from solid ellipse overlay to composite blend modes:
  - Hit flash: `ctx.globalCompositeOperation = 'multiply'` (red tint)
  - Attack flash: `ctx.globalCompositeOperation = 'screen'` (white tint)
- Removed visible ellipse shape

---

### 5.4 Carcass/Chunk Sprite Magenta Issue

**Problem**: Carcass and chunk sprites had magenta backgrounds

**Fix**:
- Applied `removeBackground()` function to carcass and chunk sprites (same as fish)
- Uses corner-based background detection and alpha feathering

---

## Phase 6: Game Balance & Stats

### 6.1 Creature Stats Analysis Script

**Goal**: Analyze and normalize creature stats for consistent combat

**Changes Made**:
- Created `scripts/analyze-creature-stats.ts`:
  - Fetches creatures from blob storage (or uses snapshot)
  - Normalizes stats using `normalizeCreature()` from loader
  - Computes min/max/mean for size, health, damage
  - Suggests normalized values: health 20, damage 4 (prey), 6 (predator), 5 (mutant)
  - Outputs `docs/plans/CREATURE_STATS_ANALYSIS.md` and `scripts/creature-stats-analysis.json`

**Files Created**:
- `scripts/analyze-creature-stats.ts`

---

### 6.2 Creature Stats Patch Script

**Goal**: Apply normalized stats to blob-stored creatures

**Changes Made**:
- Created `scripts/patch-creature-stats.ts`:
  - Reads suggested values from `creature-stats-analysis.json`
  - Fetches creatures from `/api/list-creatures`
  - Updates `stats.health` and `stats.damage` via `/api/save-creature`
  - Supports `--dry-run` flag
  - Applied to 37 creatures (30 already equal, 0 failed)

**Files Created**:
- `scripts/patch-creature-stats.ts`

**Documentation**:
- Added section to `scripts/README.md` explaining both scripts

---

### 6.3 Player Health Tuning

**Goal**: Big predators should kill player in 1-2 chomps

**Changes Made**:
- Lowered `PLAYER_BASE_MAX_HEALTH` from 100 to 30
- Updated player initialization and reset to use constant

---

## Phase 7: UI & Integration

### 7.1 Sprite Lab Save Buttons

**Changes Made**:
- Added "Save" buttons to Carcass & Meat Chunks section
- Added "Save" buttons to Essence Type Chunks section
- Buttons save sprites to IndexedDB and dispatch `refreshSharedSprites` event

**Files Modified**:
- `components/SpriteGenerationLab.tsx`

---

### 7.2 Sprite Refresh Event Listener

**Changes Made**:
- Added `useEffect` listener for `refreshSharedSprites` event in `FishEditorCanvas.tsx`
- Invalidates sprite caches and reloads carcass/chunk sprites
- Ensures UI updates reflect newly generated sprites

**Files Modified**:
- `components/FishEditorCanvas.tsx`

---

## Phase 8: Collision Module Cleanup

### 8.1 Remove Size-Based Eat Logic

**Goal**: Align collision module with health-based combat

**Changes Made**:
- Removed all size-based "eat" branches from `canvas-collision.ts`
- Removed `SWALLOW_SIZE_RATIO` import
- Added comment: "In game mode, combat and death are handled by the game loop"
- `detect*` functions now only detect overlap, don't perform removal

**Files Modified**:
- `lib/game/canvas-collision.ts`
- `lib/game/dash-constants.ts` - Documented `SWALLOW_SIZE_RATIO` as unused

---

## Phase 9: Combat States

### 9.1 Dying State

**Changes Made**:
- Added `'dying'` to `FishLifecycleState` enum
- Death flow: health ≤ 0 → set `lifecycleState = 'dying'` → delay removal → spawn carcass/chunks

**Files Modified**:
- `lib/game/combat-states.ts`

---

## Summary of New Files Created

1. `lib/game/combat.ts` - Combat resolution and damage calculation
2. `lib/game/carcass.ts` - Carcass spawning, update, rendering
3. `lib/game/essence-chunks.ts` - Essence chunk spawning, collection, rendering
4. `scripts/analyze-creature-stats.ts` - Stats analysis tool
5. `scripts/patch-creature-stats.ts` - Stats patching tool

---

## Summary of Major Constants Added

```typescript
// canvas-constants.ts
PLAYER_BASE_MAX_HEALTH = 30

COLLISION.BODY_RADIUS_RATIO = 0.4

COMBAT = {
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
}

AI.PREY_FLEE_AFTER_HIT_MS = 5000
```

---

## Iterations & Changes of Mind

1. **Attack Size Restrictions**: Initially removed completely, then refined to facing-based + size filter
2. **Homing**: Started with continuous velocity homing, changed to facing-based + bite-time lock-on
3. **Prey Flee**: Initially flee on dash proximity, changed to flee only after being hit
4. **Flash Implementation**: Started with ellipse overlays, changed to composite blend modes for tint effect
5. **Death Sequence**: Initially planned as "eaten", changed to carcass + chunks system mid-conversation

---

## Known Issues & Future Work

1. **Player Growth from Chunks**: Not implemented - player should grow when eating chunks
2. **Health Bars**: Not implemented - need health bars for AI fish when damaged and player health bar above stamina
3. **Chunk Eating Mechanic**: User wanted dash-to-eat with cooldown, but implementation was simpler (overlap-based)
4. **Sprite Swap System**: Still inconsistent, but visual feedback works around it

---

## Files Modified (Complete List)

1. `lib/game/canvas-state.ts`
2. `lib/game/canvas-constants.ts`
3. `lib/game/canvas-game-loop.ts`
4. `lib/game/canvas-renderer.ts`
5. `lib/game/canvas-collision.ts`
6. `lib/game/canvas-spawn-sync.ts`
7. `lib/game/combat-states.ts`
8. `lib/game/dash-constants.ts`
9. `components/FishEditorCanvas.tsx`
10. `components/SpriteGenerationLab.tsx`
11. `scripts/README.md`

---

## Files Created (Complete List)

1. `lib/game/combat.ts`
2. `lib/game/carcass.ts`
3. `lib/game/essence-chunks.ts`
4. `scripts/analyze-creature-stats.ts`
5. `scripts/patch-creature-stats.ts`
