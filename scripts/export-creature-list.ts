#!/usr/bin/env tsx
/**
 * Export the current list of blob-stored creatures to docs/BLOB_CREATURES.md
 * so you can track which fish exist, add more, or add stats. Run after batch
 * import or whenever blob storage changes.
 *
 * Requires dev server at FISH_PWA_BASE_URL (default http://localhost:3000).
 * Output: docs/BLOB_CREATURES.md
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';
const OUTPUT_PATH = join(process.cwd(), 'docs', 'BLOB_CREATURES.md');

type CreatureRow = {
  id: string;
  name?: string;
  biomeId?: string;
  sizeTier?: string;
  rarity?: string;
  type?: string;
  playable?: boolean;
  stats?: { size?: number; speed?: number; health?: number; damage?: number };
};

function escapeCell(s: unknown): string {
  if (s === undefined || s === null) return '—';
  const t = String(s);
  return t.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

async function main() {
  const res = await fetch(`${BASE_URL}/api/list-creatures`);
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('Failed to list creatures:', res.status, await res.text());
    process.exit(1);
  }
  const data = (await res.json()) as { success?: boolean; creatures?: CreatureRow[] };
  const creatures = (data?.creatures ?? []) as CreatureRow[];

  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    '# Blob-Stored Creatures (Snapshot)',
    '',
    'This file lists fish currently in Vercel Blob Storage. Use it to see what’s imported, add more fish in `docs/biomes/*.md`, or add stats.',
    '',
    '**Refresh:** run `npx tsx scripts/export-creature-list.ts` (dev server must be running).',
    '',
    `**Last updated:** ${date} · **Total:** ${creatures.length}`,
    '',
    '| ID | Name | Biome | Tier | Rarity | Type | Playable | Size |',
    '|----|------|-------|------|--------|------|----------|------|',
  ];

  const sorted = [...creatures].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
  for (const c of sorted) {
    const row = [
      escapeCell(c.id),
      escapeCell(c.name),
      escapeCell(c.biomeId),
      escapeCell(c.sizeTier),
      escapeCell(c.rarity),
      escapeCell(c.type),
      c.playable ? '✓' : '—',
      escapeCell(c.stats?.size),
    ].join(' | ');
    lines.push(`| ${row} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  lines.push('- **Add more fish:** Add entries to `docs/biomes/*.md`, then run `npx tsx scripts/batch-generate-fish.ts` (skips existing).');
  lines.push('- **Add tiers/stats to existing:** Run `npx tsx scripts/batch-update-creature-metadata.ts`.');
  lines.push('- **Refresh this list:** Run `npx tsx scripts/export-creature-list.ts`.');
  lines.push('');

  await writeFile(OUTPUT_PATH, lines.join('\n'), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${creatures.length} creatures to ${OUTPUT_PATH}`);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Export failed:', err);
    process.exit(1);
  });
}
