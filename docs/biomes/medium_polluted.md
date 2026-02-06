# Medium Polluted Biome: Toxic Depths

## Overview

**Biome ID**: `medium_polluted`  
**Name**: Toxic Depths  
**Base Depth**: Medium (50-200m)  
**Modifiers**: Polluted  
**Visual Theme**: Dark, murky waters with toxic waste and mutated life

## Essence Types

- **Primary**: Shallow, Polluted
- **Secondary**: None

## Unlock Requirements

- **Shallow Essence**: 150
- **Polluted Essence**: 75

## Creatures

Mutated fish adapted to toxic industrial runoff at medium depths.

### Prey Tier

1. **Mutant Minnow (mutant_minnow_medium_polluted)**
   - Description Chunks: ["extra pair of eyes", "sickly green glow", "twitching movements", "translucent patches"]
   - Visual Motif: "radiation-touched survivor"
   - Essence: { shallow: 3, polluted: 12 }
   - Size Tier: prey
   - Rarity: common

2. **Sludge Fish (sludge_fish_medium_polluted)**
   - Description Chunks: ["murky brown coloring", "asymmetric fins", "oil-slick sheen", "misshapen body"]
   - Visual Motif: "waste-dwelling scavenger"
   - Essence: { shallow: 2, polluted: 10 }
   - Size Tier: prey
   - Rarity: common

### Mid Tier

3. **Toxic Bass (toxic_bass_medium_polluted)**
   - Description Chunks: ["green bioluminescent spots", "enlarged toxic glands", "mutated jaw", "chemical burns"]
   - Visual Motif: "polluted predator adaptation"
   - Essence: { shallow: 8, polluted: 18 }
   - Size Tier: mid
   - Rarity: common

4. **Armored Carp (armored_carp_medium_polluted)**
   - Description Chunks: ["industrial metal plating", "rust-colored scales", "reinforced skull", "filter mouth"]
   - Visual Motif: "industrial waste survivor"
   - Essence: { shallow: 10, polluted: 15 }
   - Size Tier: mid
   - Rarity: uncommon

### Predator Tier

5. **Chemical Eel (chemical_eel_medium_polluted)**
   - Description Chunks: ["neon green veins", "corrosive slime coating", "elongated mutant body", "glowing eyes"]
   - Visual Motif: "toxic ambush hunter"
   - Essence: { shallow: 12, polluted: 25 }
   - Size Tier: predator
   - Rarity: uncommon

### Boss Tier

6. **Waste Leviathan (waste_leviathan_medium_polluted)**
   - Description Chunks: ["massive mutated body", "trash and debris encrusted", "multiple tumorous growths", "chemical aura"]
   - Visual Motif: "apex polluted nightmare"
   - Essence: { shallow: 15, polluted: 40 }
   - Size Tier: boss
   - Rarity: rare

7. **Toxic Behemoth (toxic_behemoth_medium_polluted)**
   - Description Chunks: ["massive armored mutant", "neon green toxic veins", "industrial debris fused to scales", "glowing corrosive eyes"]
   - Visual Motif: "polluted depths apex predator"
   - Essence: { shallow: 12, polluted: 38 }
   - Size Tier: boss
   - Rarity: rare

## Spawn Weights

- Mutant Minnow: 30
- Sludge Fish: 25
- Toxic Bass: 20
- Armored Carp: 15
- Chemical Eel: 8
- Waste Leviathan: 4
- Toxic Behemoth: 3

## Prompt Chunk Examples

### Biome-Specific Art Modifiers
```typescript
POLLUTED_ART_CHUNKS = [
  "toxic green or murky brown tones",
  "asymmetric features",
  "visible mutations or abnormalities",
  "industrial or contaminated aesthetic",
  "sickly appearance"
]
```

### Recommended Visual Motifs
- "toxic waste mutant with asymmetric deformities"
- "armored survivor of contaminated waters"
- "polluted adaptation specialist"

## Notes

- Lower essence orb spawn rate (0.3) due to pollution
- Unique mutant fish varieties
- Dangerous but rewarding biome
- Source of polluted essence
