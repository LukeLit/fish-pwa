# Fish Editor UI Updates - Visual Guide

## New Tabbed Bottom Sheet Interface

```
┌─────────────────────────────────────────────────────────────┐
│                    FISH EDITOR CANVAS                        │
│            (Full screen game view with fish)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ [Controls] [Fish Library]                    ← Tabs         │
├─────────────────────────────────────────────────────────────┤
│ TAB 1: Controls (existing features)                          │
│ - Generate Fish                                              │
│ - Generate Background                                        │
│ - Biome Background Manager (NEW)                            │
│ - Scene Controls                                             │
└─────────────────────────────────────────────────────────────┘
```

## Fish Library Tab (NEW)

```
┌─────────────────────────────────────────────────────────────┐
│ Controls [Fish Library] ← Active Tab                         │
├─────────────────────────────────────────────────────────────┤
│ [Scrollable Area]                                            │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [IMG] Goldfish Starter                      [prey]   │   │
│ │       [common] [shallow] [shallow:10]                │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [IMG] Anglerfish              [predator] [playable]  │   │
│ │       [rare] [deep] [deep_sea:30] [shallow:6]        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [IMG] Mutant Eel                      [mutant]       │   │
│ │       [epic] [polluted] [polluted:20] [toxic:15]     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Click any row to edit that fish
- Thumbnail shows actual sprite
- Color-coded type badges (green=prey, red=predator, purple=mutant)
- Blue "Playable" badge for selectable fish
- Essence types shown as individual tags with yields

## Updated Essence Types Input in Edit Mode

### Before (Text Input):
```
Essence Types (comma-separated: type:yield)
┌─────────────────────────────────────────────────────────┐
│ shallow:10, deep_sea:15, polluted:5                     │
└─────────────────────────────────────────────────────────┘
Example: shallow:10, deep_sea:15, polluted:5
```

### After (Individual Fields):
```
Essence Types
┌─────────────────────────────────────────────────────────┐
│ Shallow:     [10]                                       │
│ Deep sea:    [15]                                       │
│ Tropical:    [0]                                        │
│ Polluted:    [5]                                        │
│ Cosmic:      [0]                                        │
│ Demonic:     [0]                                        │
│ Robotic:     [0]                                        │
└─────────────────────────────────────────────────────────┘
Set to 0 to remove an essence type
```

**Benefits**:
- Clear which essence types are available
- No parsing errors from incorrect format
- Easy to see what's set and what's not
- Number input with min/max validation

## Biome Background Manager (NEW)

Located in Controls tab, after Generate Background section:

```
Save Current Background to Biome
┌──────────────────────┬──────────────────┐
│ [Shallow ▼]          │ [Save to Biome]  │
└──────────────────────┴──────────────────┘
✅ Background saved for Shallow biome
```

**Biome Options**:
- Shallow
- Medium
- Deep
- Abyssal
- Shallow Tropical
- Deep Polluted

**Workflow**:
1. Generate or load a background using existing controls
2. Select which biome it belongs to
3. Click "Save to Biome"
4. Image saved to blob storage
5. Biome metadata updated with background reference

**Storage**:
```
assets/backgrounds/biome_shallow_bg.png
game-data/biomes/shallow.json
```

## Example Fish Library Entry Details

```
┌────────────────────────────────────────────────────────────┐
│ ┌────┐                                                      │
│ │    │ Tropical Clownfish              [prey] [playable]   │
│ │ 🐠 │ [common] [shallow_tropical]                         │
│ │    │ [shallow:8] [tropical:12]                           │
│ └────┘                                                      │
└────────────────────────────────────────────────────────────┘
     ↑          ↑           ↑       ↑         ↑
  Thumbnail   Name        Type  Playable   Tags
                                Badge
```

**Tag Colors**:
- Type badges: Green (prey), Red (predator), Purple (mutant)
- Playable: Blue
- Rarity: Yellow (legendary), Purple (epic), Blue (rare), Gray (common)
- Biome: Teal
- Essence: Indigo

## User Workflows

### Create and Catalog Fish:
1. Generate fish in Controls tab
2. Edit stats and metadata
3. Save to game
4. Switch to Fish Library tab to see it listed
5. Click to re-edit anytime

### Organize Biome Backgrounds:
1. Generate underwater background
2. Select "Shallow" from biome dropdown
3. Click "Save to Biome"
4. Repeat for other biomes (deep, tropical, etc.)

### Quick Fish Editing:
1. Open Fish Library tab
2. Scroll to find desired fish
3. Click to edit
4. Modify essence yields with number inputs
5. Save changes
