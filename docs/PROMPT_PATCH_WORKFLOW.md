# Prompt Patch Workflow

## Overview

Existing blob-stored creatures can be updated with **hex-specific prompt chunks**, **primary color**, **species archetype**, and **essence color placement** without regenerating sprites. This keeps composed prompts consistent across base and growth-phase generation in the Fish Editor.

## Patch file: `scripts/creature-prompt-patches.json`

- **Manually authored** per creature: primary hex, description chunks with hex where needed, species archetype, essence color details with placement (e.g. "stripes on upper back under dorsal fin").
- Keyed by **creature id** (same id as in blob / Fish Editor).
- Each entry can set:
  - `primaryColorHex` – Primary scale/skin color (e.g. `"#C0C0C0"` for silver).
  - `descriptionChunks` – Array of strings; include hex in text for markings (e.g. `"vertical black stripes #1a1a1a"`).
  - `visualMotif` – High-level visual theme.
  - `speciesArchetype` – `fish`, `shark`, `squid`, `eel`, `ray`, `cephalopod`.
  - `essenceColorDetails` – Array of `{ "essenceTypeId": "deep_sea" | "polluted" | …, "description": "placement text" }` for fantasy/mutant fish; hex is resolved from essence types.

The patch script applies this file **after** merging from biome docs, so patch entries override doc content for that creature.

## Applying the patch

1. **Dev server running** (e.g. `npm run dev`, `FISH_PWA_BASE_URL` default `http://localhost:3000`).
2. Run:
   ```bash
   npx tsx scripts/batch-update-creature-metadata.ts
   ```
3. Optional: use a different patch file:
   ```bash
   npx tsx scripts/batch-update-creature-metadata.ts --patches path/to/other-patches.json
   ```

The script fetches all creatures from blob, merges sizeTier/spawnRules/metrics and prompt chunks from `docs/biomes/*.md`, then applies `creature-prompt-patches.json` overrides, and POSTs metadata-only to `/api/save-creature` (no sprite upload).

## After patching

- **Fish Editor**: Open any creature; the Details tab and **Composed AI Prompt** will show the patched description chunks, primary color, species archetype, and adult metric size. Generation (base sprite or Sprite Lab growth phases) uses this composed prompt.
- **Growth phases**: When generating juvenile/adult/elder sprites, the full composed prompt (including hex and placement) is used so color and detail stay consistent across stages.

## Related docs

- **Modular prompt system**: `MODULAR_PROMPT_SYSTEM.md` – chunk types, primary color, essence details, species archetype.
- **Fish data structure**: `FISH_DATA_STRUCTURE_BATCH.md` – field definitions and example JSON.
- **Art style chunks**: `ART_STYLE_PROMPT_CHUNKS.md` – shared style (no black outlines, borderless/cell-shaded).
- **Scripts**: `scripts/README.md` – Step 5 (Patch Existing Creatures) and patch file usage.
