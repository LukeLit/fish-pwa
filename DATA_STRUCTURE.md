# Data Structure Specifications

This document defines the complete TypeScript interfaces, blob storage organization, and API endpoints for the roguelite fish game system.

## Table of Contents

1. [Core Data Models](#core-data-models)
2. [Enhanced FishData Structure](#enhanced-fishdata-structure)
3. [Storage Organization](#storage-organization)
4. [API Endpoints](#api-endpoints)
5. [Migration Plan](#migration-plan)

---

## Core Data Models

### EssenceType

Defines an essence type (currency category).

```typescript
interface EssenceType {
  id: string; // 'deep_sea', 'shallow', 'polluted', 'cosmic', 'demonic', 'robotic'
  name: string; // 'Deep Sea', 'Shallow', 'Polluted', etc.
  color: string; // Hex color for UI display (e.g., '#1a237e' for deep sea)
  description: string; // Flavor text describing the essence type
}
```

**Example**:
```typescript
{
  id: "deep_sea",
  name: "Deep Sea",
  color: "#1a237e",
  description: "The essence of the abyssal depths, granting resilience and pressure resistance."
}
```

### Biome

Defines a biome (game area/environment) as a combination of base depth + modifiers.

```typescript
interface Biome {
  id: string; // 'shallow', 'shallow_tropical', 'deep_polluted', etc.
  name: string; // 'Coral Shallows', 'Tropical Shallows', 'Polluted Depths'
  baseDepth: 'shallow' | 'medium' | 'deep' | 'abyssal'; // Base depth level
  modifiers: string[]; // Array of archetype modifier IDs (e.g., ['tropical'], ['polluted', 'radioactive'])
  depthRange: {
    min: number; // Minimum depth in meters
    max: number; // Maximum depth in meters
  };
  availableEssenceTypes: string[]; // Array of EssenceType IDs available here
  visualTheme: string; // Description of visual style
  backgroundAssets: {
    backgroundImage: string; // URL to background image
    stageElements?: string[]; // Array of stage element asset URLs
    lighting?: string; // Lighting configuration
  };
  unlockCost: Record<string, number>; // Essence costs to unlock: { 'shallow': 100, 'deep_sea': 50 }
  essenceOrbSpawnRate: number; // How frequently essence orbs spawn (0-1)
  creatureSpawnRules?: {
    exclusiveCreatures?: string[]; // Creature IDs that only spawn here
    sharedCreatures?: string[]; // Creature IDs that can spawn in multiple biomes
    spawnWeights?: Record<string, number>; // Relative spawn probabilities
  };
}
```

**Example**:
```typescript
{
  id: "deep_polluted",
  name: "Polluted Depths",
  baseDepth: "deep",
  modifiers: ["polluted"],
  depthRange: { min: 200, max: 1000 },
  availableEssenceTypes: ["deep_sea", "polluted", "shallow"],
  visualTheme: "Dark, murky, toxic, bioluminescent pollution",
  backgroundAssets: {
    backgroundImage: "biomes/deep_polluted_bg.png",
    stageElements: ["biomes/pollution_particles.png", "biomes/industrial_waste.png"],
    lighting: "dark_murky"
  },
  unlockCost: { "shallow": 150, "deep_sea": 50, "polluted": 25 },
  essenceOrbSpawnRate: 0.3, // Lower spawn rate due to pollution
  creatureSpawnRules: {
    exclusiveCreatures: ["toxic_anglerfish"],
    spawnWeights: { "toxic_anglerfish": 15, "polluted_eel": 20 }
  }
}
```

### UpgradeNode

Defines a single upgrade in an upgrade tree.

```typescript
interface UpgradeNode {
  id: string; // Unique identifier
  name: string; // Display name
  description: string; // What this upgrade does
  category: 'shallow' | 'deep_sea' | 'tropical' | 'polluted' | 'hybrid' | 'meta';
  requiredEssenceTypes: Record<string, number>; // { 'deep_sea': 10, 'shallow': 5 }
  prerequisites: string[]; // Array of UpgradeNode IDs that must be purchased first
  maxLevel: number; // Maximum upgrade level (typically 2-5, not 10+)
  baseCost: number; // Cost at level 0
  costPerLevel: number; // Flat cost increase per level (or use costMultiplier)
  costMultiplier?: number; // Optional: Cost increases by this per level (alternative to costPerLevel)
  effects: UpgradeEffect[]; // Array of effects this upgrade provides
  impactLevel: 'low' | 'medium' | 'high' | 'game_changing'; // How impactful this upgrade is
}

interface UpgradeEffect {
  type: 'stat' | 'ability' | 'unlock';
  target: string; // Stat name ('health', 'speed') or ability ID ('shield')
  value: number | string; // Flat value or ability ID
  perLevel?: boolean; // If true, value is per level (e.g., +10 per level)
}
```

**Example**:
```typescript
{
  id: "deep_sea_resilience",
  name: "Deep Sea Resilience",
  description: "Increases health, allowing you to survive longer in the depths.",
  category: "deep_sea",
  requiredEssenceTypes: { "deep_sea": 15 },
  prerequisites: [],
  maxLevel: 10,
  baseCost: 15,
  costMultiplier: 1.5,
  effects: [
    {
      type: "stat",
      target: "health",
      value: 5,
      perLevel: true
    }
  ]
}
```

### Ability

Defines an ability (active or passive).

```typescript
interface Ability {
  id: string; // Unique identifier
  name: string; // Display name
  description: string; // What this ability does
  type: 'passive'; // All abilities are passive (no active abilities)
  category?: 'shallow' | 'deep_sea' | 'tropical' | 'polluted' | 'hybrid' | 'meta'; // Which tree unlocks it
  unlockRequirement?: {
    upgradeId: string; // UpgradeNode ID that unlocks this
    upgradeLevel?: number; // Minimum level required (default: 1)
  };
  // Passive ability properties
  activationType: 'always_active' | 'periodic'; // Always on vs. periodic trigger
  cooldown?: number; // Cooldown in seconds (periodic only, typically 10-30 seconds)
  duration?: number; // Duration in seconds (periodic only)
  stacking?: boolean; // Can be upgraded multiple times
  maxLevel?: number; // Maximum level if stacking
  // Effect data
  effect: {
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility' | 'attraction' | 'protection';
    target: 'self' | 'enemy' | 'area' | 'essence_orbs';
    value: number; // Effect magnitude
    radius?: number; // Area effect radius in pixels
    range?: number; // Range for attraction/utility effects
  };
}
```

**Example (Active)**:
```typescript
{
  id: "shield",
  name: "Recharging Shield",
  description: "Blocks the next hit of damage.",
  type: "active",
  category: "deep_sea",
  unlockRequirement: {
    upgradeId: "pressure_adaptation",
    upgradeLevel: 2
  },
  cooldown: 30,
  duration: 10, // Or until hit
  effect: {
    type: "buff",
    target: "self",
    value: 1 // Blocks 1 hit
  }
}
```

**Example (Passive)**:
```typescript
{
  id: "essence_magnet",
  name: "Essence Magnet",
  description: "Attract essence orbs from further away.",
  type: "passive",
  category: "meta",
  stacking: true,
  maxLevel: 5,
  effect: {
    type: "utility",
    target: "self",
    value: 25 // +25% range per level
  }
}
```

---

## Enhanced FishData Structure

### Creature (Enhanced FishData)

The complete creature data structure that extends the base FishData. **Updated with modular prompt system support**.

```typescript
/**
 * Essence Data Structure - New modular essence system
 */
interface EssenceData {
  primary: {
    type: string; // EssenceType ID
    baseYield: number; // Base essence amount
    visualChunks?: string[]; // Visual cues for this essence type
  };
  secondary?: Array<{
    type: string; // EssenceType ID
    baseYield: number;
    visualChunks?: string[]; // Optional visual cues
  }>;
}

/**
 * Mutation Metadata - For mutated creatures
 */
interface MutationMetadata {
  sourceCreatureId: string; // ID of the original creature
  mutationType: string; // Type of mutation (polluted, abyssal, cosmic, etc.)
  mutationLevel: number; // Intensity of mutation (1-5)
  mutationTrigger?: string; // What caused it (upgrade ID, biome ID, etc.)
}

interface Creature extends BaseFishData {
  // Identity
  id: string;
  name: string;
  description: string; // Legacy field, maintained for compatibility
  type: 'prey' | 'predator' | 'mutant';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  playable?: boolean; // If true, can be selected as player fish
  
  // Visual
  sprite: string; // URL to sprite image (blob storage path)
  biomeId: string; // Native biome ID
  
  // Stats
  stats: {
    size: number; // 20-200
    speed: number; // 1-10
    health: number; // 1-100
    damage: number; // 1-50
  };
  
  // NEW: Modular Prompt System
  descriptionChunks?: string[]; // Modular prompt segments describing the creature
  visualMotif?: string; // High-level visual theme/aesthetic
  
  // NEW: Enhanced Essence System
  essence?: EssenceData; // New modular essence structure with visual chunks
  
  // Legacy: Essence system (maintained for backward compatibility)
  essenceTypes: Array<{
    type: string; // EssenceType ID
    baseYield: number; // Base essence amount (before multipliers)
  }>; // All essence types are always granted (no chance-based drops)
  
  // NEW: Fusion/Mutation Metadata
  fusionParentIds?: string[]; // Parent creature IDs if this is a fusion
  fusionType?: 'balanced' | 'dominant_first' | 'dominant_second';
  fusionGeneration?: number; // How many fusions deep (1 = first-gen)
  mutationSource?: MutationMetadata; // Mutation data if this is a mutant
  
  // Progression
  unlockRequirement?: {
    biomeUnlocked: string[]; // Array of biome IDs that must be unlocked
    essenceSpent?: Record<string, number>; // Essence types and amounts spent
  };
  
  // Abilities this creature can grant when consumed
  grantedAbilities?: string[]; // Array of Ability IDs
  
  // Spawn rules
  spawnRules: {
    canAppearIn: string[]; // Array of biome IDs where this creature can spawn
    spawnWeight: number; // Relative spawn probability (1-100)
    minDepth?: number; // Optional minimum depth
    maxDepth?: number; // Optional maximum depth
  };
}
```

**Example (Updated with Modular Prompt System)**:
```typescript
{
  id: "anglerfish",
  name: "Anglerfish",
  description: "A deep-sea predator with a bioluminescent lure.", // Legacy field
  type: "predator",
  rarity: "rare",
  sprite: "creatures/anglerfish.png",
  biomeId: "deep",
  stats: {
    size: 60,
    speed: 3,
    health: 40,
    damage: 15
  },
  
  // NEW: Modular prompt chunks
  descriptionChunks: [
    "grotesque deep-sea predator",
    "massive gaping mouth with needle-sharp teeth",
    "bioluminescent lure extending from head",
    "dark blue-black scaled body",
    "bulbous compressed body shape"
  ],
  visualMotif: "terrifying abyssal ambush hunter with glowing lure",
  
  // NEW: Enhanced essence with visual chunks
  essence: {
    primary: {
      type: "deep_sea",
      baseYield: 30,
      visualChunks: [
        "adapted to crushing abyssal depths",
        "bioluminescent hunting adaptations",
        "mysterious deep-sea features"
      ]
    },
    secondary: [
      {
        type: "shallow",
        baseYield: 6,
        visualChunks: []
      }
    ]
  },
  
  // Legacy essence types (maintained for backward compatibility)
  essenceTypes: [
    { type: "deep_sea", baseYield: 30 },
    { type: "shallow", baseYield: 6 }
  ],
  
  grantedAbilities: ["bioluminescence"],
  spawnRules: {
    canAppearIn: ["deep", "deep_polluted"],
    spawnWeight: 20,
    minDepth: 200,
    maxDepth: 1000
  }
}
```

**Example (Fusion Creature)**:
```typescript
{
  id: "jellyangler",
  name: "Jellyangler",
  description: "An impossible fusion of anglerfish and jellyfish.",
  type: "mutant",
  rarity: "epic",
  sprite: "creatures/jellyangler.png",
  biomeId: "deep",
  stats: {
    size: 55,
    speed: 4,
    health: 35,
    damage: 12
  },
  
  descriptionChunks: [
    "translucent bioluminescent body",
    "anglerfish lure with jellyfish tentacles",
    "flowing ethereal fins",
    "ghostly deep-sea appearance",
    "pulsating light organs"
  ],
  visualMotif: "ethereal abyssal hybrid with flowing bioluminescent features",
  
  fusionParentIds: ["anglerfish", "moon_jellyfish"],
  fusionType: "balanced",
  fusionGeneration: 1,
  
  essence: {
    primary: {
      type: "deep_sea",
      baseYield: 25,
      visualChunks: ["deep-sea bioluminescence", "abyssal pressure adaptations"]
    },
    secondary: [
      {
        type: "cosmic",
        baseYield: 10,
        visualChunks: ["otherworldly translucent form"]
      }
    ]
  },
  
  essenceTypes: [
    { type: "deep_sea", baseYield: 25 },
    { type: "cosmic", baseYield: 10 }
  ],
  
  grantedAbilities: ["bioluminescence", "jellyfish_sting", "hybrid_vigor"],
  spawnRules: {
    canAppearIn: ["deep"],
    spawnWeight: 5,
    minDepth: 500,
    maxDepth: 2000
  }
}
```

**Example (Mutated Creature)**:
```typescript
{
  id: "toxic_goldfish",
  name: "Toxic Goldfish",
  description: "A goldfish heavily mutated by polluted waters.",
  type: "mutant",
  rarity: "uncommon",
  sprite: "creatures/toxic_goldfish.png",
  biomeId: "medium_polluted",
  stats: {
    size: 25,
    speed: 6,
    health: 20,
    damage: 8
  },
  
  descriptionChunks: [
    "sickly green-gold discolored scales",
    "asymmetric mutated fins",
    "visible toxic growths and lesions",
    "glazed contaminated eyes",
    "twisted deformed body"
  ],
  visualMotif: "heavily polluted mutant with toxic deformities",
  
  mutationSource: {
    sourceCreatureId: "goldfish_starter",
    mutationType: "polluted",
    mutationLevel: 3,
    mutationTrigger: "polluted_biome_exposure"
  },
  
  essence: {
    primary: {
      type: "polluted",
      baseYield: 15,
      visualChunks: [
        "toxic waste mutations visible",
        "contaminated appearance",
        "pollution-induced asymmetry"
      ]
    },
    secondary: [
      {
        type: "shallow",
        baseYield: 3,
        visualChunks: []
      }
    ]
  },
  
  essenceTypes: [
    { type: "polluted", baseYield: 15 },
    { type: "shallow", baseYield: 3 }
  ],
  
  grantedAbilities: ["toxic_resistance", "poison_touch"],
  spawnRules: {
    canAppearIn: ["medium_polluted"],
    spawnWeight: 25,
    minDepth: 50,
    maxDepth: 200
  }
}
```

### Related Documentation

For complete information on the modular prompt system:
- [MODULAR_PROMPT_SYSTEM.md](./MODULAR_PROMPT_SYSTEM.md) - Core system architecture
- [ART_STYLE_PROMPT_CHUNKS.md](./ART_STYLE_PROMPT_CHUNKS.md) - Art style chunks
- [VISUAL_MOTIFS.md](./VISUAL_MOTIFS.md) - Visual motif library
- [FUSION_MUTATION_METADATA.md](./FUSION_MUTATION_METADATA.md) - Fusion/mutation system
- [UPGRADE_PROMPT_CHUNKS.md](./UPGRADE_PROMPT_CHUNKS.md) - Upgrade visual effects
- [FISH_DATA_STRUCTURE_BATCH.md](./FISH_DATA_STRUCTURE_BATCH.md) - Batch data examples

### Run State

Defines the current run's state (temporary, reset on new run).

```typescript
interface RunState {
  runId: string; // Unique run identifier
  currentLevel: string; // "1-1", "1-2", etc.
  selectedFishId: string; // Creature ID selected for this run
  fishState: {
    size: number; // Current size (can grow)
    speed: number; // Current speed (can be modified by upgrades)
    health: number; // Current health
    damage: number; // Current damage
    sprite: string; // Current sprite (can evolve)
  };
  collectedEssence: Record<string, number>; // Essence collected this run: { 'shallow': 45, ... }
  selectedUpgrades: string[]; // Array of UpgradeNode IDs selected this run
  rerollsRemaining: number; // Rerolls left for upgrade selection
  evolutionLevel: number; // How many times fish has evolved this run
  hunger: number; // Current hunger (0-100)
  stats: {
    fishEaten: number;
    timeSurvived: number;
    maxSize: number;
  };
}
```

### Player State

Defines permanent player data (persists across runs).

```typescript
interface PlayerState {
  evoPoints: number; // Meta-progression currency
  essence: Record<string, number>; // Permanent essence totals: { 'shallow': 150, ... }
  metaUpgrades: Record<string, number>; // Meta upgrade levels: { 'starting_size': 3, ... }
  unlockedFish: string[]; // Array of Creature IDs unlocked
  unlockedBiomes: string[]; // Array of Biome IDs unlocked
  bestiary: Record<string, boolean>; // Discovered creatures: { 'anglerfish': true, ... }
  highScore: number;
  totalRuns: number;
}
```

### BaseFishData (Legacy Compatibility)

For backward compatibility, we maintain a base interface that matches the current FishData:

```typescript
interface BaseFishData {
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  stats: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  sprite: string;
}
```

**Migration**: Existing FishData will be extended to Creature format.

---

## Storage Organization

### Blob Storage Structure

All game data is stored in Vercel Blob Storage with the following organization:

```
/
├── essence/
│   ├── deep_sea.json          # EssenceType definition
│   ├── shallow.json
│   ├── polluted.json
│   └── ...
├── biomes/
│   ├── shallow.json          # Biome definition
│   ├── deep_sea.json
│   ├── polluted.json
│   └── ...
├── creatures/
│   ├── {creatureId}.png      # Sprite image
│   ├── {creatureId}.json     # Creature metadata (essence, stats, abilities)
│   └── ...
├── upgrades/
│   ├── deep_sea_tree.json    # Array of UpgradeNode objects
│   ├── shallow_tree.json
│   ├── polluted_tree.json
│   ├── hybrid_tree.json
│   └── meta_tree.json
├── abilities/
│   ├── {abilityId}.json       # Ability definition
│   └── ...
└── player/
    ├── essence.json          # Player's essence totals: { 'shallow': 150, 'deep_sea': 45, 'tropical': 30, ... }
    ├── evo_points.json       # Player's Evo Points: { "amount": 150 }
    ├── meta_upgrades.json    # Meta upgrade levels: { 'starting_size': 3, 'starting_speed': 2, ... }
    ├── run_state.json        # Current run state (if run in progress): RunState object
    ├── upgrades.json         # Player's upgrade levels: { 'deep_sea_resilience': 2, ... }
    ├── abilities.json        # Unlocked abilities: { 'shield': true, 'bioluminescence': true }
    ├── bestiary.json         # Discovered creatures: { 'anglerfish': true, 'clownfish': true }
    └── other_players_fish.json # Other players' fish encountered: { 'player_123_fish_1': {...} }
```

### File Naming Conventions

- **Essence Types**: `essence/{essenceTypeId}.json`
- **Biomes**: `biomes/{biomeId}.json`
- **Creatures**: 
  - Sprite: `creatures/{creatureId}.png`
  - Metadata: `creatures/{creatureId}.json`
- **Upgrades**: `upgrades/{treeId}_tree.json` (e.g., `deep_sea_tree.json`)
- **Abilities**: `abilities/{abilityId}.json`
- **Player Data**: `player/{dataType}.json`

### Data File Formats

#### EssenceType JSON
```json
{
  "id": "deep_sea",
  "name": "Deep Sea",
  "color": "#1a237e",
  "description": "The essence of the abyssal depths..."
}
```

#### Biome JSON
```json
{
  "id": "deep_polluted",
  "name": "Polluted Depths",
  "baseDepth": "deep",
  "modifiers": ["polluted"],
  "depthRange": { "min": 200, "max": 1000 },
  "availableEssenceTypes": ["deep_sea", "polluted", "shallow"],
  "visualTheme": "Dark, murky, toxic, bioluminescent pollution",
  "backgroundAssets": {
    "backgroundImage": "biomes/deep_polluted_bg.png",
    "stageElements": ["biomes/pollution_particles.png"],
    "lighting": "dark_murky"
  },
  "essenceOrbSpawnRate": 0.3,
  "unlockCost": { "shallow": 150, "deep_sea": 50, "polluted": 25 }
}
```

#### Creature JSON
```json
{
  "id": "anglerfish",
  "name": "Anglerfish",
  "description": "A deep-sea predator...",
  "type": "predator",
  "rarity": "rare",
  "sprite": "creatures/anglerfish.png",
  "biomeId": "deep",
  "stats": {
    "size": 60,
    "speed": 3,
    "health": 40,
    "damage": 15
  },
  "essenceTypes": [
    { "type": "deep_sea", "baseYield": 30 },
    { "type": "shallow", "baseYield": 6 }
  ],
  "grantedAbilities": ["bioluminescence"],
  "spawnRules": {
    "canAppearIn": ["deep", "deep_polluted"],
    "spawnWeight": 20
  }
}
```

#### Upgrade Tree JSON
```json
[
  {
    "id": "deep_sea_resilience",
    "name": "Deep Sea Resilience",
    "description": "Increases health...",
    "category": "deep_sea",
    "requiredEssenceTypes": { "deep_sea": 15 },
    "prerequisites": [],
    "maxLevel": 10,
    "baseCost": 15,
    "costMultiplier": 1.5,
    "effects": [
      {
        "type": "stat",
        "target": "health",
        "value": 5,
        "perLevel": true
      }
    ]
  }
]
```

#### Player Essence JSON
```json
{
  "deep_sea": 150,
  "shallow": 45,
  "polluted": 0
}
```

#### Player Upgrades JSON
```json
{
  "deep_sea_resilience": 5,
  "coral_speed": 3,
  "pressure_adaptation": 2
}
```

---

## API Endpoints

### Creature Management

#### POST /api/save-creature

Save a creature's sprite and metadata together.

**Request Body**:
```typescript
{
  creatureId: string;
  sprite: File | Blob; // Image file
  metadata: Creature; // Complete Creature object (without sprite URL)
}
```

**Response**:
```typescript
{
  success: boolean;
  creatureId: string;
  spriteUrl: string; // Blob storage URL
  metadataUrl: string; // Blob storage URL for JSON
}
```

**Implementation Notes**:
- Uploads sprite to `creatures/{creatureId}.png`
- Uploads metadata to `creatures/{creatureId}.json`
- Returns both URLs

#### GET /api/get-creature?id={creatureId}

Get complete creature data (sprite + metadata).

**Query Parameters**:
- `id`: Creature ID

**Response**:
```typescript
{
  creature: Creature; // With sprite URL populated
  spriteUrl: string;
  metadata: Omit<Creature, 'sprite'>;
}
```

**Implementation Notes**:
- Fetches both sprite and metadata from blob storage
- Combines into single Creature object

#### GET /api/list-creatures?biome={biomeId}&rarity={rarity}

List creatures with optional filters.

**Query Parameters**:
- `biome`: Optional biome ID filter
- `rarity`: Optional rarity filter ('common' | 'rare' | 'epic' | 'legendary')
- `discovered`: Optional boolean (only show discovered creatures)

**Response**:
```typescript
{
  creatures: Array<{
    id: string;
    name: string;
    rarity: string;
    biomeId: string;
    spriteUrl: string;
    // ... other Creature fields
  }>;
  total: number;
}
```

**Implementation Notes**:
- Lists all creature JSON files from blob storage
- Applies filters
- Returns summary data (not full Creature objects for performance)

#### DELETE /api/delete-creature?id={creatureId}

Delete a creature (sprite + metadata).

**Query Parameters**:
- `id`: Creature ID

**Response**:
```typescript
{
  success: boolean;
  deleted: string[]; // Array of deleted blob paths
}
```

### Essence & Biome Management

#### GET /api/essence-types

Get all essence type definitions.

**Response**:
```typescript
{
  essenceTypes: EssenceType[];
}
```

#### GET /api/biomes

Get all biome definitions.

**Response**:
```typescript
{
  biomes: Biome[];
}
```

#### GET /api/biome?id={biomeId}

Get a specific biome definition.

**Query Parameters**:
- `id`: Biome ID

**Response**:
```typescript
{
  biome: Biome;
}
```

### Upgrade Management

#### GET /api/upgrade-trees?category={category}

Get upgrade trees.

**Query Parameters**:
- `category`: Optional filter ('deep_sea' | 'shallow' | 'polluted' | 'hybrid' | 'meta')

**Response**:
```typescript
{
  trees: Record<string, UpgradeNode[]>; // { 'deep_sea': [...], 'shallow': [...] }
}
```

#### GET /api/player/upgrades

Get player's upgrade levels.

**Response**:
```typescript
{
  upgrades: Record<string, number>; // { 'deep_sea_resilience': 5, ... }
}
```

#### POST /api/player/purchase-upgrade

Purchase an upgrade level.

**Request Body**:
```typescript
{
  upgradeId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  newLevel: number;
  essenceRemaining: Record<string, number>; // Updated essence totals
}
```

**Implementation Notes**:
- Validates prerequisites
- Checks essence availability
- Deducts essence
- Updates player upgrades JSON

### Ability Management

#### GET /api/abilities?type={type}

Get ability definitions.

**Query Parameters**:
- `type`: Optional filter ('active' | 'passive')

**Response**:
```typescript
{
  abilities: Ability[];
}
```

#### GET /api/player/abilities

Get player's unlocked abilities.

**Response**:
```typescript
{
  abilities: Record<string, boolean>; // { 'shield': true, 'speed_boost': true }
}
```

### Player Data Management

#### GET /api/player/essence

Get player's essence totals.

**Response**:
```typescript
{
  essence: Record<string, number>; // { 'deep_sea': 150, 'shallow': 45 }
}
```

#### POST /api/player/add-essence

Add essence after a run.

**Request Body**:
```typescript
{
  essence: Record<string, number>; // { 'deep_sea': 30, 'shallow': 5 }
}
```

**Response**:
```typescript
{
  success: boolean;
  newTotals: Record<string, number>;
}
```

#### GET /api/player/evo-points

Get player's Evo Points.

**Response**:
```typescript
{
  evoPoints: number;
}
```

#### POST /api/player/add-evo-points

Add Evo Points (on death).

**Request Body**:
```typescript
{
  evoPoints: number;
}
```

**Response**:
```typescript
{
  success: boolean;
  newTotal: number;
}
```

#### POST /api/player/purchase-meta-upgrade

Purchase a meta upgrade with Evo Points.

**Request Body**:
```typescript
{
  upgradeId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  newLevel: number;
  evoPointsRemaining: number;
}
```

#### GET /api/player/run-state

Get current run state (if run in progress).

**Response**:
```typescript
{
  runState: RunState | null;
}
```

#### POST /api/player/save-run-state

Save current run state.

**Request Body**:
```typescript
{
  runState: RunState;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

#### POST /api/player/calculate-score

Calculate score from run stats.

**Request Body**:
```typescript
{
  size: number;
  fishEaten: number;
  timeSurvived: number;
  essenceCollected: number;
}
```

**Response**:
```typescript
{
  score: number;
  evoPoints: number; // Calculated from score
}
```

#### GET /api/player/bestiary

Get player's discovered creatures.

**Response**:
```typescript
{
  discovered: Record<string, boolean>; // { 'anglerfish': true, 'clownfish': true }
  totalDiscovered: number;
  totalCreatures: number;
}
```

#### POST /api/player/discover-creature

Mark a creature as discovered.

**Request Body**:
```typescript
{
  creatureId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  newlyDiscovered: boolean;
}
```

---

## Migration Plan

### Current System

**Current FishData** (from `FishEditOverlay.tsx`):
```typescript
interface FishData {
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  stats: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  sprite: string;
}
```

**Current Storage**:
- Sprites: `sprites/fish/{fishId}.png` (or similar)
- No metadata persistence (lost on page refresh)

### Migration Steps

#### Phase 1: Data Structure Extension

1. **Create new Creature interface** that extends FishData
2. **Add default values** for new fields:
   - `rarity`: Default to 'common'
   - `biomeId`: Default to 'shallow'
   - `essenceTypes`: Default to single essence type based on biome
   - `spawnRules`: Default spawn rules

3. **Update FishEditOverlay** to support new fields:
   - Add rarity selector
   - Add biome selector (base depth + modifiers)
   - Add essence types configuration (multiple types)
   - Add migration UI button for old data structure

#### Phase 2: Storage Migration

1. **Create new API endpoints**:
   - `POST /api/save-creature` (replaces current save-sprite)
   - `GET /api/get-creature` (loads sprite + metadata)
   - `GET /api/list-creatures` (lists with metadata)

2. **Migration UI in Fish Editor**:
   - Detect old data structure
   - Show "Migrate to New Format" button
   - Allow user to assign biome, essence types, etc.
   - Convert old FishData to new Creature format

3. **Update save/load logic**:
   - Fish editor saves both sprite and metadata
   - Game loads both sprite and metadata
   - Support both old and new formats during transition

#### Phase 3: Essence System Integration

1. **Create essence type definitions**:
   - Save `essence/shallow.json`, `essence/deep_sea.json`, `essence/tropical.json`, `essence/polluted.json`, etc.

2. **Create biome definitions** (base depths + modifiers):
   - Save `biomes/shallow.json`, `biomes/shallow_tropical.json`, `biomes/medium.json`, `biomes/medium_polluted.json`, `biomes/deep.json`, etc.
   - Include background assets references

3. **Update creature data**:
   - Assign creatures to biomes (base depth + modifiers)
   - Assign essence types to creatures (all types always granted)

#### Phase 4: Upgrade & Ability Integration

1. **Create upgrade tree definitions**:
   - Save `upgrades/deep_sea_tree.json`, etc.

2. **Create ability definitions**:
   - Save `abilities/shield.json`, etc.

3. **Create player data storage**:
   - Initialize `player/essence.json`, `player/upgrades.json`, etc.

#### Phase 5: Game Integration

1. **Update game engine**:
   - Load creatures with metadata
   - Implement essence orb spawning in levels
   - Collect all essence types from creatures (no chance-based drops)
   - Implement digestion phase after level completion
   - Apply passive abilities (all abilities are passive)
   - Load biome backgrounds and stage elements
   - Implement async multiplayer (other players' fish)

2. **Update UI**:
   - Display essence totals (all types)
   - Show upgrade trees (impactful, few levels)
   - Show passive ability unlocks
   - Show digestion phase UI
   - Show biome selection (depth + modifiers)
   - Show other players' fish in bestiary

### Backward Compatibility

- **Legacy FishData** remains valid (can be converted to Creature)
- **Existing sprites** are preserved and migrated
- **Default values** ensure old data works with new system

### Migration Script

A migration script could:
1. List all existing sprites
2. For each sprite:
   - Create default Creature JSON
   - Assign default biome/essence based on filename or user input
   - Save both files
3. Report migration results

---

## Implementation Notes

### Type Safety

- All interfaces use TypeScript for type safety
- API responses should be validated against interfaces
- Consider using Zod or similar for runtime validation

### Performance

- **List endpoints** return summaries, not full objects
- **Pagination** may be needed for large creature lists
- **Caching** of static data (essence types, biomes, upgrade trees)

### Error Handling

- All endpoints should return consistent error format:
```typescript
{
  success: false;
  error: string;
  code?: string; // Error code for client handling
}
```

### Security

- **Authentication**: May be needed for player data endpoints
- **Validation**: Validate all input data
- **Rate Limiting**: Prevent abuse of save endpoints

---

## Next Steps

1. **Implement API endpoints** in Next.js API routes
2. **Create migration script** for existing data
3. **Update FishEditor** to save/load metadata
4. **Update game engine** to use new data structures
5. **Implement essence system** in game
6. **Implement upgrade trees** UI and logic
7. **Implement ability system** in game

See implementation files in `lib/game/` and `app/api/` for code.
