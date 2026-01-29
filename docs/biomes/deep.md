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

Creatures adapted to crushing pressure and eternal darkness.

### Prey Tier

1. **Bristlemouth (bristlemouth_deep)**
   - Description Chunks: ["tiny bioluminescent body", "rows of light-producing organs", "delicate transparent fins", "huge eyes"]
   - Visual Motif: "living constellation of the deep"
   - Essence: { deep_sea: 15 }
   - Size Tier: prey
   - Rarity: common

2. **Glass Squid (glass_squid_deep)**
   - Description Chunks: ["completely transparent body", "visible internal organs", "glowing photophores", "ghostly drifting movement"]
   - Visual Motif: "spectral deep-sea phantom"
   - Essence: { deep_sea: 18 }
   - Size Tier: prey
   - Rarity: common

### Mid Tier

3. **Giant Isopod (giant_isopod_deep)**
   - Description Chunks: ["armored segmented body", "multiple legs", "prehistoric appearance", "scavenging adapted"]
   - Visual Motif: "ancient armored scavenger"
   - Essence: { deep_sea: 20 }
   - Size Tier: mid
   - Rarity: uncommon

4. **Vampire Squid (vampire_squid_deep)**
   - Description Chunks: ["webbed arms like cloak", "red eyes", "bioluminescent tips", "ancient living fossil"]
   - Visual Motif: "ancient deep-sea survivor with otherworldly features"
   - Essence: { deep_sea: 22 }
   - Size Tier: mid
   - Rarity: rare

### Predator Tier

5. **Anglerfish (anglerfish_deep)**
   - Description Chunks: ["grotesque deep-sea predator", "massive gaping mouth with needle-sharp teeth", "bioluminescent lure extending from head", "dark blue-black scaled body"]
   - Visual Motif: "terrifying abyssal ambush hunter with glowing lure"
   - Essence: { deep_sea: 30, shallow: 6 }
   - Size Tier: predator
   - Rarity: rare

6. **Gulper Eel (gulper_eel_deep)**
   - Description Chunks: ["serpentine deep-sea predator", "massively expandable jaw", "bioluminescent tail lure", "elongated eel-like body"]
   - Visual Motif: "bizarre abyssal predator with expandable jaws"
   - Essence: { deep_sea: 35 }
   - Size Tier: predator
   - Rarity: epic

### Boss Tier

7. **Oarfish (oarfish_deep)**
   - Description Chunks: ["serpentine ribbon-like body", "bright red dorsal crest", "silvery undulating form", "legendary sea serpent appearance"]
   - Visual Motif: "mythical deep-sea leviathan"
   - Essence: { deep_sea: 50 }
   - Size Tier: boss
   - Rarity: rare

## Spawn Weights

- Bristlemouth: 30
- Glass Squid: 25
- Giant Isopod: 15
- Vampire Squid: 10
- Anglerfish: 12
- Gulper Eel: 6
- Oarfish: 3

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
