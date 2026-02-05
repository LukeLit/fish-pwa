/**
 * Core data type definitions for the roguelite fish game
 * Based on DATA_STRUCTURE.md specification
 */

/**
 * Essence Type - Defines a currency category
 */
export interface EssenceType {
  id: string; // 'deep_sea', 'shallow', 'polluted', 'tropical', etc.
  name: string; // 'Deep Sea', 'Shallow', 'Polluted', etc.
  color: string; // Hex color for UI display (e.g., '#1a237e' for deep sea)
  description: string; // Flavor text describing the essence type
}

/**
 * Biome - Defines a game area/environment as base depth + modifiers
 */
export interface Biome {
  id: string; // 'shallow', 'shallow_tropical', 'deep_polluted', etc.
  name: string; // 'Coral Shallows', 'Tropical Shallows', 'Polluted Depths'
  baseDepth: 'shallow' | 'medium' | 'deep' | 'abyssal'; // Base depth level
  modifiers: string[]; // Array of archetype modifier IDs (e.g., ['tropical'], ['polluted'])
  depthRange: {
    min: number; // Minimum depth in meters
    max: number; // Maximum depth in meters
  };
  availableEssenceTypes: string[]; // Array of EssenceType IDs available here
  visualTheme: string; // Description of visual style
  backgroundAssets: {
    backgroundImage: string; // URL to background image
    stageElements?: string[]; // Array of stage element asset URLs
    lighting?: string; // Lighting configuration
  };
  unlockCost: Record<string, number>; // Essence costs to unlock: { 'shallow': 100, 'deep_sea': 50 }
  essenceOrbSpawnRate: number; // How frequently essence orbs spawn (0-1)
  creatureSpawnRules?: {
    exclusiveCreatures?: string[]; // Creature IDs that only spawn here
    sharedCreatures?: string[]; // Creature IDs that can spawn in multiple biomes
    spawnWeights?: Record<string, number>; // Relative spawn probabilities
  };
}

/**
 * Upgrade Effect - Defines the effect of an upgrade
 */
export interface UpgradeEffect {
  type: 'stat' | 'ability' | 'unlock';
  target: string; // Stat name ('health', 'speed') or ability ID ('shield')
  value: number | string; // Flat value or ability ID
  perLevel?: boolean; // If true, value is per level (e.g., +10 per level)
}

/**
 * Upgrade Node - Defines a single upgrade in an upgrade tree
 */
export interface UpgradeNode {
  id: string; // Unique identifier
  name: string; // Display name
  description: string; // What this upgrade does
  category: 'shallow' | 'deep_sea' | 'tropical' | 'polluted' | 'hybrid' | 'meta';
  requiredEssenceTypes: Record<string, number>; // { 'deep_sea': 10, 'shallow': 5 }
  prerequisites: string[]; // Array of UpgradeNode IDs that must be purchased first
  maxLevel: number; // Maximum upgrade level (typically 2-5, not 10+)
  baseCost: number; // Cost at level 0
  costPerLevel?: number; // Flat cost increase per level (or use costMultiplier)
  costMultiplier?: number; // Optional: Cost increases by this per level
  effects: UpgradeEffect[]; // Array of effects this upgrade provides
  impactLevel: 'low' | 'medium' | 'high' | 'game_changing'; // How impactful this upgrade is
}

/**
 * Ability - Defines a passive ability
 */
export interface Ability {
  id: string; // Unique identifier
  name: string; // Display name
  description: string; // What this ability does
  type: 'passive'; // All abilities are passive (no active abilities)
  category?: 'shallow' | 'deep_sea' | 'tropical' | 'polluted' | 'hybrid' | 'meta'; // Which tree unlocks it
  unlockRequirement?: {
    upgradeId: string; // UpgradeNode ID that unlocks this
    upgradeLevel?: number; // Minimum level required (default: 1)
  };
  // Passive ability properties
  activationType: 'always_active' | 'periodic'; // Always on vs. periodic trigger
  cooldown?: number; // Cooldown in seconds (periodic only, typically 10-30 seconds)
  duration?: number; // Duration in seconds (periodic only)
  stacking?: boolean; // Can be upgraded multiple times
  maxLevel?: number; // Maximum level if stacking
  // Effect data
  effect: {
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility' | 'attraction' | 'protection';
    target: 'self' | 'enemy' | 'area' | 'essence_orbs';
    value: number; // Effect magnitude
    radius?: number; // Area effect radius in pixels
    range?: number; // Range for attraction/utility effects
  };
}

/**
 * Base Fish Data - Legacy compatibility interface
 */
export interface BaseFishData {
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  stats: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  sprite: string;
}

/**
 * Essence Data Structure - New modular essence system
 */
export interface EssenceData {
  primary: {
    type: string; // EssenceType ID
    baseYield: number; // Base essence amount
    visualChunks?: string[]; // Visual cues for this essence type
  };
  secondary?: Array<{
    type: string; // EssenceType ID
    baseYield: number;
    visualChunks?: string[]; // Optional visual cues
  }>;
}

/**
 * Fusion Metadata - For fusion creatures
 */
export interface FusionMetadata {
  fusionParentIds: string[]; // Array of parent creature IDs (2+)
  fusionType?: 'balanced' | 'dominant_first' | 'dominant_second'; // How traits blend
  fusionGeneration?: number; // How many fusions deep (1 = first-gen)
}

/**
 * Mutation Metadata - For mutated creatures
 */
export interface MutationMetadata {
  sourceCreatureId: string; // ID of the original creature
  mutationType: string; // Type of mutation (polluted, abyssal, cosmic, etc.)
  mutationLevel: number; // Intensity of mutation (1-5)
  mutationTrigger?: string; // What caused it (upgrade ID, biome ID, etc.)
}

/**
 * Entity State - Life state of an entity
 */
export enum EntityState {
  ALIVE = 'alive',
  KNOCKED_OUT = 'knocked_out',
  CARCASS = 'carcass',
}

/**
 * Animation Action Types - The different animation poses a creature can have
 */
export type AnimationAction = 'idle' | 'swim' | 'dash' | 'bite' | 'hurt' | 'death';

/**
 * Animation Frame - A single frame/pose generated via image-to-image
 * Each frame is a separate image showing the creature in a specific pose
 */
export interface AnimationFrame {
  url: string;           // URL to the frame image
  action: AnimationAction;
  frameIndex: number;    // 0-based index within the action sequence
  generatedAt?: string;  // ISO timestamp
}

/**
 * Animation Sequence - A set of frames for one animation action
 * Generated via image-to-image from the base sprite
 */
export interface AnimationSequence {
  action: AnimationAction;
  frames: string[];      // URLs to frame images in order
  loop: boolean;         // Whether this animation loops
  frameRate: number;     // Playback speed (default: 12 fps for pixel art style)
  generatedAt?: string;
  version?: string;      // Unique version ID for this animation (prevents cache issues)
}

/**
 * Creature Animations - All animation sequences for a creature
 * Organized by growth stage, each stage can have its own animations
 */
export interface CreatureAnimations {
  // Animations per growth stage
  juvenile?: Partial<Record<AnimationAction, AnimationSequence>>;
  adult?: Partial<Record<AnimationAction, AnimationSequence>>;
  elder?: Partial<Record<AnimationAction, AnimationSequence>>;
}

/**
 * Default animation configuration
 */
export const ANIMATION_CONFIG: Record<AnimationAction, { loop: boolean; frameCount: number; frameRate: number }> = {
  idle: { loop: true, frameCount: 1, frameRate: 1 },
  swim: { loop: true, frameCount: 1, frameRate: 1 },
  dash: { loop: false, frameCount: 1, frameRate: 1 },
  bite: { loop: false, frameCount: 2, frameRate: 6 },
  hurt: { loop: false, frameCount: 1, frameRate: 1 },
  death: { loop: false, frameCount: 1, frameRate: 1 },
};

/**
 * Sprite Resolution Variants - Multi-resolution sprites for optimal rendering
 * 
 * Provides different resolution versions of the same sprite to optimize
 * rendering at different screen sizes (mipmap-like system for web).
 */
export interface SpriteResolutions {
  high: string;    // 512px - full detail for large/close fish
  medium: string;  // 256px - medium detail for normal view
  low: string;     // 128px - low detail for small/distant fish
}

/**
 * Growth Stages - Different visual representations based on creature size
 */
export type GrowthStage = 'juvenile' | 'adult' | 'elder';

/**
 * Growth Sprite Data - Sprite and metadata for a specific growth stage
 */
export interface GrowthSpriteData {
  sprite: string;                      // Sprite URL for this growth stage
  spriteResolutions?: SpriteResolutions; // Multi-resolution variants
  sizeRange: {
    min: number;                       // Minimum size for this stage
    max: number;                       // Maximum size for this stage
  };
}

/**
 * Growth Sprites - Collection of sprites for different growth stages
 */
export interface GrowthSprites {
  juvenile?: GrowthSpriteData;         // Small/young version
  adult?: GrowthSpriteData;            // Default/mature version (uses base sprite if not specified)
  elder?: GrowthSpriteData;            // Large/ancient version
}

/**
 * CreatureMetrics - Size/depth metrics for level band filtering
 */
export interface CreatureMetrics {
  base_meters: number;
  base_art_scale: number;
  sub_depth?: 'upper' | 'mid' | 'lower';
}

/**
 * Creature - Complete creature data structure (extends BaseFishData)
 */
export interface Creature extends BaseFishData {
  // Identity (inherited from BaseFishData)
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'uncommon';
  playable?: boolean; // If true, can be selected as player fish in fish selection

  // Visual
  biomeId: string; // Native biome ID
  spriteResolutions?: SpriteResolutions; // Multi-resolution sprite variants (optional, falls back to sprite)
  growthSprites?: GrowthSprites; // Different sprites for growth stages (juvenile, adult, elder)

  // Optional size tier used by biome ecosystems and runtime scaling
  sizeTier?: 'prey' | 'mid' | 'predator' | 'boss' | string;

  // Metrics for depth band filtering (base_meters, base_art_scale, sub_depth)
  metrics?: CreatureMetrics;

  // NEW: Modular Prompt System
  descriptionChunks?: string[]; // Modular prompt segments describing the creature
  visualMotif?: string; // High-level visual theme/aesthetic

  // NEW: Enhanced Essence System
  essence?: EssenceData; // New modular essence structure

  // Legacy: Essence system (maintained for backward compatibility)
  essenceTypes: Array<{
    type: string; // EssenceType ID
    baseYield: number; // Base essence amount (before multipliers)
  }>; // All essence types are always granted (no chance-based drops)

  // NEW: Fusion/Mutation Metadata
  fusionParentIds?: string[]; // Parent creature IDs if this is a fusion
  fusionType?: 'balanced' | 'dominant_first' | 'dominant_second';
  fusionGeneration?: number;
  mutationSource?: MutationMetadata; // Mutation data if this is a mutant

  // Progression
  unlockRequirement?: {
    biomeUnlocked: string[]; // Array of biome IDs that must be unlocked
    essenceSpent?: Record<string, number>; // Essence types and amounts spent
  };

  // Abilities this creature can grant when consumed
  grantedAbilities?: string[]; // Array of Ability IDs

  // Spawn rules
  spawnRules: {
    canAppearIn: string[]; // Array of biome IDs where this creature can spawn
    spawnWeight: number; // Relative spawn probability (1-100)
    minDepth?: number; // Optional minimum depth
    maxDepth?: number; // Optional maximum depth
  };

  // Animation frames - generated via image-to-image from base sprite
  // Each growth stage can have its own set of animation sequences
  animations?: CreatureAnimations;

  // Timestamps for sync tracking
  createdAt?: number;  // Unix timestamp (ms) when creature was first created
  updatedAt?: number;  // Unix timestamp (ms) when creature was last modified
}

/**
 * Background Asset - Complete background data structure with modular prompt support
 * Mirrors the Creature pattern for consistent art generation
 */
export interface BackgroundAsset {
  id: string;                    // e.g., "shallow_coral_reef"
  name: string;                  // Display name
  biomeId: string;               // Associated biome
  type: 'image' | 'video';
  url: string;                   // Blob storage URL

  // Modular prompt data (matches creature pattern)
  descriptionChunks?: string[];  // e.g., ["coral reef formations", "sunlit waters"]
  visualMotif?: string;          // e.g., "tropical paradise with vibrant corals"

  // Background-specific
  resolution?: { width: number; height: number };
  depthLayer?: 'far' | 'mid' | 'near';  // For parallax support

  // Metadata
  createdAt: string;
  generatedWith?: string;        // Model used for generation
}

/**
 * Run State - Current run's state (temporary, reset on new run)
 */
export interface RunState {
  runId: string; // Unique run identifier
  currentLevel: string; // "1-1", "1-2", etc.
  selectedFishId: string; // Creature ID selected for this run
  fishState: {
    size: number; // Current size (can grow)
    speed: number; // Current speed (can be modified by upgrades)
    health: number; // Current health
    damage: number; // Current damage
    sprite: string; // Current sprite (can evolve)
  };
  collectedEssence: Record<string, number>; // Essence collected this run: { 'shallow': 45, ... }
  selectedUpgrades: string[]; // Array of UpgradeNode IDs selected this run
  rerollsRemaining: number; // Rerolls left for upgrade selection
  evolutionLevel: number; // How many times fish has evolved this run
  hunger: number; // Current hunger (0-100)
  stats: {
    fishEaten: number;
    timeSurvived: number;
    maxSize: number;
  };
}

/**
 * Player State - Permanent player data (persists across runs)
 */
export interface PlayerState {
  evoPoints: number; // Meta-progression currency
  essence: Record<string, number>; // Permanent essence totals: { 'shallow': 150, ... }
  metaUpgrades: Record<string, number>; // Meta upgrade levels: { 'starting_size': 3, ... }
  unlockedFish: string[]; // Array of Creature IDs unlocked
  unlockedBiomes: string[]; // Array of Biome IDs unlocked
  bestiary: Record<string, boolean>; // Discovered creatures: { 'anglerfish': true, ... }
  highScore: number;
  totalRuns: number;
}

/**
 * Score Calculation Parameters
 */
export interface ScoreParams {
  size: number;
  fishEaten: number;
  timeSurvived: number;
  essenceCollected: number;
}

/**
 * Score Calculation Result
 */
export interface ScoreResult {
  score: number;
  evoPoints: number; // Calculated from score
}
