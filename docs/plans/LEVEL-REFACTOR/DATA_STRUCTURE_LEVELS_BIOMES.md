# Data Structure: Tags, Procedural Levels, Flow

**Goal:** Treat biomes as **tags** in both UI and logic. Level config is **procedural**—no biomes baked in. Levels are created at runtime using a **primary tag** (background), **level tags** (primary + secondary) for fish selection with weights, and **depth bands** (1-1, 1-2, 1-3). No level reload after digestion; player goes deeper (bigger fish) until Level Complete, then Level 2 with a new biome/depth. Player starts with only **shallow** unlocked; for now use **random** biome tags.

---

## Biomes = tags

- **Biomes are tags** everywhere: UI and logic use tags (e.g. `shallow`, `tropical`), not a fixed biome list in config.
- **Creatures** have tags (e.g. `tags: ["shallow"]` or `["shallow", "tropical"]`). Fish with multiple tags can be favored when the level has both.
- **Backgrounds** have tags; we match backgrounds to the level by primary tag (or tag overlap).
- **Level (runtime)** has: primary tag, level tags (primary + secondary), depth band. No biome list is baked into level-config.
- Rules for which tags are valid / required will get **stricter** as we add more data and art.

---

## How a level is created (procedural)

1. **Primary tag** (e.g. `shallow`) — chosen from **unlocked** tags (player starts with only `shallow`). Used to pick the **background image** (backgrounds have tags; match by primary). For now, primary can be **random** from unlocked.
2. **Level tags** = primary + **secondary tags** (e.g. `[shallow, tropical]`). Secondary can be empty or random for now.
3. **Background** — select background whose tags include the primary (or match level tags). Backgrounds with multiple tags can be used when level has those tags.
4. **Fish** — chosen by level tags with **weights**: fish that have more matching tags (e.g. both shallow and tropical) are favored; fish are mostly from the primary tag via this weighting.
5. **Depth band** — from config (e.g. 1-1, 1-2, 1-3): `min_meters`, `max_meters`, `fish_count`, `apex_count`. Filter fish by size in that range.

Level-config does **not** list biomes. It defines **depth bands** (and optionally level-name templates). The **procedure** at runtime: pick primary tag from unlocked (random for now), optional secondary tags, then pick background by primary, build fish pool by tags + weights, apply depth band for size filter.

---

## Level flow (no reload after digestion)

- **"<Level Name> 1-1"** — depth band 1 (e.g. smallest fish), primary tag drives background, tags drive fish.
- **Digestion sequence**
- **"<Level Name> 1-2"** — **go deeper** (no reload): same level name, next depth band; bigger fish. No full level reload; we just allow the player to go deeper.
- **Digestion sequence**
- **"<Level Name> 1-3"** — same level name, next depth band; bigger fish again.
- **"<Level Name> Complete!"**
- **Level 2** — **generate** with a new primary tag (can be different biome), new depth bands, etc. For now Level 2 can stay **shallow**; we know it can be a different biome as we add data/art and stricter tag rules.

So: 1-1, 1-2, 1-3 are **depth steps** within one level; digestion between them; only at "Level Complete" do we generate the next level (new name, new primary tag, new depth). No full level reload after digestion.

---

## Config: procedural, no biomes baked in

- **level-config** contains:
  - **Depth bands** (e.g. 1-1, 1-2, 1-3 for Level 1; then 2-1, 2-2, 2-3 for Level 2): `min_meters`, `max_meters`, `fish_count`, `apex_count`, `phases`, etc.
  - Optionally level-name templates or rules.
  - **No** `biomes` block or fixed list of biomes.
- **Procedure** at runtime:
  - Primary tag: from **unlocked** set (player starts with `shallow` only); for now **random** from unlocked.
  - Secondary tags: optional; for now random or empty.
  - Background: by primary tag (backgrounds have tags).
  - Fish: by level tags + weights (creatures have tags; multi-tag match favored).
  - Depth band: from config; filter fish by size.

---

## Unlocks

- Player starts with only **shallow** unlocked → pool limited to creatures that have the `shallow` tag (and any secondary tags on the level).
- Level 2 can use a different primary tag once we have more biomes unlocked and stricter tag rules.

---

## Data shape (summary)

- **Creature** — `tags: string[]` (e.g. `["shallow"]`, `["shallow", "tropical"]`). Optionally keep `biomeId` as primary for backward compat; selection uses tags + weights.
- **Background** — `tags: string[]`; match to level by primary tag or tag overlap.
- **Level (runtime)** — level name, primary tag, level tags (primary + secondary), depth band (from config).
- **Level config** — depth bands only (no biome list). Flow: Level 1 = bands 1-1 → 1-2 → 1-3 → Complete → Level 2 = new primary tag + new depth bands.

---

## Migration notes

- **createLevel** (or equivalent) will take: primary tag, level tags, depth band id (e.g. 1-1, 1-2, 1-3). It selects background by primary; loads creatures by tags + weights; filters by depth band min/max_meters.
- **Level loader** — `getLevelConfig(levelId)` or `getDepthBand(levelIndex, phase)` returns depth band rules (min_meters, max_meters, counts). No `getBiomeConfig` baked into config; tags come from creatures and backgrounds and from the runtime procedure (unlocked set, random pick).
- As we get more data and art, **tag rules** can become stricter (e.g. which tags can combine, which backgrounds match which level names).
