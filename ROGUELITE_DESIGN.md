# Roguelite Fish Game Design Document

This document defines the complete game design for our roguelite fish-eat-fish game, including the essence system, biome structure, upgrade trees, and ability mechanics.

## Table of Contents

1. [Essence System](#essence-system)
2. [Biome System](#biome-system)
3. [Creature System](#creature-system)
4. [Upgrade Trees](#upgrade-trees)
5. [Ability System](#ability-system)
6. [Progression Curves](#progression-curves)
7. [Gameplay Loop](#gameplay-loop)

---

## Essence System

### Overview

Essence is the primary currency system that drives all meta-progression. Unlike a single currency, essence comes in multiple types, each tied to specific biomes and upgrade trees. This creates strategic depth and build variety.

### Essence Types

**Core Essence Types** (Starting Set):
1. **Shallow Essence** (Light Blue/Green)
   - From: Shallow depth creatures
   - Theme: Coral reefs, vibrant life, speed
   - Upgrade Focus: Speed, agility, evasion

2. **Deep Sea Essence** (Dark Blue/Purple)
   - From: Deep depth creatures
   - Theme: Pressure, darkness, ancient creatures
   - Upgrade Focus: Defense, health, pressure resistance

3. **Tropical Essence** (Bright Yellow/Orange)
   - From: Tropical archetype creatures
   - Theme: Warm waters, colorful life, abundance
   - Upgrade Focus: Growth, vitality, abundance

4. **Polluted Essence** (Yellow/Orange/Brown)
   - From: Polluted archetype creatures
   - Theme: Toxicity, mutation, adaptation
   - Upgrade Focus: Damage over time, resistance, mutations

**Additional Essence Types** (Available for Expansion):
5. **Cosmic Essence** (Purple/White/Stars)
   - From: Cosmic biome creatures
   - Theme: Space, gravity, energy
   - Upgrade Focus: Energy abilities, gravity manipulation

6. **Demonic Essence** (Red/Black)
   - From: Demonic biome creatures
   - Theme: Fire, chaos, power
   - Upgrade Focus: Damage, aggression, fire abilities

7. **Robotic Essence** (Silver/Cyan)
   - From: Robotic biome creatures
   - Theme: Technology, precision, efficiency
   - Upgrade Focus: Precision, automation, tech abilities

8. **Radioactive Essence** (Green/Glowing)
   - From: Radioactive modifier creatures
   - Theme: Radiation, mutation, energy
   - Upgrade Focus: Unique mutations, energy bursts

### Essence Collection & Digestion

**During Run**:
- Creatures drop **essence orbs** when consumed
- Each creature provides **all essence types** it contains (no chance-based drops)
- Essence orbs are collected during the run
- Essence orbs can also spawn in the environment to help kickstart growth
- Players start much smaller than other fish and can collect essence orbs while avoiding larger predators

**Digestion Phase** (After Completing Level):
- After completing a level/round, all collected essence enters a "digestion" phase
- Digestion is a fun, gamified math system that determines how essence is converted
- The digestion system allows for strategic choices in how essence is allocated
- Players can influence digestion outcomes through upgrades and choices
- Final essence totals are added to player's permanent storage

### Essence Yield Formula

```
Base Yield = Creature Size × Biome Multiplier

Quality Multiplier:
- Standard Kill: 1.0x
- Perfect Kill (no damage taken): 1.5x
- Combo Kill (chain of 3+): 2.0x

Rarity Multiplier:
- Common: 1.0x
- Rare: 1.5x
- Epic: 2.0x
- Legendary: 3.0x

Raw Essence Collected = Base Yield × Quality Multiplier × Rarity Multiplier

All essence types from creature are collected, then processed through digestion phase.
```

**Example**:
- Legendary Deep Sea + Polluted creature, size 50, Perfect Kill
- Base: 50 × 1.0 = 50
- Quality: 50 × 1.5 = 75
- Rarity: 75 × 3.0 = 225 raw essence
- Creature provides: 150 Deep Sea + 75 Polluted (all collected)
- Digestion phase processes these into final essence totals

### Essence Storage

- Each essence type is stored separately
- Displayed in UI as: `Shallow: 150 | Deep Sea: 45 | Polluted: 0 | Tropical: 30`
- Total essence can be shown for meta upgrades that require all types

---

## Biome System

### Biome Structure

Biomes are composed of **Base Depths** combined with **Archetype Modifiers**. This allows for flexible biome combinations and progressive difficulty.

**Base Depths** (Grounded in Reality):
- **Shallow**: 0-50m (starting depth)
- **Medium**: 50-200m
- **Deep**: 200-1000m
- **Abyssal**: 1000m+ (future expansion)

**Archetype Modifiers** (Can Combine with Depths):
- **Tropical**: Warm, colorful, abundant life
- **Polluted**: Toxic, murky, industrial waste
- **Radioactive**: Glowing, mutated, high energy
- **Cosmic**: Space-themed, gravity effects
- **Demonic**: Fire, chaos, aggressive
- **Robotic**: Tech, precision, mechanical

**Biome Composition**:
- A biome is defined as: `{baseDepth} + {modifier(s)}`
- Examples: "Shallow + Tropical", "Deep + Polluted", "Medium + Radioactive"
- Modifiers can stack: "Shallow + Tropical + Polluted" (rare, high difficulty)

### Biome Data Structure

Each biome defines:
- **ID**: Unique identifier (e.g., `shallow_tropical`, `deep_polluted`)
- **Name**: Display name (e.g., "Tropical Shallows", "Polluted Depths")
- **Base Depth**: `shallow` | `medium` | `deep` | `abyssal`
- **Modifiers**: Array of archetype IDs (e.g., `["tropical"]`, `["polluted", "radioactive"]`)
- **Depth Range**: Min/max depth in meters
- **Visual Theme**: Art style, colors, lighting
- **Background Assets**: References to background images, stage elements
- **Available Essence Types**: Which essence types can be found here
- **Unlock Cost**: Essence costs to unlock this biome combination
- **Creature Spawn Rules**: Which creatures appear, spawn rates
- **Essence Orb Spawn Rate**: How frequently essence orbs spawn in environment

### Core Biomes

#### 1. Shallow (Starting Biome)
- **ID**: `shallow`
- **Base Depth**: Shallow (0-50m)
- **Modifiers**: None (base biome)
- **Visual Theme**: Bright, colorful coral reefs
- **Background**: Standard shallow water background
- **Available Essence**: Primarily Shallow
- **Unlock Cost**: Free (starting biome)
- **Creature Count**: ~20-30 species
- **Essence Orb Spawn**: High (helps kickstart growth)

#### 2. Shallow + Tropical
- **ID**: `shallow_tropical`
- **Base Depth**: Shallow (0-50m)
- **Modifiers**: `["tropical"]`
- **Visual Theme**: Vibrant tropical waters, colorful reefs
- **Background**: Tropical shallow background with palm trees, bright colors
- **Available Essence**: Shallow + Tropical
- **Unlock Cost**: 50 Shallow Essence
- **Creature Count**: ~15-20 species (tropical variants)
- **Essence Orb Spawn**: Very High

#### 3. Medium
- **ID**: `medium`
- **Base Depth**: Medium (50-200m)
- **Modifiers**: None
- **Visual Theme**: Transitional depth, moderate lighting
- **Background**: Medium depth background
- **Available Essence**: Shallow + Deep Sea (mixed)
- **Unlock Cost**: 100 Shallow Essence
- **Creature Count**: ~15-20 species
- **Essence Orb Spawn**: Medium

#### 4. Medium + Polluted
- **ID**: `medium_polluted`
- **Base Depth**: Medium (50-200m)
- **Modifiers**: `["polluted"]`
- **Visual Theme**: Murky, toxic, industrial waste
- **Background**: Polluted medium depth with waste, murky water
- **Available Essence**: Shallow + Deep Sea + Polluted
- **Unlock Cost**: 50 Shallow + 25 Deep Sea Essence
- **Creature Count**: ~15-20 species (mutated variants)
- **Essence Orb Spawn**: Low (pollution makes collection harder)

#### 5. Deep
- **ID**: `deep`
- **Base Depth**: Deep (200-1000m)
- **Modifiers**: None
- **Visual Theme**: Dark, bioluminescent, pressure effects
- **Background**: Deep sea background with bioluminescence
- **Available Essence**: Primarily Deep Sea
- **Unlock Cost**: 150 Shallow + 50 Deep Sea Essence
- **Creature Count**: ~15-20 species
- **Essence Orb Spawn**: Low

### Run Structure: Progressive Depth Rounds

A run consists of multiple **rounds**, each going deeper with increasing modifiers:

**Example Run**:
1. **Round 1**: Shallow (0-50m) - Base difficulty
2. **Round 2**: Shallow + Tropical (0-50m) - Added tropical modifier
3. **Round 3**: Medium (50-200m) - Deeper, base
4. **Round 4**: Medium + Polluted (50-200m) - Deeper + pollution modifier
5. **Round 5**: Deep (200-1000m) - Much deeper
6. **Round 6**: Deep + Polluted + Radioactive (200-1000m) - Maximum difficulty

**Progression Logic**:
- Each round goes deeper than the last
- Modifiers are added progressively (start simple, get crazier)
- Later rounds combine multiple modifiers for extreme difficulty
- Players can unlock new depth levels and modifiers through essence spending

### Biome Unlock Requirements

- **Shallow**: Always unlocked (starting biome)
- **Shallow + Tropical**: 50 Shallow Essence
- **Medium**: 100 Shallow Essence
- **Medium + Polluted**: 50 Shallow + 25 Deep Sea Essence
- **Deep**: 150 Shallow + 50 Deep Sea Essence
- **Deep + Modifiers**: Varies by modifier type
- **New Modifiers**: Unlocked through meta upgrades or discovery

### Biome Progression

- Players start in Shallow biome
- Earn essence from creatures and essence orbs
- Unlock new depth levels and modifiers by spending essence
- Each biome combination offers different creatures, challenges, and essence types
- Deeper biomes have stronger creatures and better essence yields
- Modifiers add variety and difficulty scaling

---

## Creature System

### Creature Structure

Each creature (fish) has:

**Identity**:
- `id`: Unique identifier
- `name`: Display name
- `description`: Flavor text
- `type`: `prey` | `predator` | `mutant`
- `rarity`: `common` | `rare` | `epic` | `legendary`

**Visual**:
- `sprite`: URL to sprite image
- `biomeId`: Native biome (determines visual style)
- `size`: Base size (affects collision, visibility, essence yield)

**Stats**:
- `size`: Physical size (20-200)
- `speed`: Movement speed (1-10)
- `health`: Hit points (1-100)
- `damage`: Attack damage (1-50)

**Essence**:
- `essenceTypes`: Array of essence types this creature provides
  - Each entry: `{ type: EssenceType ID, baseYield: number }`
  - All essence types are always granted (no chance-based drops)
  - Creatures can provide multiple essence types (e.g., Shallow + Tropical)

**Progression**:
- `unlockRequirement`: Optional
  - `biomeUnlocked`: Array of biome IDs that must be unlocked
  - `essenceSpent`: Record of essence types and amounts spent
- `grantedAbilities`: Array of ability IDs this creature can grant when consumed

**Spawn Rules**:
- `canAppearIn`: Array of biome IDs where this creature can spawn
- `spawnWeight`: Relative spawn probability (1-100)
- `minDepth`: Minimum depth to spawn
- `maxDepth`: Maximum depth to spawn

### Creature Examples

#### Common Shallow Fish
```typescript
{
  id: "clownfish",
  name: "Clownfish",
  description: "A small, vibrant fish found in coral reefs.",
  type: "prey",
  rarity: "common",
  biomeId: "shallow",
  size: 25,
  speed: 6,
  health: 10,
  damage: 2,
  essenceTypes: [
    { type: "shallow", baseYield: 5 }
  ],
  spawnRules: {
    canAppearIn: ["shallow", "shallow_tropical"],
    spawnWeight: 50
  }
}
```

#### Rare Deep Sea Creature
```typescript
{
  id: "anglerfish",
  name: "Anglerfish",
  description: "A deep-sea predator with a bioluminescent lure.",
  type: "predator",
  rarity: "rare",
  biomeId: "deep",
  size: 60,
  speed: 3,
  health: 40,
  damage: 15,
  essenceTypes: [
    { type: "deep_sea", baseYield: 30 },
    { type: "shallow", baseYield: 6 } // 20% of primary, always granted
  ],
  grantedAbilities: ["bioluminescence"],
  spawnRules: {
    canAppearIn: ["deep"],
    spawnWeight: 20
  }
}
```

#### Epic Polluted Mutant
```typescript
{
  id: "toxic_eel",
  name: "Toxic Eel",
  description: "A mutated eel adapted to polluted waters.",
  type: "mutant",
  rarity: "epic",
  biomeId: "medium_polluted",
  size: 80,
  speed: 4,
  health: 60,
  damage: 25,
  essenceTypes: [
    { type: "polluted", baseYield: 50 },
    { type: "deep_sea", baseYield: 10 }, // Always granted
    { type: "shallow", baseYield: 5 } // Always granted
  ],
  grantedAbilities: ["toxic_aura", "regeneration"],
  spawnRules: {
    canAppearIn: ["medium_polluted", "deep_polluted"],
    spawnWeight: 5
  }
}
```

### Creature Discovery

- Creatures are discovered when first encountered
- Discovered creatures appear in a "Bestiary" collection
- Unlocking new biomes reveals new creature types
- Some creatures require specific unlock requirements (essence spent, biomes unlocked)

### Starter Creature (Vertical Slice)

**Goldfish** - The only fish unlocked for new players:

```typescript
{
  id: "goldfish_starter",
  name: "Goldfish",
  description: "A small, hardy fish perfect for beginners. Fast and agile.",
  type: "prey",
  rarity: "common",
  biomeId: "shallow",
  stats: {
    size: 20, // Very small - smaller than most fish
    speed: 7, // Fast for survival
    health: 15, // Low health - must be careful
    damage: 3 // Low damage - can only eat very small fish
  },
  essenceTypes: [
    { type: "shallow", baseYield: 3 }
  ],
  grantedAbilities: [], // No abilities for starter
  spawnRules: {
    canAppearIn: ["shallow"],
    spawnWeight: 50
  }
}
```

**Design Intent**: 
- Challenging but doable without meta upgrades
- Fast speed helps avoid predators
- Small size creates tension
- Only Shallow essence (simple for new players)

---

## Upgrade Trees

### Tree Structure

Each essence type has its own upgrade tree. Upgrades follow the **Monster Train philosophy**: impactful upgrades with few levels (typically 2-5 max), not just incremental stat increases.

Upgrades can be:
- **Essence-Type-Specific**: Require only one essence type
- **Hybrid**: Require multiple essence types (enables cross-biome builds)
- **Meta**: Require all essence types (universal progression)

### Upgrade Philosophy (Inspired by Monster Train & Starvaders)

- **Impactful, Not Incremental**: Upgrades provide meaningful gameplay changes, not just +1 stat
- **Few Levels**: Most upgrades max at 2-5 levels (not 10+)
- **Game-Changing Effects**: Beyond stats - unlock abilities, change mechanics, enable new strategies
- **Strategic Choices**: Limited upgrade slots/points create meaningful decisions
- **Power Spikes**: Each level feels significant, not just "slightly better"

### Upgrade Node Structure

```typescript
{
  id: "upgrade_id",
  name: "Display Name",
  description: "What this upgrade does",
  category: "shallow" | "deep_sea" | "tropical" | "polluted" | "hybrid" | "meta",
  requiredEssenceTypes: {
    "deep_sea": 10,
    "shallow": 5
  },
  prerequisites: ["other_upgrade_id"], // Must have these upgrades first
  maxLevel: 3, // Typically 2-5, not 10+
  baseCost: 20, // Cost at level 0
  costPerLevel: 15, // Flat cost increase per level (or use multiplier)
  effects: [
    {
      type: "stat" | "ability" | "unlock" | "mechanic",
      target: "health" | "speed" | "shield_ability" | "digestion_bonus",
      value: 10, // Flat increase or percentage
      perLevel: true // If true, value is per level
    }
  ],
  impactLevel: "low" | "medium" | "high" | "game_changing" // How impactful this upgrade is
}
```

### Deep Sea Upgrade Tree Examples

#### Deep Sea Resilience
- **Category**: `deep_sea`
- **Cost**: 20 Deep Sea Essence (base), +15 per level
- **Max Level**: 3
- **Effect**: 
  - Level 1: +20 Health
  - Level 2: +30 Health, +10% damage resistance in deep biomes
  - Level 3: +40 Health, +20% damage resistance, unlock "Pressure Adaptation" passive
- **Prerequisites**: None
- **Impact**: High (game-changing at level 3)

#### Pressure Adaptation
- **Category**: `deep_sea`
- **Cost**: 30 Deep Sea Essence (base), +20 per level
- **Max Level**: 2
- **Effect**:
  - Level 1: +15% damage resistance in deep biomes, ignore pressure effects
  - Level 2: +25% damage resistance, +10% speed in deep biomes
- **Prerequisites**: ["deep_sea_resilience"] (level 2+)
- **Impact**: High

#### Bioluminescent Lure
- **Category**: `deep_sea`
- **Cost**: 50 Deep Sea Essence
- **Max Level**: 1
- **Effect**: Unlocks "Bioluminescence" passive ability (attracts smaller fish, reveals hidden creatures)
- **Prerequisites**: ["pressure_adaptation"] (level 1+)
- **Impact**: Game-changing (new mechanic)

### Shallow Upgrade Tree Examples

#### Coral Speed
- **Category**: `shallow`
- **Cost**: 15 Shallow Essence (base), +10 per level
- **Max Level**: 3
- **Effect**:
  - Level 1: +1 Speed
  - Level 2: +1.5 Speed, +5% evasion
  - Level 3: +2 Speed, +10% evasion, unlock "Swift Current" passive
- **Prerequisites**: None
- **Impact**: High

#### Reef Agility
- **Category**: `shallow`
- **Cost**: 25 Shallow Essence (base), +15 per level
- **Max Level**: 2
- **Effect**:
  - Level 1: +15% evasion chance, +10% speed when near obstacles
  - Level 2: +25% evasion, +20% speed near obstacles, dodge one attack every 30 seconds
- **Prerequisites**: ["coral_speed"] (level 2+)
- **Impact**: High

#### Swift Current
- **Category**: `shallow`
- **Cost**: 40 Shallow Essence
- **Max Level**: 1
- **Effect**: Unlocks "Swift Current" passive ability (periodic speed bursts, essence magnet effect)
- **Prerequisites**: ["reef_agility"] (level 1+)
- **Impact**: Game-changing

### Polluted Upgrade Tree Examples

#### Toxic Resistance
- **Category**: `polluted`
- **Cost**: 20 Polluted Essence (base), +15 per level
- **Max Level**: 3
- **Effect**:
  - Level 1: +15 Health, immune to poison
  - Level 2: +25 Health, +5% damage resistance, poison enemies on contact
  - Level 3: +35 Health, +10% damage resistance, unlock "Toxic Aura" passive
- **Prerequisites**: None
- **Impact**: High

#### Mutation Frequency
- **Category**: `polluted`
- **Cost**: 30 Polluted Essence (base), +20 per level
- **Max Level**: 2
- **Effect**:
  - Level 1: +20% chance for beneficial mutations, mutations last 50% longer
  - Level 2: +40% mutation chance, mutations last 100% longer, can stack 2 mutations
- **Prerequisites**: ["toxic_resistance"] (level 2+)
- **Impact**: Game-changing

#### Toxic Aura
- **Category**: `polluted`
- **Cost**: 50 Polluted Essence
- **Max Level**: 1
- **Effect**: Unlocks "Toxic Aura" passive ability (damage nearby smaller fish, poison cloud effect)
- **Prerequisites**: ["mutation_frequency"] (level 1+)
- **Impact**: Game-changing

### Hybrid Upgrades

Hybrid upgrades require multiple essence types, enabling cross-biome builds:

#### Abyssal Swiftness
- **Category**: `hybrid`
- **Cost**: 20 Deep Sea + 15 Shallow Essence per level
- **Max Level**: 5
- **Effect**: +0.3 Speed per level, +2 Health per level
- **Prerequisites**: ["coral_speed"] (level 3+) AND ["deep_sea_resilience"] (level 3+)

#### Mutated Depths
- **Category**: `hybrid`
- **Cost**: 25 Deep Sea + 20 Polluted Essence per level
- **Max Level**: 3
- **Effect**: +5% damage per level, creatures in deep sea have 10% chance to drop polluted essence
- **Prerequisites**: ["pressure_adaptation"] (level 2+) AND ["mutation_frequency"] (level 2+)

### Meta Upgrades

Meta upgrades require all essence types and provide universal benefits:

#### Essence Multiplier
- **Category**: `meta`
- **Cost**: 50 of each essence type per level
- **Max Level**: 5
- **Effect**: +10% essence earned per level (multiplicative)
- **Prerequisites**: None (but expensive)

#### Biome Unlocker
- **Category**: `meta`
- **Cost**: 100 of each essence type
- **Max Level**: 1 (per new biome)
- **Effect**: Unlocks a new biome (e.g., Cosmic, Demonic, Robotic)
- **Prerequisites**: ["essence_multiplier"] (level 2+)

#### Universal Growth
- **Category**: `meta`
- **Cost**: 200 of each essence type per level
- **Max Level**: 3
- **Effect**: +10% starting size per level, +5% max size per level
- **Prerequisites**: ["essence_multiplier"] (level 3+)

---

## Ability System

### Ability Philosophy

**All abilities are PASSIVE** - no player-activated abilities. Abilities are always active once unlocked, providing constant benefits or periodic effects. This creates a "build" feel where players customize their fish's passive traits.

### Passive Abilities

#### Shield (Recharging)
- **Unlock**: Deep Sea tree or hybrid upgrade
- **Type**: Passive (periodic)
- **Effect**: Automatically blocks one hit of damage every 20-30 seconds (scales with upgrades)
- **Visual**: Glowing barrier appears when active, then recharges
- **Upgradeable**: Can reduce cooldown, increase blocks, or add effects

#### Bioluminescence
- **Unlock**: Deep Sea tree
- **Type**: Passive (always active)
- **Effect**: Creates a constant light that attracts smaller fish from 150px away, reveals hidden creatures
- **Visual**: Constant bright glow around player
- **Upgradeable**: Increase attraction range, add periodic stun effect

#### Swift Current
- **Unlock**: Shallow tree
- **Type**: Passive (periodic)
- **Effect**: Every 10-15 seconds, gain +50% speed for 3 seconds, essence orbs are attracted from further away
- **Visual**: Speed lines, trail effect during burst
- **Upgradeable**: Reduce cooldown, increase speed bonus, increase essence magnet range

#### Toxic Aura
- **Unlock**: Polluted tree
- **Type**: Passive (always active)
- **Effect**: Damage nearby smaller fish (within 80px) for 2 damage per second, poison effect on contact
- **Visual**: Green toxic cloud around player
- **Upgradeable**: Increase radius, increase damage, add slow effect

#### Essence Magnet
- **Unlock**: Meta upgrade or hybrid
- **Type**: Passive (always active)
- **Effect**: Attract essence orbs from 50% further away, faster collection speed
- **Visual**: Subtle pull effect on essence orbs
- **Upgradeable**: Increase range, increase pull speed, add bonus essence on collection

#### Regeneration
- **Unlock**: Deep Sea tree or Polluted tree
- **Type**: Passive (always active)
- **Effect**: Regenerate 1 health per 5 seconds
- **Visual**: Subtle healing particles
- **Upgradeable**: Increase regen rate, add over-heal shield, add regen on kill

#### Pressure Adaptation
- **Unlock**: Deep Sea tree
- **Type**: Passive (always active in deep biomes)
- **Effect**: Take 10% less damage in deep sea biomes, ignore pressure effects
- **Visual**: Subtle pressure-resistant aura
- **Upgradeable**: Increase resistance, add speed bonus in deep biomes

#### Coral Camouflage
- **Unlock**: Shallow tree
- **Type**: Passive (always active)
- **Effect**: 15% chance to avoid detection by predators, +10% speed when near obstacles
- **Visual**: Subtle camouflage shimmer
- **Upgradeable**: Increase evasion chance, add temporary invisibility on low health

### Ability Balancing

**Passive Ability Guidelines**:
- **Always Active**: Provide constant benefits or periodic effects
- **Impactful**: Each ability significantly changes gameplay, not just small stat boosts
- **Upgradeable**: Can be enhanced through upgrade trees
- **Synergistic**: Abilities from different trees can combine for powerful builds

**Periodic Abilities** (like Shield, Swift Current):
- Cooldowns: 10-30 seconds (much lower than active abilities would be)
- Level duration: ~5 minutes, so abilities trigger 10-30 times per level
- Visual feedback: Clear indication when ability is active vs. recharging

**Always Active Abilities** (like Bioluminescence, Toxic Aura):
- Constant effects that define build identity
- Visual effects should be clear but not overwhelming
- Can be upgraded to increase effectiveness

**Synergy Examples**:
- **Swift Current + Essence Magnet**: Faster essence collection during speed bursts
- **Shield + Regeneration**: Tank build with constant healing and periodic protection
- **Toxic Aura + Pressure Adaptation**: Aggressive deep-sea build
- **Bioluminescence + Coral Camouflage**: Stealth predator that lures prey

---

## Hunger System

### Overview

The hunger system adds tension and a time pressure element to each level. Players must balance aggressive play (eating for growth) with survival (maintaining hunger).

### Mechanics

- **Hunger Meter**: Starts at 100%, decreases over time
- **Decrease Rate**: ~1-2% per second (adjustable per difficulty)
- **Refill**: Eating fish restores hunger (amount based on fish size)
- **Death Condition**: Hunger reaches 0% → Player dies (starvation)
- **Warning**: Visual/audio warning at 25% hunger

### Balance

- **Without Meta Upgrades**: Challenging - must eat regularly to survive
- **With Meta Upgrades**: Easier - upgrades can reduce hunger drain or increase refill
- **Risk/Reward**: Aggressive play = faster growth but more danger of starvation

### Visual Feedback

- **Hunger Meter**: Top center of HUD, color-coded (green → yellow → red)
- **Low Hunger Warning**: Screen tint, pulsing effect, audio cue
- **Refill Feedback**: Visual particles when eating restores hunger

---

## Evo Points System

### Overview

Evo Points are the meta-progression currency earned on death. They're separate from essence (which is run-based currency). Evo Points purchase permanent upgrades that persist across all runs.

### Earning Evo Points

**Score Calculation** (on death):
```
Score = (Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)
```

**Evo Points Conversion**:
```
Evo Points = Score / 10 (rounded down)
Minimum: 1 evo point (even for very short runs)
```

**Example**:
- Size: 45, Fish Eaten: 12, Time: 90s, Essence: 30
- Score: (45 × 10) + (12 × 5) + (90 × 2) + (30 × 3) = 450 + 60 + 180 + 90 = 780
- Evo Points: 780 / 10 = 78

### Meta Upgrades (Purchased with Evo Points)

**Examples**:
- **Starting Size +5**: Start each run larger (cost: 50 Evo Points)
- **Starting Speed +1**: Start each run faster (cost: 40 Evo Points)
- **Essence Multiplier +10%**: Earn more essence per run (cost: 100 Evo Points)
- **Hunger Drain -10%**: Hunger decreases slower (cost: 60 Evo Points)
- **Unlock New Fish**: Unlock additional starter fish (cost: 200 Evo Points)
- **Reroll Bonus +1**: Start runs with extra rerolls (cost: 150 Evo Points)

### Design Philosophy

- **Separate from Essence**: Evo Points are meta-progression, essence is run-progression
- **Death Rewards**: Even failed runs provide progression
- **Permanent Upgrades**: Make future runs easier/more interesting
- **Meaningful Choices**: Which meta upgrades to prioritize?

---

## Digestion System

### Overview

The digestion system converts collected essence into level-ups for each essence type. It's a fun, gamified math system that happens after completing a level.

### Mechanics

**Digestion Formula**:
```
Level-Up Threshold: 30 essence per level (example, adjustable)
Collected Essence: X
Level-Ups: floor(X / Threshold)
Remaining Essence: X % Threshold (carries over to next digestion)
```

**Example**:
- Collected: 45 Shallow Essence
- Threshold: 30 essence per level
- Level-Ups: floor(45 / 30) = 1 level-up
- Remaining: 45 % 30 = 15 essence (carries over)

**Multiple Essence Types**:
- Each essence type processes independently
- Player collects each level-up separately (click/tap to collect)
- Visual feedback for each collection

### Gamified Elements

- **Visual Animation**: Essence orbs float into "digestion" area
- **Math Visualization**: Show calculation process
- **Collection Interaction**: Click/tap to collect each level-up
- **Particle Effects**: Satisfying feedback on collection
- **Sound Effects**: Audio feedback for each step

### Upgrades & Choices

- Upgrades can influence digestion (e.g., reduce threshold, bonus level-ups)
- Strategic choices in how essence is allocated (future expansion)
- Remaining essence carries over (no waste)

---

## Upgrade Selection System

### Overview

After essence level-up in digestion, player selects from 3 random upgrades in that essence category. Limited rerolls add strategic depth.

### Mechanics

**Selection Process**:
1. Essence type levels up (from digestion)
2. System selects 3 random upgrades from that essence category's pool
3. Player views upgrade cards (name, description, effect)
4. Player can:
   - Select an upgrade (applied immediately)
   - Reroll (if rerolls remaining) → New 3 random upgrades
   - Select after rerolling

**Reroll System**:
- **Starting Rerolls**: 2-3 per run (adjustable)
- **Cost**: Free (limited by count, not essence)
- **Display**: "Reroll (2 remaining)"
- **Strategy**: Save rerolls for important level-ups

**Randomization**:
- Weighted by rarity (common upgrades more likely)
- No duplicates in the 3 options
- Can reroll to get different options

**Multiple Level-Ups**:
- If multiple essence types leveled up, process one at a time
- Each level-up gets its own selection screen
- Rerolls are shared across all selections in the run

---

## Evolution System

### Overview

After selecting upgrades, the fish's appearance evolves to reflect the selected upgrades. This provides visual feedback and build identity.

### Art Generation

**Process**:
1. Use existing fish art as base (e.g., "Goldfish")
2. Generate new image using AI (existing fish generation system)
3. Prompt includes:
   - Base fish: "Goldfish"
   - Upgrades selected: "Coral Speed", "Reef Agility"
   - Essence type: "Shallow"
   - Evolution level: 1 (increments with each evolution)

**Caching**:
- If art exists for this upgrade combination, use cached version
- If not, generate and cache for future use
- Cache key: `{fishId}_{upgradeIds}_ev{level}`

**Visual Style**:
- Evolution should be noticeable but not jarring
- Reflects essence type and upgrades
- Maintains fish identity

### Evolution Animation

- **Duration**: 2-3 seconds
- **Effect**: Current art → Transformation → New art
- **Particles**: Glow, morphing effects
- **Sound**: Transformation sound effect

### Essence Discard

- Remaining unspent essence is "discarded" (not carried over)
- Visual: Essence orbs fade away
- Message: "Unspent essence discarded"
- Design: Encourages spending essence before evolution

---

## Level Progression System

### Overview

Levels progress within a run: 1-1, 1-2, 1-3, etc. Each level increases difficulty while maintaining the same biome.

### Level Structure

**Format**: `{Biome}-{LevelNumber}`
- **1-1**: First level in Shallow biome
- **1-2**: Second level in Shallow biome
- **1-3**: Third level in Shallow biome
- **2-1**: First level in next biome (when unlocked)

### Difficulty Scaling

**Per Level**:
- **More Fish**: Spawn count increases
- **Larger Fish**: Average size of predators increases
- **Longer Time**: Time limit increases (or size goal increases)
- **More Essence**: Essence orb spawn rate may increase

**Example Scaling** (Shallow 1-1 → 1-2 → 1-3):
- **1-1**: 10-15 fish, time limit 60s, size goal 40
- **1-2**: 15-20 fish, time limit 75s, size goal 50
- **1-3**: 20-25 fish, time limit 90s, size goal 60

### Biome Progression

- **Within Run**: Levels in same biome (1-1, 1-2, 1-3)
- **Between Runs**: Unlock new biomes with essence (meta-progression)
- **Future**: Deeper biomes with modifiers (Deep + Polluted, etc.)

---

## Progression Curves

### Early Game (0-100 Total Essence)

**Goals**:
- Learn basic mechanics
- Unlock first biome (Deep Sea or Polluted)
- Get first few upgrades

**Pacing**:
- First upgrade: 10-15 essence (very fast)
- First biome unlock: 50-100 essence (5-10 runs)
- First ability unlock: 30-50 essence (3-5 runs)

**Balance**:
- Fast progression to hook players
- Clear goals and rewards
- Low complexity

### Mid Game (100-500 Total Essence)

**Goals**:
- Unlock all initial biomes
- Build focused upgrade path (choose essence type)
- Unlock first hybrid upgrades
- Get first active abilities

**Pacing**:
- Upgrades: 20-40 essence per level
- Biome unlocks: 100-200 essence
- Ability unlocks: 40-60 essence

**Balance**:
- Meaningful choices (which essence type to focus?)
- Multiple viable paths
- Hybrid builds become available

### Late Game (500+ Total Essence)

**Goals**:
- Max out favorite upgrade trees
- Unlock meta upgrades
- Experiment with hybrid builds
- Unlock future biomes (Cosmic, Demonic, Robotic)

**Pacing**:
- Upgrades: 50-200 essence per level
- Meta upgrades: 200-500 essence
- New biome unlocks: 300-1000 essence

**Balance**:
- Powerful upgrades feel impactful
- Multiple endgame builds viable
- Long-term goals (meta upgrades, new biomes)

### Progression Formula

**Upgrade Cost**:
```
cost(level) = baseCost × (costMultiplier ^ level)
```

**Example**: Base cost 20, multiplier 1.5
- Level 0→1: 20
- Level 1→2: 30
- Level 2→3: 45
- Level 3→4: 67.5 → 68

**Essence Earned Per Run**:
```
Base: 20-50 essence (depending on biome, creature rarity)
With multipliers: 30-150 essence per run (late game)
```

**Runs to Max Upgrade** (10 levels, base 20, multiplier 1.5):
- Total cost: ~1,200 essence
- At 50 essence/run: ~24 runs
- At 100 essence/run (with multipliers): ~12 runs

---

## Gameplay Loop

### Run Structure

A run consists of multiple **rounds** (levels), each going deeper with increasing difficulty and modifiers.

1. **Pre-Run**:
   - Main menu → Start Game → Fish Selection
   - Select fish (starter: Goldfish for new players)
   - View current upgrades and passive abilities
   - See essence totals
   - Run automatically progresses through unlocked depth levels

2. **During Run (Each Round/Level)**:
   - Start much smaller than other fish (can be adjusted via upgrades)
   - **Hunger Meter**: Decreases over time, must be maintained above 0%
   - Collect **essence orbs** that spawn in the environment to kickstart growth
   - Eat smaller fish to grow (size-based collision: can only eat fish 20% smaller)
   - Avoid larger predators
   - Collect essence orbs from consumed creatures (all essence types collected)
   - Passive abilities are always active
   - Encounter other players' fish (async multiplayer - see below)
   - **Survival Conditions**: Time limit, hunger above 0%, size goal, or eat all fish
   - Survive and progress to next round OR die and earn Evo Points

3. **Digestion Phase** (After Completing Level/Round):
   - All collected essence enters "digestion" phase
   - Fun, gamified math system determines essence conversion to level-ups
   - **Digestion Formula**: Each essence type has a level-up threshold (e.g., 30 essence per level)
   - Remaining essence carries over to next digestion
   - Players collect each level-up separately (click/tap to collect)
   - Visual feedback: Essence orbs digested into level-up points

4. **Upgrade Selection** (After Essence Level-Up):
   - Player sees 3 random upgrades from the level-up's essence category
   - Limited rerolls per run (2-3 total)
   - Select upgrade → Applied for entire run
   - Multiple level-ups processed one at a time

5. **Evolution Sequence** (After Upgrade Selection):
   - Fish art changes based on selected upgrades
   - AI generation uses existing fish art + upgrades as prompt
   - Art cached for performance
   - Remaining unspent essence discarded
   - Visual transformation animation

6. **Post-Run** (On Death):
   - **Score Calculation**: `(Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)`
   - **Evo Points**: `Score / 10` (rounded down, minimum 1)
   - Meta progression screen: Spend Evo Points on permanent upgrades
   - Return to main menu

7. **Meta-Progression**:
   - Spend Evo Points on permanent meta upgrades
   - Spend essence on run upgrades (impactful, few levels)
   - Unlock new depth levels and modifiers
   - Unlock new passive abilities
   - Plan next build

### Async Multiplayer

- **Other Players' Fish**: Encounter fish created by other players in the world
- **Sticky Factor**: Seeing other players' creations adds engagement
- **Data Storage**: Hybrid (local + cloud sync) enables sharing fish data
- **Encounter Mechanics**: Other players' fish appear as AI-controlled entities
- **Collection Aspect**: Can "discover" other players' fish in bestiary

### Run Goals

**Short-term** (per level):
- Survive time limit
- Keep hunger meter above 0%
- Reach target size
- Eat all smaller fish (optional)
- Collect essence orbs
- Avoid larger predators

**Medium-term** (per run):
- Complete multiple levels (1-1, 1-2, 1-3, etc.)
- Level up essence types through digestion
- Select impactful upgrades
- Evolve fish art
- Build powerful combinations

**Long-term** (meta-progression):
- Earn Evo Points on death
- Purchase permanent meta upgrades
- Unlock all biomes
- Max out upgrade trees
- Unlock all abilities
- Complete bestiary (discover all creatures)
- Experiment with different builds

### Build Variety

**Pure Builds**:
- **Deep Sea Tank**: Max health, shield, regeneration
- **Shallow Speedster**: Max speed, evasion, speed boost
- **Polluted Aggressor**: Max damage, toxic aura, mutations

**Hybrid Builds**:
- **Abyssal Swift**: Deep Sea + Shallow (tanky but fast)
- **Mutated Depths**: Deep Sea + Polluted (tanky with damage)
- **Toxic Reef**: Shallow + Polluted (fast with damage)

**Meta Builds**:
- **Essence Farmer**: Max essence multipliers, essence magnet
- **Universal Growth**: All essence types, max size upgrades

### Engagement Hooks

1. **Fast Levels**: ~5 minutes per level (subject to adjustments and in-game modifiers)
2. **Quick Progression**: First upgrade in 1-2 runs, first essence level-up in 1 level
3. **Meaningful Choices**: Which essence type? Which impactful upgrades? Which rerolls to use?
4. **Collection Goals**: Bestiary, all creatures discovered, other players' fish
5. **Build Experimentation**: Try different passive ability combinations
6. **Skill Rewards**: Perfect kills, combos, longer survival, better digestion results
7. **Discovery**: New depth levels, modifiers, creatures, abilities
8. **Async Multiplayer**: Encounter other players' fish, share creations
9. **Digestion Mini-Game**: Fun mathy gamified essence conversion
10. **Evolution Visuals**: See fish art change based on upgrades
11. **Hunger Challenge**: Manage hunger meter adds tension and strategy
12. **Evo Points**: Death rewards permanent progression

---

## Design Principles

### Core Pillars

1. **Fast-Paced**: Quick levels (~5 minutes), immediate feedback
2. **Impactful Progression**: Every upgrade feels game-changing (Monster Train philosophy)
3. **Build Variety**: Multiple viable paths, passive ability combinations
4. **Skill Rewards**: Better play = more essence = better digestion = faster progression
5. **Discovery**: Unlocking new depth levels, modifiers, creatures feels exciting
6. **Collection**: Long-term goals (bestiary, all upgrades, other players' fish)
7. **Progressive Difficulty**: Rounds go deeper with increasing modifiers
8. **Grounded + Fantasy**: Base depths (realistic) + modifiers (fantasy elements)

### Balance Goals

- **No Single Dominant Strategy**: All essence types and builds should be viable
- **Meaningful Choices**: Upgrades should feel impactful, not incremental
- **Progressive Difficulty**: Early game easy, late game challenging
- **Fair Progression**: Free players can progress, but premium can accelerate
- **Skill vs. Time**: Skillful play rewards more, but time investment also matters

### Player Experience

**New Player** (First 10 runs):
- Learn basic mechanics
- Unlock first biome
- Get first upgrades
- Feel progression

**Engaged Player** (10-50 runs):
- Experiment with builds
- Unlock all initial biomes
- Get first abilities
- Find favorite playstyle

**Dedicated Player** (50+ runs):
- Max out favorite trees
- Unlock meta upgrades
- Complete bestiary
- Experiment with all builds

---

## Expansion Support

The system is designed to support expansion without requiring major structural changes:

### New Essence Types

- **Cosmic Essence**: Space-themed modifier, gravity mechanics
- **Demonic Essence**: Fire-themed modifier, aggressive creatures
- **Robotic Essence**: Tech-themed modifier, precision mechanics
- **Radioactive Essence**: Radiation modifier, mutation effects
- Additional types can be added as needed

### New Depth Levels

- **Abyssal**: 1000m+ (future expansion)
- Additional depth levels can be added for progression

### New Modifiers

- New archetype modifiers can be added to existing depth levels
- Modifiers can combine (e.g., "Deep + Polluted + Radioactive")
- Each modifier adds new essence types, creatures, and challenges

### New Mechanics

- **Breeding System**: Like Dave the Diver's fish farm
- **Evolution System**: Creatures evolve based on essence consumed
- **Seasonal Events**: Limited-time modifiers and creatures
- **Enhanced Async Multiplayer**: More interaction with other players' fish
- **Digestion Variants**: Different digestion mini-games for different essence types

---

## Next Steps

This design document will inform:
1. **Data Structure Design**: TypeScript interfaces for all systems
2. **API Design**: Endpoints for saving/loading creature data
3. **Storage Design**: Blob storage organization
4. **Implementation Plan**: Step-by-step development roadmap

See `DATA_STRUCTURE.md` for complete technical specifications.
