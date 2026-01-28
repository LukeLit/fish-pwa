# Deep Biome: Abyssal Depths

## Overview

**Biome ID**: `deep`  
**Name**: Abyssal Depths  
**Base Depth**: Deep (200-1000m)  
**Modifiers**: None  
**Visual Theme**: Pitch black waters with ancient creatures and crushing pressure

## Essence Types

- **Primary**: Deep Sea
- **Secondary**: None

## Unlock Requirements

- **Deep Sea Essence**: 300

## Creatures

### Large Creatures

#### Pike (large_predator)
- See shallow biome documentation
- May appear with deep-sea adaptations

### Epic Creatures

#### Great White Shark (epic_shark)
- See shallow biome documentation
- Ventures into deep waters

### Unique Deep Sea Creatures

Future deep-sea specific creatures:

#### Anglerfish
- **Type**: Predator
- **Rarity**: Rare
- **Stats**: Size 60, Speed 3, Health 40, Damage 15
- **Description Chunks**:
  - grotesque deep-sea predator
  - massive gaping mouth with needle-sharp teeth
  - bioluminescent lure extending from head
  - dark blue-black scaled body
  - bulbous compressed body shape
- **Visual Motif**: "terrifying abyssal ambush hunter with glowing lure"
- **Essence**: Deep Sea (30), Shallow (6)
- **Granted Abilities**: bioluminescence, lure_trap

#### Gulper Eel
- **Type**: Predator
- **Rarity**: Epic
- **Description Chunks**:
  - serpentine deep-sea predator
  - massively expandable jaw
  - bioluminescent tail lure
  - elongated eel-like body
  - translucent nightmare features
- **Visual Motif**: "bizarre abyssal predator with expandable jaws"

#### Vampire Squid (if cephalopods added)
- **Type**: Mutant
- **Rarity**: Legendary
- **Visual Motif**: "ancient deep-sea survivor with otherworldly features"

## Spawn Weights

- Pike: 20
- Great White Shark: 10
- Anglerfish: 15 (future)
- Gulper Eel: 8 (future)

## Prompt Chunk Examples

### Biome-Specific Art Modifiers
```typescript
ABYSSAL_ART_CHUNKS = [
  "bioluminescent organs",
  "translucent features",
  "alien-like adaptations",
  "deep black or navy base color",
  "adapted to crushing depths",
  "ghostly bioluminescence"
]
```

### Recommended Visual Motifs
- "alien abyssal creature adapted to crushing depths"
- "terrifying deep-sea predator with bioluminescence"
- "ancient survivor from the abyss"
- "otherworldly deep-sea entity"

## Notes

- Very low essence orb spawn rate (0.2)
- Most challenging biome
- Exclusive deep sea essence source
- Unique bioluminescent creatures
- High-risk, high-reward gameplay
