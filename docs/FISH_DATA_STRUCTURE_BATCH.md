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
- `descriptionChunks`: Array of unique descriptive prompt chunks. For natural fish use species-appropriate, non-violent wording; reserve spikes/teeth/violent phrasing for ability chunks or mutant/fantasy fish.
- `visualMotif`: (Optional) Special effects or motifs (e.g., "glowing veins")
- `primaryColorHex`: (Optional) Primary scale/skin color hex (e.g., `"#FFD700"` for goldfish)
- `essenceColorDetails`: (Optional) Array of `{ essenceTypeId: string, description: string }` for fantasy essence-colored details (e.g., `[{ essenceTypeId: "polluted", description: "stripes on upper back under dorsal fin" }]`). Hex resolved from essence types.
- `speciesArchetype`: (Optional) Body shape: `fish`, `shark`, `squid`, `eel`, `ray`, `cephalopod`
- `fusionParentIds`: (Optional) Array of parent fish IDs for fusions
- `mutationSource`: (Optional) Source or trigger for mutation
- `spriteUrl`: (Optional) Path or blob URL to the fish's sprite
- `metadataUrl`: (Optional) Path or blob URL to the fish's metadata
- `metrics`: (Optional) Size/depth metrics for level band filtering. See [FISH_METRICS_AND_DEPTH_BANDS.md](plans/LEVEL-REFACTOR/FISH_METRICS_AND_DEPTH_BANDS.md).
  - `base_meters`: Start size in meters
  - `base_art_scale`: Art units for rendering (same as stats.size)
  - `min_meters`: (Optional) Real-world min size
  - `max_meters`: (Optional) Real-world max when grown
  - `sub_depth`: (Optional) `'upper' | 'mid' | 'lower'`

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
  "primaryColorHex": "#FFD700",
  "speciesArchetype": "fish",
  "fusionParentIds": [],
  "mutationSource": null,
  "spriteUrl": "/sprites/fish/lanternfish.png",
  "metadataUrl": "/creatures/lanternfish_abyssal_common.json",
  "metrics": {
    "base_meters": 0.2,
    "base_art_scale": 20,
    "min_meters": 0.02,
    "max_meters": 0.15,
    "sub_depth": "upper"
  }
}
```

## Patching existing creatures (prompt chunks + hex)

To update blob-stored creatures with new prompt chunks, primary color, species archetype, and essence placement **without regenerating sprites**:

1. **Patch file**: Edit `scripts/creature-prompt-patches.json` (manually authored per creature id: `primaryColorHex`, `descriptionChunks` with hex where needed, `speciesArchetype`, `essenceColorDetails`).
2. **Apply**: With dev server running, run `npx tsx scripts/batch-update-creature-metadata.ts`. The script merges from `docs/biomes/*.md` then applies the patch file; patch entries override doc content for that creature.

See **`PROMPT_PATCH_WORKFLOW.md`** for the full workflow. The Fish Editor uses the patched data for the Composed AI Prompt and generation.

## Notes
- All essence types must be present in the `essence` object, even if zero.
- `descriptionChunks` is extensible for upgrades, fusions, and future content.
- `visualMotif`, `fusionParentIds`, and `mutationSource` are optional but recommended for future-proofing.
- Sprite and metadata URLs are optional for initial upload but should be filled after asset generation.

---

See also: `MODULAR_PROMPT_SYSTEM.md`, `PROMPT_PATCH_WORKFLOW.md`, `DATA_STRUCTURE.md`, `FISH_EDITOR.md`