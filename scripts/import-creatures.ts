#!/usr/bin/env ts-node
/**
 * Bulk import creatures from JSON files to blob storage
 * 
 * Usage:
 *   npx ts-node scripts/import-creatures.ts <creatures-dir>
 * 
 * Example:
 *   npx ts-node scripts/import-creatures.ts ./data/creatures
 * 
 * Directory structure:
 *   creatures/
 *     ├── goldfish.json      # Creature metadata
 *     ├── goldfish.png       # Creature sprite
 *     ├── pufferfish.json
 *     ├── pufferfish.png
 *     └── ...
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { put } from '@vercel/blob';

interface CreatureData {
  id: string;
  name: string;
  description?: string;
  type?: 'prey' | 'predator' | 'mutant' | string;
  stats?: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  sprite?: string;
  rarity?: string;
  playable?: boolean;
  biomeId?: string;
  // Old format (legacy support)
  essenceTypes?: Array<{ type: string; baseYield: number }>;
  // New format: all essence types as object
  essence?: {
    shallow?: number;
    deep_sea?: number;
    tropical?: number;
    polluted?: number;
    cosmic?: number;
    demonic?: number;
    robotic?: number;
  };
  // Modular prompt system
  descriptionChunks?: string[];
  visualMotif?: string | string[];
  fusionParentIds?: string[];
  mutationSource?: string | null;
  // For future: ability/essence/biome prompt chunks
  abilityPromptChunks?: string[];
  essencePromptChunks?: string[];
  biomePromptChunks?: string[];
  spawnRules?: {
    canAppearIn?: string[];
    spawnWeight?: number;
    minDepth?: number;
    maxDepth?: number;
  };
  grantedAbilities?: string[];
  unlockRequirements?: {
    requiredUpgrade?: { upgradeId: string; level: number };
    essenceCost?: Record<string, number>;
  };
}

async function importCreatures(directory: string) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('❌ BLOB_READ_WRITE_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log(`📁 Reading creatures from: ${directory}`);

  const files = await readdir(directory);
  const jsonFiles = files.filter(f => extname(f) === '.json');
  const imageFiles = new Set(files.filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f))));

  console.log(`Found ${jsonFiles.length} creature definitions`);
  console.log(`Found ${imageFiles.size} sprite images`);

  let successCount = 0;
  let failCount = 0;

  for (const jsonFile of jsonFiles) {
    const creatureId = basename(jsonFile, '.json');
    console.log(`\n📝 Processing: ${creatureId}`);

    try {
      // Read creature data
      const jsonPath = join(directory, jsonFile);
      const jsonContent = await readFile(jsonPath, 'utf-8');
      const creatureData: CreatureData = JSON.parse(jsonContent);

      // Ensure ID matches filename
      creatureData.id = creatureId;

      // Find sprite file
      let spriteUrl: string | undefined;
      const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
      for (const ext of possibleExtensions) {
        const spriteFile = `${creatureId}${ext}`;
        if (imageFiles.has(spriteFile)) {
          console.log(`  🎨 Uploading sprite: ${spriteFile}`);
          const spritePath = join(directory, spriteFile);
          const spriteBuffer = await readFile(spritePath);

          // Upload sprite to blob storage
          const spriteBlob = await put(
            `assets/creatures/${creatureId}.png`,
            spriteBuffer,
            {
              access: 'public',
              addRandomSuffix: false,
              allowOverwrite: true,
            }
          );
          spriteUrl = spriteBlob.url;
          console.log(`  ✅ Sprite uploaded: ${spriteUrl}`);
          break;
        }
      }

      if (!spriteUrl) {
        console.log(`  ⚠️  No sprite found for ${creatureId}`);
      }

      // Update sprite URL in creature data
      if (spriteUrl) {
        creatureData.sprite = spriteUrl;
      }

      // Upload creature metadata
      console.log(`  📤 Uploading metadata...`);
      const metadataBlob = await put(
        `assets/creatures/${creatureId}.json`,
        JSON.stringify(creatureData, null, 2),
        {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
        }
      );

      console.log(`  ✅ Metadata uploaded: ${metadataBlob.url}`);
      console.log(`  ✨ ${creatureId} imported successfully!`);
      successCount++;

    } catch (error) {
      console.error(`  ❌ Failed to import ${creatureId}:`, error);
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total: ${jsonFiles.length}`);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx ts-node scripts/import-creatures.ts <creatures-dir>');
  process.exit(1);
}

const directory = args[0];
importCreatures(directory).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
