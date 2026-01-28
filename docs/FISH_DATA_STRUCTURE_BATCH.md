# Fish Data Structure for Batch Upload

## Overview
This document describes the JSON structure for fish data, supporting modular prompts, essence distribution, and future fusion/evolution mechanics. This format is used for batch uploading fish to blob storage.

## Fish Data Fields
- `id`: Unique identifier for the fish
- `name`: Display name
- `biome`: Biome where the fish spawns (e.g., "shallow", "deep_sea", "polluted", "abyssal")
- `rarity`: "common", "rare", or other custom rarity
- `sizeTier`: "prey", "mid", "predator", "boss"
- `essence`: Object with all essence types and values (all types always present, values may be zero)
- `descriptionChunks`: Array of unique descriptive prompt chunks (base, upgrades, fusions, etc.)
- `visualMotif`: (Optional) Special effects or motifs (e.g., "glowing veins")
- `fusionParentIds`: (Optional) Array of parent fish IDs for fusions
- `mutationSource`: (Optional) Source or trigger for mutation
- `spriteUrl`: (Optional) Path or blob URL to the fish's sprite
- `metadataUrl`: (Optional) Path or blob URL to the fish's metadata

## Example
```json
{
  "id": "lanternfish_abyssal_common",
  "name": "Lanternfish",
  "biome": "abyssal",
  "rarity": "common",
  "sizeTier": "prey",
  "essence": {
    "shallow": 1,
    "deep_sea": 10,
    "tropical": 0,
    "polluted": 0,
    "cosmic": 0,
    "demonic": 0,
    "robotic": 0
  },
  "descriptionChunks": [
    "bulbous head with glowing lure",
    "needle-like teeth"
  ],
  "visualMotif": "bioluminescent spots",
  "fusionParentIds": [],
  "mutationSource": null,
  "spriteUrl": "/sprites/fish/lanternfish.png",
  "metadataUrl": "/creatures/lanternfish_abyssal_common.json"
}
```

## Notes
- All essence types must be present in the `essence` object, even if zero.
- `descriptionChunks` is extensible for upgrades, fusions, and future content.
- `visualMotif`, `fusionParentIds`, and `mutationSource` are optional but recommended for future-proofing.
- Sprite and metadata URLs are optional for initial upload but should be filled after asset generation.

---

See also: `MODULAR_PROMPT_SYSTEM.md`, `DATA_STRUCTURE.md`, `FISH_EDITOR.md`