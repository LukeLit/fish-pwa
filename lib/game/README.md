# Game Data Structures

This directory contains the core data structures and game data for the roguelite fish game.

## Overview

The data structures are based on the specifications in `DATA_STRUCTURE.md` and support the vertical slice implementation outlined in `VERTICAL_SLICE.md`.

## Directory Structure

```
lib/game/
├── types.ts              # Core TypeScript interfaces
├── index.ts              # Main export file
├── run-state.ts          # Run state management utilities
├── player-state.ts       # Player state management utilities
├── essence-manager.ts    # Multi-type essence management
└── data/
    ├── index.ts          # Data export file
    ├── essence-types.ts  # Essence type definitions
    ├── biomes.ts         # Biome definitions
    ├── creatures.ts      # Creature definitions
    ├── upgrades.ts       # Upgrade tree definitions
    └── abilities.ts      # Ability definitions
```

## Core Interfaces

### EssenceType
Defines an essence type (currency category). Examples: Shallow, Deep Sea, Tropical, Polluted.

### Biome
Defines a game area/environment as a combination of base depth + modifiers. Each biome has:
- Visual theme and background assets
- Available essence types
- Creature spawn rules
- Unlock costs

### Creature
Enhanced fish data structure that includes:
- Basic stats (size, speed, health, damage)
- Essence yields (multiple types)
- Spawn rules
- Granted abilities
- Rarity and biome association

### UpgradeNode
Defines upgrades in the upgrade trees:
- Essence requirements
- Prerequisites
- Max levels
- Cost scaling
- Effects (stat boosts, abilities, unlocks)

### Ability
Defines passive abilities:
- Always active or periodic
- Effects (damage, heal, buff, debuff, utility, attraction, protection)
- Unlock requirements

### RunState
Tracks the current run's temporary state:
- Current level
- Fish state (size, speed, health, damage, sprite)
- Collected essence
- Selected upgrades
- Evolution level
- Hunger
- Stats (fish eaten, time survived, max size)

### PlayerState
Tracks permanent player data across runs:
- Evo Points (meta-progression currency)
- Permanent essence totals
- Meta upgrade levels
- Unlocked fish and biomes
- Bestiary (discovered creatures)
- High score and total runs

## Usage

### Importing Types
```typescript
import type { 
  EssenceType, 
  Biome, 
  Creature, 
  RunState, 
  PlayerState 
} from '@/lib/game/types';
```

### Importing Data
```typescript
import { 
  ESSENCE_TYPES, 
  BIOMES, 
  CREATURES,
  UPGRADE_TREES,
  ABILITIES
} from '@/lib/game/data';
```

### State Management
```typescript
import { 
  createNewRunState,
  loadRunState,
  saveRunState,
  addEssenceToRun,
  updateFishState
} from '@/lib/game/run-state';

import {
  createNewPlayerState,
  loadPlayerState,
  savePlayerState,
  addEvoPoints,
  calculateScore
} from '@/lib/game/player-state';
```

### Essence Management
```typescript
import { MultiEssenceManager } from '@/lib/game/essence-manager';

const essenceManager = new MultiEssenceManager();
await essenceManager.add('shallow', 10);
const shallowAmount = await essenceManager.getAmount('shallow');
```

## Initial Data

The following data is included for the vertical slice:

### Essence Types
- **Shallow**: Bright green, grants speed and agility
- **Deep Sea**: Dark blue, grants resilience and pressure resistance
- **Tropical**: Golden yellow, grants vibrant colors and charm
- **Polluted**: Purple, grants toxic abilities and mutation

### Biomes
- **Coral Shallows**: Starting biome (0-50m depth)

### Creatures
- **Goldfish** (starter): Small, fast, low damage
- **Minnow**: Tiny prey fish
- **Bass**: Medium predator

### Upgrade Trees
- **Shallow Tree**: Coral Speed, Reef Agility, Shallow Growth
- **Deep Sea Tree**: Deep Sea Resilience, Pressure Adaptation
- **Meta Tree**: Starting Size, Starting Speed, Essence Multiplier, Slower Hunger

### Abilities
- **Essence Magnet**: Attract essence orbs
- **Swift Current**: Periodic speed bursts
- **Shield**: Blocks damage
- **Bioluminescence**: Attract prey
- **Regeneration**: Heal over time

## State Management

### Run State Flow
1. **Create New Run**: `createNewRunState(fishId)`
2. **Save Run**: `saveRunState(runState)`
3. **Load Run**: `loadRunState()`
4. **Clear Run**: `clearRunState()`

### Player State Flow
1. **Load Player**: `loadPlayerState()` (creates new if none exists)
2. **Update Player**: Use helper functions (addEvoPoints, addEssence, etc.)
3. **Save Player**: `savePlayerState(playerState)`

### Score Calculation
```typescript
const result = calculateScore({
  size: 50,
  fishEaten: 10,
  timeSurvived: 120,
  essenceCollected: 30
});
// result.score: (50 × 10) + (10 × 5) + (120 × 2) + (30 × 3) = 880
// result.evoPoints: Math.max(1, Math.floor(880 / 10)) = 88
```

## Extension

To add new data:

1. **Essence Types**: Add to `data/essence-types.ts`
2. **Biomes**: Add to `data/biomes.ts`
3. **Creatures**: Add to `data/creatures.ts`
4. **Upgrades**: Add to appropriate tree in `data/upgrades.ts`
5. **Abilities**: Add to `data/abilities.ts`

All data follows the interfaces defined in `types.ts` and is fully type-safe.

## Migration

The system includes backward compatibility with the legacy essence system. Use `MultiEssenceManager.migrateLegacyEssence()` to convert old single-type essence to the new multi-type system.
