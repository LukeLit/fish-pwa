/**
 * Job Store
 * 
 * Persists job state in Vercel Blob storage for durability across
 * serverless function invocations and session restarts.
 */

import { uploadGameData, downloadGameData } from '@/lib/storage/blob-storage';
import type { AnyJob, JobStatus, JobListResponse } from './types';

const JOBS_KEY = 'jobs';

/**
 * Get all jobs
 */
export async function getAllJobs(): Promise<AnyJob[]> {
  const jobs = await downloadGameData<Record<string, AnyJob>>(JOBS_KEY, {});
  return Object.values(jobs);
}

/**
 * Get jobs by status
 */
export async function getJobsByStatus(status: JobStatus): Promise<AnyJob[]> {
  const jobs = await getAllJobs();
  return jobs.filter(job => job.status === status);
}

/**
 * Get a specific job by ID
 */
export async function getJob(jobId: string): Promise<AnyJob | null> {
  const jobs = await downloadGameData<Record<string, AnyJob>>(JOBS_KEY, {});
  return jobs[jobId] || null;
}

/**
 * Create a new job
 */
export async function createJob<T extends AnyJob>(job: Omit<T, 'createdAt' | 'updatedAt'>): Promise<T> {
  const jobs = await downloadGameData<Record<string, AnyJob>>(JOBS_KEY, {});

  const now = new Date().toISOString();
  const fullJob = {
    ...job,
    createdAt: now,
    updatedAt: now,
  } as T;

  jobs[job.id] = fullJob;
  await uploadGameData(JOBS_KEY, jobs);

  console.log(`[JobStore] Created job ${job.id} of type ${job.type}`);
  return fullJob;
}

/**
 * Update a job with retry logic
 */
export async function updateJob<T extends AnyJob>(
  jobId: string,
  updates: Partial<T>,
  maxRetries: number = 5
): Promise<T | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const jobs = await downloadGameData<Record<string, AnyJob>>(JOBS_KEY, {});

      if (!jobs[jobId]) {
        console.error(`[JobStore] Job ${jobId} not found (attempt ${attempt + 1})`);
        // If job not found, might be a stale read - retry with longer delay
        if (attempt < maxRetries - 1) {
          const delay = 500 * (attempt + 1); // 500ms, 1s, 1.5s, 2s
          console.log(`[JobStore] Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        return null;
      }

      const updatedJob = {
        ...jobs[jobId],
        ...updates,
        updatedAt: new Date().toISOString(),
      } as T;

      // Set completedAt if status is changing to completed or failed
      if ((updates.status === 'completed' || updates.status === 'failed') && !updatedJob.completedAt) {
        updatedJob.completedAt = new Date().toISOString();
      }

      jobs[jobId] = updatedJob;
      await uploadGameData(JOBS_KEY, jobs);

      console.log(`[JobStore] Updated job ${jobId}: status=${updatedJob.status}`);
      return updatedJob;
    } catch (error: any) {
      lastError = error;
      console.error(`[JobStore] Update error for ${jobId} (attempt ${attempt + 1}):`, error.message);
      if (attempt < maxRetries - 1) {
        const delay = 500 * (attempt + 1);
        await sleep(delay);
      }
    }
  }

  console.error(`[JobStore] Failed to update job ${jobId} after ${maxRetries} attempts:`, lastError?.message);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<boolean> {
  const jobs = await downloadGameData<Record<string, AnyJob>>(JOBS_KEY, {});

  if (!jobs[jobId]) {
    return false;
  }

  delete jobs[jobId];
  await uploadGameData(JOBS_KEY, jobs);

  console.log(`[JobStore] Deleted job ${jobId}`);
  return true;
}

/**
 * Delete completed jobs older than specified hours
 */
export async function cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
  const jobs = await downloadGameData<Record<string, AnyJob>>(JOBS_KEY, {});
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  let deleted = 0;
  for (const [id, job] of Object.entries(jobs)) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      job.completedAt &&
      job.completedAt < cutoff
    ) {
      delete jobs[id];
      deleted++;
    }
  }

  if (deleted > 0) {
    await uploadGameData(JOBS_KEY, jobs);
    console.log(`[JobStore] Cleaned up ${deleted} old jobs`);
  }

  return deleted;
}

/**
 * Get paginated job list
 */
export async function getJobList(
  page: number = 1,
  limit: number = 20,
  status?: JobStatus
): Promise<JobListResponse> {
  let jobs = await getAllJobs();

  // Filter by status if provided
  if (status) {
    jobs = jobs.filter(job => job.status === status);
  }

  // Sort by createdAt descending (newest first)
  jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = jobs.length;
  const start = (page - 1) * limit;
  const paginatedJobs = jobs.slice(start, start + limit);

  return { jobs: paginatedJobs, total };
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
