/**
 * Job System Types
 * 
 * Defines the structure for async background jobs that can persist
 * across sessions and be processed by cron jobs or serverless functions.
 */

export type JobType = 'clip_generation' | 'fish_mutation' | 'sprite_generation';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Base job interface
 */
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  progress?: number; // 0-100
  progressMessage?: string;
}

/**
 * Clip generation job
 */
export interface ClipGenerationJob extends Job {
  type: 'clip_generation';
  input: {
    creatureId: string;
    action: string;
    spriteUrl: string;
    description?: string;
  };
  // Google operation ID for polling
  operationId?: string;
  // Result when complete
  result?: {
    videoUrl: string;
    thumbnailUrl: string;
    frames: string[];
    duration: number;
    frameRate: number;
  };
}

/**
 * Fish mutation job (for future use)
 */
export interface FishMutationJob extends Job {
  type: 'fish_mutation';
  input: {
    sourceCreatureId: string;
    mutationType: string;
    mutationLevel: number;
  };
  result?: {
    newCreatureId: string;
    spriteUrl: string;
    stats: Record<string, number>;
  };
}

/**
 * Sprite generation job (for future use)
 */
export interface SpriteGenerationJob extends Job {
  type: 'sprite_generation';
  input: {
    prompt: string;
    model: string;
    creatureId?: string;
  };
  result?: {
    spriteUrl: string;
  };
}

/**
 * Union type for all jobs
 */
export type AnyJob = ClipGenerationJob | FishMutationJob | SpriteGenerationJob;

/**
 * Job list response
 */
export interface JobListResponse {
  jobs: AnyJob[];
  total: number;
}
