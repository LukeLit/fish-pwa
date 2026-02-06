# Level Refactor – Plan Docs

Docs for the level/biome refactor and shared level creation.

| File | Purpose |
|------|---------|
| **DATA_STRUCTURE_LEVELS_BIOMES.md** | Tags, procedural levels, flow: biomes = tags; depth bands only in config; 1-1→1-2→1-3→Level 2; no reload after digestion. |
| **FISH_METRICS_AND_DEPTH_BANDS.md** | Canonical design for creature metrics (base_meters, min_meters, max_meters, sub_depth) and band-fit rules. |
| **NEW_FISH_REQUIREMENTS.md** | Fish to add for 3-x and 4-x depth bands; prioritized list and data source. |
| **PLAN_BLOB_SNAPSHOT_AND_LEVELS.md** | Single plan: blob snapshot script, level-config = depth bands only, flow 1-1→1-2→1-3→Level 2, order of work. |
| **SHARED_LEVEL_CREATION.md** | Implementation status for shared `createLevel(biomeId, levelId)` used by /game and /fish-editor. Start here to see what we’re doing and what’s done. |
| **Level Structure** | Nested JSON for biomes/levels/sub-depths and level-gen. |
| **Grok-Convo** | BLOB_CREATURES, meters/art scale, sub_depth, patching (batch-update-creature-metadata). |
| **fish-data** | (Legacy/reference.) |
