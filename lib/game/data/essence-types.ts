/**
 * Essence Type Definitions
 * Based on DATA_STRUCTURE.md specification
 */
import type { EssenceType } from '../types';

/**
 * Core essence types for the game
 */
export const ESSENCE_TYPES: Record<string, EssenceType> = {
  shallow: {
    id: 'shallow',
    name: 'Shallow',
    color: '#4ade80', // Bright green
    description: 'The essence of shallow waters, granting speed and agility.',
  },
  deep_sea: {
    id: 'deep_sea',
    name: 'Deep Sea',
    color: '#1a237e', // Dark blue
    description: 'The essence of the abyssal depths, granting resilience and pressure resistance.',
  },
  tropical: {
    id: 'tropical',
    name: 'Tropical',
    color: '#fbbf24', // Golden yellow
    description: 'The essence of tropical waters, granting vibrant colors and charm.',
  },
  polluted: {
    id: 'polluted',
    name: 'Polluted',
    color: '#8b5cf6', // Purple
    description: 'The essence of contaminated waters, granting toxic abilities and mutation.',
  },
};

/**
 * Get all essence types as an array
 */
export function getAllEssenceTypes(): EssenceType[] {
  return Object.values(ESSENCE_TYPES);
}

/**
 * Get essence type by ID
 */
export function getEssenceType(id: string): EssenceType | undefined {
  return ESSENCE_TYPES[id];
}

/**
 * Check if essence type exists
 */
export function isValidEssenceType(id: string): boolean {
  return id in ESSENCE_TYPES;
}
