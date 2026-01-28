# Modular Art Prompt System for Fish Generation

## Overview
This document outlines the modular art prompt system for generating fish sprites in the game. Prompts are broken into reusable chunks, supporting dynamic composition for upgrades, fusions, and future content.

## Prompt Chunk Types
- **Art Style Chunk**: Shared style reference (e.g., "stylized, vibrant, exaggerated features, inspired by [reference image]")
- **Formatting Chunk**: Shared formatting (e.g., "side view, right-facing, isolated on solid bright magenta background (#FF00FF), no other elements, game sprite")
- **Angle/View Chunk**: (Optional) Specific camera angle or pose
- **Biome/Type Style Chunk**: Biome or special type (e.g., "polluted mutant", "abyssal horror")
- **Description Chunks**: Unique, fish-specific descriptors (e.g., "elongated jaws, glowing eyes, armored fins"). Multiple allowed per fish, including upgrades/fusions.
- **Visual Motif Chunk**: (Optional) Special effects or motifs (e.g., "glowing veins", "toxic sludge")

## Data Storage
- Shared prompt chunks are stored in a global config (for editor access and tweaking)
- Each fish stores only its description chunk(s) and visual motif(s)
- Upgrades and fusions store their own prompt chunks, which are composed with the fish's base prompt
- Final prompt for art generation is built by concatenating all relevant chunks

## Example (Fish Data)
```json
{
  "name": "Lanternfish",
  "biome": "abyssal",
  "rarity": "common",
  "essence": { "deep_sea": 10, "shallow": 2 },
  "descriptionChunks": [
    "bulbous head with glowing lure",
    "needle-like teeth"
  ],
  "visualMotif": "bioluminescent spots",
  "fusionParentIds": [],
  "mutationSource": null
}
```

## Example (Upgrade Data)
```json
{
  "id": "spiked_skin",
  "promptChunk": "armored, spiked skin",
  "effect": "+defense"
}
```

## Example (Composed Prompt)
> stylized, vibrant, exaggerated features, inspired by [reference image]; side view, right-facing, isolated on solid bright magenta background (#FF00FF), no other elements, game sprite; abyssal horror; bulbous head with glowing lure, needle-like teeth, bioluminescent spots, armored, spiked skin

## Future-Proofing
- Description chunks are extensible for upgrades, fusions, and mutations
- Visual motifs and special effects can be added as new fields
- Prompt chunk system supports dynamic, editor-driven prompt composition

---

See also: `DATA_STRUCTURE.md`, `FISH_EDITOR.md`, `UPGRADE_SYSTEM.md`
