/**
 * Local Storage fallback for fish data
 * Used when Vercel Blob Storage is not available
 */

import type { Creature } from '@/lib/game/types';

const FISH_STORAGE_KEY = 'fish_game_creatures';

/**
 * Save a creature to localStorage
 */
export function saveCreatureToLocal(creature: Creature): void {
  try {
    const stored = localStorage.getItem(FISH_STORAGE_KEY);
    const creatures: Record<string, Creature> = stored ? JSON.parse(stored) : {};
    
    creatures[creature.id] = creature;
    
    localStorage.setItem(FISH_STORAGE_KEY, JSON.stringify(creatures));
    console.log('[LocalFishStorage] Saved creature to localStorage:', creature.id);
  } catch (error) {
    console.error('[LocalFishStorage] Failed to save creature:', error);
    throw error;
  }
}

/**
 * Load a creature from localStorage
 */
export function loadCreatureFromLocal(creatureId: string): Creature | null {
  try {
    const stored = localStorage.getItem(FISH_STORAGE_KEY);
    if (!stored) return null;
    
    const creatures: Record<string, Creature> = JSON.parse(stored);
    return creatures[creatureId] || null;
  } catch (error) {
    console.error('[LocalFishStorage] Failed to load creature:', error);
    return null;
  }
}

/**
 * List all creatures from localStorage
 */
export function listCreaturesFromLocal(): Creature[] {
  try {
    const stored = localStorage.getItem(FISH_STORAGE_KEY);
    if (!stored) return [];
    
    const creatures: Record<string, Creature> = JSON.parse(stored);
    return Object.values(creatures);
  } catch (error) {
    console.error('[LocalFishStorage] Failed to list creatures:', error);
    return [];
  }
}

/**
 * Get playable creatures from localStorage
 */
export function getPlayableCreaturesFromLocal(): Creature[] {
  const allCreatures = listCreaturesFromLocal();
  return allCreatures.filter(creature => creature.playable === true);
}

/**
 * Delete a creature from localStorage
 */
export function deleteCreatureFromLocal(creatureId: string): void {
  try {
    const stored = localStorage.getItem(FISH_STORAGE_KEY);
    if (!stored) return;
    
    const creatures: Record<string, Creature> = JSON.parse(stored);
    delete creatures[creatureId];
    
    localStorage.setItem(FISH_STORAGE_KEY, JSON.stringify(creatures));
    console.log('[LocalFishStorage] Deleted creature from localStorage:', creatureId);
  } catch (error) {
    console.error('[LocalFishStorage] Failed to delete creature:', error);
    throw error;
  }
}
