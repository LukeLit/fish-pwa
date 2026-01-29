#!/usr/bin/env tsx
/**
 * Test script to generate a single fish using the modular prompt system.
 * 
 * Usage:
 *   FISH_PWA_BASE_URL=http://localhost:3000 npx ts-node scripts/test-generate-fish.ts
 * 
 * This demonstrates the modular prompt system with a sample fish from the biome docs.
 */

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

// Sample fish data matching the format from biome docs
const testFish = {
  id: 'test_lanternfish',
  name: 'Lanternfish',
  biome: 'deep_sea',
  biomeId: 'deep_sea',
  rarity: 'common',
  sizeTier: 'prey' as const,
  essence: {
    shallow: 2,
    deep_sea: 15,
    tropical: 0,
    polluted: 0,
    cosmic: 0,
    demonic: 0,
    robotic: 0,
  },
  descriptionChunks: [
    'bulbous head with glowing lure',
    'needle-like teeth',
  ],
  visualMotif: 'bioluminescent spots',
};

async function testGenerateFish() {
  console.log('🧪 Testing modular prompt fish generation...\n');
  console.log('Test fish:', testFish.name);
  console.log('Biome:', testFish.biome);
  console.log('Description chunks:', testFish.descriptionChunks);
  console.log('Visual motif:', testFish.visualMotif);
  console.log('Essence:', testFish.essence);
  console.log('\n---\n');

  // Import the prompt builder (using dynamic import to handle path aliases)
  const { composeFishPrompt } = await import('../lib/ai/prompt-builder');

  // Compose the prompt
  const { prompt, cacheKey } = composeFishPrompt(testFish);

  console.log('📝 Composed Prompt:');
  console.log(prompt);
  console.log('\n🔑 Cache Key:', cacheKey);
  console.log('\n---\n');

  // Generate the sprite
  console.log('🎨 Generating sprite...');
  const response = await fetch(`${BASE_URL}/api/generate-fish-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'google/imagen-4.0-fast-generate-001',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }

  const data = await response.json();
  if (!data.success || !data.imageBase64) {
    console.error('❌ No image data returned');
    process.exit(1);
  }

  console.log('✅ Sprite generated successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. The sprite is in base64 format');
  console.log('   2. You can save it using the Fish Editor UI');
  console.log('   3. Or use scripts/batch-generate-fish.ts for bulk generation');
  console.log('\n📊 Prompt stats:');
  console.log(`   - Prompt length: ${prompt.length} characters`);
  console.log(`   - Chunks used: ${prompt.split(',').length} segments`);
}

if (require.main === module) {
  testGenerateFish().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
