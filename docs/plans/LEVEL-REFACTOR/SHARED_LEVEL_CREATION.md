# Shared Level Creation – Implementation Status

This doc tracks the **shared "Create Level X-X"** refactor so we don't lose track. Full plan lives in the Cursor plan (Shared Level Creation); this is a copy of the essentials and status.

## Goal

- **Single source of truth**: One shared method `createLevel(biomeId, levelId)` builds the spawn list for a level (e.g. Shallows 1-1). Both `/game` and `/fish-editor` call it and pass the result into the existing canvas pipeline.
- **Rules-based, procedural**: Level config JSON defines **rules only** (fish count, apex count, sub_depths). We do **not** list fish IDs in JSON. At runtime we load creatures by biome from blob and fill slots by type/count; adding/removing fish in blob automatically affects levels.

## Order of Work

1. **Level config + loader** – `lib/game/data/level-config.json` (rules only) + `lib/game/data/level-loader.ts` (`getLevelConfig(biomeId, levelId)` with safe fallback).
2. **createLevel** – `lib/game/create-level.ts`: load config, load creatures by biome, filter by rules, fill slots (apex + prey), size with `computeEncounterSize`, return `{ spawnList }`.
3. **GameCanvas** – Replace manual spawn list with `createLevel('shallow', levelNum)`; remove ad-hoc fish count/apex logic.
4. **Fish editor** – Biome select = `createLevel(biomeId, 1)`; initial load same. Remove "spawn all fish in biome" path.
5. **Canvas spawn sync** – Harden so sync runs when canvas is ready (fix "no fish / no intro" in editor if needed).

## Key Files

| Purpose | Path |
|--------|------|
| Level rules (no fish IDs) | `lib/game/data/level-config.json` |
| Level rules loader | `lib/game/data/level-loader.ts` |
| Shared create-level API | `lib/game/create-level.ts` |
| Game route | `components/GameCanvas.tsx` |
| Editor route | `app/fish-editor/page.tsx` |
| Spawn sync | `lib/game/canvas-spawn-sync.ts` |

## Level Config Shape (“bones” for procedural loading)

The config is the **bones** for procedural level loading: pull in a biome, match fish to depth level by **meter size**, and map out an entire **run** (level 1–3, 3 phases each, biome(s) per level).

- **Biome** (in config): `depth_range_meters: { min, max }` – depth of the biome in meters, for sorting biomes and matching fish to depth.
- **Level** (per biome):  
  - `phases` – e.g. 3 phases per level (for future phase-based logic).  
  - `min_meters`, `max_meters` – fish size range in meters for this level; match fish to depth by size (used when creatures have `metrics.base_meters`).  
  - `fish_count`, `apex_count`, `sub_depths` – as before (counts and sub_depth filter).
- **Runs** (top-level): `runs[runId]` = `{ id, name, levels: [ { biome, level_id }, ... ] }` – maps out a full run (e.g. level 1–3 with biome(s) assigned per level). Use `getRunConfig(runId)` to load it.

Loader: `getLevelConfig(biomeId, levelId)` returns rules including `min_meters` / `max_meters` and `phases`. `getBiomeConfig(biomeId)` returns biome depth range for sorting. `getRunConfig(runId)` returns the run definition. Meter ranges are **not yet used** in `createLevel`; they are in place for sorting fish/biomes and for future filtering by `metrics.base_meters`.

## Assumptions

- Empty creature pool → `createLevel` returns `{ spawnList: [] }`; no throw. Callers handle empty list.
- Missing level in config → `getLevelConfig` returns safe default (e.g. fish_count 24, apex_count 1, sub_depths []).
- Spawn list shape = `Creature & { creatureId?: string }` with `stats.size` from `computeEncounterSize`. Sync assigns positions.

## Out of Scope (follow-up)

- **Meter scale patch**: Adding `metrics: { base_meters, base_art_scale }` and `sub_depth` to creature blobs via `batch-update-creature-metadata.ts` is **not** part of this refactor. Do that when we want sub_depth filtering and meter-based prompts. This refactor uses current `stats.size` and type/tier only.
- **Biome data**: Biomes already have `depthRange` in meters; no biome patch in this work.

## Related Docs in This Folder

- **Level Structure** – Nested biome/level/sub-depth JSON and level-gen.
- **Grok-Convo** – BLOB_CREATURES, meters/art scale, sub_depth, patching notes.

## Implementation status

**Plan is fully implemented.**

- **Done**: Level config (`level-config.json`) with meter bones (min/max_meters, phases, runs), level loader (`level-loader.ts`: `getLevelConfig`, `getBiomeConfig`, `getRunConfig`), `createLevel` (`create-level.ts`), GameCanvas wired to `createLevel`, fish-editor biome select and initial load use `createLevel` (with fallback spawn when `createLevel` returns empty), spawn sync hardened (`canvasReady` tied to `isClient`, `STAMINA` import fix so fish spawn and intros play).
- **Next (optional)**: Add more biomes/levels to `level-config.json`; use `min_meters`/`max_meters` in `createLevel` once creatures have `metrics.base_meters`; meter-scale patch (creature blob `metrics` + `sub_depth`) is follow-up.
