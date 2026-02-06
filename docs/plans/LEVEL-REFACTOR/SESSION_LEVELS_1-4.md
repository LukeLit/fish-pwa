# Session Levels 1–4: Run Description and Checklist

## Run flow

- **Level 1:** Depth bands **1-1** → **1-2** → **1-3** (depth steps; no full reload between them—player goes deeper after digestion). After 1-3: **Level Complete**.
- **Level 2:** New primary tag (for now can stay shallow); depth bands **2-1**, **2-2**, **2-3** (or as configured). Tag rules will get stricter as we add more data and art.

So: 1-1, 1-2, 1-3 are depth steps within one level; only at Level Complete do we generate the next level (new name, new primary tag, new depth bands).

---

## Blob snapshot

**File:** `docs/plans/LEVEL-REFACTOR/blob-snapshot.json` (gitignored by default).

**What’s in it:**

- `creatures`: Full creature objects from blob (id, name, biomeId, type, rarity, stats, spawnRules.canAppearIn, sizeTier, etc.). Optional per-creature `_inferred_base_meters` and `_inferred_base_art_scale` for planning only.
- `biomes`: `{ id, name, depthRange: { min, max } }` from code.
- `exportedAt`: ISO string.

**How to regenerate:**

1. Start the dev server (`npm run dev` or equivalent).
2. Run: `npx tsx scripts/download-blob-snapshot.ts`.
3. Script prints path, creature count, and biome count.

**Dependencies:** Dev server at `FISH_PWA_BASE_URL` (default `http://localhost:3000`) so `/api/list-creatures` works.

---

## Checklist: what we have and what to update

- [x] **Level-config = depth bands only, no biomes block.**  
  Done: `lib/game/data/level-config.json` has `depth_bands` (e.g. 1-1, 1-2, 1-3, 2-1, 2-2, 2-3) and `runs` with `steps` (depth band ids) and `primary_biome`. Level loader maps `getLevelConfig(biomeId, levelId)` to depth band rules and derives `run.levels` from `run.steps` for backward compat.

- [ ] **Blob: tags / canAppearIn aligned** so fish load by tags + weights. Snapshot shows current state; follow-up is to align creature metadata with tag model (e.g. `tags: string[]` or `canAppearIn` for primary/secondary tags).

- [ ] **Optional: metrics.base_meters, min_meters, max_meters, sub_depth in blob.**  
  Add via batch-update-creature-metadata so `createLevel` can filter by depth band min/max_meters and sub_depth. See [FISH_METRICS_AND_DEPTH_BANDS.md](./FISH_METRICS_AND_DEPTH_BANDS.md). Use snapshot to tune level band ranges first.

- [ ] **Document new fish for 3-x/4-x.**  
  See [NEW_FISH_REQUIREMENTS.md](./NEW_FISH_REQUIREMENTS.md) for fish to add to fill depth bands 3-x and 4-x.

- [ ] **Game/editor: wire run to depth bands and createLevel(primaryTag, levelTags, depthBandId).**  
  Follow-up: drive run progression from `getRunConfig(runId)` (which now exposes `steps` and derived `levels`); eventually call createLevel with primary tag, level tags, and depth band id instead of (biomeId, levelId). Current `createLevel(biomeId, levelId)` still works via level-loader mapping.
