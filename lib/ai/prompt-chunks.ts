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
  'inspired by concept art, stylized proportions, no black outlines',
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
  'no black outlines, borderless or cell-shaded rendering, clean fill colors',
  'ensure sprite reads well at small sizes (64–128px)',
  'avoid excessive detail that muddies the silhouette',
  'keep lighting consistent (top-left key light)',
];

/**
 * Species archetype chunks – body shape/silhouette so fish, sharks, squid, eels read differently.
 */
export const SPECIES_ARCHETYPE_CHUNKS: Record<string, string[]> = {
  fish: [
    'typical fish body',
    'detailed scales and fins',
    'side profile',
  ],
  shark: [
    'elongated fusiform body',
    'distinct dorsal fin',
    'pointed snout',
    'powerful tail',
  ],
  squid: [
    'mantle body',
    'tentacles at front',
    'no dorsal fin',
    'cephalopod silhouette',
  ],
  eel: [
    'elongated serpentine body',
    'no pelvic fins',
    'continuous dorsal and anal fins',
    'eel-like silhouette',
  ],
  ray: [
    'flat disc-shaped body',
    'wide pectoral fins',
    'tail often slender',
    'ray silhouette',
  ],
  cephalopod: [
    'mantle with arms or tentacles',
    'cephalopod body plan',
    'no fish-style fins',
  ],
};

/**
 * Essence-type specific visual modifiers.
 * Hex values align with lib/game/data/essence-types.ts where defined.
 */
export const ESSENCE_TYPE_CHUNKS: Record<string, string[]> = {
  shallow: [
    'bright freshwater colors (#4ade80 green tones)',
    'subtle iridescence',
    'natural patterns',
  ],
  deep_sea: [
    'dark muted tones (#1a237e blue tones)',
    'bioluminescent spots or streaks',
    'translucent skin',
  ],
  tropical: [
    'vibrant saturated colors (#fbbf24 golden tones)',
    'bold patterns',
    'ornate fins',
  ],
  polluted: [
    'dull sickly hues (#8b5cf6 purple accents)',
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
  shallow_tropical: [
    'vibrant tropical reef colors',
    'coral-inspired patterns on fins',
    'warm sunlit water tones',
    'exotic reef dweller appearance',
  ],
  medium: [
    'twilight zone adaptation',
    'subdued blue-gray tones',
    'beginning bioluminescent hints',
    'transitional depth features',
  ],
  medium_polluted: [
    'toxic green or murky brown tones',
    'visible mutations or asymmetry',
    'industrial contamination aesthetic',
    'sickly polluted appearance',
  ],
  deep: [
    'deep pressure adaptations',
    'bioluminescent organs',
    'translucent or dark coloration',
    'alien-like deep features',
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
 * Keys match ability IDs in lib/game/data/abilities.ts.
 */
export const ABILITY_CHUNKS: Record<string, string[]> = {
  // Legacy / optional IDs (may not exist in abilities.ts)
  spiked_skin: ['armored, spiked scales'],
  camouflage: ['shifting, mottled colors'],
  electric: ['crackling electric sparks', 'glowing electric lines'],
  toxic: ['oozing, greenish patches', 'high-contrast warning colors'],
  // abilities.ts
  essence_magnet: ['subtle magnetic field, essence drawn toward body'],
  swift_current: ['streamlined fins', 'motion blur when darting'],
  shield: ['tough scaled armor', 'protective sheen'],
  bioluminescence: ['glowing patterns or lures'],
  regeneration: ['visible healing scars', 'vibrant regenerating tissue'],
  essence_range: ['subtle aura around fish', 'essence affinity'],
  run_start_bonus: ['slightly larger, fit build'],
  hunger_resistance: ['robust, well-fed look'],
  speed_bonus: ['streamlined', 'powerful tail'],
  extra_life: ['resilient scales', 'second-wind vigor'],
  coral_armor: ['armored, coral-like scales'],
  reef_dash: ['sleek reef-dweller build', 'quick-dart fins'],
  kelp_heal: ['kelp-touched coloring', 'calm, restorative look'],
  fin_slash: ['sharp leading fin edges', 'predatory fin shape'],
  pressure_shell: ['thick, pressure-resistant scales', 'deep-dweller build'],
  lure: ['glowing lure or barbel', 'bioluminescent lure'],
  ink_cloud: ['ink-sac marking', 'cloudy discharge possible'],
  abyssal_siphon: ['siphon-like mouth or markings', 'dark abyssal tones'],
  bright_scales: ['bright, reflective scales', 'iridescent sheen'],
  warm_current: ['warm-water coloring', 'tropical flow lines'],
  reef_blend: ['reef-matching mottling', 'camouflage patterns'],
  tropical_heal: ['sun-touched highlights', 'vibrant healthy coloring'],
  sun_burst: ['bright dorsal stripe', 'surface-sun accent'],
  current_rider: ['current-swept fins', 'flowing streamlined shape'],
  toxin_resistance: ['thick slime coat', 'industrial-scale toughness'],
  sludge_trail: ['slightly murky trailing edge', 'pollution-adapted scales'],
  filter_feed: ['filter-feeder mouth', 'sturdy gill structure'],
  corrosive_touch: ['acid-tinted markings', 'caustic gland hints'],
  adaptive_scales: ['variable scale texture', 'adaptive coloring'],
  murk_vision: ['large, clear eyes', 'murky-water adaptation'],
  cross_essence: ['mixed essence glow', 'dual-tone accents'],
  fused_traits: ['hybrid morphology', 'combined lineage cues'],
  dual_resistance: ['reinforced scales', 'dual-environment build'],
  hybrid_speed: ['hybrid streamlined form', 'efficient musculature'],
  mixed_lure: ['combined lure and glow', 'multi-attract markings'],
  evolution_burst: ['evolution-ready build', 'burst-capable musculature'],
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
 * Style chunks for shared assets (carcass, meat, essence orbs).
 * Matches fish art style but without fish-specific formatting (direction, scales).
 * Use for decorative chunks and essence-type sprites.
 */
export function getSharedAssetStyleChunks(): string[] {
  return [
    ...ART_STYLE_CHUNK,
    'isolated on solid bright magenta background (#FF00FF)',
    'no other background elements',
    'digital illustration, high-resolution, not pixel art',
    'transparent PNG (for final asset)',
    ...TECH_ART_GUIDELINES_CHUNK,
  ];
}

/**
 * Get species archetype chunks for body shape/silhouette (if any).
 * Default 'fish' when archetype unset or unknown.
 */
export function getSpeciesArchetypeChunks(archetype?: string | null): string[] {
  if (!archetype) return SPECIES_ARCHETYPE_CHUNKS.fish;
  const key = archetype.toLowerCase() as keyof typeof SPECIES_ARCHETYPE_CHUNKS;
  return SPECIES_ARCHETYPE_CHUNKS[key] ?? SPECIES_ARCHETYPE_CHUNKS.fish;
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

