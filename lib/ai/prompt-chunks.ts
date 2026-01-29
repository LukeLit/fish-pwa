/**
 * Shared prompt chunks for fish art generation.
 * Based on docs:
 * - docs/ART_STYLE_PROMPT_CHUNKS.md
 * - docs/MODULAR_PROMPT_SYSTEM.md
 * - docs/VISUAL_MOTIFS.md
 * - docs/UPGRADE_PROMPT_CHUNKS.md
 */

/**
 * High-level art style description used for all fish.
 */
export const ART_STYLE_CHUNK = [
  'stylized, vibrant, exaggerated features',
  'inspired by concept art and cartoonish proportions',
  'high visual clarity and strong silhouette',
  'playful, imaginative, and slightly surreal',
];

/**
 * Technical / formatting requirements for sprites.
 */
export const FORMATTING_CHUNK = [
  'isolated on solid bright magenta background (#FF00FF)',
  'no other background elements',
  'side profile view, facing RIGHT (head pointing right, tail on left)',
  'CRITICAL: fish must face RIGHT, not left',
  'digital illustration, high-resolution, not pixel art',
  'transparent PNG (for final asset)',
  'detailed scales and fins',
];

/**
 * Additional angle / view hints.
 */
export const ANGLE_CHUNK = [
  'side profile view, facing RIGHT direction',
  'head pointing right, tail pointing left',
  'dynamic pose if possible',
];

/**
 * Tech art guidelines – keep sprites readable in-game.
 */
export const TECH_ART_GUIDELINES_CHUNK = [
  'avoid gradients or soft shadows (prefer cell shading or hard edges)',
  'use bold, readable color palettes',
  'maintain consistent outline thickness',
  'ensure sprite reads well at small sizes (64–128px)',
  'avoid excessive detail that muddies the silhouette',
  'keep lighting consistent (top-left key light)',
];

/**
 * Essence-type specific visual modifiers.
 */
export const ESSENCE_TYPE_CHUNKS: Record<string, string[]> = {
  shallow: [
    'bright, freshwater colors',
    'subtle iridescence',
    'natural patterns',
  ],
  deep_sea: [
    'dark, muted tones',
    'bioluminescent spots or streaks',
    'translucent skin',
  ],
  tropical: [
    'vibrant, saturated colors',
    'bold patterns',
    'ornate fins',
  ],
  polluted: [
    'dull, sickly hues',
    'toxic growths',
    'mutated features',
    'patches of sludge',
  ],
  cosmic: [
    'shimmering, star-like specks',
    'ethereal glows',
    'otherworldly patterns',
  ],
  demonic: [
    'jagged, spiked features',
    'red and black palette',
    'glowing eyes or runes',
  ],
  robotic: [
    'metallic textures',
    'glowing circuitry',
    'mechanical appendages',
  ],
};

/**
 * Biome-style visual modifiers (environmental flavor that should still
 * read well on a solid magenta background when interpreted as surface detail).
 */
export const BIOME_CHUNKS: Record<string, string[]> = {
  shallow: [
    'clear water reflections',
    'aquatic plants influence in patterns',
    'sunlit highlights on scales',
  ],
  deep_sea: [
    'shadowy gradients in coloration',
    'faint blue bioluminescent glows',
    'pressure-adapted deep sea body forms',
  ],
  tropical: [
    'coral-inspired shapes and patterns',
    'reef motifs on fins and scales',
    'playful tropical color splashes',
  ],
  polluted: [
    'debris and oil-slick inspired markings',
    'chemical stain coloration',
    'unnatural mutated features',
  ],
  abyssal: [
    'ancient, eldritch visual motifs',
    'runic markings on body',
    'occasional tentacles or extra eyes',
  ],
};

/**
 * Ability visual chunks that can be added when a fish has a given upgrade.
 */
export const ABILITY_CHUNKS: Record<string, string[]> = {
  spiked_skin: ['armored, spiked scales'],
  bioluminescence: ['glowing patterns or lures'],
  camouflage: ['shifting, mottled colors'],
  electric: ['crackling electric sparks', 'glowing electric lines'],
  regeneration: ['visible healing scars', 'vibrant regenerating tissue'],
  toxic: ['oozing, greenish patches', 'high-contrast warning colors'],
};

/**
 * Compose the base, non–fish-specific chunks (style + formatting + tech-art).
 */
export function getBaseStyleChunks(): string[] {
  return [
    ...ART_STYLE_CHUNK,
    ...FORMATTING_CHUNK,
    ...ANGLE_CHUNK,
    ...TECH_ART_GUIDELINES_CHUNK,
  ];
}

/**
 * Get biome-related chunks for a biome id (if any).
 */
export function getBiomeChunks(biomeId?: string | null): string[] {
  if (!biomeId) return [];
  const key = biomeId as keyof typeof BIOME_CHUNKS;
  return BIOME_CHUNKS[key] ?? [];
}

/**
 * Get essence-related visual chunks for a set of essence types.
 * Accepts either a simple array of type ids or a map of type->amount.
 */
export function getEssenceVisualChunks(
  essence:
    | string[]
    | Record<string, number | undefined>
    | undefined
): string[] {
  if (!essence) return [];

  const types: string[] = Array.isArray(essence)
    ? essence
    : Object.entries(essence)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([k]) => k);

  const chunks: string[] = [];
  for (const type of types) {
    const key = type as keyof typeof ESSENCE_TYPE_CHUNKS;
    if (ESSENCE_TYPE_CHUNKS[key]) {
      chunks.push(...ESSENCE_TYPE_CHUNKS[key]);
    }
  }
  return chunks;
}

/**
 * Get ability visual chunks for a list of upgrade / ability ids.
 */
export function getAbilityVisualChunks(abilities?: string[]): string[] {
  if (!abilities || abilities.length === 0) return [];
  const chunks: string[] = [];
  for (const abilityId of abilities) {
    const key = abilityId as keyof typeof ABILITY_CHUNKS;
    if (ABILITY_CHUNKS[key]) {
      chunks.push(...ABILITY_CHUNKS[key]);
    }
  }
  return chunks;
}

