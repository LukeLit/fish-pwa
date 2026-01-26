# Fish Editor UI Changes - Visual Guide

## Overview

The Fish Edit Overlay has been updated with new fields to support the complete Creature data structure.

## Updated UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Fish                                      [← Back]      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [Scrollable Content Area]                                    │
│                                                               │
│ Name                                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Text Input]                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Description                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Textarea - 4 rows]                                     │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Type                                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Dropdown: Prey / Predator / Mutant]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┏━━━━━━━━━━━━━━━━━ NEW FIELDS ━━━━━━━━━━━━━━━━━┓           │
│ ┃                                                 ┃           │
│ ┃ Rarity                                          ┃           │
│ ┃ ┌───────────────────────────────────────────┐  ┃           │
│ ┃ │ [Dropdown: Common/Rare/Epic/Legendary]    │  ┃           │
│ ┃ └───────────────────────────────────────────┘  ┃           │
│ ┃                                                 ┃           │
│ ┃ ┌─┐                                            ┃           │
│ ┃ │✓│ Playable (Can be selected as player fish) ┃           │
│ ┃ └─┘                                            ┃           │
│ ┃                                                 ┃           │
│ ┃ Biome                                           ┃           │
│ ┃ ┌───────────────────────────────────────────┐  ┃           │
│ ┃ │ [Dropdown: Shallow/Medium/Deep/etc.]      │  ┃           │
│ ┃ └───────────────────────────────────────────┘  ┃           │
│ ┃                                                 ┃           │
│ ┃ Essence Types (comma-separated: type:yield)    ┃           │
│ ┃ ┌───────────────────────────────────────────┐  ┃           │
│ ┃ │ [Text: e.g., shallow:10, deep_sea:15]    │  ┃           │
│ ┃ └───────────────────────────────────────────┘  ┃           │
│ ┃ Example: shallow:10, deep_sea:15, polluted:5   ┃           │
│ ┃                                                 ┃           │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛           │
│                                                               │
│ Stats                                                         │
│ ─────                                                         │
│ Size: 80                                                      │
│ ├─────────●─────────┤ [Slider: 20-200]                      │
│                                                               │
│ Speed: 5                                                      │
│ ├────●───────────────┤ [Slider: 1-10]                       │
│                                                               │
│ Health: 50                                                    │
│ ├─────────●─────────┤ [Slider: 1-100]                       │
│                                                               │
│ Damage: 10                                                    │
│ ├─────●─────────────┤ [Slider: 1-50]                        │
│                                                               │
│ ┏━━━━━━━━━━━━━━━━━ NEW BUTTONS ━━━━━━━━━━━━━━━━┓           │
│ ┃                                                 ┃           │
│ ┃ ┌─────────────────────────────────────────┐   ┃           │
│ ┃ │  Save Changes (Local)                   │   ┃           │
│ ┃ │  [Green Button]                          │   ┃           │
│ ┃ └─────────────────────────────────────────┘   ┃           │
│ ┃                                                 ┃           │
│ ┃ ┌─────────────────────────────────────────┐   ┃           │
│ ┃ │  Save to Game (Persistent)               │   ┃           │
│ ┃ │  [Blue Button]                           │   ┃           │
│ ┃ └─────────────────────────────────────────┘   ┃           │
│ ┃                                                 ┃           │
│ ┃ ┌─────────────────────────────────────────┐   ┃           │
│ ┃ │  Unlock for Player                       │   ┃ (Only if  │
│ ┃ │  [Purple Button]                         │   ┃ playable) │
│ ┃ └─────────────────────────────────────────┘   ┃           │
│ ┃                                                 ┃           │
│ ┃ ┌─────────────────────────────────────────┐   ┃           │
│ ┃ │ ✓ Saved to game successfully!            │   ┃           │
│ ┃ │ [Success Message - Green]                │   ┃           │
│ ┃ └─────────────────────────────────────────┘   ┃           │
│ ┃                                                 ┃           │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ [← Previous]                          [Next →]               │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme

- **Green Button**: Save Changes (Local) - Updates in-editor state only
- **Blue Button**: Save to Game (Persistent) - Saves to blob storage
- **Purple Button**: Unlock for Player - Adds to PlayerState.unlockedFish
- **Success Message**: Green background with checkmark
- **Error Message**: Red background with X

## Button States

### Save Changes (Local)
- **Always visible**
- Updates the local fish data in the editor
- Does not persist to storage

### Save to Game (Persistent)
- **Always visible**
- Saves sprite to: `assets/creatures/{fishId}.png`
- Saves metadata to: `assets/creatures/{fishId}.json`
- Shows success/error message

### Unlock for Player
- **Only visible when `playable` checkbox is checked**
- Adds fish to `PlayerState.unlockedFish`
- Saves to: `game-data/player/state.json`
- Shows success/error message

## Field Defaults

When a fish is loaded or created:

- **Rarity**: Defaults to `common`
- **Playable**: Defaults to `false`
- **Biome**: Defaults to `shallow`
- **Essence Types**: Defaults to `[{ type: 'shallow', baseYield: 10 }]`
- **Spawn Rules**: Auto-configured based on biome selection

## User Flow

1. User opens Fish Editor (`/fish-editor`)
2. User clicks "Edit" on a fish or spawns a new one
3. Edit overlay opens at bottom of screen (50% height)
4. User fills in all fields including new fields
5. User checks "Playable" if fish should be selectable
6. User clicks "Save Changes (Local)" to update editor state
7. User clicks "Save to Game (Persistent)" to save to blob storage
8. If playable, user clicks "Unlock for Player" to make it available
9. Success message appears
10. User can navigate to next/previous fish or close overlay

## Integration Points

### Fish Selection Screen
- Will query `/api/list-creatures?playable=true`
- Will check against `/api/player/get-unlocked-fish`
- Will only show fish that are:
  - `playable === true`
  - In player's `unlockedFish` array

### Game Engine
- Will load creatures from blob storage using `/api/get-creature`
- Will use all metadata fields for spawning, combat, essence drops, etc.

## Responsive Design

The overlay:
- Takes 50% of screen height (max 600px)
- Scrollable content area for long forms
- Fixed header with title and back button
- Fixed footer with navigation arrows
- Centered save buttons and messages
