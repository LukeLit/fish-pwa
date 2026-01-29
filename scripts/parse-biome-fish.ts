#!/usr/bin/env tsx
/**
 * Parse biome markdown files into structured fish data suitable for batch upload.
 *
 * Input: docs/biomes/*.md
 * Output shape (in-memory / stdout):
 *   {
 *     id: string;
 *     name: string;
 *     biome: string;
 *     rarity: string;
 *     sizeTier: 'prey' | 'mid' | 'predator' | 'boss' | string;
 *     essence: Record<string, number>;
 *     descriptionChunks: string[];
 *     visualMotif?: string;
 *   }[]
 */

import { readFile, readdir } from 'fs/promises';
import { join, basename, extname } from 'path';

export interface ParsedFish {
  id: string;
  name: string;
  biome: string;
  rarity: string;
  sizeTier: 'prey' | 'mid' | 'predator' | 'boss' | string;
  essence: Record<string, number>;
  descriptionChunks: string[];
  visualMotif?: string;
}

const BIOME_DIR = 'docs/biomes';

/**
 * Parse a single biome markdown file into ParsedFish entries.
 * Supports both the "Fish List" format and the richer "Biome: ..." format
 * used in the shallow biome doc.
 */
export async function parseBiomeFile(path: string): Promise<ParsedFish[]> {
  const content = await readFile(path, 'utf-8');
  const lines = content.split(/\r?\n/);

  const biomeId = deriveBiomeIdFromFile(path, content);

  const fish: ParsedFish[] = [];

  // Strategy: look for fish entry headers and then inspect following bullet lines.
  // We support patterns like:
  // - "1. **Name**"
  // - "#### Name (id)"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pattern A: numbered list entry: "1. **Name**"
    let match = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    // Pattern B: heading with id: "#### Name (id)"
    if (!match) {
      const headingMatch = line.match(/^####\s+(.+?)(?:\s+\(([^)]+)\))?\s*$/);
      if (headingMatch) {
        const name = headingMatch[1].trim();
        const explicitId = (headingMatch[2] || '').trim();
        const block = extractFishBlock(lines, i + 1);
        const parsed = parseFishBlock(name, explicitId, biomeId, block);
        if (parsed) fish.push(parsed);
        continue;
      }
    }

    if (match) {
      const name = match[1].trim();
      const block = extractFishBlock(lines, i + 1);
      const parsed = parseFishBlock(name, undefined, biomeId, block);
      if (parsed) fish.push(parsed);
    }
  }

  return fish;
}

function deriveBiomeIdFromFile(path: string, content: string): string {
  const base = basename(path, extname(path));
  // Prefer explicit biome id if present in the doc
  const idMatch = content.match(/Biome ID\s*\**:\s*`([^`]+)`/i);
  if (idMatch) return idMatch[1].trim();
  return base;
}

/**
 * Extract the bullet/block section following a fish header until the next
 * blank line or header.
 */
function extractFishBlock(lines: string[], start: number): string[] {
  const block: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) break; // new markdown heading
    if (/^\d+\.\s+\*\*/.test(line.trim())) break; // next numbered fish
    block.push(line.trim());
  }
  return block;
}

function parseFishBlock(
  name: string,
  explicitId: string | undefined,
  biomeId: string,
  block: string[]
): ParsedFish | null {
  const result: ParsedFish = {
    id: explicitId || slugify(`${name}_${biomeId}`),
    name,
    biome: biomeId,
    rarity: 'common',
    sizeTier: 'prey',
    essence: {},
    descriptionChunks: [],
  };

  for (const raw of block) {
    const line = raw.trim();
    if (!line.startsWith('-')) continue;

    // Normalize "- Key: value" form
    const withoutDash = line.replace(/^-\s*/, '');

    // Rarity / sizeTier lines
    if (/^Size Tier:/i.test(withoutDash)) {
      const val = withoutDash.split(':')[1]?.trim() || '';
      result.sizeTier = val.toLowerCase() as ParsedFish['sizeTier'];
      continue;
    }
    if (/^Rarity:/i.test(withoutDash)) {
      const val = withoutDash.split(':')[1]?.trim() || '';
      result.rarity = val.toLowerCase();
      continue;
    }

    // Description Chunks
    if (/^Description Chunks/i.test(withoutDash)) {
      const bracketMatch = withoutDash.match(/\[(.+)\]/);
      if (bracketMatch) {
        try {
          const arr = JSON.parse(bracketMatch[0]) as string[];
          result.descriptionChunks.push(...arr);
        } catch {
          // Fall back to simple splitting if JSON parse fails
          const inner = bracketMatch[1];
          inner.split(',').forEach((chunk) => {
            const trimmed = chunk.replace(/^"|"$/g, '').trim();
            if (trimmed) result.descriptionChunks.push(trimmed);
          });
        }
      }
      continue;
    }

    // Visual Motif
    if (/^Visual Motif/i.test(withoutDash)) {
      const colonIdx = withoutDash.indexOf(':');
      if (colonIdx !== -1) {
        let motif = withoutDash.slice(colonIdx + 1).trim();
        motif = motif.replace(/^"|"$/g, '');
        result.visualMotif = motif;
      }
      continue;
    }

    // Essence
    if (/^Essence:/i.test(withoutDash)) {
      const braceMatch = withoutDash.match(/\{(.+)\}/);
      if (braceMatch) {
        try {
          const obj = JSON.parse(braceMatch[0]) as Record<string, number>;
          result.essence = obj;
        } catch {
          // Very simple fallback: split on commas
          const inner = braceMatch[1];
          inner.split(',').forEach((pair) => {
            const [k, v] = pair.split(':').map((s) => s.trim());
            const num = Number(v);
            if (k && !Number.isNaN(num)) {
              result.essence[k] = num;
            }
          });
        }
      }
      continue;
    }
  }

  if (result.descriptionChunks.length === 0 && !result.visualMotif) {
    // This fish entry is probably not in the expected modular format.
    return null;
  }

  return result;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main() {
  const files = await readdir(BIOME_DIR);
  const mdFiles = files.filter((f) => extname(f) === '.md');

  const all: ParsedFish[] = [];
  for (const file of mdFiles) {
    const fullPath = join(BIOME_DIR, file);
    const entries = await parseBiomeFile(fullPath);
    all.push(...entries);
  }

  // Pretty-print JSON to stdout so callers can redirect to a file if needed.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(all, null, 2));
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to parse biome fish:', err);
    process.exit(1);
  });
}

