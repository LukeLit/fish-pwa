# Shallow Tropical Biome: Tropical Paradise

## Overview

**Biome ID**: `shallow_tropical`  
**Name**: Tropical Paradise  
**Base Depth**: Shallow (0-40m)  
**Modifiers**: Tropical  
**Visual Theme**: Warm, vibrant tropical reef with abundant colorful life

## Essence Types

- **Primary**: Shallow, Tropical
- **Secondary**: None

## Unlock Requirements

- **Shallow Essence**: 100
- **Tropical Essence**: 50

## Creatures

This biome shares creatures with the shallow biome but with tropical variants.

### Common Creatures

#### Guppy (tiny_fish)
- See shallow biome documentation

#### Minnow (small_prey) 
- See shallow biome documentation

### Rare Creatures

#### Tropical Parrotfish (rare_tropical)
- **Type**: Prey
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

## Spawn Weights

- Guppy: 30
- Minnow: 25
- Tropical Parrotfish: 15

## Prompt Chunk Examples

### Biome-Specific Art Modifiers
```typescript
TROPICAL_ART_CHUNKS = [
  "vibrant rainbow colors",
  "exotic patterns and markings",
  "decorative fins",
  "bold contrasting stripes or spots"
]
```

### Recommended Visual Motifs
- "dazzling tropical reef dweller"
- "vibrant exotic swimmer"
- "rainbow-colored paradise fish"

## Notes

- Higher essence orb spawn rate (0.6)
- Requires unlocking with shallow and tropical essence
- Focus on colorful, decorative fish
