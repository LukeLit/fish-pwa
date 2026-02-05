# Level Refactor – Plan Docs

Docs for the level/biome refactor and shared level creation.

| File | Purpose |
|------|---------|
| **DATA_STRUCTURE_LEVELS_BIOMES.md** | Tags, procedural levels, flow: biomes = tags; depth bands only in config; 1-1→1-2→1-3→Level 2; no reload after digestion. |
| **PLAN_BLOB_SNAPSHOT_AND_LEVELS.md** | Single plan: blob snapshot script, level-config = depth bands only, flow 1-1→1-2→1-3→Level 2, order of work. |
| **SHARED_LEVEL_CREATION.md** | Implementation status for shared `createLevel(biomeId, levelId)` used by /game and /fish-editor. Start here to see what we’re doing and what’s done. |
| **Level Structure** | Nested JSON for biomes/levels/sub-depths and level-gen. |
| **Grok-Convo** | BLOB_CREATURES, meters/art scale, sub_depth, patching (batch-update-creature-metadata). |
| **fish-data** | (Legacy/reference.) |
