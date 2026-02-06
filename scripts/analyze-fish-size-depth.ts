#!/usr/bin/env tsx
/**
 * Analyze fish size distribution across depth bands for level planning.
 * Reads blob-snapshot.json and outputs FISH_SIZE_DEPTH_ANALYSIS.md.
 *
 * Run: npx tsx scripts/analyze-fish-size-depth.ts
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

type Creature = {
  id: string;
  name?: string;
  biomeId?: string;
  type?: string;
  stats?: { size?: number };
  growthSprites?: { elder?: { sizeRange?: { max?: number } } };
  _inferred_base_meters?: number;
};

type Snapshot = { creatures: Creature[] };

// Real-world size reference (meters): min = near end of juvenile, max = full grown
// Goldfish: ~0.05–0.35 m | Guppy/minnow: ~0.02–0.06 m | Great white: 4–6 m
const REAL_WORLD_SIZES: Record<string, { min: number; max: number }> = {
  // Tiny (shallows)
  goldfish: { min: 0.08, max: 0.35 },
  guppy: { min: 0.03, max: 0.06 },
  minnow: { min: 0.05, max: 0.12 },
  clownfish: { min: 0.06, max: 0.11 },
  butterflyfish: { min: 0.08, max: 0.2 },
  blue_tang: { min: 0.08, max: 0.3 },
  pumpkinseed: { min: 0.05, max: 0.25 },
  fathead_minnow: { min: 0.04, max: 0.08 },
  mosquitofish: { min: 0.02, max: 0.07 },
  yellow_perch: { min: 0.05, max: 0.4 },
  sardine: { min: 0.1, max: 0.25 },
  perch: { min: 0.12, max: 0.5 },
  common_carp: { min: 0.15, max: 1.0 },
  channel_catfish: { min: 0.2, max: 1.2 },
  bass: { min: 0.2, max: 0.75 },
  pike: { min: 0.3, max: 1.2 },
  barracuda: { min: 0.4, max: 1.8 },
  lionfish: { min: 0.15, max: 0.45 },
  moray_eel: { min: 0.3, max: 1.5 },
  parrotfish: { min: 0.2, max: 1.2 },
  mackerel: { min: 0.25, max: 0.6 },
  ocean_sunfish: { min: 0.5, max: 3.0 },
  thresher_shark: { min: 0.8, max: 5.5 },
  anglerfish: { min: 0.2, max: 1.0 },
  gulper_eel: { min: 0.3, max: 1.8 },
  vampire_squid: { min: 0.15, max: 0.3 },
  giant_isopod: { min: 0.08, max: 0.5 },
  bristlemouth: { min: 0.02, max: 0.1 },
  glass_squid: { min: 0.05, max: 0.15 },
  juvenile_squid: { min: 0.05, max: 0.3 },
  lanternfish: { min: 0.02, max: 0.15 },
  dragonfish: { min: 0.05, max: 0.4 },
  fangtooth: { min: 0.03, max: 0.18 },
  hatchetfish: { min: 0.02, max: 0.12 },
  viperfish: { min: 0.1, max: 0.35 },
  barreleye: { min: 0.05, max: 0.15 },
  black_swallower: { min: 0.1, max: 0.25 },
  cusk_eel: { min: 0.05, max: 0.6 },
  snailfish: { min: 0.03, max: 0.3 },
  tripod_fish: { min: 0.05, max: 0.35 },
  grenadier: { min: 0.2, max: 1.2 },
  oarfish: { min: 0.5, max: 8.0 },
  // Sharks / apex
  great_white: { min: 1.0, max: 6.0 },
  hammerhead_shark: { min: 1.0, max: 4.0 },
  tiger_shark: { min: 1.5, max: 5.0 },
  reef_shark: { min: 1.5, max: 3.0 },
  toxic_behemoth: { min: 1.5, max: 3.0 },
  // Mutants / fiction - use game-appropriate spread
  mutant: { min: 0.15, max: 1.0 },
  sludge: { min: 0.15, max: 0.8 },
  toxic: { min: 0.2, max: 1.5 },
  leviathan: { min: 1.0, max: 5.0 },
  waste_leviathan: { min: 1.0, max: 4.0 },
  abyssal_horror: { min: 0.5, max: 3.0 },
};

function inferRealWorldSize(name: string, id: string): { min: number; max: number } | null {
  const lower = (name || id).toLowerCase();
  // Check shark / great white first (overrides "bass" in "Great White Bass")
  if (lower.includes('great white') || (lower.includes('shark') && !lower.includes('bass'))) return { min: 1.0, max: 6.0 };
  // Elder/Leviathan lantern = large variant, not tiny lanternfish
  if (lower.includes('elder lanternfish') || lower.includes('leviathan lantern')) return { min: 0.8, max: 3.0 };
  for (const [key, sizes] of Object.entries(REAL_WORLD_SIZES)) {
    if (lower.includes(key.replace(/_/g, ' ')) || lower.includes(key)) return sizes;
  }
  if (lower.includes('shark')) return { min: 1.0, max: 6.0 };
  if (lower.includes('carp') || lower.includes('catfish')) return { min: 0.15, max: 1.2 };
  if (lower.includes('eel')) return { min: 0.2, max: 1.5 };
  if (lower.includes('squid')) return { min: 0.1, max: 0.4 };
  if (lower.includes('mutant') || lower.includes('zombie')) return { min: 0.15, max: 1.0 };
  if (lower.includes('leviathan')) return { min: 1.0, max: 5.0 };
  return null;
}

async function main() {
  const snapshotPath = join(process.cwd(), 'docs', 'plans', 'LEVEL-REFACTOR', 'blob-snapshot.json');
  const content = await readFile(snapshotPath, 'utf-8');
  const snapshot: Snapshot = JSON.parse(content);
  const creatures = snapshot.creatures.filter((c) => c.id && !c.id.startsWith('shallow') && !c.id.startsWith('deep'));

  // Proposed depth bands 1-1 → 4-3: goldfish (~0.15m) to great white (~5m)
  const DEPTH_BANDS: Record<string, { min_m: number; max_m: number }> = {
    '1-1': { min_m: 0.15, max_m: 0.5 },   // Shallows – guppy/goldfish/minnow
    '1-2': { min_m: 0.35, max_m: 0.9 },   // Upper – perch/sardine
    '1-3': { min_m: 0.6, max_m: 1.2 },    // Mid – bass/carp
    '2-1': { min_m: 0.5, max_m: 1.0 },
    '2-2': { min_m: 0.8, max_m: 1.5 },
    '2-3': { min_m: 1.0, max_m: 2.0 },
    '3-1': { min_m: 1.2, max_m: 2.5 },
    '3-2': { min_m: 1.5, max_m: 3.0 },
    '3-3': { min_m: 2.0, max_m: 4.0 },
    '4-1': { min_m: 2.5, max_m: 4.5 },
    '4-2': { min_m: 3.0, max_m: 5.0 },
    '4-3': { min_m: 3.5, max_m: 6.0 },    // Apex – great white range
  };

  const rows: Array<{
    name: string;
    id: string;
    biome: string;
    type: string;
    current_base_m: number;
    elder_max_m: number;
    rw_min?: number;
    rw_max?: number;
    fits_bands: string[];
  }> = [];

  for (const c of creatures) {
    const baseM = c._inferred_base_meters ?? (c.stats?.size ?? 60) / 100;
    const elderMax = c.growthSprites?.elder?.sizeRange?.max;
    const maxM = elderMax != null ? elderMax / 100 : 3.0;
    const rw = inferRealWorldSize(c.name ?? '', c.id);
    const fitsBands = Object.entries(DEPTH_BANDS).filter(
      ([_, band]) => (rw ? rw.min <= band.max_m && rw.max >= band.min_m : baseM <= band.max_m && maxM >= band.min_m)
    ).map(([id]) => id);

    rows.push({
      name: c.name ?? c.id,
      id: c.id,
      biome: c.biomeId ?? '—',
      type: c.type ?? 'prey',
      current_base_m: baseM,
      elder_max_m: maxM,
      rw_min: rw?.min,
      rw_max: rw?.max,
      fits_bands: fitsBands,
    });
  }

  rows.sort((a, b) => a.current_base_m - b.current_base_m);

  let md = `# Fish Size & Depth Band Analysis

Generated: ${new Date().toISOString()}

## Target spread: goldfish (0.15 m) → great white (5–6 m)

- **1-1** (shallow): ~0.15–0.5 m – goldfish, guppy, minnow
- **4-3** (deep apex): ~3.5–6 m – great white, oarfish elder, large apex

## Proposed depth bands (min_m – max_m)

| Band | Min (m) | Max (m) |
|------|---------|---------|
${Object.entries(DEPTH_BANDS).map(([id, b]) => `| ${id} | ${b.min_m} | ${b.max_m} |`).join('\n')}

---

## Current fish: size distribution

| Name | Biome | Type | Current base (m) | Elder max (m) | Real-world min–max (m) | Fits bands |
|------|-------|------|------------------|---------------|------------------------|------------|
`;

  for (const r of rows) {
    const rwStr = r.rw_min != null && r.rw_max != null ? `${r.rw_min.toFixed(2)}–${r.rw_max.toFixed(2)}` : '—';
    md += `| ${r.name} | ${r.biome} | ${r.type} | ${r.current_base_m.toFixed(2)} | ${r.elder_max_m.toFixed(1)} | ${rwStr} | ${r.fits_bands.join(', ') || '—'} |\n`;
  }

  // Gaps: bands with few/no fish
  const bandCounts: Record<string, number> = {};
  for (const id of Object.keys(DEPTH_BANDS)) bandCounts[id] = 0;
  for (const r of rows) {
    for (const b of r.fits_bands) bandCounts[b] = (bandCounts[b] ?? 0) + 1;
  }

  md += `
---

## Band coverage (fish count per band)

| Band | Fish count |
|------|------------|
${Object.entries(bandCounts).map(([id, n]) => `| ${id} | ${n} |`).join('\n')}

---

## Suggested metrics updates (real-world min/max)

Fish where real-world range differs from current base. Use as metrics.min_meters / metrics.max_meters when batch-updating.

| ID | Name | Current (m) | Suggested min (m) | Suggested max (m) |
|----|------|-------------|-------------------|-------------------|
${rows
      .filter((r) => r.rw_min != null && r.rw_max != null)
      .slice(0, 35)
      .map((s) => `| ${s.id} | ${s.name} | ${s.current_base_m.toFixed(2)} | ${s.rw_min!.toFixed(2)} | ${s.rw_max!.toFixed(2)} |`)
      .join('\n')}

---

## Notes

1. **Current spread**: Most fish are 0.2–1.2 m. Need more in 2–6 m range for 3-x and 4-x.
2. **Real-world sizes**: Use \`rw_min\`/\`rw_max\` as suggested \`metrics.min_meters\`/\`metrics.max_meters\` when updating creatures.
3. **Juvenile floor**: Don't use microscopic sizes; start near end of juvenile (e.g. guppy 0.03 m min, goldfish 0.08 m min).
4. **Fish to add**: Consider adding or retuning: larger sharks, barracuda elder, oarfish (already 1.2 base, can grow 8 m), thresher shark elder, lionfish/tropical apex.
`;

  const outPath = join(process.cwd(), 'docs', 'plans', 'LEVEL-REFACTOR', 'FISH_SIZE_DEPTH_ANALYSIS.md');
  const fs = await import('fs/promises');
  await fs.writeFile(outPath, md, 'utf-8');
  console.log(`Wrote ${outPath}`);
  console.log(`Creatures analyzed: ${rows.length}`);
  console.log(`Depth bands: ${Object.keys(DEPTH_BANDS).length}`);
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
