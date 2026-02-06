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

import { readFile, readdir, writeFile } from 'fs/promises';
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
  speciesArchetype?: string;
  primaryColorHex?: string;
  essenceColorDetails?: Array<{ essenceTypeId: string; description: string }>;
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

    // Pattern A: numbered list entry: "1. **Name**" or "1. **Name (id)**"
    const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)(?:\s+\(([^)]+)\))?\*\*/);
    // Pattern B: heading with id: "#### Name (id)"
    if (!numberedMatch) {
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

    if (numberedMatch) {
      const name = numberedMatch[1].trim();
      const explicitId = (numberedMatch[2] || '').trim();
      const block = extractFishBlock(lines, i + 1);
      const parsed = parseFishBlock(name, explicitId || undefined, biomeId, block);
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
 * #### or numbered fish header (stops at next #### or "1. **").
 */
function extractFishBlock(lines: string[], start: number): string[] {
  const block: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) break; // new markdown heading
    if (/^\d+\.\s+\*\*/.test(line.trim())) break; // next numbered fish
    if (/^####\s/.test(line.trim())) break; // next #### fish (shallow format)
    block.push(line);
  }
  return block;
}

/** Strip optional ** around key names for shallow format ("**Type**: Prey" -> "Type". */
function normalizeKey(line: string): string {
  return line.replace(/^-\s*/, '').replace(/^\*\*|\*\*:.*$/g, '').trim();
}

/** Parse "Stats: Size 20, Speed 7" or "**Stats**: Size 20, ..." and return size number if present. */
function parseStatsSize(withoutDash: string): number | undefined {
  const sizeMatch = withoutDash.match(/Size\s+(\d+)/i);
  return sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;
}

/**
 * Infer sizeTier from Type (Prey/Predator) and optional Stats Size.
 * Shallow format: Prey + Size>=30 -> mid; Predator + Size>=100 -> boss, else predator.
 */
function inferSizeTier(type: string, statsSize: number | undefined): ParsedFish['sizeTier'] {
  const t = type.toLowerCase();
  if (t === 'predator') {
    if (statsSize !== undefined && statsSize >= 100) return 'boss';
    return 'predator';
  }
  if (t === 'prey' && statsSize !== undefined && statsSize >= 30) return 'mid';
  if (t === 'prey') return 'prey';
  return 'prey';
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
    speciesArchetype: undefined,
    primaryColorHex: undefined,
    essenceColorDetails: undefined,
  };

  let typeFromDoc: string | undefined;
  let statsSize: number | undefined;

  for (let idx = 0; idx < block.length; idx++) {
    const raw = block[idx];
    const line = raw.trim();
    if (!line.startsWith('-')) continue;

    // Normalize: strip "- " and optional ** around key (shallow format)
    const withoutDash = line.replace(/^-\s*/, '');
    const keyNormalized = withoutDash.replace(/^\*\*([^*]+)\*\*:.*$/, '$1').trim();

    // Size Tier (explicit)
    if (/^(\*\*)?Size Tier:/i.test(withoutDash) || keyNormalized === 'Size Tier') {
      const val = withoutDash.split(':')[1]?.trim() || '';
      result.sizeTier = val.toLowerCase() as ParsedFish['sizeTier'];
      continue;
    }

    // Type (shallow format: "**Type**: Prey" -> infer sizeTier later with Stats)
    if (/^(\*\*)?Type:/i.test(withoutDash) || keyNormalized === 'Type') {
      const val = withoutDash.split(':')[1]?.trim() || '';
      typeFromDoc = val;
      continue;
    }

    // Stats (shallow: "**Stats**: Size 20, Speed 7" -> extract Size for tier)
    if (/^(\*\*)?Stats:/i.test(withoutDash) || keyNormalized === 'Stats') {
      const size = parseStatsSize(withoutDash);
      if (size !== undefined) statsSize = size;
      continue;
    }

    // Rarity
    if (/^(\*\*)?Rarity:/i.test(withoutDash) || keyNormalized === 'Rarity') {
      const val = withoutDash.split(':')[1]?.trim() || '';
      result.rarity = val.toLowerCase();
      continue;
    }

    // Species Archetype
    if (/^(\*\*)?Species Archetype:/i.test(withoutDash) || keyNormalized === 'Species Archetype') {
      const val = withoutDash.split(':')[1]?.trim() || '';
      if (val) result.speciesArchetype = val.toLowerCase().replace(/\s+/g, '_');
      continue;
    }

    // Primary Color (hex)
    if (/^(\*\*)?Primary Color:/i.test(withoutDash) || keyNormalized === 'Primary Color') {
      const val = withoutDash.split(':')[1]?.trim() || '';
      const hexMatch = val.match(/#[0-9A-Fa-f]{6}/);
      if (hexMatch) result.primaryColorHex = hexMatch[0];
      continue;
    }

    // Essence Color Details: "type — description" or "type: description"
    if (/^(\*\*)?Essence Color Details:/i.test(withoutDash) || keyNormalized === 'Essence Color Details') {
      const val = withoutDash.split(':')[1]?.trim() || '';
      const parts = val.split(/[—:]/).map((s) => s.trim());
      if (parts.length >= 2 && parts[0]) {
        const essenceTypeId = parts[0].toLowerCase().replace(/\s+/g, '_');
        const description = parts.slice(1).join(' ').trim();
        if (description) {
          result.essenceColorDetails = result.essenceColorDetails ?? [];
          result.essenceColorDetails.push({ essenceTypeId, description });
        }
      }
      continue;
    }

    // Description Chunks — bracket form: [ "a", "b" ]
    if (/^(\*\*)?Description Chunks?/i.test(withoutDash)) {
      const bracketMatch = withoutDash.match(/\[(.+)\]/);
      if (bracketMatch) {
        try {
          const arr = JSON.parse(bracketMatch[0]) as string[];
          result.descriptionChunks.push(...arr);
        } catch {
          const inner = bracketMatch[1];
          inner.split(',').forEach((chunk) => {
            const trimmed = chunk.replace(/^"|"$/g, '').trim();
            if (trimmed) result.descriptionChunks.push(trimmed);
          });
        }
      } else {
        // Shallow format: "- **Description Chunks**:" then sub-bullets "  - text"
        for (let j = idx + 1; j < block.length; j++) {
          const sub = block[j];
          const subTrim = sub.trim();
          if (subTrim.startsWith('-') && !/^\s*-\s*\*\*/.test(sub)) {
            const chunk = sub.replace(/^\s*-\s*/, '').trim();
            if (chunk) result.descriptionChunks.push(chunk);
          } else if (subTrim && subTrim.startsWith('-') && /^\s*-\s*\*\*/.test(sub)) {
            break; // next key line, stop collecting chunks
          } else if (!subTrim) {
            break;
          }
        }
      }
      continue;
    }

    // Visual Motif
    if (/^(\*\*)?Visual Motif/i.test(withoutDash)) {
      const colonIdx = withoutDash.indexOf(':');
      if (colonIdx !== -1) {
        let motif = withoutDash.slice(colonIdx + 1).trim();
        motif = motif.replace(/^"|"$/g, '');
        result.visualMotif = motif;
      }
      continue;
    }

    // Essence — "Essence: Shallow (3 base yield)" or { shallow: 3 }
    if (/^(\*\*)?Essence:/i.test(withoutDash)) {
      const braceMatch = withoutDash.match(/\{(.+)\}/);
      if (braceMatch) {
        try {
          const obj = JSON.parse(braceMatch[0]) as Record<string, number>;
          result.essence = obj;
        } catch {
          const inner = braceMatch[1];
          inner.split(',').forEach((pair) => {
            const [k, v] = pair.split(':').map((s) => s.trim());
            const num = Number(v);
            if (k && !Number.isNaN(num)) result.essence[k] = num;
          });
        }
      } else {
        // Shallow format: "Essence: Shallow (3 base yield)" or "Shallow (15), Deep Sea (5)"
        const part = withoutDash.split(':')[1]?.trim() || '';
        part.split(',').forEach((seg) => {
          const m = seg.trim().match(/(\w+(?:\s+\w+)?)\s*\((\d+)/);
          if (m) {
            const k = m[1].toLowerCase().replace(/\s+/g, '_');
            result.essence[k] = parseInt(m[2], 10);
          }
        });
      }
      continue;
    }
  }

  if (typeFromDoc !== undefined) {
    result.sizeTier = inferSizeTier(typeFromDoc, statsSize);
  }

  if (result.descriptionChunks.length === 0 && !result.visualMotif) {
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

function getOutPath(): string | undefined {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  if (outIdx !== -1 && argv[outIdx + 1]) return argv[outIdx + 1];
  const oIdx = argv.indexOf('-o');
  if (oIdx !== -1 && argv[oIdx + 1]) return argv[oIdx + 1];
  return undefined;
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

  const outPath = getOutPath();
  const json = JSON.stringify(all, null, 2);

  if (outPath) {
    await writeFile(outPath, json, 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`Wrote ${all.length} fish to ${outPath}`);
  } else {
    // Pretty-print to stdout so callers can redirect (e.g. parse-biome-fish.ts > out.json)
    // eslint-disable-next-line no-console
    console.log(json);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to parse biome fish:', err);
    process.exit(1);
  });
}

