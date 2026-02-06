# Fish Metrics and Depth Bands

Canonical design for creature size metrics and how they map to depth bands (1-1 through 4-3).

---

## Metrics rules

| Field | Purpose |
|-------|---------|
| `base_meters` | Start size in meters. Used for display and fallback when min/max absent. Derived from `stats.size / 100`. |
| `base_art_scale` | Art units for rendering (same as `stats.size`). |
| `min_meters` | Real-world min size (near end of juvenile). Floor ~0.05 m to avoid microscopic. |
| `max_meters` | Real-world max when grown. Default 3 m when no elder sprite; else `elder.sizeRange.max / 100`. |
| `sub_depth` | `'upper' | 'mid' | 'lower'` for progression tiers. Inferred from size if absent. |

---

## Band-fit rule

Creature fits depth band `(band_min, band_max)` when:

- `(min_meters ?? base_meters) <= band_max` AND `(max_meters ?? base_meters) >= band_min`

This allows fish with a size range to appear in bands that overlap that range.

---

## Depth bands (1-1 to 4-3)

| Band | Min (m) | Max (m) |
|------|---------|---------|
| 1-1 | 0.15 | 0.5 |
| 1-2 | 0.35 | 0.9 |
| 1-3 | 0.6 | 1.2 |
| 2-1 | 0.5 | 1 |
| 2-2 | 0.8 | 1.5 |
| 2-3 | 1 | 2 |
| 3-1 | 1.2 | 2.5 |
| 3-2 | 1.5 | 3 |
| 3-3 | 2 | 4 |
| 4-1 | 2.5 | 4.5 |
| 4-2 | 3 | 5 |
| 4-3 | 3.5 | 6 |

---

## Juvenile floor

Do not use microscopic sizes. Min should be near end of juvenile:

- Guppy: ~0.03 m min
- Goldfish: ~0.08 m min

---

## Batch script

[batch-update-creature-metadata.ts](../../scripts/batch-update-creature-metadata.ts) currently sets `base_meters`, `base_art_scale`, `sub_depth`. Extend to support `min_meters` / `max_meters` when adding the real-world size table.

---

## Related

- [FISH_SIZE_DEPTH_ANALYSIS.md](./FISH_SIZE_DEPTH_ANALYSIS.md) – Generated analysis with suggested min/max per creature
- [NEW_FISH_REQUIREMENTS.md](./NEW_FISH_REQUIREMENTS.md) – Fish to add for 3-x and 4-x
