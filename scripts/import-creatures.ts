#!/usr/bin/env ts-node
/**
 * Bulk import creatures from JSON files to blob storage
 * 
 * Updated to support modular prompt system with descriptionChunks, visualMotif,
 * essence object, fusion/mutation metadata, and automatic migration from legacy format.
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

/**
 * Enhanced Essence Data Structure
 */
interface EssenceData {
  primary: {
    type: string;
    baseYield: number;
    visualChunks?: string[];
  };
  secondary?: Array<{
    type: string;
    baseYield: number;
    visualChunks?: string[];
  }>;
}

/**
 * Mutation Metadata
 */
interface MutationMetadata {
  sourceCreatureId: string;
  mutationType: string;
  mutationLevel: number;
  mutationTrigger?: string;
}

/**
 * Complete Creature Data Structure with Modular Prompt Support
 */
interface CreatureData {
  id: string;
  name: string;
  description: string; // Legacy field
  type: 'prey' | 'predator' | 'mutant';
  stats: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  sprite?: string;
  rarity?: string;
  playable?: boolean;
  biomeId?: string;
  
  // NEW: Modular Prompt System
  descriptionChunks?: string[];
  visualMotif?: string;
  
  // NEW: Enhanced Essence System
  essence?: EssenceData;
  
  // Legacy essence (maintained for backward compatibility)
  essenceTypes?: Array<{ type: string; baseYield: number }>;
  
  // NEW: Fusion/Mutation Metadata
  fusionParentIds?: string[];
  fusionType?: 'balanced' | 'dominant_first' | 'dominant_second';
  fusionGeneration?: number;
  mutationSource?: MutationMetadata;
  
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

/**
 * Migrate legacy essence types to new essence structure
 */
function migrateEssenceTypes(essenceTypes?: Array<{ type: string; baseYield: number }>): EssenceData | undefined {
  if (!essenceTypes || essenceTypes.length === 0) {
    return undefined;
  }
  
  const [primary, ...secondary] = essenceTypes;
  
  return {
    primary: {
      type: primary.type,
      baseYield: primary.baseYield,
      visualChunks: [] // Can be populated manually or via defaults
    },
    secondary: secondary.length > 0 ? secondary.map(ess => ({
      type: ess.type,
      baseYield: ess.baseYield,
      visualChunks: []
    })) : undefined
  };
}

/**
 * Migrate legacy description to description chunks
 */
function migrateDescriptionToChunks(description?: string): string[] | undefined {
  if (!description) {
    return undefined;
  }
  
  // Split on periods, commas, and semicolons
  const chunks = description
    .split(/[.,;]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return chunks.length > 0 ? chunks : undefined;
}

/**
 * Extract visual motif from description (first sentence)
 */
function extractVisualMotif(description?: string): string | undefined {
  if (!description) {
    return undefined;
  }
  
  const firstSentence = description.split(/[.!?]/)[0]?.trim();
  return firstSentence || undefined;
}

/**
 * Apply automatic migration to creature data
 */
function applyMigration(creature: CreatureData): CreatureData {
  const migrated = { ...creature };
  
  // Migrate description chunks if not present but description exists
  if (!migrated.descriptionChunks && migrated.description) {
    migrated.descriptionChunks = migrateDescriptionToChunks(migrated.description);
    console.log(`    ℹ️  Auto-migrated description to ${migrated.descriptionChunks?.length || 0} chunks`);
  }
  
  // Extract visual motif if not present but description exists
  if (!migrated.visualMotif && migrated.description) {
    migrated.visualMotif = extractVisualMotif(migrated.description);
    console.log(`    ℹ️  Auto-extracted visual motif: "${migrated.visualMotif}"`);
  }
  
  // Migrate essence types to essence object if not present
  if (!migrated.essence && migrated.essenceTypes) {
    migrated.essence = migrateEssenceTypes(migrated.essenceTypes);
    console.log(`    ℹ️  Auto-migrated essence types to essence object`);
  }
  
  // Ensure essenceTypes exists for backward compatibility
  if (!migrated.essenceTypes && migrated.essence) {
    migrated.essenceTypes = [
      { type: migrated.essence.primary.type, baseYield: migrated.essence.primary.baseYield },
      ...(migrated.essence.secondary?.map(sec => ({ type: sec.type, baseYield: sec.baseYield })) || [])
    ];
    console.log(`    ℹ️  Created legacy essenceTypes for backward compatibility`);
  }
  
  return migrated;
}

/**
 * Validate creature data
 */
function validateCreature(creature: CreatureData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!creature.id) errors.push('Missing id');
  if (!creature.name) errors.push('Missing name');
  if (!creature.type) errors.push('Missing type');
  if (!creature.stats) errors.push('Missing stats');
  
  // Stats validation
  if (creature.stats) {
    if (creature.stats.size < 1 || creature.stats.size > 200) {
      errors.push('Stats size out of range (1-200)');
    }
    if (creature.stats.speed < 0 || creature.stats.speed > 10) {
      errors.push('Stats speed out of range (0-10)');
    }
    if (creature.stats.health < 1 || creature.stats.health > 100) {
      errors.push('Stats health out of range (1-100)');
    }
    if (creature.stats.damage < 0 || creature.stats.damage > 50) {
      errors.push('Stats damage out of range (0-50)');
    }
  }
  
  // Essence validation - must have either essence or essenceTypes
  if (!creature.essence && !creature.essenceTypes) {
    errors.push('Missing both essence and essenceTypes (at least one required)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async function importCreatures(directory: string) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('❌ BLOB_READ_WRITE_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log(`📁 Reading creatures from: ${directory}`);
  console.log(`📦 Modular prompt system enabled`);
  
  const files = await readdir(directory);
  const jsonFiles = files.filter(f => extname(f) === '.json');
  const imageFiles = new Set(files.filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f))));
  
  console.log(`Found ${jsonFiles.length} creature definitions`);
  console.log(`Found ${imageFiles.size} sprite images`);
  
  let successCount = 0;
  let failCount = 0;
  let migratedCount = 0;
  
  for (const jsonFile of jsonFiles) {
    const creatureId = basename(jsonFile, '.json');
    console.log(`\n📝 Processing: ${creatureId}`);
    
    try {
      // Read creature data
      const jsonPath = join(directory, jsonFile);
      const jsonContent = await readFile(jsonPath, 'utf-8');
      let creatureData: CreatureData = JSON.parse(jsonContent);
      
      // Ensure ID matches filename
      creatureData.id = creatureId;
      
      // Apply automatic migration
      const hadModularFields = !!(creatureData.descriptionChunks || creatureData.essence);
      creatureData = applyMigration(creatureData);
      if (!hadModularFields && (creatureData.descriptionChunks || creatureData.essence)) {
        migratedCount++;
      }
      
      // Validate creature data
      const validation = validateCreature(creatureData);
      if (!validation.valid) {
        console.log(`  ⚠️  Validation warnings for ${creatureId}:`);
        validation.errors.forEach(err => console.log(`    - ${err}`));
      }
      
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
  console.log(`🔄 Auto-migrated: ${migratedCount}`);
  console.log(`Total: ${jsonFiles.length}`);
  console.log(`\n💡 Tip: Review migrated creatures and manually add visual chunks for better prompt quality`);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx ts-node scripts/import-creatures.ts <creatures-dir>');
  console.error('\nSupports modular prompt system:');
  console.error('  - Auto-migrates legacy description to descriptionChunks');
  console.error('  - Auto-migrates essenceTypes to essence object');
  console.error('  - Maintains backward compatibility with legacy fields');
  process.exit(1);
}

const directory = args[0];
importCreatures(directory).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
