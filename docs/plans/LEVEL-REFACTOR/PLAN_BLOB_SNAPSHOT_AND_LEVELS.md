# Blob Snapshot and Level Flow (Tags, Procedural)

**Overview:** Add a script to download all fish and biome data from blob into a snapshot JSON for inspection. Level config is **procedural** (depth bands only, no biomes baked in). Biomes are **tags**: primary tag for background, level tags (primary + secondary) for fish selection with weights. Flow: **1-1** → digestion → **1-2** (go deeper, no reload) → digestion → **1-3** → Level Complete → **Level 2** (shallow for now; can be different biome later). Tag rules will get stricter as more data/art exist.

**Data structure:** See [DATA_STRUCTURE_LEVELS_BIOMES.md](./DATA_STRUCTURE_LEVELS_BIOMES.md).

---

## 1. Download script: blob + biome snapshot

**Goal:** One runnable script that fetches all creature data from blob and exports code biomes so we can see what we have and map levels.

**Approach:**

- New script `scripts/download-blob-snapshot.ts` (dev server required, like `scripts/export-creature-list.ts`):
  - Call `GET ${BASE_URL}/api/list-creatures` (no filters) for full `Creature[]` from blob.
  - For biomes: import `getAllBiomes()` from the game and serialize `id`, `name`, `depthRange` (min/max meters). Prefer that over a new API.
  - Write **`docs/plans/LEVEL-REFACTOR/blob-snapshot.json`** with:
    - `creatures`: full creature objects (id, name, biomeId, type, rarity, stats, spawnRules.canAppearIn, sizeTier, etc.).
    - `biomes`: `{ id, name, depthRange: { min, max } }` from code.
    - `exportedAt`: ISO string.
    - Optional: per creature, `_inferred_base_meters: stats.size / 100` for planning only (do not write back to blob).
  - Runnable with `npx tsx scripts/download-blob-snapshot.ts`; print path, creature count, biome count.

**Output:** `docs/plans/LEVEL-REFACTOR/blob-snapshot.json` (gitignore if desired).

**Dependencies:** Dev server at `FISH_PWA_BASE_URL` (default `http://localhost:3000`).

---

## 2. Level config: depth bands only; flow 1-1 → 1-2 → 1-3 → Level 2

**Goal:** Level config is procedural—depth bands only, no biomes list. Flow: **1-1** → digestion → **1-2** (go deeper, no reload) → digestion → **1-3** → Level Complete → **Level 2** (new primary tag; for now can stay shallow, different biome later). Tag rules get stricter with more data/art.

**Current state:** `lib/game/data/level-config.json` has biomes with nested levels and one run (e.g. shallow_run 1–3). We move to **depth bands** only; biomes are **tags** at runtime (primary + secondary), not baked into config.

**Changes:**

- **Config shape:** Top-level **depth bands** (e.g. Level 1 = 1-1, 1-2, 1-3; Level 2 = 2-1, 2-2, 2-3). Each band: `min_meters`, `max_meters`, `fish_count`, `apex_count`, `phases`, etc. **No** `biomes` block; no fixed list of biomes in config.
- **Run / flow:** Steps reference depth bands (e.g. 1-1, 1-2, 1-3 for Level 1). Primary tag (and optional secondary) chosen at runtime from **unlocked** tags (player starts with only shallow; for now **random** from unlocked). Level 2 can stay shallow; known it can be a different biome as tag rules tighten.
- **Concrete:** Level 1 = bands 1-1, 1-2, 1-3 (no reload between them; only after 1-3 show Level Complete, then Level 2). Level 2 = bands 2-1, 2-2, … (can stay shallow).

Level loader: `getLevelConfig(levelId)` (or equivalent) returns depth band rules only. Primary/secondary tags and background/fish selection live in **createLevel** (or equivalent) using tags + weights; see DATA_STRUCTURE_LEVELS_BIOMES.md.

---

## 3. Meters and data for mapping

**In snapshot (planning only):**

- Per creature: **inferred** `_inferred_base_meters = stats.size / 100` (optional `_inferred_base_art_scale = stats.size`) to map fish to level bands. Do not write back to blob.

**In level-config:**

- Each band has `min_meters`, `max_meters`. Use snapshot to choose ranges that cover available fish.

**Future (document only):**

- **Meter scale:** Add `metrics: { base_meters, base_art_scale, min_meters?, max_meters?, sub_depth }` to creature blobs via batch-update-creature-metadata so createLevel can filter by depth band. See [FISH_METRICS_AND_DEPTH_BANDS.md](./FISH_METRICS_AND_DEPTH_BANDS.md).
- **Tags / canAppearIn:** Creatures have tags (or biomeId/canAppearIn for backward compat); selection by tags + weights. Snapshot shows current state; follow-up to align blob with tag model.

---

## 4. Doc: what we have and what to update

**Under `docs/plans/LEVEL-REFACTOR/`:**

- **SESSION_LEVELS_1-4.md** (or equivalent):
  - Short description of run: Level 1 = 1-1 → 1-2 → 1-3 (depth steps, no reload) → Level Complete → Level 2 (new primary tag; shallow for now).
  - Reference to `blob-snapshot.json` (how to regenerate, what’s in it).
  - Checklist: (1) Level-config = depth bands only, no biomes block. (2) Blob: tags / canAppearIn aligned so fish load by tags + weights. (3) Optional: metrics.base_meters, sub_depth in blob. (4) Game/editor: wire run to depth bands and createLevel(primaryTag, levelTags, depthBandId).

---

## 5. Order of work

1. **Implement download script** — fetch creatures from API, biomes from code; write `blob-snapshot.json` with optional _inferred_base_meters; document dev server requirement.
2. **Run script once** (or document “run after dev server up”) to get a snapshot to tune from.
3. **Refactor level-config** — depth bands only (e.g. 1-1, 1-2, 1-3 for Level 1; 2-1, 2-2, … for Level 2); no biomes block; runs reference depth bands.
4. **Add SESSION_LEVELS doc** — describe run, snapshot, and checklist above.

---

## 6. Files to add or touch

- **New:** `scripts/download-blob-snapshot.ts` — fetch list-creatures + biomes, write snapshot JSON with optional _inferred_base_meters.
- **New:** `docs/plans/LEVEL-REFACTOR/SESSION_LEVELS_1-4.md` — run description, snapshot usage, checklist.
- **Edit:** `lib/game/data/level-config.json` — depth bands only (no biomes block); runs = steps by depth band.
- **Optional:** `app/api/list-biomes/route.ts` only if we prefer API over script importing biomes.

---

## 7. Data flow (high level)

- Blob + code biomes → download script → `blob-snapshot.json`.
- Level config (depth bands) + runtime (unlocked tags, random primary/secondary) → createLevel → background by primary tag, fish by tags + weights, filtered by depth band.
- Game/editor: 1-1 → digestion → 1-2 → digestion → 1-3 → Level Complete → Level 2 (follow-up wiring).

No game/editor code changes required for the snapshot or config refactor; wiring run progression to depth bands and createLevel(primaryTag, levelTags, depthBandId) is a follow-up task.
