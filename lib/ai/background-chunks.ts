/**
 * Shared prompt chunks for background art generation.
 * Mirrors the fish prompt-chunks.ts pattern for consistent art style.
 * 
 * Chunk categories:
 * - Art Style: Stylized, orthographic game art
 * - Formatting: Resolution, aspect ratio, technical specs
 * - Depth: Lighting/atmosphere based on ocean depth
 * - Biome: Environment-specific visual details
 */

/**
 * High-level art style description used for all backgrounds.
 * Matches the stylized aesthetic of fish sprites.
 */
export const BACKGROUND_ART_STYLE_CHUNK = [
  'stylized digital painting',
  'vibrant saturated colors',
  'game background art',
  'concept art quality',
  'atmospheric and immersive',
];

/**
 * Technical / formatting requirements for background images.
 * NOTE: Aspect ratio is controlled by the API (16:9 for backgrounds).
 * Focus on composition that works well for game backgrounds.
 */
export const BACKGROUND_FORMATTING_CHUNK = [
  'centered composition',
  'main subject in center of frame',
  'open space for gameplay',
  'no fish or creatures',
  'empty scene',
  'high detail',
];

/**
 * Base underwater scene chunks used for all backgrounds.
 * Simple, focused description of the scene type.
 */
export const BACKGROUND_BASE_CHUNK = [
  'underwater ocean environment',
  'atmospheric underwater lighting',
  'sense of depth and space',
  'layered scenery with foreground and background elements',
];

/**
 * Depth-based visual chunks - controls lighting and atmosphere.
 */
export const BACKGROUND_DEPTH_CHUNKS: Record<string, string[]> = {
  shallow: [
    'sunlit waters',
    'bright aquamarine and turquoise tones',
    'visible surface light rays penetrating water',
    'warm tropical lighting',
    'dancing light patterns on seafloor',
    'clear visibility',
  ],
  medium: [
    'filtered blue light',
    'moderate depth atmosphere',
    'dimmer lighting with occasional light shafts',
    'cooler color temperature',
    'transitional twilight zone',
    'reduced visibility in distance',
  ],
  deep: [
    'dark blue depths',
    'minimal light penetration',
    'cold color palette',
    'mysterious and foreboding atmosphere',
    'faint bioluminescent hints',
    'limited visibility',
  ],
  abyssal: [
    'pitch black void',
    'bioluminescent accents only',
    'crushing depth atmosphere',
    'occasional glowing particles',
    'total darkness with isolated light sources',
    'alien and otherworldly',
  ],
};

/**
 * Biome-specific visual chunks for backgrounds.
 * These add environmental details specific to each biome type.
 */
export const BACKGROUND_BIOME_CHUNKS: Record<string, string[]> = {
  shallow: [
    'sandy ocean floor',
    'scattered rocks and pebbles',
    'swaying seaweed and kelp',
    'shells and small debris',
    'gentle water surface visible above',
  ],
  shallow_tropical: [
    'vibrant coral reef formations',
    'colorful tropical corals',
    'sea fans and anemones',
    'bright reef ecosystem',
    'crystal clear tropical water',
    'white sand bottom',
  ],
  medium: [
    'rocky underwater terrain',
    'sparse vegetation',
    'underwater cliffs and ledges',
    'scattered boulders',
    'kelp forest in distance',
  ],
  medium_polluted: [
    'murky green-brown water',
    'floating debris and trash',
    'oil slicks and chemical stains',
    'dying coral and vegetation',
    'industrial waste elements',
    'toxic algae blooms',
  ],
  deep: [
    'volcanic rock formations',
    'hydrothermal vents in distance',
    'sparse deep-sea vegetation',
    'otherworldly rock spires',
    'ancient underwater canyon',
  ],
  deep_sea: [
    'abyssal plain',
    'bioluminescent particles floating',
    'strange deep-sea formations',
    'ghostly white tube worms',
    'eerie deep ocean atmosphere',
  ],
  tropical: [
    'dense coral gardens',
    'tropical reef paradise',
    'colorful sea fans',
    'bright warm waters',
    'exotic underwater flora',
  ],
  polluted: [
    'heavily contaminated water',
    'industrial runoff visible',
    'dead and dying ecosystem',
    'toxic waste barrels',
    'mutation-inducing environment',
    'sickly green glow',
  ],
  abyssal: [
    'hadal zone depths',
    'ancient eldritch formations',
    'alien underwater landscape',
    'crushing pressure environment',
    'primordial ocean floor',
    'bioluminescent jellyfish drifting',
  ],
};

/**
 * Essence type influence on background atmosphere.
 * These add subtle visual elements based on the biome's primary essence type.
 */
export const BACKGROUND_ESSENCE_CHUNKS: Record<string, string[]> = {
  shallow: [
    'life-giving sunlit atmosphere',
    'fresh and vibrant ecosystem',
  ],
  deep_sea: [
    'bioluminescent particle effects',
    'mysterious deep glow',
  ],
  tropical: [
    'warm inviting waters',
    'paradise reef aesthetic',
  ],
  polluted: [
    'toxic green haze',
    'contaminated water effects',
  ],
  cosmic: [
    'ethereal starlight filtering through',
    'otherworldly space-like atmosphere',
  ],
  demonic: [
    'hellish red undertones',
    'volcanic heat distortion',
  ],
  robotic: [
    'artificial structure elements',
    'technological debris',
  ],
};

/**
 * Compose the base style chunks for all backgrounds.
 */
export function getBackgroundBaseChunks(): string[] {
  return [
    ...BACKGROUND_ART_STYLE_CHUNK,
    ...BACKGROUND_FORMATTING_CHUNK,
    ...BACKGROUND_BASE_CHUNK,
  ];
}

/**
 * Get depth-based visual chunks.
 * @param depth - 'shallow' | 'medium' | 'deep' | 'abyssal'
 */
export function getBackgroundDepthChunks(depth?: string | null): string[] {
  if (!depth) return BACKGROUND_DEPTH_CHUNKS.shallow;
  const key = depth as keyof typeof BACKGROUND_DEPTH_CHUNKS;
  return BACKGROUND_DEPTH_CHUNKS[key] ?? BACKGROUND_DEPTH_CHUNKS.shallow;
}

/**
 * Get biome-specific visual chunks for backgrounds.
 * @param biomeId - The biome identifier
 */
export function getBackgroundBiomeChunks(biomeId?: string | null): string[] {
  if (!biomeId) return [];
  const key = biomeId as keyof typeof BACKGROUND_BIOME_CHUNKS;
  return BACKGROUND_BIOME_CHUNKS[key] ?? [];
}

/**
 * Get essence-influenced atmosphere chunks.
 * @param essenceTypes - Array of essence type IDs or Record of type->amount
 */
export function getBackgroundEssenceChunks(
  essenceTypes?: string[] | Record<string, number | undefined>
): string[] {
  if (!essenceTypes) return [];

  const types: string[] = Array.isArray(essenceTypes)
    ? essenceTypes
    : Object.entries(essenceTypes)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k]) => k);

  const chunks: string[] = [];
  for (const type of types) {
    const key = type as keyof typeof BACKGROUND_ESSENCE_CHUNKS;
    if (BACKGROUND_ESSENCE_CHUNKS[key]) {
      chunks.push(...BACKGROUND_ESSENCE_CHUNKS[key]);
    }
  }
  return chunks;
}

/**
 * Map biome IDs to their base depth level.
 */
export function getBiomeBaseDepth(biomeId: string): 'shallow' | 'medium' | 'deep' | 'abyssal' {
  const depthMap: Record<string, 'shallow' | 'medium' | 'deep' | 'abyssal'> = {
    shallow: 'shallow',
    shallow_tropical: 'shallow',
    tropical: 'shallow',
    medium: 'medium',
    medium_polluted: 'medium',
    deep: 'deep',
    deep_sea: 'deep',
    polluted: 'medium',
    abyssal: 'abyssal',
  };
  return depthMap[biomeId] ?? 'shallow';
}
