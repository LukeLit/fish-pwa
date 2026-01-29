# Visual Motifs Library

## Overview

Visual motifs are high-level thematic elements that define the overall aesthetic and "personality" of a fish creature. They provide a cohesive visual direction that guides the composition of all other prompt chunks.

A good visual motif captures the essence of what makes a creature visually unique and memorable.

## Motif Categories

### 1. Hunter/Predator Motifs

#### Ambush Predator
- **Description**: "patient ambush hunter with camouflaged features"
- **Visual Cues**: Mottled patterns, wide mouth, compressed body
- **Examples**: Anglerfish, Stonefish, Scorpionfish

#### Pursuit Predator  
- **Description**: "sleek pursuit predator built for speed"
- **Visual Cues**: Streamlined body, powerful tail, sharp features
- **Examples**: Barracuda, Tuna, Marlin

#### Pack Hunter
- **Description**: "coordinated pack hunter with social markings"
- **Visual Cues**: Contrasting patterns for identification, medium size
- **Examples**: Piranha, Jack, Dolphinfish

### 2. Prey/Survival Motifs

#### Schooling Prey
- **Description**: "swift schooling fish with reflective scales"
- **Visual Cues**: Silver/metallic finish, small size, large eyes
- **Examples**: Sardines, Anchovies, Herring

#### Camouflage Specialist
- **Description**: "master of disguise with adaptive coloration"
- **Visual Cues**: Mottled patterns, environmental mimicry, flat body
- **Examples**: Flounder, Sole, Leafy Seadragon

#### Armored Defender
- **Description**: "heavily armored defensive specialist"
- **Visual Cues**: Thick scales, spines, plated body
- **Examples**: Pufferfish, Boxfish, Armored Catfish

### 3. Depth-Based Motifs

#### Shallow Reef Dweller
- **Description**: "vibrant reef dweller with tropical colors"
- **Visual Cues**: Bright colors, decorative fins, compact body
- **Examples**: Clownfish, Angelfish, Butterflyfish

#### Twilight Zone Wanderer
- **Description**: "adaptable mid-depth wanderer with subdued tones"
- **Visual Cues**: Blue-gray colors, moderate size, balanced features
- **Examples**: Snapper, Grouper, Sea Bass

#### Abyssal Dweller
- **Description**: "alien abyssal creature adapted to crushing depths"
- **Visual Cues**: Bioluminescence, translucent features, grotesque adaptations
- **Examples**: Gulper Eel, Viperfish, Fangtooth

### 4. Elemental/Essence Motifs

#### Bioluminescent Wonder
- **Description**: "ethereal creature with radiant bioluminescence"
- **Visual Cues**: Glowing organs, light patterns, soft emanation
- **Examples**: Lanternfish, Flashlight Fish, Cookiecutter Shark

#### Toxic Avenger
- **Description**: "poisonous creature with warning coloration"
- **Visual Cues**: Bright warning colors, venomous spines, aggressive appearance
- **Examples**: Lionfish, Stonefish, Pufferfish

#### Ancient Survivor
- **Description**: "prehistoric survivor with primordial features"
- **Visual Cues**: Armored plates, archaic anatomy, rugged appearance
- **Examples**: Sturgeon, Coelacanth, Gar

#### Crystalline Being
- **Description**: "translucent crystalline creature with refractive qualities"
- **Visual Cues**: See-through body, light refraction, delicate features
- **Examples**: Glass Catfish, Transparent Goby, Salp

### 5. Mutation/Hybrid Motifs

#### Polluted Mutant
- **Description**: "toxic waste mutant with asymmetric deformities"
- **Visual Cues**: Abnormal growths, mismatched features, sickly colors
- **Examples**: Mutated versions of normal fish

#### Fusion Hybrid
- **Description**: "impossible fusion of multiple species"
- **Visual Cues**: Mixed anatomical features, transitional elements, chimeric appearance
- **Examples**: Anglerfish-Jellyfish hybrid, Shark-Eel fusion

#### Evolved Apex
- **Description**: "highly evolved apex predator with enhanced features"
- **Visual Cues**: Exaggerated hunting adaptations, metallic sheen, perfect symmetry
- **Examples**: Megalodon descendant, Super-enhanced versions

#### Cosmic Horror
- **Description**: "otherworldly entity from beyond the depths"
- **Visual Cues**: Impossible geometry, reality-defying features, eldritch appearance
- **Examples**: Void creatures, Cosmic fish

### 6. Behavioral Motifs

#### Graceful Dancer
- **Description**: "elegant creature with flowing, graceful movements"
- **Visual Cues**: Long flowing fins, ribbons, delicate features
- **Examples**: Betta, Guppy, Angelfish

#### Aggressive Brawler
- **Description**: "aggressive territorial fighter"
- **Visual Cues**: Thick muscular body, blunt features, scarred appearance
- **Examples**: Triggerfish, Damselfish, Cichlid

#### Curious Explorer
- **Description**: "inquisitive explorer with alert features"
- **Visual Cues**: Large forward-facing eyes, prominent sensory organs
- **Examples**: Wrasse, Goby, Blenny

#### Patient Lurker
- **Description**: "motionless lurker waiting for opportunity"
- **Visual Cues**: Downturned features, bottom-dwelling adaptations
- **Examples**: Flatfish, Catfish, Goosefish

### 7. Cosmic/Mythical Motifs

#### Starborn Navigator
- **Description**: "cosmic navigator with celestial features"
- **Visual Cues**: Constellation patterns, stellar glow, space-like coloration
- **Examples**: Cosmic essence creatures

#### Demonic Entity
- **Description**: "infernal entity with demonic features"
- **Visual Cues**: Red/black coloration, horn-like protrusions, hellish glow
- **Examples**: Demonic essence creatures

#### Mechanical Construct
- **Description**: "artificial construct with robotic features"
- **Visual Cues**: Segmented metal body, mechanical joints, LED-like lights
- **Examples**: Robotic essence creatures

#### Divine Guardian
- **Description**: "celestial guardian with holy radiance"
- **Visual Cues**: White/gold coloration, halo-like glow, angelic features
- **Examples**: Divine essence creatures

## Motif Composition Guidelines

### Combining Motifs

You can combine multiple motifs for complex creatures:

**Formula**: [Primary Motif] + [Secondary Motif]

**Examples**:
- "patient ambush hunter with bioluminescent lure" (Ambush + Bioluminescent)
- "heavily armored reef dweller with toxic spines" (Armored + Toxic + Reef)
- "sleek pursuit predator from the abyssal depths" (Pursuit + Abyssal)

### Motif Evolution

Motifs can evolve as creatures progress:

**Level 1**: "small schooling prey with reflective scales"  
**Level 2**: "agile predator-prey hybrid with enhanced speed"  
**Level 3**: "apex pursuit predator with bioluminescent tracking"

### Context-Sensitive Motifs

Motifs can adapt based on context:

**In Shallow Biome**: "vibrant reef ambusher"  
**In Deep Biome**: "bioluminescent abyssal ambusher"  
**With Toxic Upgrade**: "toxic ambush predator"

## Motif Database Structure

```typescript
interface VisualMotif {
  id: string;
  name: string;
  description: string; // The actual prompt chunk
  category: 'hunter' | 'prey' | 'depth' | 'elemental' | 'mutation' | 'behavioral' | 'mythical';
  subcategory?: string;
  tags: string[];
  visualCues: string[]; // Key visual elements
  compatibleWith?: string[]; // Compatible motif IDs
  incompatibleWith?: string[]; // Conflicting motif IDs
  rarityPreference?: 'common' | 'rare' | 'epic' | 'legendary';
}
```

**Example**:
```typescript
{
  id: 'ambush_predator',
  name: 'Ambush Predator',
  description: 'patient ambush hunter with camouflaged features',
  category: 'hunter',
  subcategory: 'predator',
  tags: ['camouflage', 'patient', 'predator'],
  visualCues: [
    'mottled camouflage patterns',
    'wide gaping mouth',
    'compressed body for hiding',
    'forward-facing eyes'
  ],
  compatibleWith: ['bioluminescent_wonder', 'toxic_avenger'],
  incompatibleWith: ['pursuit_predator', 'schooling_prey'],
  rarityPreference: 'rare'
}
```

## Usage in Fish Editor

### Motif Selector UI

The fish editor should provide:

1. **Category Dropdown**: Filter by motif category
2. **Motif List**: Browse available motifs with previews
3. **Custom Motif**: Enter custom motif description
4. **Combination Helper**: Suggest compatible motif combinations
5. **Preview**: Show how motif affects final prompt

### Auto-Suggestion

Based on creature properties, suggest appropriate motifs:

```typescript
function suggestMotifs(creature: Partial<Creature>): VisualMotif[] {
  const suggestions: VisualMotif[] = [];
  
  // Based on type
  if (creature.type === 'predator') {
    suggestions.push(...PREDATOR_MOTIFS);
  }
  
  // Based on biome
  if (creature.biomeId === 'deep') {
    suggestions.push(...ABYSSAL_MOTIFS);
  }
  
  // Based on essence
  if (creature.essence?.primary?.type === 'polluted') {
    suggestions.push(...MUTANT_MOTIFS);
  }
  
  // Based on rarity
  if (creature.rarity === 'legendary') {
    suggestions.push(...MYTHICAL_MOTIFS);
  }
  
  return suggestions;
}
```

## Preset Motif Combinations

### Shallow Biome Presets

- **Common Reef Fish**: "vibrant reef dweller with tropical colors"
- **Predatory Bass**: "aggressive territorial hunter of shallow waters"
- **Schooling Minnow**: "swift schooling fish with reflective scales"

### Deep Biome Presets

- **Anglerfish**: "patient abyssal ambusher with bioluminescent lure"
- **Gulper Eel**: "bizarre deep-sea predator with expandable jaws"
- **Vampire Squid**: "ancient survivor from the twilight zone"

### Polluted Biome Presets

- **Toxic Mutant**: "polluted mutant with asymmetric deformities"
- **Industrial Survivor**: "armored survivor of contaminated waters"
- **Waste Scavenger**: "resilient scavenger adapted to toxic environment"

### Cosmic Essence Presets

- **Star Navigator**: "cosmic navigator with celestial constellation patterns"
- **Void Entity**: "otherworldly void creature with reality-defying features"
- **Nebula Dweller**: "ethereal being with gaseous translucent form"

## Best Practices

### DO:
✅ Keep motifs concise (5-10 words)  
✅ Focus on visual themes, not mechanics  
✅ Use evocative language  
✅ Make motifs memorable  
✅ Consider cross-biome adaptations  

### DON'T:
❌ Write entire prompts as motifs  
❌ Describe stats or gameplay  
❌ Use technical jargon  
❌ Make motifs too generic  
❌ Contradict other prompt chunks  

## Related Documentation

- [MODULAR_PROMPT_SYSTEM.md](./MODULAR_PROMPT_SYSTEM.md) - Core prompt composition
- [ART_STYLE_PROMPT_CHUNKS.md](./ART_STYLE_PROMPT_CHUNKS.md) - Art style chunks
- [FUSION_MUTATION_METADATA.md](./FUSION_MUTATION_METADATA.md) - Fusion/mutation visuals
