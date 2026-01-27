/**
 * Vercel Blob Storage utility
 * Provides abstraction for storing game data and assets in Vercel Blob Storage
 */

import { put, del, list, head } from '@vercel/blob';

const GAME_DATA_PREFIX = 'game-data/';
const ASSETS_PREFIX = 'assets/';

/**
 * Upload game data as JSON to Vercel Blob Storage
 * Always allows overwrites to support asset management
 */
export async function uploadGameData(key: string, data: unknown): Promise<string> {
  try {
    const blob = await put(`${GAME_DATA_PREFIX}${key}.json`, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  } catch (error) {
    console.error(`[BlobStorage] Failed to upload game data ${key}:`, error);
    throw error;
  }
}

/**
 * Download game data from Vercel Blob Storage
 */
export async function downloadGameData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    // Use list to find the blob URL
    const { blobs } = await list({
      prefix: `${GAME_DATA_PREFIX}${key}.json`,
      limit: 1,
    });

    if (blobs.length === 0) {
      return defaultValue;
    }

    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.warn(`[BlobStorage] Failed to download game data ${key}, using default:`, error);
    return defaultValue;
  }
}

/**
 * Upload asset (image, model, etc.) to Vercel Blob Storage
 * Always allows overwrites for asset management
 */
export async function uploadAsset(
  filename: string,
  data: Buffer | Blob | string,
  contentType: string
): Promise<{ url: string; pathname: string }> {
  try {
    const blob = await put(`${ASSETS_PREFIX}${filename}`, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    
    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error) {
    console.error(`[BlobStorage] Failed to upload asset ${filename}:`, error);
    throw error;
  }
}

/**
 * Delete asset from Vercel Blob Storage
 */
export async function deleteAsset(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error(`[BlobStorage] Failed to delete asset ${url}:`, error);
    throw error;
  }
}

/**
 * List assets by prefix
 */
export async function listAssets(prefix: string = ''): Promise<Array<{
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}>> {
  try {
    const { blobs } = await list({
      prefix: `${ASSETS_PREFIX}${prefix}`,
    });
    
    return blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
  } catch (error) {
    console.error(`[BlobStorage] Failed to list assets:`, error);
    throw error;
  }
}

/**
 * Check if asset exists
 */
export async function assetExists(pathname: string): Promise<boolean> {
  try {
    await head(`${ASSETS_PREFIX}${pathname}`);
    return true;
  } catch {
    return false;
  }
}
