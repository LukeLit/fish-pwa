/**
 * Spending Tracker
 * 
 * Tracks daily API spending to prevent runaway costs.
 * Uses blob storage for persistence across serverless invocations.
 */

import { uploadGameData, downloadGameData } from '@/lib/storage/blob-storage';

const SPENDING_KEY = 'spending-tracker';

/**
 * Default daily limits (can be overridden via env vars)
 */
const DEFAULT_DAILY_VIDEO_LIMIT = 10; // ~$40/day max at $4/video

export interface SpendingRecord {
  date: string; // YYYY-MM-DD
  videoGenerations: number;
  lastUpdated: string;
}

export interface SpendingTracker {
  currentDay: SpendingRecord;
  history: SpendingRecord[];
}

/**
 * Get the current date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the spending tracker data
 */
async function getSpendingTracker(): Promise<SpendingTracker> {
  const today = getTodayString();
  const defaultTracker: SpendingTracker = {
    currentDay: {
      date: today,
      videoGenerations: 0,
      lastUpdated: new Date().toISOString(),
    },
    history: [],
  };

  const tracker = await downloadGameData<SpendingTracker>(SPENDING_KEY, defaultTracker);

  // Roll over to new day if needed
  if (tracker.currentDay.date !== today) {
    // Save yesterday's record to history (keep last 30 days)
    tracker.history.unshift(tracker.currentDay);
    tracker.history = tracker.history.slice(0, 30);

    // Start fresh for today
    tracker.currentDay = {
      date: today,
      videoGenerations: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  return tracker;
}

/**
 * Check if we can generate another video today
 */
export async function canGenerateVideo(): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  const tracker = await getSpendingTracker();
  const limit = parseInt(process.env.DAILY_VIDEO_LIMIT || '') || DEFAULT_DAILY_VIDEO_LIMIT;
  const remaining = Math.max(0, limit - tracker.currentDay.videoGenerations);

  if (tracker.currentDay.videoGenerations >= limit) {
    return {
      allowed: false,
      reason: `Daily video generation limit reached (${limit} videos). Resets at midnight UTC.`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining,
  };
}

/**
 * Record a video generation (call this when starting a video job)
 */
export async function recordVideoGeneration(): Promise<SpendingRecord> {
  const tracker = await getSpendingTracker();

  tracker.currentDay.videoGenerations += 1;
  tracker.currentDay.lastUpdated = new Date().toISOString();

  await uploadGameData(SPENDING_KEY, tracker);

  console.log(`[SpendingTracker] Recorded video generation. Today's count: ${tracker.currentDay.videoGenerations}`);

  return tracker.currentDay;
}

/**
 * Get current spending status
 */
export async function getSpendingStatus(): Promise<{
  today: SpendingRecord;
  limit: number;
  remaining: number;
  percentUsed: number;
}> {
  const tracker = await getSpendingTracker();
  const limit = parseInt(process.env.DAILY_VIDEO_LIMIT || '') || DEFAULT_DAILY_VIDEO_LIMIT;
  const remaining = Math.max(0, limit - tracker.currentDay.videoGenerations);
  const percentUsed = Math.round((tracker.currentDay.videoGenerations / limit) * 100);

  return {
    today: tracker.currentDay,
    limit,
    remaining,
    percentUsed,
  };
}

/**
 * Get spending history
 */
export async function getSpendingHistory(): Promise<SpendingRecord[]> {
  const tracker = await getSpendingTracker();
  return [tracker.currentDay, ...tracker.history];
}
