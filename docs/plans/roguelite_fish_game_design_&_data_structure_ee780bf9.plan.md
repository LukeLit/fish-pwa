---
name: Roguelite Fish Game Design & Data Structure
overview: Research game mechanics from Dave the Diver, Hungry Shark, and fisheatfish.io, then design a roguelite essence-based progression system with biomes, creatures, and upgrade trees. Create comprehensive documentation and design clean data structures for fish, essence, biomes, and upgrades.
todos:
  - id: research_dave
    content: Research and document Dave the Diver mechanics (fish quality, biomes, progression)
    status: completed
  - id: research_hungry_shark
    content: Research and document Hungry Shark mechanics (upgrades, progression, abilities)
    status: completed
  - id: research_fisheatfish
    content: Research and document fisheatfish.io mechanics (enchanting, progression, abilities)
    status: completed
  - id: create_research_doc
    content: Create RESEARCH_GAME_MECHANICS.md with comparative analysis
    status: completed
  - id: design_essence
    content: Design essence system (primary/secondary, types, yield formulas)
    status: completed
  - id: design_biomes
    content: Design biome system (structure, creature relationships, unlock requirements)
    status: completed
  - id: design_upgrades
    content: Design upgrade trees (essence-type-specific, hybrid upgrades, meta progression)
    status: completed
  - id: design_abilities
    content: Design ability system (active abilities, passive abilities, balancing)
    status: completed
  - id: create_design_doc
    content: Create ROGUELITE_DESIGN.md with complete game design
    status: completed
  - id: design_data_models
    content: Design TypeScript interfaces for all data structures
    status: completed
  - id: design_storage
    content: Design blob storage organization and API endpoints
    status: completed
  - id: create_data_doc
    content: Create DATA_STRUCTURE.md with complete specifications
    status: completed
isProject: false
---

# Roguelite Fish Game Design & Data Structure Plan

## Phase 1: Deep Research

### 1.1 Dave the Diver Analysis

- **Fish Quality System**: 3-star rating (dead/alive/harpoon-free) affects meat yield
- **Fish Farm**: Breeding mechanics, egg/roe generation, density limits
- **Marinca Cards**: Collection system with quality-based rankings
- **Depth/Biome System**: Different fish at different depths (Shallows 0-50m, Medium 50-130m, Depths 130-250m)
- **Fish Attributes**: Weight, length, active time (day/night), usable menus
- **Document**: Extract all fish attributes, biome associations, and progression mechanics

### 1.2 Hungry Shark Evolution Analysis

- **Stat Upgrades**: Bite, Speed, Boost (three core stats)
- **Shark Progression**: Unlock tiers (Great White → Megalodon → Big Daddy → Sharkjira)
- **Accessories**: Jetpack, Laser Beams, Hypno Hats (special abilities)
- **Currency**: Coins and gems for upgrades/unlocks
- **Roguelite Loop**: Earn currency → upgrade → unlock next tier → repeat
- **Document**: Extract upgrade patterns, progression gates, and ability mechanics

### 1.3 fisheatfish.io Analysis

- **Enchanting System**: 34 enchantments with stat boosts, XP multipliers, mutation chances
- **Rod Progression**: 178 rods with 5 stats (Lure Speed, Luck, Control, Resilience, Max Kg)
- **Stage Progression**: 12 stages unlocking new areas
- **Passive Abilities**: Rod-specific bonuses for certain fish types
- **Document**: Extract enchanting mechanics, progression structure, and ability systems

### 1.4 Research Documentation

Create `RESEARCH_GAME_MECHANICS.md` with:

- Comparative analysis tables
- Key mechanics extracted from each game
- Inspiration for our roguelite formula
- Mechanics that fit fish-eat-fish genre

## Phase 2: Design Jam

### 2.1 Essence System Design

**Structure**:

- Primary essence type (determines main upgrade tree access)
- Optional secondary essence (10-30% of primary amount, unlocks hybrid upgrades)
- Essence types: Deep Sea, Shallow, Polluted, Cosmic, Demonic, Robotic (expandable)

**Essence Yield Formula**:

- Base yield = fish size × biome multiplier
- Quality multiplier (1x/1.5x/2x for different catch methods)
- Rarity multiplier (common/rare/epic/legendary)

### 2.2 Biome & Creature System

**Biome Structure**:

- Each biome has: name, depth range, visual theme, essence types available
- Biomes: Deep Sea, Shallow, Polluted, Cosmic, Demonic, Robotic

**Creature Structure**:

- Exclusive creatures: Only appear in their native biome
- Shared creatures: Appear in multiple biomes with different essence yields
- Creature attributes: Primary essence type, secondary essence (optional), base stats, rarity tier

### 2.3 Roguelite Meta-Progression

**Upgrade Trees** (essence-type specific):

- Each essence type has its own tech tree
- Hybrid upgrades require multiple essence types
- Meta upgrades (essence multiplier, unlock new biomes) use all types

**Run-to-Run Progression**:

- Permanent upgrades purchased with essence
- Unlock new biomes by spending essence
- Unlock new creature types by discovering them

### 2.4 Ability System

**Active Abilities** (run-time):

- Recharging shield (blocks one hit, 30s cooldown)
- Stun projectile (stuns nearby fish, makes them edible)
- Speed boost (temporary speed increase)
- Growth burst (instant size increase)

**Passive Abilities** (upgrade-based):

- Essence magnet (attract essence from further away)
- Regeneration (slow health regen)
- Damage aura (damage nearby smaller fish)
- Essence multiplier (earn more essence per kill)

### 2.5 Design Documentation

Create `ROGUELITE_DESIGN.md` with:

- Complete essence system specification
- Biome and creature definitions
- Upgrade tree structures
- Ability mechanics and balancing
- Progression curves and formulas

## Phase 3: Data Structure Design

### 3.1 Core Data Models

**EssenceType**:

```typescript
interface EssenceType {
  id: string; // 'deep_sea', 'shallow', 'cosmic', etc.
  name: string;
  color: string; // For UI display
  description: string;
}
```

**Biome**:

```typescript
interface Biome {
  id: string;
  name: string;
  depthRange: { min: number; max: number };
  availableEssenceTypes: string[]; // EssenceType IDs
  visualTheme: string;
  unlockCost: Record<string, number>; // Essence costs
}
```

**Creature** (extends FishData):

```typescript
interface Creature extends FishData {
  biomeId: string; // Native biome
  canAppearIn: string[]; // Other biomes it can spawn in
  primaryEssence: {
    type: string; // EssenceType ID
    baseYield: number;
  };
  secondaryEssence?: {
    type: string;
    baseYield: number; // 10-30% of primary
    chance: number; // 0-1 probability
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  abilities?: string[]; // Ability IDs this creature can grant
}
```

**UpgradeTree**:

```typescript
interface UpgradeNode {
  id: string;
  name: string;
  description: string;
  requiredEssenceTypes: Record<string, number>; // { 'deep_sea': 10, 'cosmic': 5 }
  prerequisites: string[]; // Upgrade IDs
  maxLevel: number;
  effects: UpgradeEffect[];
}

interface UpgradeEffect {
  type: 'stat' | 'ability' | 'unlock';
  target: string; // Stat name or ability ID
  value: number | string;
  perLevel?: boolean;
}
```

### 3.2 Fish Data Structure Enhancement

**Enhanced FishData**:

```typescript
interface FishData {
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  
  // Visual
  sprite: string; // URL to sprite image
  biomeId: string; // Which biome this fish belongs to
  
  // Stats
  stats: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  
  // Essence system
  essence: {
    primary: {
      type: string; // EssenceType ID
      baseYield: number;
    };
    secondary?: {
      type: string;
      baseYield: number;
      chance: number;
    };
  };
  
  // Rarity and progression
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockRequirement?: {
    biomeUnlocked: string[];
    essenceSpent: Record<string, number>;
  };
  
  // Abilities this fish can grant when consumed
  grantedAbilities?: string[];
}
```

### 3.3 Storage Structure

**Blob Storage Organization**:

- `fish/{fishId}.png` - Sprite image
- `fish/{fishId}.json` - FishData metadata (essence, stats, abilities)
- `biomes/{biomeId}.json` - Biome definitions
- `essence/{essenceTypeId}.json` - Essence type definitions
- `upgrades/{upgradeTreeId}.json` - Upgrade tree definitions

**API Endpoints to Create**:

- `POST /api/save-fish` - Save sprite + metadata together
- `GET /api/list-fish?biome=deep_sea` - List fish with metadata
- `GET /api/get-fish?id=...` - Get complete fish data (sprite + metadata)

### 3.4 Data Structure Documentation

Create `DATA_STRUCTURE.md` with:

- Complete TypeScript interfaces
- Blob storage organization
- API endpoint specifications
- Migration plan from current system

## Phase 4: Implementation Files

### Files to Create/Modify:

1. **`lib/game/essence-types.ts`** - Essence type definitions
2. **`lib/game/biomes.ts`** - Biome definitions and management
3. **`lib/game/creatures.ts`** - Creature definitions (extends FishData)
4. **`lib/meta/essence-manager.ts`** - Enhanced with multiple essence types
5. **`lib/meta/upgrade-trees.ts`** - Essence-type-specific upgrade trees
6. **`app/api/save-fish/route.ts`** - Save sprite + metadata together
7. **`app/api/get-fish/route.ts`** - Load complete fish data
8. **`RESEARCH_GAME_MECHANICS.md`** - Research findings
9. **`ROGUELITE_DESIGN.md`** - Complete game design document
10. **`DATA_STRUCTURE.md`** - Data model specifications

## Implementation Order

1. **Research Phase** (Documentation only)

   - Extract mechanics from all three games
   - Create research document

2. **Design Phase** (Documentation only)

   - Design essence system
   - Design biome/creature relationships
   - Design upgrade trees
   - Design ability system
   - Create design document

3. **Data Structure Phase** (Documentation only)

   - Define all TypeScript interfaces
   - Design blob storage structure
   - Create data structure document

4. **Implementation Phase** (After plan approval)

   - Create new data models
   - Update existing FishData structure
   - Implement save/load with metadata
   - Migrate existing fish data