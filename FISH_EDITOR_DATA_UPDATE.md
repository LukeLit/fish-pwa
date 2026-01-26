# Fish Editor Updates - New Features Guide

## Overview

The Fish Editor has been updated to support the complete Creature data structure as defined in `DATA_STRUCTURE.md`. This enables proper saving of fish metadata, marking fish as playable, and unlocking them for the player.

## New Features

### 1. Extended Fish Data Fields

The Fish Editor now supports all fields from the `Creature` interface:

- **Rarity**: Common, Rare, Epic, or Legendary
- **Playable**: Flag to mark fish as selectable by the player
- **Biome**: Native biome where the fish spawns (Shallow, Medium, Deep, Abyssal, etc.)
- **Essence Types**: Multiple essence types with base yields (e.g., `shallow:10, deep_sea:15`)
- **Spawn Rules**: Automatically set based on biome selection

### 2. Save to Game (Persistent Storage)

The "Save to Game (Persistent)" button saves both the fish sprite and complete metadata to Vercel Blob Storage:

- Sprite saved to: `assets/creatures/{fishId}.png`
- Metadata saved to: `assets/creatures/{fishId}.json`

This ensures fish data persists across sessions and can be loaded by the game.

### 3. Unlock for Player

When a fish is marked as "Playable", an "Unlock for Player" button appears. This button:

- Adds the fish to the player's `unlockedFish` array in PlayerState
- Makes the fish available for selection in the fish selection screen
- Persists the unlock status in blob storage

## Usage Workflow

### Creating a New Playable Fish

1. **Generate or Load Fish**: Use the Fish Editor to generate a new fish or load an existing one
2. **Edit Properties**:
   - Set a descriptive name and description
   - Choose fish type (Prey, Predator, or Mutant)
   - Select rarity level
   - **Check "Playable"** to make it selectable by the player
   - Select the native biome
   - Configure essence types (format: `type:yield`, comma-separated)
3. **Adjust Stats**: Use the sliders to set size, speed, health, and damage
4. **Save Changes**: Click "Save Changes (Local)" to update the in-editor state
5. **Save to Game**: Click "Save to Game (Persistent)" to save to blob storage
6. **Unlock for Player**: Click "Unlock for Player" to make it available in fish selection

### Example: Creating a Starter Fish

```
Name: Goldfish Starter
Description: A hardy goldfish, perfect for beginners.
Type: Prey
Rarity: Common
Playable: ✓ Checked
Biome: Shallow
Essence Types: shallow:10
Stats: Size: 80, Speed: 5, Health: 50, Damage: 10
```

After saving and unlocking, this fish will appear in the fish selection screen for new players.

## API Endpoints

### Save Creature
```
POST /api/save-creature
Body: FormData with creatureId, sprite (file), metadata (JSON)
```

### Get Creature
```
GET /api/get-creature?id={creatureId}
Returns: Complete creature data with sprite URL
```

### List Creatures
```
GET /api/list-creatures?playable=true&biome=shallow&rarity=common
Returns: Filtered list of creatures
```

### Unlock Fish for Player
```
POST /api/player/unlock-fish
Body: { fishId: string }
Returns: Success message and updated unlockedFish array
```

### Get Unlocked Fish
```
GET /api/player/get-unlocked-fish
Returns: Array of unlocked fish IDs
```

## Data Structure

### FishData (Extended)

```typescript
interface FishData {
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  stats: {
    size: number;      // 20-200
    speed: number;     // 1-10
    health: number;    // 1-100
    damage: number;    // 1-50
  };
  sprite: string;
  
  // New fields
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  playable?: boolean;
  biomeId?: string;
  essenceTypes?: Array<{
    type: string;
    baseYield: number;
  }>;
  spawnRules?: {
    canAppearIn: string[];
    spawnWeight: number;
    minDepth?: number;
    maxDepth?: number;
  };
}
```

### PlayerState.unlockedFish

```typescript
interface PlayerState {
  // ... other fields
  unlockedFish: string[];  // Array of creature IDs
}
```

Default unlocked fish: `['goldfish_starter']`

## Integration with Fish Selection

The fish selection screen will use the following logic:

1. Fetch all creatures: `GET /api/list-creatures?playable=true`
2. Fetch player's unlocked fish: `GET /api/player/get-unlocked-fish`
3. Display only creatures where:
   - `creature.playable === true`
   - `creature.id` is in `playerState.unlockedFish`

## Background Assets

For biomes, backgrounds can be saved similarly using the existing `/api/save-sprite` endpoint with `type=background`:

```typescript
POST /api/save-sprite
Body: {
  imageBase64: string,
  filename: string,
  type: 'background'
}
```

Backgrounds are saved to: `assets/backgrounds/{filename}`

## Testing

To test the new features:

1. Navigate to `/fish-editor`
2. Click the pause button (top right) to pause the scene
3. Click "Edit" on any fish
4. Modify the new fields (rarity, playable, biome, essence types)
5. Click "Save to Game (Persistent)"
6. If playable is checked, click "Unlock for Player"
7. Verify success messages appear

## Notes

- All fish must have at least one essence type
- Default essence type is `shallow:10` if none specified
- Spawn rules are automatically configured based on the selected biome
- The "Unlock for Player" button only appears when the fish is marked as playable
- Fish sprites can be data URLs (for newly generated fish) or blob storage URLs (for saved fish)

## Future Enhancements

Potential improvements for future iterations:

- Visual indicator showing which fish are already unlocked
- Bulk unlock/lock functionality
- Essence type selector with dropdown instead of text input
- Advanced spawn rules configuration UI
- Ability to test fish in different biomes directly in the editor
