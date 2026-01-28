# Upgrade Prompt Chunks and Effects

## Overview
This document describes how upgrade prompt chunks are defined and used in fish art generation. Each upgrade can contribute a prompt chunk (e.g., "spiked skin") that is dynamically composed with the fish's base prompt and other modifiers.

## Upgrade Data Fields
- `id`: Unique upgrade identifier
- `promptChunk`: Short, descriptive phrase for art prompt (e.g., "armored, spiked skin")
- `effect`: Gameplay effect (e.g., "+defense")
- `visualMotif`: (Optional) Special effect or motif (e.g., "glowing veins")

## Example (Upgrade Data)
```json
{
  "id": "spiked_skin",
  "promptChunk": "armored, spiked skin",
  "effect": "+defense",
  "visualMotif": "spiked fins"
}
```

## Usage
- When a fish receives an upgrade, its composed art prompt includes the upgrade's `promptChunk` and (optionally) `visualMotif`
- Multiple upgrades can stack their prompt chunks for complex, evolving art
- Upgrade prompt chunks are stored in upgrade data and referenced by fish as needed

## Future Expansion
- Add new upgrades with unique prompt chunks and effects
- Support for upgrade-specific visual motifs and special effects

---

See also: `MODULAR_PROMPT_SYSTEM.md`, `FISH_DATA_STRUCTURE_BATCH.md`, `FUSION_MUTATION_METADATA.md`