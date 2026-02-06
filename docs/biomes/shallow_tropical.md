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

Vibrant reef fish native to tropical shallow waters.

### Prey Tier

1. **Clownfish (clownfish_tropical)**
   - Description Chunks: ["bright orange body", "white vertical stripes", "rounded fins", "anemone dweller"]
   - Visual Motif: "iconic reef symbiote"
   - Essence: { shallow: 5, tropical: 10 }
   - Size Tier: prey
   - Rarity: common

2. **Blue Tang (blue_tang_tropical)**
   - Description Chunks: ["electric blue body", "yellow tail fin", "oval disc shape", "black markings"]
   - Visual Motif: "vibrant reef swimmer"
   - Essence: { shallow: 5, tropical: 12 }
   - Size Tier: prey
   - Rarity: common

3. **Tropical Parrotfish (rare_tropical)**
   - Description Chunks: ["vibrant rainbow-colored fish", "parrot-like beak mouth", "large flowing fins", "iridescent multi-colored scales"]
   - Visual Motif: "dazzling tropical reef dweller"
   - Essence: { shallow: 10, tropical: 8 }
   - Size Tier: prey
   - Rarity: rare
   - Playable: yes

### Mid Tier

4. **Butterflyfish (butterflyfish_tropical)**
   - Description Chunks: ["bright yellow body", "black eye stripe", "disc-shaped silhouette", "delicate trailing fins"]
   - Visual Motif: "elegant reef dancer"
   - Essence: { shallow: 8, tropical: 15 }
   - Size Tier: mid
   - Rarity: common

### Predator Tier

5. **Lionfish (lionfish_tropical)**
   - Description Chunks: ["venomous flowing spines", "striped red and white body", "fan-like pectoral fins", "menacing display"]
   - Visual Motif: "dangerous beauty of the reef"
   - Essence: { shallow: 12, tropical: 20 }
   - Size Tier: predator
   - Rarity: uncommon

### Boss Tier

6. **Moray Eel (moray_eel_tropical)**
   - Description Chunks: ["serpentine muscular body", "gaping jaws with needle teeth", "mottled pattern", "lurking in coral crevice"]
   - Visual Motif: "ambush predator of the reef"
   - Essence: { shallow: 15, tropical: 30 }
   - Size Tier: boss
   - Rarity: rare

7. **Reef Shark (reef_shark_tropical)**
   - Description Chunks: ["sleek gray body with white underside", "rounded snout", "compact powerful build", "patrols reef edges"]
   - Visual Motif: "tropical reef apex predator"
   - Essence: { shallow: 18, tropical: 35 }
   - Size Tier: boss
   - Rarity: rare

## Spawn Weights

- Clownfish: 30
- Blue Tang: 25
- Tropical Parrotfish: 15
- Butterflyfish: 20
- Lionfish: 10
- Moray Eel: 5
- Reef Shark: 4

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
