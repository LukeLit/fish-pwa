# Art Style Prompt Chunks

## Overview

This document defines the shared art style, formatting, and technical requirement chunks that are appended to all AI-generated fish sprite prompts to ensure visual consistency and proper sprite generation.

## Core Art Style Chunks

### Technical Requirements

These chunks ensure the AI generates proper game sprites:

```typescript
const TECHNICAL_CHUNKS = [
  "isolated on transparent background",
  "PNG cutout style",
  "no background elements",
  "clean silhouette",
  "game sprite asset",
  "professional game art quality"
];
```

**Purpose**: Ensure the AI generates sprites that can be used directly in-game without manual editing.

### Orientation & Perspective

```typescript
const ORIENTATION_CHUNKS = [
  "side view",
  "facing right",
  "perfectly horizontal alignment",
  "profile view"
];
```

**Purpose**: Maintain consistent orientation across all fish sprites for easier animation and mirroring.

### Visual Style

```typescript
const VISUAL_STYLE_CHUNKS = [
  "vibrant colors",
  "detailed scales and fins",
  "smooth gradients",
  "slight rim lighting for depth",
  "semi-realistic cartoon style"
];
```

**Purpose**: Define the overall aesthetic of the game - not photorealistic, but not overly cartoony either.

### Detail Level

```typescript
const DETAIL_CHUNKS = [
  "clearly visible individual fins",
  "distinct eye detail",
  "subtle texture on body",
  "anatomically plausible proportions"
];
```

**Purpose**: Ensure readability at game resolution while maintaining visual interest.

## Biome-Specific Art Modifiers

### Shallow Water
```typescript
const SHALLOW_ART_CHUNKS = [
  "bright, saturated colors",
  "clear, well-lit appearance",
  "tropical color palette"
];
```

### Deep Sea
```typescript
const DEEP_SEA_ART_CHUNKS = [
  "darker color tones",
  "bioluminescent accents",
  "mysterious shadowy areas",
  "adapted to low-light environment"
];
```

### Polluted
```typescript
const POLLUTED_ART_CHUNKS = [
  "toxic green or murky brown tones",
  "asymmetric features",
  "visible mutations or abnormalities",
  "industrial or contaminated aesthetic"
];
```

### Tropical
```typescript
const TROPICAL_ART_CHUNKS = [
  "vibrant rainbow colors",
  "exotic patterns and markings",
  "decorative fins",
  "bold contrasting stripes or spots"
];
```

### Abyssal
```typescript
const ABYSSAL_ART_CHUNKS = [
  "bioluminescent organs",
  "translucent features",
  "alien-like adaptations",
  "deep black or navy base color"
];
```

## Rarity-Based Art Modifiers

### Common
```typescript
const COMMON_ART_CHUNKS = [
  "simple color scheme",
  "minimal special features",
  "straightforward design"
];
```

### Uncommon
```typescript
const UNCOMMON_ART_CHUNKS = [
  "interesting pattern or marking",
  "slight color variation",
  "one distinctive feature"
];
```

### Rare
```typescript
const RARE_ART_CHUNKS = [
  "unique color combination",
  "multiple distinctive features",
  "elegant or striking appearance",
  "metallic sheen or iridescence"
];
```

### Epic
```typescript
const EPIC_ART_CHUNKS = [
  "dramatic color gradients",
  "multiple unique features",
  "ethereal or majestic appearance",
  "glowing accents",
  "impressive size and presence"
];
```

### Legendary
```typescript
const LEGENDARY_ART_CHUNKS = [
  "extraordinary unique design",
  "mythical or fantastical elements",
  "multiple glowing features",
  "aura or energy effects",
  "unforgettable silhouette"
];
```

## Type-Specific Art Modifiers

### Prey Fish
```typescript
const PREY_ART_CHUNKS = [
  "streamlined body for speed",
  "large eyes for awareness",
  "defensive coloration or camouflage",
  "smaller relative size",
  "non-threatening appearance"
];
```

### Predator Fish
```typescript
const PREDATOR_ART_CHUNKS = [
  "sharp teeth visible",
  "forward-facing predatory eyes",
  "powerful muscular build",
  "intimidating presence",
  "hunting-adapted features"
];
```

### Mutant Fish
```typescript
const MUTANT_ART_CHUNKS = [
  "asymmetric or unusual features",
  "visible mutations or abnormalities",
  "unexpected color combinations",
  "otherworldly or surreal elements",
  "breaks normal fish anatomy"
];
```

## Special Visual Effects

### Bioluminescence
```typescript
const BIOLUMINESCENT_CHUNKS = [
  "glowing bioluminescent spots or stripes",
  "soft inner light emanating from body",
  "ethereal glow effect",
  "light-producing organs visible"
];
```

### Toxicity
```typescript
const TOXIC_CHUNKS = [
  "warning coloration",
  "toxic gland visible",
  "venomous spines or barbs",
  "dangerous appearance"
];
```

### Camouflage
```typescript
const CAMOUFLAGE_CHUNKS = [
  "mottled or patterned for blending",
  "countershading (dark top, light bottom)",
  "mimicry of environment",
  "adaptive coloration"
];
```

### Armor/Scales
```typescript
const ARMOR_CHUNKS = [
  "heavy armored scales",
  "plated body segments",
  "reinforced protective features",
  "tank-like appearance"
];
```

## Negative Prompts (What to Avoid)

```typescript
const NEGATIVE_CHUNKS = [
  "NOT on white background",
  "NO solid color backgrounds",
  "NO additional creatures",
  "NO environment elements",
  "NO text or labels",
  "NOT facing left",
  "NO vertical orientation",
  "NO blurry or low quality"
];
```

**Note**: Some AI models support negative prompts explicitly; otherwise, use positive reinforcement of desired features.

## Complete Prompt Assembly

### Standard Assembly Function

```typescript
function assembleStandardPrompt(
  descriptionChunks: string[],
  visualMotif: string,
  type: 'prey' | 'predator' | 'mutant',
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
  biomeModifiers?: string[],
  specialEffects?: string[]
): string {
  const chunks: string[] = [];
  
  // 1. Base description
  chunks.push(...descriptionChunks);
  
  // 2. Visual motif
  chunks.push(visualMotif);
  
  // 3. Type-specific modifiers
  chunks.push(...getTypeArtChunks(type));
  
  // 4. Rarity modifiers
  chunks.push(...getRarityArtChunks(rarity));
  
  // 5. Biome modifiers
  if (biomeModifiers) {
    chunks.push(...biomeModifiers);
  }
  
  // 6. Special effects
  if (specialEffects) {
    chunks.push(...specialEffects);
  }
  
  // 7. Visual style
  chunks.push(...VISUAL_STYLE_CHUNKS);
  
  // 8. Detail level
  chunks.push(...DETAIL_CHUNKS);
  
  // 9. Orientation
  chunks.push(...ORIENTATION_CHUNKS);
  
  // 10. Technical requirements (always last)
  chunks.push(...TECHNICAL_CHUNKS);
  
  return chunks.join(', ');
}
```

### Example: Common Prey Fish

**Input**:
```typescript
descriptionChunks: ["small silver fish", "streamlined body", "large reflective eyes"]
visualMotif: "swift schooling fish"
type: "prey"
rarity: "common"
```

**Output**:
```
small silver fish, streamlined body, large reflective eyes, swift schooling fish, 
streamlined body for speed, large eyes for awareness, defensive coloration or camouflage, 
smaller relative size, non-threatening appearance, simple color scheme, minimal special features, 
straightforward design, vibrant colors, detailed scales and fins, smooth gradients, 
slight rim lighting for depth, semi-realistic cartoon style, clearly visible individual fins, 
distinct eye detail, subtle texture on body, anatomically plausible proportions, 
side view, facing right, perfectly horizontal alignment, profile view, 
isolated on transparent background, PNG cutout style, no background elements, 
clean silhouette, game sprite asset, professional game art quality
```

### Example: Epic Deep-Sea Predator

**Input**:
```typescript
descriptionChunks: ["massive anglerfish", "glowing lure", "razor-sharp teeth", "deep blue scales"]
visualMotif: "terrifying abyssal hunter"
type: "predator"
rarity: "epic"
biomeModifiers: DEEP_SEA_ART_CHUNKS
specialEffects: BIOLUMINESCENT_CHUNKS
```

**Output**:
```
massive anglerfish, glowing lure, razor-sharp teeth, deep blue scales, 
terrifying abyssal hunter, sharp teeth visible, forward-facing predatory eyes, 
powerful muscular build, intimidating presence, hunting-adapted features, 
dramatic color gradients, multiple unique features, ethereal or majestic appearance, 
glowing accents, impressive size and presence, darker color tones, bioluminescent accents, 
mysterious shadowy areas, adapted to low-light environment, glowing bioluminescent spots or stripes, 
soft inner light emanating from body, ethereal glow effect, light-producing organs visible, 
vibrant colors, detailed scales and fins, smooth gradients, slight rim lighting for depth, 
semi-realistic cartoon style, clearly visible individual fins, distinct eye detail, 
subtle texture on body, anatomically plausible proportions, side view, facing right, 
perfectly horizontal alignment, profile view, isolated on transparent background, 
PNG cutout style, no background elements, clean silhouette, game sprite asset, 
professional game art quality
```

## Model-Specific Adjustments

### Google Imagen
- Works well with long, detailed prompts
- Excellent at following "transparent background" instructions
- May need explicit "no background elements" reinforcement

### Flux 2 Pro
- Prefers more concise prompts
- Strong artistic interpretation
- May require "game sprite, clean cutout" emphasis

### OpenAI DALL-E
- Good with natural language descriptions
- May struggle with exact transparency
- Benefits from "PNG cutout style" specification

## Quality Control

### Post-Generation Checks

After generating a sprite, verify:

1. ✅ **Background**: Truly transparent (no fake backgrounds)
2. ✅ **Orientation**: Facing right, horizontal
3. ✅ **Size**: Appropriate detail level for game resolution
4. ✅ **Silhouette**: Clean, readable outline
5. ✅ **Style**: Matches visual style of other sprites
6. ✅ **Features**: All requested elements present

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Fake white/colored background | Emphasize "transparent background, PNG cutout style" |
| Facing wrong direction | Add "side view facing right" earlier in prompt |
| Too realistic/photographic | Add "semi-realistic cartoon style, game sprite" |
| Too simple/cartoony | Add "detailed scales and fins, professional quality" |
| Blurry or low detail | Add "high quality, sharp details, clear features" |
| Wrong proportions | Add "anatomically plausible proportions" |

## Versioning

**Current Version**: 1.0  
**Last Updated**: 2026-01-28

When updating art style:
1. Create new version of art chunks
2. Tag with version number
3. Allow creatures to specify preferred version
4. Gradually migrate creatures to new version

```typescript
interface ArtStyleVersion {
  version: string;
  technicalChunks: string[];
  visualStyleChunks: string[];
  // ... other chunk categories
}
```

## Related Documentation

- [MODULAR_PROMPT_SYSTEM.md](./MODULAR_PROMPT_SYSTEM.md) - Core prompt system
- [VISUAL_MOTIFS.md](./VISUAL_MOTIFS.md) - Motif library
- [FISH_EDITOR.md](./FISH_EDITOR.md) - Editor usage guide
