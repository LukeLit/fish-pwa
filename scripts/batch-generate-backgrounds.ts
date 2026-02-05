#!/usr/bin/env tsx
/**
 * Batch-generate background images for all biomes.
 *
 * High-level flow:
 *  1. Define background specs for each biome (with description chunks and visual motifs)
 *  2. For each background:
 *     - Compose modular prompt via background-prompt-builder
 *     - Call /api/generate-fish-image to generate an image
 *     - Call /api/save-background to upload image + metadata to blob storage
 *
 * NOTE: This script assumes a dev server is running at FISH_PWA_BASE_URL
 * (default http://localhost:3000).
 *
 * Env vars for timeouts and retries:
 *   BATCH_GENERATE_TIMEOUT_MS  - timeout for generate-fish-image (default 120000)
 *   BATCH_SAVE_TIMEOUT_MS      - timeout for save-background (default 60000)
 *   BATCH_DELAY_MS             - delay between backgrounds (default 5000)
 *   BATCH_MAX_RETRIES          - retries per request (default 3)
 *   BATCH_LIMIT                - process only first N backgrounds (default: all)
 *   BATCH_SKIP_EXISTING        - skip backgrounds that already exist (default: 1)
 *   BATCH_MODEL                - AI model to use (default: google/imagen-4.0-fast-generate-001)
 */

import type { BackgroundAsset } from '../lib/game/types';

const BASE_URL = process.env.FISH_PWA_BASE_URL || 'http://localhost:3000';

/** Timeout for image generation (AI can be slow). */
const GENERATE_TIMEOUT_MS = Number(process.env.BATCH_GENERATE_TIMEOUT_MS) || 120_000;
/** Timeout for save-background. */
const SAVE_TIMEOUT_MS = Number(process.env.BATCH_SAVE_TIMEOUT_MS) || 60_000;
/** Delay between backgrounds to avoid overwhelming server. */
const DELAY_BETWEEN_BG_MS = Number(process.env.BATCH_DELAY_MS) || 5_000;
/** Max retries per request. */
const MAX_RETRIES = Number(process.env.BATCH_MAX_RETRIES) || 3;
/** AI model to use */
const AI_MODEL = process.env.BATCH_MODEL || 'google/imagen-4.0-fast-generate-001';

/**
 * Background specifications for each biome.
 * Each biome can have multiple background variants.
 */
interface BackgroundSpec {
  id: string;
  name: string;
  biomeId: string;
  descriptionChunks: string[];
  visualMotif: string;
}

const BACKGROUND_SPECS: BackgroundSpec[] = [
  // Shallow biome
  {
    id: 'shallow_sandy_floor',
    name: 'Sandy Shallows',
    biomeId: 'shallow',
    descriptionChunks: [
      'sandy ocean floor',
      'scattered smooth rocks',
      'small shells and pebbles',
      'gentle ripples of light',
      'swaying seagrass patches',
    ],
    visualMotif: 'sun-dappled sandy shallows with peaceful atmosphere',
  },
  {
    id: 'shallow_kelp_forest',
    name: 'Kelp Forest Shallows',
    biomeId: 'shallow',
    descriptionChunks: [
      'towering kelp fronds',
      'dappled sunlight filtering through',
      'rocky substrate',
      'sea urchins on rocks',
      'small caves and overhangs',
    ],
    visualMotif: 'majestic kelp forest with golden sunlight streaming through',
  },

  // Shallow Tropical
  {
    id: 'shallow_tropical_reef',
    name: 'Tropical Coral Reef',
    biomeId: 'shallow_tropical',
    descriptionChunks: [
      'vibrant coral formations',
      'brain coral and staghorn coral',
      'colorful sea fans waving',
      'white sand bottom',
      'crystal clear warm water',
    ],
    visualMotif: 'paradise tropical reef bursting with color and life',
  },
  {
    id: 'shallow_tropical_lagoon',
    name: 'Tropical Lagoon',
    biomeId: 'shallow_tropical',
    descriptionChunks: [
      'shallow turquoise lagoon',
      'scattered coral heads',
      'palm shadows on water surface',
      'starfish on sand',
      'gentle waves above',
    ],
    visualMotif: 'serene tropical lagoon with pristine waters',
  },

  // Medium depth
  {
    id: 'medium_rocky_slope',
    name: 'Rocky Slope',
    biomeId: 'medium',
    descriptionChunks: [
      'rocky underwater slope',
      'scattered boulders',
      'sparse kelp growth',
      'twilight zone lighting',
      'cooler blue tones',
    ],
    visualMotif: 'mysterious rocky slope descending into deeper waters',
  },
  {
    id: 'medium_underwater_cliff',
    name: 'Underwater Cliff',
    biomeId: 'medium',
    descriptionChunks: [
      'dramatic underwater cliff face',
      'ledges and crevices',
      'sea whips and soft corals',
      'filtered blue light from above',
      'sense of vast depth below',
    ],
    visualMotif: 'imposing underwater cliff with hints of the abyss below',
  },

  // Medium Polluted
  {
    id: 'medium_polluted_waste',
    name: 'Polluted Waters',
    biomeId: 'medium_polluted',
    descriptionChunks: [
      'murky greenish water',
      'floating debris and trash',
      'oil slicks on surface',
      'dying coral formations',
      'industrial pipe outlets',
    ],
    visualMotif: 'disturbing polluted ocean with toxic atmosphere',
  },

  // Deep
  {
    id: 'deep_volcanic',
    name: 'Deep Volcanic',
    biomeId: 'deep',
    descriptionChunks: [
      'volcanic rock formations',
      'hydrothermal vent in distance',
      'mineral deposits',
      'very dim ambient light',
      'strange rock spires',
    ],
    visualMotif: 'alien volcanic landscape in crushing depths',
  },
  {
    id: 'deep_canyon',
    name: 'Deep Canyon',
    biomeId: 'deep',
    descriptionChunks: [
      'underwater canyon walls',
      'layers of sediment visible',
      'occasional bioluminescent glow',
      'near total darkness',
      'ancient rock formations',
    ],
    visualMotif: 'awe-inspiring deep canyon carved over millennia',
  },

  // Deep Sea
  {
    id: 'deep_sea_plains',
    name: 'Abyssal Plains',
    biomeId: 'deep_sea',
    descriptionChunks: [
      'flat abyssal plain',
      'soft sediment floor',
      'ghostly marine snow falling',
      'scattered whale bones',
      'bioluminescent particles',
    ],
    visualMotif: 'hauntingly beautiful abyssal plains with gentle particle snow',
  },
  {
    id: 'deep_sea_vents',
    name: 'Hydrothermal Vents',
    biomeId: 'deep_sea',
    descriptionChunks: [
      'black smoker hydrothermal vents',
      'tube worm colonies',
      'mineral chimneys',
      'super-heated water shimmer',
      'complete darkness except vent glow',
    ],
    visualMotif: 'otherworldly hydrothermal vent ecosystem in eternal darkness',
  },

  // Abyssal
  {
    id: 'abyssal_void',
    name: 'The Void',
    biomeId: 'abyssal',
    descriptionChunks: [
      'absolute pitch black void',
      'occasional bioluminescent flash',
      'incomprehensible depth',
      'ancient eldritch formations',
      'pressure beyond imagination',
    ],
    visualMotif: 'terrifying void of the hadal zone where light never reaches',
  },
  {
    id: 'abyssal_trenches',
    name: 'Hadal Trench',
    biomeId: 'abyssal',
    descriptionChunks: [
      'deepest ocean trench',
      'strange pale formations',
      'ghostly bioluminescent organisms',
      'crushing pressure environment',
      'primordial ocean floor',
    ],
    visualMotif: 'alien landscape of the deepest trenches on Earth',
  },

  // Polluted
  {
    id: 'polluted_industrial',
    name: 'Industrial Waste Zone',
    biomeId: 'polluted',
    descriptionChunks: [
      'heavily contaminated water',
      'rusted industrial debris',
      'toxic waste barrels',
      'sickly green bioluminescence',
      'dead and mutated vegetation',
    ],
    visualMotif: 'nightmarish industrial waste zone with toxic mutations',
  },
];

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.min(5_000 * attempt, 15_000);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastErr;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch set of background IDs that already exist in blob storage (for resume/skip). */
async function getExistingBackgroundIds(): Promise<Set<string>> {
  try {
    const res = await fetch(`${BASE_URL}/api/list-assets?type=background&includeMetadata=true`);
    if (!res.ok) return new Set();
    const data = (await res.json()) as { success?: boolean; backgrounds?: BackgroundAsset[] };
    const list = data?.backgrounds ?? [];
    return new Set(list.map((b) => b.id));
  } catch {
    return new Set();
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { status: res.status, statusText: res.statusText };
  }
}

async function generateBackground(
  spec: BackgroundSpec
): Promise<{ success: boolean; id: string; error?: string }> {
  // Compose prompt using the background prompt builder
  const { composeBackgroundPrompt } = await import('../lib/ai/background-prompt-builder');

  const { prompt, cacheKey } = composeBackgroundPrompt({
    id: spec.id,
    name: spec.name,
    biomeId: spec.biomeId,
    descriptionChunks: spec.descriptionChunks,
    visualMotif: spec.visualMotif,
  });


  // 1) Generate image (with timeout and retry)
  // Backgrounds use 16:9 aspect ratio for widescreen display
  const genRes = await withRetry(
    () =>
      fetchWithTimeout(
        `${BASE_URL}/api/generate-fish-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: AI_MODEL,
            aspectRatio: '16:9',
            cacheKey,
          }),
        },
        GENERATE_TIMEOUT_MS
      ),
    'generate-image'
  );

  if (!genRes.ok) {
    const err = await safeJson(genRes);
    return {
      success: false,
      id: spec.id,
      error: `generate-image failed: ${JSON.stringify(err)}`,
    };
  }

  const genJson: any = await genRes.json();
  if (!genJson.success || !genJson.imageBase64) {
    return {
      success: false,
      id: spec.id,
      error: 'generate-image returned no imageBase64',
    };
  }

  // Turn base64 into Blob via fetch for FormData
  const dataUrl = `data:image/png;base64,${genJson.imageBase64}`;
  const imgRes = await fetch(dataUrl);
  const imageBlob = await imgRes.blob();

  // 2) Save background (metadata + image) via API
  const metadata: BackgroundAsset = {
    id: spec.id,
    name: spec.name,
    biomeId: spec.biomeId,
    type: 'image',
    url: '', // server will fill in blob URL
    descriptionChunks: spec.descriptionChunks,
    visualMotif: spec.visualMotif,
    createdAt: new Date().toISOString(),
    generatedWith: AI_MODEL,
  };

  const formData = new FormData();
  formData.append('backgroundId', spec.id);
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('image', imageBlob, `${spec.id}.png`);

  const saveRes = await withRetry(
    () =>
      fetchWithTimeout(
        `${BASE_URL}/api/save-background`,
        { method: 'POST', body: formData },
        SAVE_TIMEOUT_MS
      ),
    'save-background'
  );

  if (!saveRes.ok) {
    const err = await safeJson(saveRes);
    return {
      success: false,
      id: spec.id,
      error: `save-background failed: ${JSON.stringify(err)}`,
    };
  }

  const saveJson: any = await saveRes.json();
  if (!saveJson.success) {
    return {
      success: false,
      id: spec.id,
      error: `save-background returned error: ${saveJson.error || 'unknown error'}`,
    };
  }

  return { success: true, id: spec.id };
}

async function main() {

  const skipExisting = process.env.BATCH_SKIP_EXISTING !== '0';
  let toProcess: BackgroundSpec[] = [...BACKGROUND_SPECS];

  if (skipExisting) {
    const existingIds = await getExistingBackgroundIds();
    toProcess = BACKGROUND_SPECS.filter((bg) => !existingIds.has(bg.id));
    const skipped = BACKGROUND_SPECS.length - toProcess.length;
    if (skipped > 0) {
    }
  }

  const limit = process.env.BATCH_LIMIT
    ? parseInt(process.env.BATCH_LIMIT, 10)
    : toProcess.length;
  toProcess = toProcess.slice(0, limit);

  if (toProcess.length === 0) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const spec = toProcess[i];

    try {
      const result = await generateBackground(spec);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      failCount++;
    }

    if (i < toProcess.length - 1 && DELAY_BETWEEN_BG_MS > 0) {
      await delay(DELAY_BETWEEN_BG_MS);
    }
  }
}

if (require.main === module) {
  main().catch(() => {
    process.exit(1);
  });
}
