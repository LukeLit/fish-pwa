# Fusion & Mutation Metadata System

## Overview

This system tracks lineage, fusion parents, and mutation sources for creatures, enabling visual inheritance and progressive evolution mechanics. It supports both **fusion** (combining two parent creatures) and **mutation** (environmental/upgrade-induced changes).

## Core Concepts

### Fusion
Combining two distinct parent creatures to create a hybrid offspring with traits from both.

### Mutation
Modifying an existing creature through environmental exposure, upgrades, or progression, creating a variant.

## Data Structure

### fusionParentIds (Array\<string\>, optional)

For creatures created through fusion of two or more parents.

```typescript
interface FusionData {
  fusionParentIds: string[]; // Array of parent creature IDs
  fusionType?: 'balanced' | 'dominant_first' | 'dominant_second'; // How traits blend
  fusionGeneration?: number; // How many fusions deep (1 = first-gen fusion)
}
```

**Example**:
```typescript
{
  id: 'anglerfish_jellyfish_hybrid',
  name: 'Jellyangler',
  fusionParentIds: ['anglerfish', 'moon_jellyfish'],
  fusionType: 'balanced',
  fusionGeneration: 1
}
```

### mutationSource (object, optional)

For creatures created through mutation of an existing creature.

```typescript
interface MutationData {
  mutationSource: {
    sourceCreatureId: string;      // ID of the original creature
    mutationType: string;           // Type of mutation (see Mutation Types)
    mutationLevel: number;          // Intensity of mutation (1-5)
    mutationTrigger?: string;       // What caused it (upgrade ID, biome ID, etc.)
  };
}
```

**Example**:
```typescript
{
  id: 'goldfish_toxic_mutant',
  name: 'Toxic Goldfish',
  mutationSource: {
    sourceCreatureId: 'goldfish_starter',
    mutationType: 'polluted',
    mutationLevel: 3,
    mutationTrigger: 'polluted_adaptation_upgrade'
  }
}
```

## Mutation Types

### Environmental Mutations

#### Polluted
- **Trigger**: Exposure to polluted biome or toxic upgrades
- **Visual Changes**: Green/brown tones, asymmetric features, visible tumors/growths
- **Prompt Chunks**:
  ```typescript
  [
    'toxic green discoloration',
    'asymmetric mutated features',
    'visible pollution-induced growths',
    'sickly appearance'
  ]
  ```

#### Abyssal
- **Trigger**: Extended time in deep/abyssal biomes
- **Visual Changes**: Bioluminescence, translucent features, enlarged eyes
- **Prompt Chunks**:
  ```typescript
  [
    'adapted to crushing depths',
    'bioluminescent organs developed',
    'translucent deep-sea features',
    'oversized light-sensitive eyes'
  ]
  ```

#### Radioactive
- **Trigger**: Rare radioactive biome or cosmic essence exposure
- **Visual Changes**: Glowing green/blue, energy emanation, altered anatomy
- **Prompt Chunks**:
  ```typescript
  [
    'radioactive glow emanating from body',
    'mutated extra fins or appendages',
    'crackling energy aura',
    'unstable molecular structure visible'
  ]
  ```

### Upgrade-Induced Mutations

#### Size Mutation
- **Trigger**: Extreme size-boosting upgrades
- **Visual Changes**: Gigantism features, exaggerated proportions
- **Prompt Chunks**:
  ```typescript
  [
    'massively enlarged body',
    'exaggerated muscular structure',
    'proportionally larger features'
  ]
  ```

#### Speed Mutation
- **Trigger**: Extreme speed upgrades
- **Visual Changes**: Streamlined body, enlarged fins, elongated features
- **Prompt Chunks**:
  ```typescript
  [
    'hyper-streamlined aerodynamic body',
    'overdeveloped propulsion fins',
    'elongated torpedo shape'
  ]
  ```

#### Predator Mutation
- **Trigger**: Carnivore/predator upgrades
- **Visual Changes**: Enhanced teeth, aggressive features, hunting adaptations
- **Prompt Chunks**:
  ```typescript
  [
    'enlarged razor-sharp teeth',
    'predatory facial structure enhanced',
    'aggressive hunting adaptations visible'
  ]
  ```

### Essence-Based Mutations

#### Cosmic Mutation
- **Trigger**: High cosmic essence absorption
- **Visual Changes**: Constellation patterns, stellar glow, space-like features
- **Prompt Chunks**:
  ```typescript
  [
    'constellation patterns across body',
    'cosmic energy emanation',
    'star-like bioluminescent spots',
    'galaxy-colored scales'
  ]
  ```

#### Demonic Mutation
- **Trigger**: High demonic essence absorption
- **Visual Changes**: Horn-like growths, red/black coloration, infernal features
- **Prompt Chunks**:
  ```typescript
  [
    'demonic horn-like protrusions',
    'infernal red and black coloration',
    'hellfire glow in eyes',
    'twisted menacing features'
  ]
  ```

#### Robotic Mutation
- **Trigger**: High robotic essence absorption
- **Visual Changes**: Mechanical parts, segmented body, LED-like lights
- **Prompt Chunks**:
  ```typescript
  [
    'mechanical segmented exoskeleton',
    'robotic joints and hinges visible',
    'LED-like bioluminescent circuits',
    'artificial cybernetic enhancements'
  ]
  ```

## Mutation Levels

### Level 1: Minor Mutation
- **Visual Impact**: Slight color change, minor feature alteration
- **Prompt Modifier**: "subtle [mutation type] adaptations"

### Level 2: Moderate Mutation
- **Visual Impact**: Noticeable changes, new features emerge
- **Prompt Modifier**: "moderate [mutation type] mutations"

### Level 3: Major Mutation
- **Visual Impact**: Significant alterations, multiple new features
- **Prompt Modifier**: "heavily [mutation type] mutated"

### Level 4: Extreme Mutation
- **Visual Impact**: Dramatic transformation, barely recognizable
- **Prompt Modifier**: "extremely [mutation type] mutated, barely recognizable from origin"

### Level 5: Complete Transformation
- **Visual Impact**: Total transformation, new creature entirely
- **Prompt Modifier**: "completely transformed by [mutation type] into new entity"

## Fusion System

### Fusion Types

#### Balanced Fusion
- **Description**: 50/50 blend of both parents
- **Visual Rule**: Take equal features from both parents
- **Prompt Assembly**:
  ```typescript
  [
    ...parent1.descriptionChunks.slice(0, 2),
    ...parent2.descriptionChunks.slice(0, 2),
    'perfectly balanced hybrid features'
  ]
  ```

#### Dominant First
- **Description**: 70% first parent, 30% second parent
- **Visual Rule**: Primary features from first parent, accents from second
- **Prompt Assembly**:
  ```typescript
  [
    ...parent1.descriptionChunks,
    parent2.visualMotif,
    'with hints of secondary parent traits'
  ]
  ```

#### Dominant Second
- **Description**: 30% first parent, 70% second parent
- **Visual Rule**: Primary features from second parent, accents from first
- **Prompt Assembly**:
  ```typescript
  [
    ...parent2.descriptionChunks,
    parent1.visualMotif,
    'with subtle traces of first parent'
  ]
  ```

### Fusion Visual Inheritance

#### Color Blending
```typescript
function blendColors(color1: string, color2: string, ratio: number): string {
  // Blend hex colors based on fusion ratio
  // ratio = 0.5 for balanced, 0.7 for dominant first, etc.
}
```

#### Feature Mixing
- **Body Shape**: Interpolate between parent shapes
- **Fins**: Combine fin styles from both parents
- **Patterns**: Overlay or alternate patterns
- **Special Features**: Mix bioluminescence, toxins, etc.

#### Size Calculation
```typescript
function calculateFusionSize(parent1Size: number, parent2Size: number, type: FusionType): number {
  switch (type) {
    case 'balanced':
      return (parent1Size + parent2Size) / 2;
    case 'dominant_first':
      return parent1Size * 0.7 + parent2Size * 0.3;
    case 'dominant_second':
      return parent1Size * 0.3 + parent2Size * 0.7;
  }
}
```

## Prompt Chunk Composition

### For Fusions

```typescript
function composeFusionPrompt(fusion: Creature): string[] {
  const chunks: string[] = [];
  const parent1 = getCreature(fusion.fusionParentIds[0]);
  const parent2 = getCreature(fusion.fusionParentIds[1]);
  
  // Base description from fusion data
  chunks.push(...fusion.descriptionChunks);
  
  // Inherit visual chunks based on fusion type
  if (fusion.fusionType === 'balanced') {
    chunks.push(...parent1.descriptionChunks.slice(0, 2));
    chunks.push(...parent2.descriptionChunks.slice(0, 2));
    chunks.push('seamlessly blended hybrid features');
  }
  
  // Mix essence visual chunks
  if (parent1.essence?.primary?.visualChunks) {
    chunks.push(parent1.essence.primary.visualChunks[0]);
  }
  if (parent2.essence?.primary?.visualChunks) {
    chunks.push(parent2.essence.primary.visualChunks[0]);
  }
  
  chunks.push('chimeric fusion creature');
  
  return chunks;
}
```

### For Mutations

```typescript
function composeMutationPrompt(mutant: Creature): string[] {
  const chunks: string[] = [];
  const source = getCreature(mutant.mutationSource.sourceCreatureId);
  
  // Start with source description (possibly modified)
  chunks.push(...source.descriptionChunks.map(chunk => 
    modifyChunkForMutation(chunk, mutant.mutationSource.mutationLevel)
  ));
  
  // Add mutation-specific visual chunks
  const mutationChunks = getMutationVisualChunks(
    mutant.mutationSource.mutationType,
    mutant.mutationSource.mutationLevel
  );
  chunks.push(...mutationChunks);
  
  // Add mutation intensity descriptor
  chunks.push(getMutationIntensityDescriptor(mutant.mutationSource.mutationLevel));
  
  return chunks;
}
```

## Gameplay Integration

### Unlocking Fusions

```typescript
interface FusionUnlock {
  requiredParents: string[]; // Must have both parents discovered
  unlockCost: Record<string, number>; // Essence cost to unlock fusion
  prerequisites?: string[]; // Upgrade requirements
}
```

### Unlocking Mutations

```typescript
interface MutationUnlock {
  sourceCreature: string; // Base creature to mutate
  triggerCondition: {
    type: 'biome_exposure' | 'upgrade_purchase' | 'essence_threshold';
    value: string | number; // Biome ID, upgrade ID, or essence amount
  };
  unlockCost?: Record<string, number>;
}
```

## Editor UI Integration

### Fusion Creator

1. **Parent Selector**: Choose two parent creatures
2. **Fusion Type**: Select balanced/dominant fusion
3. **Preview**: Show predicted visual outcome
4. **Trait Mixer**: Fine-tune which traits to emphasize
5. **Name Generator**: Suggest fusion names

### Mutation Creator

1. **Source Selector**: Choose base creature
2. **Mutation Type**: Select environmental/upgrade/essence mutation
3. **Mutation Level**: Slider from 1-5
4. **Preview**: Show mutation progression
5. **Trigger Setup**: Define unlock conditions

## Examples

### Example 1: Balanced Fusion

**Parents**: Anglerfish + Moon Jellyfish

```typescript
{
  id: 'jellyangler',
  name: 'Jellyangler',
  fusionParentIds: ['anglerfish', 'moon_jellyfish'],
  fusionType: 'balanced',
  fusionGeneration: 1,
  descriptionChunks: [
    'bioluminescent jellyfish-like body',
    'anglerfish lure extending from head',
    'translucent flowing tentacle fins',
    'deep-sea predatory features'
  ],
  visualMotif: 'ethereal abyssal hunter with flowing bioluminescent features'
}
```

### Example 2: Polluted Mutation (Level 3)

**Source**: Goldfish

```typescript
{
  id: 'toxic_goldfish',
  name: 'Toxic Goldfish',
  mutationSource: {
    sourceCreatureId: 'goldfish_starter',
    mutationType: 'polluted',
    mutationLevel: 3,
    mutationTrigger: 'polluted_biome_exposure'
  },
  descriptionChunks: [
    'sickly green-gold discolored scales',
    'asymmetric mutated fins',
    'visible toxic growths on body',
    'glazed over contaminated eyes'
  ],
  visualMotif: 'heavily polluted mutant with toxic deformities'
}
```

### Example 3: Multi-Generation Fusion

**Parents**: Jellyangler (fusion) + Electric Eel

```typescript
{
  id: 'voltaic_jellyangler',
  name: 'Voltaic Jellyangler',
  fusionParentIds: ['jellyangler', 'electric_eel'],
  fusionType: 'dominant_first',
  fusionGeneration: 2, // Second-generation fusion
  descriptionChunks: [
    'electrically charged bioluminescent body',
    'jellyfish tentacles crackling with electricity',
    'eel-like serpentine movement',
    'anglerfish lure emitting electrical pulses'
  ],
  visualMotif: 'electrified abyssal hybrid with multi-species lineage'
}
```

## Related Documentation

- [MODULAR_PROMPT_SYSTEM.md](./MODULAR_PROMPT_SYSTEM.md) - Core prompt system
- [VISUAL_MOTIFS.md](./VISUAL_MOTIFS.md) - Motif library
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Core data interfaces
- [UPGRADE_PROMPT_CHUNKS.md](./UPGRADE_PROMPT_CHUNKS.md) - Upgrade visual effects
