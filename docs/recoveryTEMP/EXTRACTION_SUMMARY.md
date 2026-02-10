# Code Extraction Summary

## Overview

Successfully extracted **129 code snippets** from **25 files** in the copypasta transcript. The extraction prioritizes the most recent snippets when there's overlap, ensuring you get the final state of each code change.

## Output Files

1. **`extracted-code-snippets-v2.md`** - Main extraction output (107 KB)
   - Organized by file
   - Shows merged code (prioritizing most recent)
   - Includes context and individual snippets for reference

2. **`extract-code-snippets-v2.ts`** - Extraction script (can be rerun if needed)

## Files Extracted

### Core Game Files (most changes)
- `canvas-game-loop.ts` - 32 snippets (combat logic, homing, body separation, etc.)
- `canvas-renderer.ts` - 19 snippets (visual effects, flashes, squash/stretch)
- `canvas-state.ts` - 14 snippets (health, carcasses, chunks, flee logic)
- `essence-chunks.ts` - 13 snippets (chunk spawning, collection, rendering)
- `combat.ts` - 6 snippets (damage calculation, health-based combat)
- `canvas-collision.ts` - 7 snippets (body separation, collision detection)
- `carcass.ts` - 5 snippets (carcass spawning, decay, rendering)

### UI Components
- `FishEditorCanvas.tsx` - 4 snippets (carcass/chunk rendering, sprite refresh)
- `SpriteGenerationLab.tsx` - 5 snippets (save buttons for carcass/chunks)

### Constants & Config
- `canvas-constants.ts` - 5 snippets (COMBAT constants, health, collision ratios)
- `lib/game/canvas-constants.ts` - 2 snippets

### Other Files
- `canvas-spawn-sync.ts` - 1 snippet (fish health initialization)
- `combat-states.ts` - 1 snippet (dying state)
- `dash-constants.ts` - 1 snippet (documentation)
- `README.md` - 2 snippets (script documentation)
- `scripts/patch-creature-stats.ts` - 1 snippet
- Various plan documents

## Key Features Extracted

### 1. Health-Based Combat System
- Health/maxHealth properties on FishEntity and PlayerEntity
- Health initialization in spawn and reset
- Damage calculation based on size ratios
- Death when health <= 0

### 2. Carcass & Essence Chunks
- Carcass spawning on death
- Chunk spawning with essence types
- Collection mechanics
- Fade/decay logic

### 3. Visual Combat Feedback
- Hit flashes (red tint)
- Attack flashes (white tint)
- Squash/stretch animations
- Damage numbers
- Essence numbers on chunk collection

### 4. Body Separation & Collision
- Body radius ratio (40% of size)
- Physical separation preventing overlap
- Separate head colliders for combat

### 5. Homing & Auto-Aim
- Close-range auto-aim multiplier
- Directional targeting (facing-based)
- Size-based targeting restrictions
- Bite-time lock-on

### 6. Prey Flee Logic
- Flee only after being hit (not just size-based)
- Track attacker ID and flee duration
- Prevent larger fleeing prey from counterattacking

### 7. Attack Cooldowns
- Attack cooldown timers
- Chunk eat cooldown
- Last bite time tracking

### 8. Lunge Mechanics
- Lunge velocity on attack
- Lunge decay over time
- Stretch animation during lunge
- Chunk-eating lunge (weaker)

## How to Use This Extraction

1. **Review the merged code** in `extracted-code-snippets-v2.md` for each file
2. **Check individual snippets** in the expandable sections if you need to see the evolution
3. **Use context sections** to understand when/why changes were made
4. **Prioritize most recent snippets** - they're already sorted by line number (most recent last)

## Notes

- Some code snippets may have text mixed in (from the transcript format)
- Concatenated lines have been split where possible
- Empty lines and diff markers have been filtered out
- The extraction preserves the order of changes (most recent prioritized)

## Next Steps

1. Review `extracted-code-snippets-v2.md` file by file
2. Compare extracted code with current codebase
3. Identify missing pieces or discrepancies
4. Apply changes systematically, testing as you go
