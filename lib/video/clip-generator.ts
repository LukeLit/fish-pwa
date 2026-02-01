/**
 * Animation Utilities
 * 
 * Helper functions for animation frame management.
 * Video generation has been removed for fish - using image-to-image instead.
 * Video generation is still available for backgrounds via /api/generate-video-fal
 */

import type { 
  GrowthStage, 
  Creature, 
  AnimationAction,
  CreatureAnimations,
  AnimationSequence
} from '@/lib/game/types';

/**
 * Video generation settings from localStorage
 * Still used for background video generation
 */
export interface VideoGenerationSettings {
  selectedVideoModel: string;
  videoDuration: number;
  videoResolution: string;
  videoAspectRatio: string;
  negativePrompt: string;
  enableDirectMode: boolean;
}

/**
 * Get the provider from a model ID
 */
export function getProviderFromModel(modelId: string): 'fal' | 'veo' {
  return modelId.startsWith('fal/') ? 'fal' : 'veo';
}

/**
 * Get the Fal model key from full model ID (e.g., 'fal/wan-2.1' -> 'wan-2.1')
 */
export function getFalModelKey(modelId: string): string {
  return modelId.replace('fal/', '');
}

/**
 * Get saved video generation settings from localStorage
 * Used for background video generation
 */
export function getVideoGenerationSettings(): VideoGenerationSettings {
  const defaults: VideoGenerationSettings = {
    selectedVideoModel: 'fal/kling-2.1-pro',
    videoDuration: 10,
    videoResolution: '720p',
    videoAspectRatio: '16:9', // Widescreen for backgrounds
    negativePrompt: 'blurry, distorted, low quality, text, watermark',
    enableDirectMode: false,
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const savedSettings = localStorage.getItem('generationSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return {
        selectedVideoModel: settings.selectedVideoModel || defaults.selectedVideoModel,
        videoDuration: settings.videoDuration || defaults.videoDuration,
        videoResolution: settings.videoResolution || defaults.videoResolution,
        videoAspectRatio: settings.videoAspectRatio || defaults.videoAspectRatio,
        negativePrompt: settings.negativePrompt ?? defaults.negativePrompt,
        enableDirectMode: settings.enableDirectMode ?? defaults.enableDirectMode,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return defaults;
}

/**
 * Get the sprite URL for a specific growth stage
 * Falls back through: growthSprites[stage] -> base sprite
 */
export function getSpriteForGrowthStage(creature: Creature, stage: GrowthStage): string {
  const growthSprite = creature.growthSprites?.[stage]?.sprite;
  if (growthSprite) {
    return growthSprite;
  }
  
  if (stage === 'adult') {
    return creature.sprite;
  }
  
  return creature.sprite;
}

/**
 * Get all growth stages that have sprites available
 */
export function getAvailableGrowthStages(creature: Creature): GrowthStage[] {
  const stages: GrowthStage[] = [];
  
  stages.push('adult');
  
  if (creature.growthSprites?.juvenile?.sprite) {
    stages.unshift('juvenile');
  }
  if (creature.growthSprites?.elder?.sprite) {
    stages.push('elder');
  }
  
  return stages;
}

/**
 * Check if a creature has animation for a specific stage and action
 */
export function hasAnimation(
  animations: CreatureAnimations | undefined, 
  stage: GrowthStage,
  action: AnimationAction
): boolean {
  return (animations?.[stage]?.[action]?.frames?.length ?? 0) > 0;
}

/**
 * Get animation sequence for a stage and action
 */
export function getAnimationSequence(
  animations: CreatureAnimations | undefined,
  stage: GrowthStage,
  action: AnimationAction
): AnimationSequence | null {
  return animations?.[stage]?.[action] || null;
}

/**
 * Count total animations for a creature
 */
export function countAnimations(animations: CreatureAnimations | undefined): number {
  if (!animations) return 0;
  
  let count = 0;
  for (const stage of ['juvenile', 'adult', 'elder'] as GrowthStage[]) {
    const stageAnims = animations[stage];
    if (stageAnims) {
      count += Object.keys(stageAnims).length;
    }
  }
  
  return count;
}

/**
 * Get list of available actions for a growth stage
 */
export function getAvailableActions(
  animations: CreatureAnimations | undefined,
  stage: GrowthStage
): AnimationAction[] {
  const stageAnims = animations?.[stage];
  if (!stageAnims) return [];
  return Object.keys(stageAnims) as AnimationAction[];
}
