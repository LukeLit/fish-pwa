# Persist Player Size Between Levels

## Overview

This document describes the implementation plan for persisting player fish size across level transitions. Currently, when a player completes a level and progresses to the next one, their size resets to the default starting value. This breaks the core roguelite progression where players should grow continuously throughout a run.

## Problem Statement

### Current Behavior
1. Player starts level 1-1 at base size (~45 with meta upgrades)
2. Player eats fish and grows to size ~80
3. Level completes, digestion/upgrade screens shown
4. `window.location.reload()` is called to start next level
5. **BUG**: Player starts level 1-2 at base size (~45) instead of ~80

### Root Cause
- `engine.start()` creates a new Player with hardcoded size 10
- RunState tracks `fishState.size` but it's never read when continuing a run
- Player size is never synced back to RunState during gameplay

### Code Locations
- [app/game/page.tsx](../app/game/page.tsx) line 136: `window.location.reload()` triggers full restart
- [lib/game/engine.ts](../lib/game/engine.ts) `start()`: Creates Player with size 10
- [lib/game/run-state.ts](../lib/game/run-state.ts): Has `fishState.size` but unused

## Solution

### 1. Read Saved Size on Game Start

When `engine.start()` is called, check if there's an existing RunState (indicating a continued run) and use the saved size:

```typescript
async start(): Promise<void> {
  // Check if continuing an existing run
  const runState = loadRunState();
  const startingSize = runState?.fishState?.size ?? 10;
  
  // Create player with saved size (or default for new run)
  this.player = new Player(this.physics, startX, startY, startingSize);
  
  // Apply meta upgrades ONLY if this is a fresh run (level 1-1)
  if (!runState || runState.currentLevel === '1-1') {
    // Apply starting size/speed meta upgrades
  }
}
```

### 2. Save Player Size on Growth

When the player eats fish and grows, sync the new size to RunState:

```typescript
// After player grows from eating fish
import { updateFishState } from './run-state';

// In collision handling after growth:
const runState = loadRunState();
if (runState) {
  const updated = updateFishState(runState, { size: this.player.stats.size });
  saveRunState(updated);
}
```

## Files to Modify

| File | Change |
|------|--------|
| `lib/game/engine.ts` | Read size from RunState on start; Save size when player grows |

## Testing Checklist

- [ ] Start new game at 1-1 - player starts at base size with meta bonuses
- [ ] Eat fish and grow to ~80
- [ ] Complete the level (let timer run out)
- [ ] Go through digestion/upgrade screens
- [ ] Verify player starts 1-2 at size ~80 (not reset)
- [ ] Complete 1-2, verify size persists to 1-3
- [ ] Start a completely new game - verify size resets to base

## Future Considerations

### Level Objectives (Win/Lose Conditions)
This change is a stepping stone toward implementing modular level objectives:
- **Timer-based**: Survive for X seconds (current default)
- **Size-based**: Reach target size
- **Boss**: Defeat the boss creature
- **Eat-all**: Consume all fish in the level

These objectives should be data-driven and defined per-level in the biome/level configuration.

## Related Issues
- GitHub Issue: #76
