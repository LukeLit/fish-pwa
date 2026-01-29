# Shallow Biome: Coral Shallows

## Overview

**Biome ID**: `shallow`  
**Name**: Coral Shallows  
**Base Depth**: Shallow (0-50m)  
**Modifiers**: None  
**Visual Theme**: Bright, colorful coral reef with tropical fish and clear waters

## Essence Types

- **Primary**: Shallow
- **Secondary**: None

## Unlock Requirements

- **Starting biome** - No unlock cost

## Creatures

### Common Creatures

#### Goldfish (goldfish_starter)
- **Type**: Prey
- **Size Tier**: prey
- **Rarity**: Common
- **Playable**: Yes
- **Stats**: Size 20, Speed 7, Health 15, Damage 3
- **Description Chunks**:
  - small golden-orange fish
  - rounded streamlined body
  - flowing translucent fins
  - bright reflective scales
  - large alert eyes
- **Visual Motif**: "swift schooling fish with vibrant coloration"
- **Essence**: Shallow (3 base yield)
- **Granted Abilities**: None

#### Guppy (tiny_fish)
- **Type**: Prey
- **Size Tier**: prey
- **Rarity**: Common
- **Playable**: No
- **Stats**: Size 8, Speed 6, Health 3, Damage 0.5
- **Description Chunks**:
  - extremely tiny colorful fish
  - vibrant rainbow scales
  - delicate transparent fins
  - quick darting movements
- **Visual Motif**: "miniature tropical schooling fish"
- **Essence**: Shallow (1 base yield)
- **Granted Abilities**: None

#### Minnow (small_prey)
- **Type**: Prey
- **Size Tier**: prey
- **Rarity**: Common
- **Playable**: No
- **Stats**: Size 10, Speed 5, Health 5, Damage 1
- **Description Chunks**:
  - tiny silver fish
  - streamlined slender body
  - large reflective eyes
  - translucent fins
  - shimmering metallic scales
- **Visual Motif**: "swift schooling prey fish"
- **Essence**: Shallow (2 base yield)
- **Granted Abilities**: None

### Medium Creatures

#### Perch (medium_fish)
- **Type**: Prey
- **Size Tier**: mid
- **Rarity**: Common
- **Playable**: No
- **Stats**: Size 30, Speed 4, Health 20, Damage 5
- **Description Chunks**:
  - medium-sized silver fish
  - vertical black stripes
  - spiny dorsal fin
  - broad streamlined body
  - cautious alert posture
- **Visual Motif**: "wary mid-sized schooling fish"
- **Essence**: Shallow (5 base yield)
- **Granted Abilities**: None

#### Bass (medium_predator)
- **Type**: Predator
- **Size Tier**: predator
- **Rarity**: Common
- **Playable**: No
- **Stats**: Size 40, Speed 4, Health 30, Damage 10
- **Description Chunks**:
  - medium-sized predatory fish
  - muscular powerful body
  - large mouth with sharp teeth
  - dark green scaled body
  - aggressive forward-facing eyes
- **Visual Motif**: "territorial shallow-water hunter"
- **Essence**: Shallow (8 base yield)
- **Granted Abilities**: ambush_strike

### Large Creatures

#### Pike (large_predator)
- **Type**: Predator
- **Size Tier**: predator
- **Rarity**: Uncommon
- **Playable**: No
- **Stats**: Size 70, Speed 5, Health 50, Damage 20
- **Description Chunks**:
  - large elongated predator
  - torpedo-shaped muscular body
  - massive jaw with razor teeth
  - camouflaged green-brown scales
  - menacing predatory stance
- **Visual Motif**: "apex shallow-water ambush predator"
- **Essence**: Shallow (15 base yield), Deep Sea (5 base yield)
- **Granted Abilities**: ambush_strike, speed_burst

### Rare Creatures

#### Tropical Parrotfish (rare_tropical)
- **Type**: Prey
- **Size Tier**: mid
- **Rarity**: Rare
- **Playable**: Yes
- **Stats**: Size 50, Speed 3, Health 35, Damage 8
- **Description Chunks**:
  - vibrant rainbow-colored fish
  - parrot-like beak mouth
  - large flowing fins
  - iridescent multi-colored scales
  - elegant graceful movements
- **Visual Motif**: "dazzling tropical reef dweller"
- **Essence**: Shallow (10 base yield), Tropical (8 base yield)
- **Granted Abilities**: reef_camouflage, hard_scales

### Epic Creatures

#### Great White Shark (epic_shark)
- **Type**: Predator
- **Size Tier**: boss
- **Rarity**: Epic
- **Playable**: Yes
- **Stats**: Size 120, Speed 6, Health 80, Damage 35
- **Description Chunks**:
  - massive apex predator
  - powerful streamlined body
  - rows of serrated teeth
  - gray-white countershaded scales
  - intimidating presence
  - signature dorsal fin
- **Visual Motif**: "legendary ocean apex predator"
- **Essence**: Shallow (30 base yield), Deep Sea (20 base yield)
- **Granted Abilities**: apex_predator, blood_sense, speed_burst

## Spawn Weights

- Guppy: 40 (Most common)
- Minnow: 30
- Perch: 20
- Bass: 15
- Goldfish: 10 (Starting fish)
- Pike: 5
- Tropical Parrotfish: 5
- Great White Shark: 2 (Rarest)

## Prompt Chunk Examples

### Biome-Specific Art Modifiers
```typescript
SHALLOW_ART_CHUNKS = [
  "bright, saturated colors",
  "clear, well-lit appearance",
  "tropical color palette",
  "sunlit water adaptations"
]
```

### Recommended Visual Motifs
- "vibrant reef dweller with tropical colors"
- "swift schooling fish with reflective scales"
- "territorial shallow-water hunter"
- "graceful tropical swimmer"
- "coral reef ambusher"

## Notes

- Starting biome for all players
- Highest variety of fish types
- Good balance of prey and predators
- Ideal for learning game mechanics
- Moderate essence orb spawn rate (0.5)
