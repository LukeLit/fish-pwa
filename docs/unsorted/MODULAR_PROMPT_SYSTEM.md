# Modular Prompt System

## Overview

The modular prompt system enables dynamic, composable AI art prompts for fish generation. Instead of hardcoded full prompts, we build prompts from reusable chunks that can adapt based on context (biome, essence type, abilities, upgrades, mutations, etc.).

## Core Concept

A fish's visual appearance prompt is assembled from multiple sources:

1. **Base Description Chunks** - Core creature features (stored in `descriptionChunks` array)
2. **Art Style Chunks** - Shared formatting, style, and technical requirements
3. **Visual Motif** - Thematic visual elements (stored in `visualMotif` field)
4. **Essence Chunks** - Visual cues based on essence types
5. **Biome Chunks** - Environment-specific adaptations
6. **Ability Chunks** - Visual indicators of granted abilities
7. **Upgrade Chunks** - Visual modifications from upgrades
8. **Fusion/Mutation Chunks** - Lineage-based visual traits

## Data Structure

### descriptionChunks (Array\<string\>)

An array of modular prompt segments that describe the core features of the creature.

**Example**:
```typescript
descriptionChunks: [
  "sleek silver body with iridescent scales",
  "large dorsal fin with bioluminescent spots",
  "sharp predatory eyes",
  "streamlined torpedo shape"
]
```

### visualMotif (string)

A high-level visual theme or aesthetic direction for the creature.

**Example**:
```typescript
visualMotif: "bioluminescent deep-sea hunter"
// or
visualMotif: "toxic waste mutant with asymmetric features"
```

### essence (object)

Replaces the legacy `essenceTypes` array with a richer structure:

```typescript
essence: {
  primary: {
    type: 'deep_sea',  // Primary essence type
    baseYield: 30,     // Base yield amount
    visualChunks: [    // Visual cues for this essence
      "deep blue coloration with pressure-adapted features",
      "bioluminescent patterns"
    ]
  },
  secondary: [
    {
      type: 'polluted',
      baseYield: 10,
      visualChunks: [
        "toxic green highlights",
        "asymmetric mutations"
      ]
    }
  ]
}
```

### fusionParentIds (Array\<string\>, optional)

For fusion creatures, IDs of the parent creatures.

**Example**:
```typescript
fusionParentIds: ['anglerfish', 'jellyfish']
```

### mutationSource (object, optional)

For mutated creatures, the source and mutation details.

**Example**:
```typescript
mutationSource: {
  sourceCreatureId: 'goldfish',
  mutationType: 'polluted',  // What caused the mutation
  mutationLevel: 2           // Intensity of mutation
}
```

## Prompt Composition

### Assembly Order

1. **Base chunks** from `descriptionChunks`
2. **Visual motif** from `visualMotif`
3. **Primary essence visual chunks**
4. **Secondary essence visual chunks**
5. **Biome adaptation chunks** (from biome data)
6. **Ability indicator chunks** (from granted abilities)
7. **Upgrade modification chunks** (from active upgrades)
8. **Fusion parent trait chunks** (if fusion creature)
9. **Mutation effect chunks** (if mutated creature)
10. **Art style chunks** (technical requirements, format, etc.)

### Composition Function

```typescript
function composePrompt(creature: Creature, context?: PromptContext): string {
  const chunks: string[] = [];
  
  // 1. Base description
  if (creature.descriptionChunks) {
    chunks.push(...creature.descriptionChunks);
  }
  
  // 2. Visual motif
  if (creature.visualMotif) {
    chunks.push(creature.visualMotif);
  }
  
  // 3. Essence visual chunks
  if (creature.essence?.primary?.visualChunks) {
    chunks.push(...creature.essence.primary.visualChunks);
  }
  if (creature.essence?.secondary) {
    creature.essence.secondary.forEach(sec => {
      if (sec.visualChunks) {
        chunks.push(...sec.visualChunks);
      }
    });
  }
  
  // 4. Context-based chunks
  if (context?.biome) {
    chunks.push(...getBiomeAdaptationChunks(context.biome));
  }
  
  if (context?.abilities) {
    chunks.push(...getAbilityVisualChunks(context.abilities));
  }
  
  if (context?.upgrades) {
    chunks.push(...getUpgradeVisualChunks(context.upgrades));
  }
  
  // 5. Fusion/Mutation chunks
  if (creature.fusionParentIds) {
    chunks.push(...getFusionVisualChunks(creature.fusionParentIds));
  }
  
  if (creature.mutationSource) {
    chunks.push(...getMutationVisualChunks(creature.mutationSource));
  }
  
  // 6. Art style and technical requirements
  chunks.push(...getArtStyleChunks());
  
  // Join all chunks
  return chunks.join(', ');
}
```

## Benefits

### 1. **Modularity**
- Reusable prompt segments across creatures
- Easy to update visual style globally
- Consistent art direction

### 2. **Context Awareness**
- Prompts adapt to biome, upgrades, abilities
- Dynamic visual representation of game state
- Visual progression through runs

### 3. **Maintainability**
- Centralized art style definitions
- Version control for visual changes
- Easy A/B testing of visual elements

### 4. **Extensibility**
- Add new chunk types without refactoring
- Support future features (seasons, events, etc.)
- Easy to add new essence types or biomes

### 5. **Data-Driven**
- Designers can modify visuals without code changes
- JSON-based configuration
- Easy to batch update creatures

## Migration from Legacy

### Legacy Format
```typescript
{
  description: "A deep-sea predator with a bioluminescent lure.",
  essenceTypes: [
    { type: "deep_sea", baseYield: 30 },
    { type: "shallow", baseYield: 6 }
  ]
}
```

### New Format
```typescript
{
  descriptionChunks: [
    "deep-sea predator",
    "bioluminescent lure",
    "large sharp teeth",
    "dark blue scaled body"
  ],
  visualMotif: "abyssal hunter with glowing lure",
  essence: {
    primary: {
      type: "deep_sea",
      baseYield: 30,
      visualChunks: [
        "adapted to crushing depths",
        "bioluminescent features"
      ]
    },
    secondary: [
      {
        type: "shallow",
        baseYield: 6,
        visualChunks: []
      }
    ]
  }
}
```

### Automatic Migration

The system should support automatic migration:

```typescript
function migrateToModular(legacy: LegacyCreature): Creature {
  return {
    ...legacy,
    // Parse description into chunks
    descriptionChunks: legacy.description
      ? legacy.description.split(/[,.]\s+/).map(s => s.trim())
      : [],
    
    // Extract visual motif (first sentence)
    visualMotif: legacy.description?.split('.')[0] || '',
    
    // Migrate essence types
    essence: migrateEssenceTypes(legacy.essenceTypes),
    
    // Preserve legacy field for compatibility
    description: legacy.description,
    essenceTypes: legacy.essenceTypes
  };
}
```

## Editor Integration

The fish editor should provide:

1. **Chunk Library Browser** - Browse and select predefined chunks
2. **Chunk Editor** - Add/edit/remove/reorder chunks
3. **Live Preview** - See composed prompt in real-time
4. **Visual Motif Selector** - Choose from preset motifs or custom
5. **Essence Chunk Manager** - Assign visual chunks to essence types
6. **Context Simulator** - Preview how creature looks in different contexts

## Best Practices

### Chunk Writing Guidelines

1. **Be Specific**: "sleek silver scales" not "looks nice"
2. **Visual Focus**: Describe appearance, not behavior
3. **Modular**: Each chunk should be independently meaningful
4. **Consistent Style**: Use similar language across chunks
5. **Avoid Redundancy**: Don't repeat information across chunks

### Example: Good Chunks
```typescript
descriptionChunks: [
  "streamlined torpedo body",
  "metallic silver scales with blue highlights",
  "large forward-facing eyes",
  "powerful crescent-shaped tail fin"
]
```

### Example: Bad Chunks
```typescript
descriptionChunks: [
  "a fish that looks cool",           // Too vague
  "swims fast in the ocean",          // Describes behavior, not appearance
  "silver body, silver color, shiny", // Redundant
  "like a tuna but different"         // Not specific enough
]
```

## Future Enhancements

### Planned Features

1. **Seasonal Chunks** - Visual changes based on in-game seasons
2. **Status Effect Chunks** - Visual indicators for buffs/debuffs
3. **Evolution Stage Chunks** - Progressive visual changes as fish evolves
4. **Rarity Modifiers** - Visual flair based on rarity tier
5. **Player Customization** - Allow players to influence visual style
6. **Localization** - Support for multi-language prompts
7. **A/B Testing** - Test different visual approaches
8. **AI Chunk Generation** - Use AI to generate new chunks based on parameters

## Related Documentation

- [ART_STYLE_PROMPT_CHUNKS.md](./ART_STYLE_PROMPT_CHUNKS.md) - Shared art style chunks
- [VISUAL_MOTIFS.md](./VISUAL_MOTIFS.md) - Motif library and guidelines
- [FUSION_MUTATION_METADATA.md](./FUSION_MUTATION_METADATA.md) - Fusion/mutation system
- [UPGRADE_PROMPT_CHUNKS.md](./UPGRADE_PROMPT_CHUNKS.md) - Upgrade visual effects
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Core data interfaces
- [FISH_DATA_STRUCTURE_BATCH.md](./FISH_DATA_STRUCTURE_BATCH.md) - Batch data examples
