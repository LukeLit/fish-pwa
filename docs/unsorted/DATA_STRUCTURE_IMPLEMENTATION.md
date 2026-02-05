# Data Structure Implementation Guide

## Overview

The core data structures for the roguelite fish game have been implemented in `lib/game/`. This document provides guidance for implementing the sub-issues outlined in the EPIC.

## What's Been Implemented

✅ **Core Type Definitions** (`lib/game/types.ts`)
- All interfaces from DATA_STRUCTURE.md
- Type-safe, fully documented
- Ready for use in all sub-issues

✅ **Initial Game Data** (`lib/game/data/`)
- 4 essence types
- 1 starting biome (Coral Shallows)
- 3 creatures (Goldfish starter, Minnow, Bass)
- Sample upgrade trees
- Sample abilities

✅ **State Management Utilities** (`lib/game/`)
- Run state management (temporary)
- Player state management (permanent)
- Multi-type essence manager
- Score calculation
- All state operations are pure functions

✅ **Documentation**
- Comprehensive README in `lib/game/`
- Usage examples for all features
- Migration guide for legacy systems

## Quick Start for Sub-Issues

### Issue 1: Main Menu Implementation

**What you need:**
```typescript
import { hasActiveRun } from '@/lib/game/run-state';

// Check if "Continue" button should be enabled
const canContinue = hasActiveRun();
```

### Issue 2: Fish Selection Screen

**What you need:**
```typescript
import { getStarterCreatures } from '@/lib/game/data';

// Get available fish for new players
const availableFish = getStarterCreatures(); // [Goldfish]
```

### Issue 3: Run State Management System

**What you need:**
```typescript
import { 
  createNewRunState,
  saveRunState,
  loadRunState,
  clearRunState
} from '@/lib/game/run-state';

// Create new run
const runState = createNewRunState('goldfish_starter');
saveRunState(runState);

// Load existing run
const existingRun = loadRunState();

// Clear run (on death)
clearRunState();
```

### Issue 4-6: Gameplay Core

**What you need:**
```typescript
import { 
  addEssenceToRun,
  updateFishState,
  updateRunStats
} from '@/lib/game/run-state';

import { CREATURES } from '@/lib/game/data';

// During gameplay
let runState = loadRunState();

// Collect essence
runState = addEssenceToRun(runState, 'shallow', 5);

// Fish grows
runState = updateFishState(runState, { 
  size: runState.fishState.size + 2 
});

// Update stats
runState = updateRunStats(runState, { 
  fishEaten: runState.stats.fishEaten + 1 
});

// Save periodically
saveRunState(runState);
```

### Issue 7-9: Progression Systems

**What you need:**
```typescript
import { UPGRADE_TREES } from '@/lib/game/data';
import { addUpgradeToRun, incrementEvolution } from '@/lib/game/run-state';

// Get available upgrades
const shallowUpgrades = UPGRADE_TREES.shallow;

// Select upgrade
runState = addUpgradeToRun(runState, 'coral_speed');
runState = incrementEvolution(runState);
```

### Issue 10: Level Progression

**What you need:**
```typescript
import { progressToNextLevel } from '@/lib/game/run-state';

// After completing a level
runState = progressToNextLevel(runState);
// runState.currentLevel: "1-1" -> "1-2"
```

### Issue 11: Meta Progression

**What you need:**
```typescript
import { 
  loadPlayerState,
  savePlayerState,
  addEvoPoints,
  calculateScore,
  upgradeMetaUpgrade,
  spendEvoPoints
} from '@/lib/game/player-state';

import { META_UPGRADES } from '@/lib/game/data';

// On death
const scoreResult = calculateScore({
  size: runState.stats.maxSize,
  fishEaten: runState.stats.fishEaten,
  timeSurvived: runState.stats.timeSurvived,
  essenceCollected: Object.values(runState.collectedEssence).reduce((a,b) => a+b, 0)
});

let playerState = loadPlayerState();
playerState = addEvoPoints(playerState, scoreResult.evoPoints);
savePlayerState(playerState);

// Purchase meta upgrade
const upgraded = spendEvoPoints(playerState, 50);
if (upgraded) {
  playerState = upgradeMetaUpgrade(upgraded, 'meta_starting_size');
  savePlayerState(playerState);
}
```

### Issue 12: Essence System

**What you need:**
```typescript
import { MultiEssenceManager } from '@/lib/game/essence-manager';

const essenceManager = new MultiEssenceManager();

// Get essence amounts
const shallowAmount = await essenceManager.getAmount('shallow');
const allEssence = await essenceManager.getAllAmounts();

// Add essence after run
await essenceManager.addMultiple(runState.collectedEssence);

// Spend essence
const success = await essenceManager.spendMultiple({
  shallow: 30,
  deep_sea: 10
});
```

### Issue 13-14: Biomes and Creatures

**What you need:**
```typescript
import { 
  getBiome,
  getCreaturesByBiome
} from '@/lib/game/data';

// Get biome data
const biome = getBiome('shallow');
// Use biome.backgroundAssets, biome.essenceOrbSpawnRate, etc.

// Get spawnable creatures
const creatures = getCreaturesByBiome('shallow');
```

## Data Structure Patterns

### Immutable Updates

All state utilities return NEW state objects (immutable):

```typescript
// ✅ Good
let runState = loadRunState();
runState = addEssenceToRun(runState, 'shallow', 10);
saveRunState(runState);

// ❌ Bad - mutating original
const runState = loadRunState();
runState.collectedEssence.shallow += 10; // Don't do this!
```

### Type Safety

All functions are fully typed:

```typescript
import type { RunState, PlayerState, Creature } from '@/lib/game/types';

function processRun(runState: RunState): void {
  // TypeScript will catch all errors
}
```

### Error Handling

State utilities handle errors gracefully:

```typescript
const runState = loadRunState();
if (!runState) {
  // No active run
}

const upgraded = spendEvoPoints(playerState, 100);
if (!upgraded) {
  // Not enough Evo Points
}
```

## Testing Your Implementation

### Manual Testing Checklist

1. **State Persistence**
   - Create run → Refresh page → Run still exists
   - Complete run → Check Evo Points → Still there after refresh

2. **Type Safety**
   - TypeScript compilation passes
   - No type errors in editor

3. **Data Validation**
   - Invalid fish ID → Returns null
   - Invalid biome ID → Returns undefined
   - Insufficient essence → Spend fails

### Example Test Flow

```typescript
// 1. Create new run
const runState = createNewRunState('goldfish_starter');
console.assert(runState !== null, 'Run should be created');
console.assert(runState.currentLevel === '1-1', 'Should start at 1-1');

// 2. Collect essence
let updated = addEssenceToRun(runState, 'shallow', 10);
console.assert(updated.collectedEssence.shallow === 10, 'Essence should be added');

// 3. Save and load
saveRunState(updated);
const loaded = loadRunState();
console.assert(loaded !== null, 'Run should load');
console.assert(loaded.collectedEssence.shallow === 10, 'Essence should persist');

// 4. Calculate score
const score = calculateScore({
  size: 50,
  fishEaten: 10,
  timeSurvived: 120,
  essenceCollected: 30
});
console.assert(score.score === 880, 'Score calculation correct');
console.assert(score.evoPoints === 88, 'Evo Points calculation correct');
```

## Common Patterns

### Loading State at Component Mount

```typescript
'use client';
import { useEffect, useState } from 'react';
import { loadRunState, loadPlayerState } from '@/lib/game';
import type { RunState, PlayerState } from '@/lib/game/types';

export function GameComponent() {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  useEffect(() => {
    setRunState(loadRunState());
    setPlayerState(loadPlayerState());
  }, []);

  // Use state...
}
```

### Updating State During Gameplay

```typescript
function handleEssenceCollected(type: string, amount: number) {
  setRunState(prev => {
    if (!prev) return null;
    const updated = addEssenceToRun(prev, type, amount);
    saveRunState(updated); // Save immediately
    return updated;
  });
}
```

### Validation Before Actions

```typescript
import { getCreature, isValidEssenceType } from '@/lib/game/data';

function startRun(fishId: string) {
  const creature = getCreature(fishId);
  if (!creature) {
    console.error('Invalid fish ID');
    return;
  }
  
  const runState = createNewRunState(fishId);
  // Continue...
}
```

## Next Steps

With the data structures complete, you can now:

1. **Start implementing UI components** using the data types
2. **Build gameplay mechanics** that update run state
3. **Create progression screens** that use player state
4. **Implement meta upgrades** using the upgrade trees
5. **Add biome visuals** using biome data

All data is type-safe, validated, and ready to use. Refer to `lib/game/README.md` for detailed API documentation.

## Support

For questions or issues:
1. Check `lib/game/README.md` for API documentation
2. Review `DATA_STRUCTURE.md` for design specifications
3. Look at the example code in this guide
4. Check TypeScript types for available properties and methods
