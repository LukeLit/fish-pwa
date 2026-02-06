# Art Style and Tech Art Prompt Chunks
## Overview
This document defines the shared prompt chunks used to guide the art style and technical art requirements for fish sprite generation. These chunks are modular and can be referenced or updated independently of fish-specific description chunks.

---
## Art Style Chunk
- stylized, vibrant, exaggerated features
- inspired by concept art, stylized proportions, no black outlines
- high visual clarity and strong silhouette
- playful, imaginative, and slightly surreal

## Formatting Chunk
- isolated on solid bright magenta background (#FF00FF)
- no other background elements
- side profile, right-facing
- digital illustration, high-resolution, not pixel art
- transparent PNG (for final asset)
- detailed scales and fins

## Angle/View Chunk
- side profile, right-facing
- dynamic pose if possible

## Tech Art Guidelines Chunk
- avoid gradients or soft shadows (prefer cell shading or hard edges)
- use bold, readable color palettes
- no black outlines, borderless or cell-shaded rendering, clean fill colors
- ensure sprite reads well at small sizes (64–128px)
- avoid excessive detail that muddies the silhouette
- keep lighting consistent (top-left key light)

---
## Essence Type Visual Chunks (with hex where defined)
- **Shallow**: bright freshwater colors (#4ade80 green tones); subtle iridescence; natural patterns
- **Deep Sea**: dark muted tones (#1a237e blue tones); bioluminescent spots or streaks; translucent skin
- **Tropical**: vibrant saturated colors (#fbbf24 golden tones); bold patterns; ornate fins
- **Polluted**: dull sickly hues (#8b5cf6 purple accents); toxic growths; mutated features; patches of sludge
- **Cosmic**: shimmering, star-like specks; ethereal glows; otherworldly patterns
- **Demonic**: jagged, spiked features; red/black palette; glowing eyes or runes
- **Robotic**: metallic textures; glowing circuitry; mechanical appendages

## Biome Visual Chunks
- **Shallow**: clear water reflections; aquatic plants; sunlit highlights
- **Deep Sea**: shadowy gradients; faint blue glows; pressure-adapted forms
- **Tropical**: coral-inspired shapes; reef motifs; playful color splashes
- **Polluted**: debris, oil slicks, or chemical stains; unnatural mutations
- **Abyssal**: ancient, eldritch motifs; runic markings; tentacles or extra eyes

## Ability Visual Chunks
- **Spiked Skin**: armored, spiked scales
- **Bioluminescence**: glowing patterns or lures
- **Camouflage**: shifting, mottled colors
- **Electric**: crackling sparks; glowing lines
- **Regeneration**: visible healing scars; vibrant tissue
- **Toxic**: oozing, greenish patches; warning colors

---
## Example (Composed Prompt)
> stylized, vibrant, exaggerated features; inspired by concept art, stylized proportions, no black outlines; high visual clarity and strong silhouette; playful, imaginative, and slightly surreal; isolated on solid bright magenta background (#FF00FF); no other background elements; game sprite, side view, right-facing; high resolution, transparent PNG; detailed scales and fins; avoid gradients or soft shadows; use bold, readable color palettes; no black outlines, borderless or cell-shaded rendering, clean fill colors; ensure sprite reads well at small sizes; avoid excessive detail; keep lighting consistent (top-left key light)

---
These chunks should be referenced in the editor and batch data tools, and can be updated as the art direction evolves.

See also: `MODULAR_PROMPT_SYSTEM.md`, `PROMPT_PATCH_WORKFLOW.md`, `FISH_DATA_STRUCTURE_BATCH.md`
