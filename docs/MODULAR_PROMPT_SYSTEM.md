# Modular Art Prompt System for Fish Generation

## Overview
This document outlines the modular art prompt system for generating fish sprites in the game. Prompts are broken into reusable chunks, supporting dynamic composition for upgrades, fusions, and future content.

## Prompt Chunk Types
- **Art Style Chunk**: Shared style reference (e.g., "stylized, vibrant, exaggerated features, inspired by [reference image]")
- **Formatting Chunk**: Shared formatting (e.g., "side view, right-facing, isolated on solid bright magenta background (#FF00FF), no other elements, game sprite")
- **Angle/View Chunk**: (Optional) Specific camera angle or pose
- **Biome/Type Style Chunk**: Biome or special type (e.g., "polluted mutant", "abyssal horror")
- **Description Chunks**: Unique, fish-specific descriptors. For **natural/non-mutant fish**, use species-appropriate, non-violent features (e.g., "rounded body", "orange scales", "flowing fins"). Reserve aggressive or fantastical wording (spikes, sharp teeth, bloody, etc.) for **ability/upgrade chunks** (e.g., spiked_skin, toxic) or **mutant/fantasy fish** (creatures with mutationSource, fusionParentIds, or fantasy biomes).
- **Visual Motif Chunk**: (Optional) Special effects or motifs (e.g., "glowing veins", "toxic sludge")
- **Primary Color** (optional): Hex for primary scale/skin color (e.g., `primaryColorHex: "#FFD700"`). Ensures consistent hue across base and growth sprites.
- **Essence Color Details** (optional): Array of `{ essenceTypeId, description }` for fantasy essence accents; hex is resolved from essence types (e.g., polluted stripes on upper back). Use for fantasy/mutation/fusion fish.
- **Species Archetype** (optional): Body shape/silhouette—e.g., `fish`, `shark`, `squid`, `eel`, `ray`, `cephalopod`. Drives different silhouettes in prompts.

## Data Storage
- Shared prompt chunks are stored in a global config (for editor access and tweaking)
- Each fish stores only its description chunk(s) and visual motif(s)
- Upgrades and fusions store their own prompt chunks, which are composed with the fish's base prompt
- Final prompt for art generation is built by concatenating all relevant chunks

## Patching existing fish (hex + placement)

To update **already-uploaded** creatures with primary hex, hex-in-chunks, species archetype, and essence color placement (without regenerating sprites):

1. Edit **`scripts/creature-prompt-patches.json`** – manually authored per creature id: `primaryColorHex`, `descriptionChunks` (with hex in text where needed, e.g. `"vertical black stripes #1a1a1a"`), `visualMotif`, `speciesArchetype`, `essenceColorDetails` (placement text; hex resolved from essence types).
2. With dev server running, run: **`npx tsx scripts/batch-update-creature-metadata.ts`**. The script merges from `docs/biomes/*.md` then applies the patch file overrides and saves metadata-only to blob.

See **`docs/PROMPT_PATCH_WORKFLOW.md`** for full workflow. The Fish Editor composes prompts from the patched data (Details tab, Composed AI Prompt, and generation).

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
  "primaryColorHex": "#1a237e",
  "speciesArchetype": "fish",
  "essenceColorDetails": [{ "essenceTypeId": "deep_sea", "description": "lure under jaw" }],
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
