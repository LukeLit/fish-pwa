# Medium Depth Biome: Twilight Zone

## Overview

**Biome ID**: `medium`  
**Name**: Twilight Zone  
**Base Depth**: Medium (50-200m)  
**Modifiers**: None  
**Visual Theme**: Dimly lit waters with bioluminescent creatures

## Essence Types

- **Primary**: Shallow, Deep Sea
- **Secondary**: None

## Unlock Requirements

- **Shallow Essence**: 200
- **Deep Sea Essence**: 100

## Creatures

Fish adapted to the dimly lit twilight zone between surface and deep waters.

### Prey Tier

1. **Sardine (sardine_medium)**
   - Description Chunks: ["sleek silver body", "schooling behavior", "streamlined shape", "reflective scales"]
   - Visual Motif: "swift twilight schooler"
   - Essence: { shallow: 8, deep_sea: 5 }
   - Size Tier: prey
   - Rarity: common

2. **Juvenile Squid (juvenile_squid_medium)**
   - Description Chunks: ["translucent mantle", "small tentacles", "large curious eyes", "faint bioluminescent spots"]
   - Visual Motif: "ghostly twilight drifter"
   - Essence: { shallow: 6, deep_sea: 8 }
   - Size Tier: prey
   - Rarity: common

### Mid Tier

3. **Mackerel (mackerel_medium)**
   - Description Chunks: ["torpedo-shaped body", "iridescent blue-green back", "silver flanks", "forked tail"]
   - Visual Motif: "fast twilight hunter"
   - Essence: { shallow: 10, deep_sea: 8 }
   - Size Tier: mid
   - Rarity: common

4. **Ocean Sunfish (ocean_sunfish_medium)**
   - Description Chunks: ["flat disc-shaped body", "truncated tail fin", "tiny mouth", "bizarre silhouette"]
   - Visual Motif: "gentle twilight giant"
   - Essence: { shallow: 12, deep_sea: 10 }
   - Size Tier: mid
   - Rarity: uncommon

### Predator Tier

5. **Barracuda (barracuda_medium)**
   - Description Chunks: ["elongated torpedo body", "fearsome underbite with fangs", "silver scales", "lightning fast"]
   - Visual Motif: "sleek twilight ambusher"
   - Essence: { shallow: 15, deep_sea: 12 }
   - Size Tier: predator
   - Rarity: uncommon

### Boss Tier

6. **Thresher Shark (thresher_shark_medium)**
   - Description Chunks: ["extremely long scythe-like tail", "sleek gray body", "large eyes for low light", "elegant predator"]
   - Visual Motif: "twilight zone apex hunter"
   - Essence: { shallow: 20, deep_sea: 25 }
   - Size Tier: boss
   - Rarity: rare

## Spawn Weights

- Sardine: 30
- Juvenile Squid: 25
- Mackerel: 20
- Ocean Sunfish: 15
- Barracuda: 10
- Thresher Shark: 5

## Prompt Chunk Examples

### Biome-Specific Art Modifiers
```typescript
TWILIGHT_ART_CHUNKS = [
  "adapted to low-light environment",
  "subdued blue-gray tones",
  "beginning bioluminescent features",
  "transitional depth adaptations"
]
```

### Recommended Visual Motifs
- "adaptable mid-depth wanderer"
- "twilight zone cruiser"
- "semi-deep water predator"

## Notes

- Moderate essence orb spawn rate (0.4)
- Transition zone between shallow and deep biomes
- Mix of shallow and deep sea essence
