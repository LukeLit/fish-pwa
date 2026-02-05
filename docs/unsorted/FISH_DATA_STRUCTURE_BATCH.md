# Fish Data Structure for Batch Generation

## Overview

This document defines the complete JSON structure for batch fish data generation, including all required and optional fields for the modular prompt system. Use this as a reference when creating JSON data files for all fish listed in biome documentation.

## Complete Creature JSON Structure

```json
{
  "id": "string (required, unique identifier, kebab-case)",
  "name": "string (required, display name)",
  "description": "string (optional, legacy field for backward compatibility)",
  "type": "prey | predator | mutant (required)",
  "rarity": "common | uncommon | rare | epic | legendary (required)",
  "playable": "boolean (optional, default: false)",
  
  "sprite": "string (required, URL or path to sprite image)",
  "biomeId": "string (required, primary biome ID)",
  
  "stats": {
    "size": "number (required, 10-200)",
    "speed": "number (required, 1-10)",
    "health": "number (required, 1-100)",
    "damage": "number (required, 1-50)"
  },
  
  "descriptionChunks": [
    "string (modular prompt segment 1)",
    "string (modular prompt segment 2)",
    "string (modular prompt segment 3, etc.)"
  ],
  
  "visualMotif": "string (high-level visual theme)",
  
  "essence": {
    "primary": {
      "type": "string (essence type ID)",
      "baseYield": "number (base amount)",
      "visualChunks": [
        "string (visual cue 1)",
        "string (visual cue 2)"
      ]
    },
    "secondary": [
      {
        "type": "string (essence type ID)",
        "baseYield": "number",
        "visualChunks": [
          "string (optional visual cues)"
        ]
      }
    ]
  },
  
  "essenceTypes": [
    {
      "type": "string (legacy field for backward compatibility)",
      "baseYield": "number"
    }
  ],
  
  "spawnRules": {
    "canAppearIn": ["string (biome ID 1)", "string (biome ID 2)"],
    "spawnWeight": "number (1-100, relative probability)",
    "minDepth": "number (optional, meters)",
    "maxDepth": "number (optional, meters)"
  },
  
  "grantedAbilities": ["string (ability ID 1)", "string (ability ID 2, optional)"],
  
  "unlockRequirement": {
    "biomeUnlocked": ["string (biome ID)"],
    "essenceSpent": {
      "essence_type_id": "number (amount)"
    }
  },
  
  "fusionParentIds": ["string (parent 1 ID)", "string (parent 2 ID, optional)"],
  
  "fusionType": "balanced | dominant_first | dominant_second (optional)",
  
  "fusionGeneration": "number (optional, for multi-gen fusions)",
  
  "mutationSource": {
    "sourceCreatureId": "string (original creature ID)",
    "mutationType": "string (polluted | abyssal | cosmic | etc.)",
    "mutationLevel": "number (1-5)",
    "mutationTrigger": "string (upgrade ID or biome ID, optional)"
  }
}
```

## Field-by-Field Examples

### Basic Required Fields

```json
{
  "id": "goldfish_starter",
  "name": "Goldfish",
  "type": "prey",
  "rarity": "common",
  "sprite": "/sprites/fish/goldfish.png",
  "biomeId": "shallow"
}
```

### Stats Object

```json
{
  "stats": {
    "size": 20,
    "speed": 7,
    "health": 15,
    "damage": 3
  }
}
```

### Description Chunks (New Modular System)

```json
{
  "descriptionChunks": [
    "small golden-orange fish",
    "rounded streamlined body",
    "flowing translucent fins",
    "bright reflective scales",
    "large alert eyes"
  ],
  "visualMotif": "swift schooling fish with vibrant coloration"
}
```

### Essence Object (New System)

```json
{
  "essence": {
    "primary": {
      "type": "shallow",
      "baseYield": 3,
      "visualChunks": [
        "bright coral reef colors",
        "adapted to sunlit waters"
      ]
    },
    "secondary": [
      {
        "type": "tropical",
        "baseYield": 1,
        "visualChunks": [
          "tropical vibrant accents"
        ]
      }
    ]
  }
}
```

### Legacy Essence Types (Backward Compatibility)

```json
{
  "essenceTypes": [
    { "type": "shallow", "baseYield": 3 },
    { "type": "tropical", "baseYield": 1 }
  ]
}
```

### Spawn Rules

```json
{
  "spawnRules": {
    "canAppearIn": ["shallow", "shallow_tropical"],
    "spawnWeight": 30,
    "minDepth": 0,
    "maxDepth": 50
  }
}
```

### Granted Abilities

```json
{
  "grantedAbilities": ["quick_escape", "schooling_bonus"]
}
```

### Unlock Requirements

```json
{
  "unlockRequirement": {
    "biomeUnlocked": ["shallow_tropical"],
    "essenceSpent": {
      "shallow": 50,
      "tropical": 20
    }
  }
}
```

### Fusion Metadata

```json
{
  "fusionParentIds": ["anglerfish", "jellyfish"],
  "fusionType": "balanced",
  "fusionGeneration": 1,
  "descriptionChunks": [
    "bioluminescent jellyfish-like body",
    "anglerfish lure extending from head",
    "translucent flowing tentacle fins"
  ],
  "visualMotif": "ethereal deep-sea hybrid hunter"
}
```

### Mutation Metadata

```json
{
  "mutationSource": {
    "sourceCreatureId": "goldfish_starter",
    "mutationType": "polluted",
    "mutationLevel": 3,
    "mutationTrigger": "polluted_biome_exposure"
  },
  "descriptionChunks": [
    "sickly green-gold discolored scales",
    "asymmetric mutated fins",
    "visible toxic growths on body"
  ],
  "visualMotif": "heavily polluted mutant goldfish"
}
```

## Complete Example Files

### Example 1: Basic Prey Fish (Minnow)

**File**: `data/creatures/minnow.json`

```json
{
  "id": "minnow",
  "name": "Minnow",
  "description": "A tiny silvery fish, easy prey for larger predators.",
  "type": "prey",
  "rarity": "common",
  "playable": false,
  "sprite": "/sprites/fish/minnow.png",
  "biomeId": "shallow",
  "stats": {
    "size": 10,
    "speed": 5,
    "health": 5,
    "damage": 1
  },
  "descriptionChunks": [
    "tiny silver fish",
    "streamlined slender body",
    "large reflective eyes",
    "translucent fins",
    "shimmering metallic scales"
  ],
  "visualMotif": "swift schooling prey fish",
  "essence": {
    "primary": {
      "type": "shallow",
      "baseYield": 2,
      "visualChunks": [
        "adapted to shallow sunlit waters",
        "bright reflective coloration"
      ]
    },
    "secondary": []
  },
  "essenceTypes": [
    { "type": "shallow", "baseYield": 2 }
  ],
  "spawnRules": {
    "canAppearIn": ["shallow", "shallow_tropical"],
    "spawnWeight": 40,
    "minDepth": 0,
    "maxDepth": 50
  },
  "grantedAbilities": []
}
```

### Example 2: Predator Fish (Bass)

**File**: `data/creatures/bass.json`

```json
{
  "id": "bass",
  "name": "Bass",
  "description": "A medium-sized predator, dangerous to small fish.",
  "type": "predator",
  "rarity": "common",
  "playable": false,
  "sprite": "/sprites/fish/bass.png",
  "biomeId": "shallow",
  "stats": {
    "size": 40,
    "speed": 4,
    "health": 30,
    "damage": 10
  },
  "descriptionChunks": [
    "medium-sized predatory fish",
    "muscular powerful body",
    "large mouth with sharp teeth",
    "dark green scaled body",
    "aggressive forward-facing eyes"
  ],
  "visualMotif": "territorial shallow-water hunter",
  "essence": {
    "primary": {
      "type": "shallow",
      "baseYield": 8,
      "visualChunks": [
        "shallow-water predator adaptations",
        "camouflaged green-brown tones"
      ]
    },
    "secondary": []
  },
  "essenceTypes": [
    { "type": "shallow", "baseYield": 8 }
  ],
  "spawnRules": {
    "canAppearIn": ["shallow"],
    "spawnWeight": 15,
    "minDepth": 10,
    "maxDepth": 50
  },
  "grantedAbilities": ["ambush_strike"]
}
```

### Example 3: Deep Sea Rare Fish (Anglerfish)

**File**: `data/creatures/anglerfish.json`

```json
{
  "id": "anglerfish",
  "name": "Anglerfish",
  "description": "A deep-sea predator with a bioluminescent lure.",
  "type": "predator",
  "rarity": "rare",
  "playable": false,
  "sprite": "/sprites/fish/anglerfish.png",
  "biomeId": "deep",
  "stats": {
    "size": 60,
    "speed": 3,
    "health": 40,
    "damage": 15
  },
  "descriptionChunks": [
    "grotesque deep-sea predator",
    "massive gaping mouth with needle-sharp teeth",
    "bioluminescent lure extending from head",
    "dark blue-black scaled body",
    "bulbous compressed body shape"
  ],
  "visualMotif": "terrifying abyssal ambush hunter with glowing lure",
  "essence": {
    "primary": {
      "type": "deep_sea",
      "baseYield": 30,
      "visualChunks": [
        "adapted to crushing abyssal depths",
        "bioluminescent hunting adaptations",
        "mysterious deep-sea features"
      ]
    },
    "secondary": [
      {
        "type": "shallow",
        "baseYield": 6,
        "visualChunks": []
      }
    ]
  },
  "essenceTypes": [
    { "type": "deep_sea", "baseYield": 30 },
    { "type": "shallow", "baseYield": 6 }
  ],
  "spawnRules": {
    "canAppearIn": ["deep", "deep_polluted"],
    "spawnWeight": 20,
    "minDepth": 200,
    "maxDepth": 1000
  },
  "grantedAbilities": ["bioluminescence", "lure_trap"]
}
```

### Example 4: Fusion Creature (Jellyangler)

**File**: `data/creatures/jellyangler.json`

```json
{
  "id": "jellyangler",
  "name": "Jellyangler",
  "description": "An impossible fusion of anglerfish and jellyfish.",
  "type": "mutant",
  "rarity": "epic",
  "playable": true,
  "sprite": "/sprites/fish/jellyangler.png",
  "biomeId": "deep",
  "stats": {
    "size": 55,
    "speed": 4,
    "health": 35,
    "damage": 12
  },
  "fusionParentIds": ["anglerfish", "moon_jellyfish"],
  "fusionType": "balanced",
  "fusionGeneration": 1,
  "descriptionChunks": [
    "translucent bioluminescent body",
    "anglerfish lure with jellyfish tentacles",
    "flowing ethereal fins",
    "ghostly deep-sea appearance",
    "pulsating light organs"
  ],
  "visualMotif": "ethereal abyssal hybrid with flowing bioluminescent features",
  "essence": {
    "primary": {
      "type": "deep_sea",
      "baseYield": 25,
      "visualChunks": [
        "deep-sea bioluminescence",
        "abyssal pressure adaptations"
      ]
    },
    "secondary": [
      {
        "type": "cosmic",
        "baseYield": 10,
        "visualChunks": [
          "otherworldly translucent form"
        ]
      }
    ]
  },
  "essenceTypes": [
    { "type": "deep_sea", "baseYield": 25 },
    { "type": "cosmic", "baseYield": 10 }
  ],
  "spawnRules": {
    "canAppearIn": ["deep"],
    "spawnWeight": 5,
    "minDepth": 500,
    "maxDepth": 2000
  },
  "grantedAbilities": ["bioluminescence", "jellyfish_sting", "hybrid_vigor"],
  "unlockRequirement": {
    "biomeUnlocked": ["deep"],
    "essenceSpent": {
      "deep_sea": 100,
      "cosmic": 50
    }
  }
}
```

### Example 5: Mutated Creature (Toxic Goldfish)

**File**: `data/creatures/toxic_goldfish.json`

```json
{
  "id": "toxic_goldfish",
  "name": "Toxic Goldfish",
  "description": "A goldfish heavily mutated by polluted waters.",
  "type": "mutant",
  "rarity": "uncommon",
  "playable": true,
  "sprite": "/sprites/fish/toxic_goldfish.png",
  "biomeId": "medium_polluted",
  "stats": {
    "size": 25,
    "speed": 6,
    "health": 20,
    "damage": 8
  },
  "mutationSource": {
    "sourceCreatureId": "goldfish_starter",
    "mutationType": "polluted",
    "mutationLevel": 3,
    "mutationTrigger": "polluted_biome_exposure"
  },
  "descriptionChunks": [
    "sickly green-gold discolored scales",
    "asymmetric mutated fins",
    "visible toxic growths and lesions",
    "glazed contaminated eyes",
    "twisted deformed body"
  ],
  "visualMotif": "heavily polluted mutant with toxic deformities",
  "essence": {
    "primary": {
      "type": "polluted",
      "baseYield": 15,
      "visualChunks": [
        "toxic waste mutations visible",
        "contaminated appearance",
        "pollution-induced asymmetry"
      ]
    },
    "secondary": [
      {
        "type": "shallow",
        "baseYield": 3,
        "visualChunks": []
      }
    ]
  },
  "essenceTypes": [
    { "type": "polluted", "baseYield": 15 },
    { "type": "shallow", "baseYield": 3 }
  ],
  "spawnRules": {
    "canAppearIn": ["medium_polluted"],
    "spawnWeight": 25,
    "minDepth": 50,
    "maxDepth": 200
  },
  "grantedAbilities": ["toxic_resistance", "poison_touch"],
  "unlockRequirement": {
    "biomeUnlocked": ["medium_polluted"],
    "essenceSpent": {
      "polluted": 30
    }
  }
}
```

## Migration from Legacy Format

### Automatic Migration Function

```typescript
function migrateLegacyToModular(legacy: any): Creature {
  return {
    ...legacy,
    
    // Parse description into chunks (simple split on punctuation)
    descriptionChunks: legacy.descriptionChunks || 
      (legacy.description 
        ? legacy.description.split(/[,.]\s+/).map((s: string) => s.trim()).filter(Boolean)
        : []),
    
    // Extract visual motif (first sentence or generated from type/biome)
    visualMotif: legacy.visualMotif || 
      (legacy.description?.split('.')[0]) ||
      generateDefaultMotif(legacy.type, legacy.biomeId),
    
    // Migrate essence types to new structure
    essence: legacy.essence || migrateEssenceTypes(legacy.essenceTypes),
    
    // Preserve legacy fields for backward compatibility
    description: legacy.description,
    essenceTypes: legacy.essenceTypes
  };
}

function migrateEssenceTypes(essenceTypes: Array<{type: string, baseYield: number}>) {
  if (!essenceTypes || essenceTypes.length === 0) {
    return {
      primary: { type: 'shallow', baseYield: 1, visualChunks: [] },
      secondary: []
    };
  }
  
  const [primary, ...secondary] = essenceTypes;
  
  return {
    primary: {
      ...primary,
      visualChunks: getDefaultEssenceVisualChunks(primary.type)
    },
    secondary: secondary.map(ess => ({
      ...ess,
      visualChunks: []
    }))
  };
}
```

## Validation Schema

```typescript
interface CreatureValidation {
  // Required fields
  id: { required: true, pattern: /^[a-z0-9_-]+$/ };
  name: { required: true, minLength: 1 };
  type: { required: true, enum: ['prey', 'predator', 'mutant'] };
  rarity: { required: true, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] };
  sprite: { required: true };
  biomeId: { required: true };
  stats: { required: true, shape: StatsValidation };
  spawnRules: { required: true, shape: SpawnRulesValidation };
  
  // New modular fields (optional but recommended)
  descriptionChunks: { required: false, type: 'array', itemType: 'string' };
  visualMotif: { required: false, type: 'string' };
  essence: { required: false, shape: EssenceValidation };
  
  // Legacy fields (optional)
  description: { required: false };
  essenceTypes: { required: false };
  
  // Advanced fields (optional)
  fusionParentIds: { required: false, type: 'array', itemType: 'string' };
  mutationSource: { required: false, shape: MutationSourceValidation };
}
```

## Batch Generation Checklist

When creating JSON files for all fish:

- [ ] Create `/data/creatures/` directory
- [ ] One JSON file per creature (filename = creature ID)
- [ ] All required fields present
- [ ] Description chunks are modular (3-7 chunks each)
- [ ] Visual motif captures essence of creature
- [ ] Essence object with visual chunks defined
- [ ] Legacy essenceTypes maintained for compatibility
- [ ] Spawn rules appropriate for biome
- [ ] Stats balanced for creature type/rarity
- [ ] Sprite path correct (or placeholder)
- [ ] Fusion parents exist (if fusion creature)
- [ ] Mutation source exists (if mutant)
- [ ] Validate JSON syntax
- [ ] Test import with batch script

## Related Documentation

- [MODULAR_PROMPT_SYSTEM.md](./MODULAR_PROMPT_SYSTEM.md) - Prompt composition
- [ART_STYLE_PROMPT_CHUNKS.md](./ART_STYLE_PROMPT_CHUNKS.md) - Art style chunks
- [VISUAL_MOTIFS.md](./VISUAL_MOTIFS.md) - Motif library
- [FUSION_MUTATION_METADATA.md](./FUSION_MUTATION_METADATA.md) - Fusion/mutation system
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Core interfaces
