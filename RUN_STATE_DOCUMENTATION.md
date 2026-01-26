# Run State Management System Documentation

## Overview

The Run State Management System tracks the current run's progress, including fish state, collected essence, selected upgrades, and run statistics. This system is a key component of the roguelite progression, enabling players to continue runs across page refreshes and providing the foundation for the meta-progression system.

## Architecture

### Storage Layer

The system uses **localStorage** for client-side persistence with an optional **API endpoint** for server-side storage.

- **Primary Storage**: `localStorage` (key: `fish_game_run_state`)
- **Optional API**: `/api/player/run-state` (GET, POST, DELETE)

### Data Structure

The `RunState` interface (defined in `lib/game/types.ts`) includes:

```typescript
interface RunState {
  runId: string;              // Unique run identifier
  currentLevel: string;       // "1-1", "1-2", etc.
  selectedFishId: string;     // Creature ID selected for this run
  fishState: {
    size: number;             // Current size (can grow)
    speed: number;            // Current speed (can be modified)
    health: number;           // Current health
    damage: number;           // Current damage
    sprite: string;           // Current sprite (can evolve)
  };
  collectedEssence: Record<string, number>; // { 'shallow': 45, ... }
  selectedUpgrades: string[]; // Array of upgrade IDs
  rerollsRemaining: number;   // Rerolls left for upgrade selection
  evolutionLevel: number;     // Evolution count this run
  hunger: number;             // Current hunger (0-100)
  stats: {
    fishEaten: number;
    timeSurvived: number;
    maxSize: number;
  };
}
```

## Core Functions

### Creating a New Run

```typescript
import { createNewRunState, saveRunState } from '@/lib/game/run-state';

// Create new run with goldfish starter
const runState = createNewRunState('goldfish_starter');
if (runState) {
  saveRunState(runState);
  // Start game with this run state
}
```

### Loading an Existing Run

```typescript
import { loadRunState, hasActiveRun } from '@/lib/game/run-state';

// Check if a run exists
if (hasActiveRun()) {
  const runState = loadRunState();
  if (runState) {
    console.log(`Continuing run ${runState.runId} at level ${runState.currentLevel}`);
    // Resume game
  }
}
```

### Updating Run State During Gameplay

```typescript
import { 
  loadRunState, 
  saveRunState,
  addEssenceToRun,
  updateRunStats,
  updateFishState 
} from '@/lib/game/run-state';

let runState = loadRunState();
if (!runState) return;

// Player eats a fish
runState = updateRunStats(runState, {
  fishEaten: runState.stats.fishEaten + 1
});

// Fish grows
runState = updateFishState(runState, {
  size: runState.fishState.size + 5,
  health: runState.fishState.health + 2
});

// Collect essence
runState = addEssenceToRun(runState, 'shallow', 10);

// Save changes
saveRunState(runState);
```

### Handling Upgrades

```typescript
import { addUpgradeToRun, useReroll } from '@/lib/game/run-state';

let runState = loadRunState();
if (!runState) return;

// Player selects an upgrade
runState = addUpgradeToRun(runState, 'coral_speed_1');
saveRunState(runState);

// Player uses a reroll
const afterReroll = useReroll(runState);
if (afterReroll) {
  runState = afterReroll;
  // Show new upgrade options
  saveRunState(runState);
} else {
  // No rerolls left
  console.log('No rerolls remaining');
}
```

### Level Progression

```typescript
import { progressToNextLevel, incrementEvolution } from '@/lib/game/run-state';

let runState = loadRunState();
if (!runState) return;

// Level complete - progress to next level
runState = progressToNextLevel(runState);
// This resets collected essence and restores hunger

// Fish evolves
runState = incrementEvolution(runState);
// Update fish sprite based on evolution level

saveRunState(runState);
```

### Ending a Run

```typescript
import { clearRunState } from '@/lib/game/run-state';

// On game over or run completion
const runState = loadRunState();
if (runState) {
  // Calculate final score
  const score = calculateFinalScore(runState);
  
  // Award essence/evo points to player state
  awardRewards(runState);
  
  // Clear run state
  clearRunState();
  // This disables the "Continue" button until a new game starts
}
```

## Integration Points

### Main Menu (MetaHub)

The main menu checks for an active run to enable/disable the "Continue" button:

```typescript
import { hasActiveRun } from '@/lib/game/run-state';

const [hasRun, setHasRun] = useState(false);

useEffect(() => {
  setHasRun(hasActiveRun());
}, []);

// Enable "Continue" button if hasRun is true
```

### Game Initialization (GameCanvas)

The game canvas initializes or loads run state on mount:

```typescript
import { loadRunState, createNewRunState, saveRunState } from '@/lib/game/run-state';

useEffect(() => {
  let runState = loadRunState();
  
  if (!runState) {
    // No existing run, create new one
    runState = createNewRunState('goldfish_starter');
    if (runState) {
      saveRunState(runState);
    }
  }
  
  // Load game assets based on run state
  loadGameAssets(runState);
}, []);
```

### Game Over Handling

On game over, clear the run state:

```typescript
import { clearRunState } from '@/lib/game/run-state';

const handleGameOver = () => {
  clearRunState();
  // Show game over screen
  // Award evo points/essence to player state
};
```

## API Endpoints

### GET /api/player/run-state

Get the current run state.

**Query Parameters:**
- `playerId` (optional, default: 'default')

**Response:**
```json
{
  "runState": { ... } | null
}
```

### POST /api/player/run-state

Save the current run state.

**Request Body:**
```json
{
  "runState": { ... },
  "playerId": "default"
}
```

**Response:**
```json
{
  "success": true
}
```

### DELETE /api/player/run-state

Clear the current run state.

**Query Parameters:**
- `playerId` (optional, default: 'default')

**Response:**
```json
{
  "success": true
}
```

## Best Practices

### When to Save Run State

- After level completion
- After selecting an upgrade
- After significant fish state changes (size increases, evolution)
- When pausing the game (not yet implemented)

### When to Clear Run State

- On game over (death)
- On run completion (final boss defeated, if applicable)
- When starting a new game (if player explicitly chooses "New Game" instead of "Continue")

### Error Handling

All run state functions handle errors gracefully:

```typescript
// saveRunState logs errors but doesn't throw
saveRunState(runState); // Safe to call

// loadRunState returns null on error
const runState = loadRunState();
if (!runState) {
  // Handle missing/invalid run state
}

// createNewRunState returns null if creature not found
const runState = createNewRunState(fishId);
if (!runState) {
  console.error('Invalid fish ID');
}
```

### localStorage Availability

The system assumes localStorage is available (browser environment). For SSR or Node.js environments, localStorage operations will fail gracefully with console errors.

## Testing

A comprehensive test script is available at `test-run-state.ts`:

```bash
npx tsx test-run-state.ts
```

This tests:
- Creating new run states
- Adding essence, stats, upgrades
- Using rerolls
- Incrementing evolution
- Progressing to next level
- All helper functions

## Future Enhancements

1. **Auto-save during gameplay**: Periodic auto-save every N seconds
2. **Cloud sync**: Use API endpoints to sync run state across devices
3. **Run history**: Track multiple runs (currently only one active run)
4. **Pause/resume**: Better support for pausing and resuming runs
5. **Validation**: Add runtime validation with Zod or similar library

## See Also

- `DATA_STRUCTURE.md` - Complete data structure specifications
- `VERTICAL_SLICE.md` - Game flow documentation
- `lib/game/types.ts` - TypeScript interfaces
- `lib/game/run-state.ts` - Implementation
- `lib/game/player-state.ts` - Player (meta) state management
