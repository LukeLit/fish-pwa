# Upgrade Prompt Chunks System

## Overview

This system defines how upgrades affect the visual appearance of creatures through AI prompt modifications. When a player purchases upgrades, the creature's sprite can be regenerated with visual cues that reflect the enhanced abilities.

## Core Concept

Each upgrade category can contribute **visual prompt chunks** that modify the creature's appearance when active. This creates visual feedback for progression and makes upgraded creatures look more powerful.

## Upgrade Categories & Visual Effects

### Shallow Essence Upgrades

#### Speed Boost
```typescript
{
  upgradeId: 'shallow_speed_boost',
  visualChunks: {
    level1: ['slightly more streamlined fins'],
    level2: ['elongated streamlined fins', 'sleeker body profile'],
    level3: ['hyper-streamlined torpedo body', 'oversized propulsion fins']
  }
}
```

#### Agility
```typescript
{
  upgradeId: 'shallow_agility',
  visualChunks: {
    level1: ['nimble flexible body'],
    level2: ['multiple stabilizing fins', 'enhanced maneuverability features'],
    level3: ['acrobatic body with extra control surfaces']
  }
}
```

#### Camouflage
```typescript
{
  upgradeId: 'shallow_camouflage',
  visualChunks: {
    level1: ['adaptive color-shifting scales'],
    level2: ['sophisticated camouflage patterns', 'environment-matching texture'],
    level3: ['near-invisible adaptive camouflage', 'chameleon-like skin']
  }
}
```

### Deep Sea Essence Upgrades

#### Pressure Adaptation
```typescript
{
  upgradeId: 'deep_pressure_adaptation',
  visualChunks: {
    level1: ['reinforced scales for pressure resistance'],
    level2: ['thick armored plating', 'compressed robust body'],
    level3: ['heavily reinforced exoskeleton', 'adapted to crushing depths']
  }
}
```

#### Bioluminescence
```typescript
{
  upgradeId: 'deep_bioluminescence',
  visualChunks: {
    level1: ['faint bioluminescent spots'],
    level2: ['bright bioluminescent stripes', 'glowing organs visible'],
    level3: ['intense multi-colored bioluminescence', 'radiant light-producing body']
  }
}
```

#### Sonar Sense
```typescript
{
  upgradeId: 'deep_sonar',
  visualChunks: {
    level1: ['enlarged sensory organs'],
    level2: ['prominent echolocation structures', 'enhanced sensory features'],
    level3: ['massive sonar dome', 'sophisticated sensory array']
  }
}
```

### Polluted Essence Upgrades

#### Toxic Resistance
```typescript
{
  upgradeId: 'polluted_resistance',
  visualChunks: {
    level1: ['slight discoloration from toxin exposure'],
    level2: ['adaptive mutations visible', 'toxic-resistant features'],
    level3: ['fully adapted to toxic environment', 'mutated resilient body']
  }
}
```

#### Poison Generation
```typescript
{
  upgradeId: 'polluted_poison',
  visualChunks: {
    level1: ['venomous spines emerging'],
    level2: ['toxic glands visible', 'warning coloration developing'],
    level3: ['deadly toxic spines', 'bright danger warning patterns', 'poison sacs visible']
  }
}
```

#### Mutation Adaptation
```typescript
{
  upgradeId: 'polluted_mutation',
  visualChunks: {
    level1: ['minor beneficial mutations'],
    level2: ['asymmetric enhanced features', 'mutant adaptations'],
    level3: ['advanced mutations', 'evolved beyond original form']
  }
}
```

### Tropical Essence Upgrades

#### Vibrant Scales
```typescript
{
  upgradeId: 'tropical_vibrant_scales',
  visualChunks: {
    level1: ['brightened tropical colors'],
    level2: ['brilliant rainbow scales', 'iridescent sheen'],
    level3: ['dazzling multi-colored scales', 'prismatic light-refracting body']
  }
}
```

#### Reef Camouflage
```typescript
{
  upgradeId: 'tropical_reef_camo',
  visualChunks: {
    level1: ['coral-matching patterns'],
    level2: ['sophisticated reef mimicry', 'polyp-like textures'],
    level3: ['perfect coral reef camouflage', 'indistinguishable from environment']
  }
}
```

### Hybrid Upgrades

#### Size Increase
```typescript
{
  upgradeId: 'hybrid_size_boost',
  visualChunks: {
    level1: ['slightly enlarged muscular build'],
    level2: ['significantly increased size', 'powerful physique'],
    level3: ['massive imposing size', 'gigantic muscular body']
  }
}
```

#### Predator Enhancement
```typescript
{
  upgradeId: 'hybrid_predator',
  visualChunks: {
    level1: ['sharper teeth visible'],
    level2: ['enhanced predatory features', 'menacing appearance'],
    level3: ['apex predator physique', 'terrifying hunting adaptations']
  }
}
```

#### Armor Plating
```typescript
{
  upgradeId: 'hybrid_armor',
  visualChunks: {
    level1: ['reinforced scale armor'],
    level2: ['heavy plated armor', 'defensive spines'],
    level3: ['impenetrable armored exoskeleton', 'fortress-like plating']
  }
}
```

### Meta Upgrades

#### Essence Magnet
```typescript
{
  upgradeId: 'meta_essence_magnet',
  visualChunks: {
    level1: ['faint essence-attracting aura'],
    level2: ['visible essence collection field'],
    level3: ['powerful essence vortex around body']
  }
}
```

#### Evolution Potential
```typescript
{
  upgradeId: 'meta_evolution',
  visualChunks: {
    level1: ['adaptive evolutionary features'],
    level2: ['rapidly evolving physiology', 'transitional features'],
    level3: ['perfect evolutionary form', 'optimized body structure']
  }
}
```

## Cosmic/Special Essence Upgrades

### Cosmic Essence

#### Star Navigation
```typescript
{
  upgradeId: 'cosmic_star_nav',
  visualChunks: {
    level1: ['faint constellation patterns on scales'],
    level2: ['glowing star-map markings', 'celestial patterns'],
    level3: ['brilliant constellation body art', 'cosmic energy emanation']
  }
}
```

#### Void Resistance
```typescript
{
  upgradeId: 'cosmic_void',
  visualChunks: {
    level1: ['reality-bending shimmer'],
    level2: ['void-touched features', 'impossible geometry hints'],
    level3: ['otherworldly void-adapted form', 'reality-defying appearance']
  }
}
```

### Demonic Essence

#### Hellfire
```typescript
{
  upgradeId: 'demonic_hellfire',
  visualChunks: {
    level1: ['faint infernal glow in eyes'],
    level2: ['hellfire emanating from body', 'demonic red glow'],
    level3: ['wreathed in hellfire', 'infernal flame patterns']
  }
}
```

#### Demonic Transformation
```typescript
{
  upgradeId: 'demonic_transform',
  visualChunks: {
    level1: ['small horn-like protrusions'],
    level2: ['demonic features emerging', 'twisted horns and spines'],
    level3: ['full demonic form', 'terrifying infernal appearance']
  }
}
```

### Robotic Essence

#### Cybernetic Enhancement
```typescript
{
  upgradeId: 'robotic_cybernetics',
  visualChunks: {
    level1: ['small mechanical implants'],
    level2: ['visible cybernetic enhancements', 'mechanical joints'],
    level3: ['heavily augmented cyborg body', 'advanced robotic systems']
  }
}
```

#### Energy Shield
```typescript
{
  upgradeId: 'robotic_shield',
  visualChunks: {
    level1: ['faint energy shield shimmer'],
    level2: ['visible protective energy field', 'shield generators'],
    level3: ['powerful glowing energy shield', 'force field visible']
  }
}
```

## Prompt Composition Logic

### Single Upgrade Effect

```typescript
function getUpgradeVisualChunks(upgradeId: string, level: number): string[] {
  const upgrade = UPGRADE_VISUAL_MAP[upgradeId];
  if (!upgrade) return [];
  
  const levelKey = `level${level}` as keyof typeof upgrade.visualChunks;
  return upgrade.visualChunks[levelKey] || [];
}
```

### Multiple Upgrade Stacking

```typescript
function composeUpgradePrompt(activeUpgrades: Array<{id: string, level: number}>): string[] {
  const allChunks: string[] = [];
  
  // Group upgrades by category to avoid conflicts
  const grouped = groupUpgradesByCategory(activeUpgrades);
  
  // Prioritize higher-level upgrades
  const sorted = activeUpgrades.sort((a, b) => b.level - a.level);
  
  // Add chunks from each upgrade
  sorted.forEach(upgrade => {
    const chunks = getUpgradeVisualChunks(upgrade.id, upgrade.level);
    allChunks.push(...chunks);
  });
  
  // Remove duplicates while preserving order
  return [...new Set(allChunks)];
}
```

### Upgrade Synergies

Some upgrades have **synergistic visual effects** when combined:

```typescript
const UPGRADE_SYNERGIES = {
  'bioluminescence+poison': [
    'toxic bioluminescent glow',
    'warning light patterns'
  ],
  'size+armor': [
    'massive heavily armored tank',
    'fortress-like scaled behemoth'
  ],
  'speed+predator': [
    'lightning-fast apex hunter',
    'blur of predatory motion'
  ]
};
```

## Integration with Creature Prompt

```typescript
function composeFullPrompt(
  creature: Creature,
  activeUpgrades?: Array<{id: string, level: number}>,
  context?: PromptContext
): string {
  const chunks: string[] = [];
  
  // 1. Base creature description
  chunks.push(...creature.descriptionChunks);
  chunks.push(creature.visualMotif);
  
  // 2. Essence visual chunks
  if (creature.essence?.primary?.visualChunks) {
    chunks.push(...creature.essence.primary.visualChunks);
  }
  
  // 3. UPGRADE VISUAL EFFECTS (inserted here)
  if (activeUpgrades && activeUpgrades.length > 0) {
    const upgradeChunks = composeUpgradePrompt(activeUpgrades);
    chunks.push(...upgradeChunks);
    
    // Check for synergies
    const synergies = checkUpgradeSynergies(activeUpgrades);
    chunks.push(...synergies);
  }
  
  // 4. Context-based chunks (biome, abilities, etc.)
  // ... rest of composition
  
  return chunks.join(', ');
}
```

## Visual Progression Example

### Goldfish with Speed Upgrades

**Base Goldfish**:
```
small golden fish, rounded body, standard fins, bright orange scales,
swift schooling fish, isolated on transparent background
```

**+ Speed Boost Level 1**:
```
small golden fish, rounded body, slightly more streamlined fins, bright orange scales,
swift schooling fish, isolated on transparent background
```

**+ Speed Boost Level 3**:
```
small golden fish, hyper-streamlined torpedo body, oversized propulsion fins,
bright orange scales, lightning-fast swimmer, isolated on transparent background
```

### Anglerfish with Bioluminescence & Size

**Base Anglerfish**:
```
deep-sea predator, bioluminescent lure, large mouth with sharp teeth,
dark scales, patient abyssal hunter, isolated on transparent background
```

**+ Bioluminescence Level 2 + Size Level 2**:
```
deep-sea predator, bright bioluminescent stripes, glowing organs visible,
large mouth with sharp teeth, significantly increased size, powerful physique,
dark scales, patient abyssal hunter, isolated on transparent background
```

## Editor UI Integration

### Upgrade Preview Panel

The editor should provide:

1. **Active Upgrades List**: Show which upgrades are applied
2. **Level Sliders**: Adjust upgrade levels (1-3 or 1-5)
3. **Visual Preview**: Show how each upgrade affects the prompt
4. **Before/After Comparison**: Toggle upgrades on/off to see changes
5. **Synergy Detector**: Highlight when synergies activate

### Upgrade Visual Tester

```typescript
interface UpgradeVisualTester {
  baseCreature: Creature;
  testUpgrades: Array<{id: string, level: number}>;
  
  // Methods
  applyUpgrade(upgradeId: string, level: number): void;
  removeUpgrade(upgradeId: string): void;
  generatePreview(): Promise<string>; // Generate sprite with upgrades
  compareWithBase(): void; // Side-by-side comparison
}
```

## Best Practices

### DO:
✅ Keep upgrade chunks concise (3-7 words each)  
✅ Make higher levels visually more dramatic  
✅ Ensure upgrades are visually compatible  
✅ Use consistent language across similar upgrades  
✅ Test upgrade combinations for coherence  

### DON'T:
❌ Make level 1 too similar to level 3  
❌ Use contradictory visual descriptions  
❌ Overload with too many upgrade chunks  
❌ Ignore upgrade synergies  
❌ Make upgrades that clash with creature type  

## Upgrade Conflict Resolution

Some upgrades may conflict visually:

```typescript
const UPGRADE_CONFLICTS = {
  'camouflage': ['vibrant_scales', 'bioluminescence'], // Can't be invisible AND glowing
  'stealth': ['size_boost'], // Can't be stealthy AND massive
  'speed': ['armor'] // Can't be ultra-fast AND heavily armored
};

function resolveConflicts(upgrades: Array<{id: string, level: number}>): void {
  // Prioritize higher-level upgrades
  // Or blend conflicting upgrades creatively
}
```

## Future Enhancements

1. **Dynamic Upgrade Animations**: Smooth transitions between upgrade levels
2. **Upgrade Visual Presets**: Pre-defined visual styles for upgrade combos
3. **Player Customization**: Let players choose visual style for upgrades
4. **Seasonal Variants**: Upgrades look different in different seasons
5. **Rarity Modifiers**: Legendary fish have more dramatic upgrade visuals

## Related Documentation

- [MODULAR_PROMPT_SYSTEM.md](./MODULAR_PROMPT_SYSTEM.md) - Core prompt system
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Upgrade node definitions
- [VISUAL_MOTIFS.md](./VISUAL_MOTIFS.md) - Visual motif library
- [FUSION_MUTATION_METADATA.md](./FUSION_MUTATION_METADATA.md) - Mutation system
