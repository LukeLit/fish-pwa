# Fusion and Mutation Metadata for Fish

## Overview
This document describes the metadata fields and logic for tracking fish fusions, mutations, and their lineage. This supports future gameplay features and dynamic prompt composition.

## Metadata Fields
- `fusionParentIds`: Array of fish IDs that were combined to create this fish (empty for base fish)
- `mutationSource`: String or object describing the trigger or source of mutation (e.g., upgrade ID, environmental effect)
- `visualMotif`: Special visual effect or motif (e.g., "glowing veins", "toxic sludge")
- `descriptionChunks`: Array of prompt chunks, including those from parents, upgrades, or mutations

## Example (Fusion Fish)
```json
{
  "id": "angler_lantern_fusion",
  "name": "Angler-Lantern Fusion",
  "biome": "abyssal",
  "rarity": "rare",
  "sizeTier": "predator",
  "essence": {
    "shallow": 2,
    "deep_sea": 20,
    "tropical": 0,
    "polluted": 0,
    "cosmic": 5,
    "demonic": 0,
    "robotic": 0
  },
  "descriptionChunks": [
    "elongated jaws",
    "glowing lure",
    "massive fangs"
  ],
  "visualMotif": "eldritch glow",
  "fusionParentIds": ["anglerfish_abyssal_common", "lanternfish_abyssal_common"],
  "mutationSource": null
}
```

## Example (Mutated Fish)
```json
{
  "id": "mutant_carp_polluted_rare",
  "name": "Mutant Carp",
  "biome": "polluted",
  "rarity": "rare",
  "sizeTier": "mid",
  "essence": {
    "shallow": 0,
    "deep_sea": 0,
    "tropical": 0,
    "polluted": 20,
    "cosmic": 0,
    "demonic": 5,
    "robotic": 0
  },
  "descriptionChunks": [
    "distorted body",
    "extra eyes",
    "toxic growths"
  ],
  "visualMotif": "radioactive slime",
  "fusionParentIds": [],
  "mutationSource": "toxic_waste_upgrade"
}
```

## Notes
- Fusions and mutations inherit and combine prompt chunks from their sources.
- Visual motifs and mutation sources are used for both gameplay and art prompt generation.
- This structure supports future expansion for more complex lineage and evo logic.

---

See also: `FISH_DATA_STRUCTURE_BATCH.md`, `MODULAR_PROMPT_SYSTEM.md`, `UPGRADE_SYSTEM.md`