# New Fish Requirements for 3-x and 4-x Depth Bands

Design doc for fish to add or retune to fill depth bands 3-x and 4-x (2–6 m range).

---

## Target spread

Goldfish (~0.15 m) to great white (~5–6 m) across 1-1 to 4-3.

---

## Band coverage summary

From [FISH_SIZE_DEPTH_ANALYSIS.md](./FISH_SIZE_DEPTH_ANALYSIS.md):

| Band | Fish count |
|------|------------|
| 1-1 | 49 |
| 1-2 | 39 |
| 1-3 | 34 |
| 2-1 | 36 |
| 2-2 | 30 |
| 2-3 | 29 |
| 3-1 | 23 |
| 3-2 | 17 |
| 3-3 | 9 |
| 4-1 | 9 |
| 4-2 | 9 |
| 4-3 | 5 |

Coverage drops sharply in 3-x and 4-x. Need more fish in the 2–6 m range.

---

## Fish to add / retune (prioritized)

1. **3-x and 4-x apex** – Hammerhead, Tiger Shark, or larger shark variants (2–5 m).

2. **Deep mid-range** – Barracuda elder (up to 1.8 m), Oarfish elder (already 1.2 base, can grow 8 m; ensure metrics reflect that).

3. **Tropical apex** – Large parrotfish or moray elder for shallow_tropical 2–3 m.

4. **Polluted apex** – Waste Leviathan already 1.2 m; consider one more 2–3 m polluted predator.

---

## Data source

- Add entries to `docs/biomes/*.md`
- Run `npx tsx scripts/batch-generate-fish.ts` for new IDs
- Run `npx tsx scripts/batch-update-creature-metadata.ts` for metrics

---

## Reference

- [FISH_SIZE_DEPTH_ANALYSIS.md](./FISH_SIZE_DEPTH_ANALYSIS.md) – "Suggested metrics updates" table for existing fish
- Run `npx tsx scripts/analyze-fish-size-depth.ts` to regenerate analysis
