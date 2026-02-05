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
  // Import the prompt builder (using dynamic import to handle path aliases)
  const { composeFishPrompt } = await import('../lib/ai/prompt-builder');

  // Compose the prompt
  const { prompt, cacheKey } = composeFishPrompt(testFish);

  // Generate the sprite
  const response = await fetch(`${BASE_URL}/api/generate-fish-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'google/imagen-4.0-fast-generate-001',
    }),
  });

  if (!response.ok) {
    process.exit(1);
  }

  const data = await response.json();
  if (!data.success || !data.imageBase64) {
    process.exit(1);
  }
}

if (require.main === module) {
  testGenerateFish().catch(() => {
    process.exit(1);
  });
}
