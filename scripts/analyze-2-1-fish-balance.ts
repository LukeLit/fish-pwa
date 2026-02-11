#!/usr/bin/env tsx
/**
 * Analyze fish balance for 2-1: size comparability with player (1.35 m = 135 art units)
 * and whether 2-1 shows different fish than 1-3 (original plan).
 *
 * Uses blob-snapshot.json. Run: npx tsx scripts/analyze-2-1-fish-balance.ts
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

type Creature = {
  id: string;
  name?: string;
  biomeId?: string;
  type?: string;
  stats?: { size?: number };
  metrics?: { base_meters?: number; min_meters?: number; max_meters?: number };
  growthSprites?: { elder?: { sizeRange?: { max?: number } } };
  sizeTier?: string;
  spawnRules?: { canAppearIn?: string[] };
};

type Snapshot = { creatures: Creature[] };

const PLAYER_SIZE_2_1 = 135; // 1.35 m in art units
const TIER_SIZE_RANGES: Record<string, { min: number; max: number }> = {
  prey: { min: 20, max: 38 },
  mid: { min: 42, max: 58 },
  predator: { min: 70, max: 95 },
  boss: { min: 110, max: 150 },
};

function bandFit(
  creature: Creature,
  bandMin: number,
  bandMax: number
): boolean {
  const minM =
    creature.metrics?.min_meters ??
    creature.metrics?.base_meters ??
    (creature.stats?.size ?? 60) / 100;
  const maxM =
    creature.metrics?.max_meters ??
    creature.metrics?.base_meters ??
    (creature.stats?.size ?? 60) / 100;
  return minM <= bandMax && maxM >= bandMin;
}

function hasTag(creature: Creature, tags: string[]): boolean {
  const tagSet = new Set(tags);
  if (tagSet.has(creature.biomeId ?? '')) return true;
  const canAppear = creature.spawnRules?.canAppearIn ?? [];
  return canAppear.some((b) => tagSet.has(b));
}

function inferTier(c: Creature): string {
  if (c.sizeTier) return c.sizeTier;
  if (c.type === 'prey') return 'prey';
  if (c.type === 'predator') return 'predator';
  const s = c.stats?.size ?? 60;
  if (s <= 50) return 'prey';
  if (s <= 80) return 'mid';
  if (s <= 120) return 'predator';
  return 'boss';
}

function spawnSizeRange(tier: string, levelId: number): { min: number; max: number } {
  const range = TIER_SIZE_RANGES[tier] ?? TIER_SIZE_RANGES.mid;
  const levelMult = 1 + (levelId - 1) * 0.1;
  return {
    min: Math.round(range.min * levelMult),
    max: Math.round(range.max * levelMult),
  };
}

async function main() {
  const snapshotPath = join(
    process.cwd(),
    'docs/plans/LEVEL-REFACTOR/blob-snapshot.json'
  );
  const raw = await readFile(snapshotPath, 'utf-8');
  const snapshot: Snapshot = JSON.parse(raw);
  const creatures = snapshot.creatures ?? [];

  const levelTags = ['shallow', 'medium'];
  const taggedPool = creatures.filter((c) => hasTag(c, levelTags));

  // Current config: 1-3 and 2-1 both use 0.6–1.2 m
  const band_1_3 = { min: 0.6, max: 1.2 };
  const band_2_1_current = { min: 0.8, max: 1.4 }; // Shifted up to differentiate from 1-3
  // Original plan (FISH_SIZE_DEPTH_ANALYSIS): 2-1 was 0.5–1 m
  const band_2_1_original = { min: 0.5, max: 1 };

  const fit1_3 = taggedPool.filter((c) => bandFit(c, band_1_3.min, band_1_3.max));
  const fit2_1_current = taggedPool.filter((c) =>
    bandFit(c, band_2_1_current.min, band_2_1_current.max)
  );
  const fit2_1_original = taggedPool.filter((c) =>
    bandFit(c, band_2_1_original.min, band_2_1_original.max)
  );

  const ids1_3 = new Set(fit1_3.map((c) => c.id));
  const ids2_1_current = new Set(fit2_1_current.map((c) => c.id));
  const ids2_1_original = new Set(fit2_1_original.map((c) => c.id));

  const only1_3 = fit1_3.filter((c) => !ids2_1_current.has(c.id));
  const only2_1 = fit2_1_current.filter((c) => !ids1_3.has(c.id));
  const only2_1_original = fit2_1_original.filter((c) => !ids1_3.has(c.id));
  const only1_3_vs_original = fit1_3.filter((c) => !ids2_1_original.has(c.id));
  const only2_1_vs_original = fit2_1_original.filter((c) => !ids1_3.has(c.id));

  console.log('=== 2-1 Fish Balance Analysis ===\n');
  console.log(`Player size entering 2-1: ${PLAYER_SIZE_2_1} art units (1.35 m)\n`);

  console.log('--- Creature pool sizes ---');
  console.log(`Tagged (shallow/medium): ${taggedPool.length}`);
  console.log(`Fit 1-3 (0.6–1.2 m):     ${fit1_3.length}`);
  console.log(`Fit 2-1 (0.6–1.2 m):     ${fit2_1_current.length} (current)`);
  console.log(`Fit 2-1 (0.5–1 m):       ${fit2_1_original.length} (original plan)\n`);

  console.log('--- Different fish: 1-3 vs 2-1 ---');
  const sameBand = ids1_3.size === ids2_1_current.size && [...ids1_3].every((id) => ids2_1_current.has(id));
  if (sameBand) {
    console.log(`If 2-1 used same band (0.6–1.2): IDENTICAL pool (${fit1_3.length} fish).`);
  }
  console.log(
    `Current 2-1 band (0.8–1.4 m): ${fit2_1_current.length} fish. 1-3 has ${fit1_3.length}.`
  );
  console.log(`  → Only in 1-3 (excluded from 2-1): ${only1_3.length} fish (smaller species)`);
  console.log(`  → In both: ${fit2_1_current.length} fish (shared pool for 2-1)\n`);
  console.log(
    `Original plan (2-1: 0.5–1 m): 1-3 and 2-1 had different pools:`
  );
  console.log(`  → Only in 1-3 (not 2-1): ${only1_3_vs_original.length} fish`);
  console.log(`  → Only in 2-1 (not 1-3): ${only2_1_vs_original.length} fish\n`);

  if (only2_1_vs_original.length > 0) {
    console.log('  Fish only in 2-1 (original 0.5–1 band):');
    only2_1_vs_original.slice(0, 15).forEach((c) => {
      const min =
        c.metrics?.min_meters ?? (c.stats?.size ?? 60) / 100;
      const max =
        c.metrics?.max_meters ?? (c.stats?.size ?? 60) / 100;
      console.log(`    - ${c.name ?? c.id} (${c.type}) ${min.toFixed(2)}–${max.toFixed(2)} m`);
    });
    if (only2_1_vs_original.length > 15) {
      console.log(`    ... and ${only2_1_vs_original.length - 15} more`);
    }
  }

  console.log('\n--- Spawn sizes in 2-1 (level 4: +30% scaling) ---');
  const level4 = 4;
  const preyRange = spawnSizeRange('prey', level4);
  const predRange = spawnSizeRange('predator', level4);
  const bossRange = spawnSizeRange('boss', level4);
  console.log(`Prey:     ${preyRange.min}–${preyRange.max} art units`);
  console.log(`Predator: ${predRange.min}–${predRange.max} art units`);
  console.log(`Boss:     ${bossRange.min}–${bossRange.max} art units`);
  console.log(`Player:   ${PLAYER_SIZE_2_1} art units`);
  console.log('');
  console.log(
    `Comparability: Prey are much smaller (26–49). Predators overlap player (91–124). Boss is larger (143–195).`
  );
  console.log(
    `Verdict: Fish in 2-1 will be comparable — predators near player size, boss above.`
  );

  console.log('\n--- Recommendation for different fish in 2-1 ---');
  console.log(
    `To get different fish in 2-1 vs 1-3, shift 2-1 band up: e.g. 0.8–1.4 m.`
  );
  console.log(
    `This excludes small fish (max < 0.8) and favors larger/mid-range creatures.`
  );
  console.log(
    `Player at 1.35 m still fits (band only filters creature pool, not player).`
  );

  const band_2_1_proposed = { min: 0.8, max: 1.4 };
  const fit2_1_proposed = taggedPool.filter((c) =>
    bandFit(c, band_2_1_proposed.min, band_2_1_proposed.max)
  );
  const ids2_1_proposed = new Set(fit2_1_proposed.map((c) => c.id));
  const only1_3_proposed = fit1_3.filter((c) => !ids2_1_proposed.has(c.id));
  const only2_1_proposed = fit2_1_proposed.filter((c) => !ids1_3.has(c.id));
  console.log(`\nWith 2-1 = 0.8–1.4 m:`);
  console.log(`  Fit 2-1: ${fit2_1_proposed.length} fish`);
  console.log(`  Only in 1-3: ${only1_3_proposed.length} fish`);
  console.log(`  Only in 2-1: ${only2_1_proposed.length} fish`);
}

main().catch(console.error);
