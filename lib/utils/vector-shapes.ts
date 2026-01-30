/**
 * Vector shape utilities for UI components
 */

export interface ClipPathConfig {
  baseCorner: number
  deepCornerExtra: number
  maxEdgeSlant: number
}

/**
 * Generate a unique irregular clip-path for vector-backed components
 * Creates slight variations in corners while maintaining the vector aesthetic
 */
export function generateClipPath(config: ClipPathConfig, seed: number = Math.random()): string {
  const { baseCorner, deepCornerExtra, maxEdgeSlant } = config
  
  // Base corner chamfer sizes - one corner is always deeper
  const deepCornerIndex = Math.floor(seed * 4) // 0-3 for which corner is deeper
  
  // Generate corner sizes with variation
  const corners = [
    baseCorner + (deepCornerIndex === 0 ? deepCornerExtra : 0),
    baseCorner + (deepCornerIndex === 1 ? deepCornerExtra : 0),
    baseCorner + (deepCornerIndex === 2 ? deepCornerExtra : 0),
    baseCorner + (deepCornerIndex === 3 ? deepCornerExtra : 0),
  ]
  
  // Add slight random variation to edges
  const edgeSlant = Math.floor((seed * 10) % (maxEdgeSlant + 1))
  
  return `polygon(
    ${corners[0] + edgeSlant}px 0%, 
    calc(100% - ${corners[1]}px) 0%, 
    100% ${corners[1] + edgeSlant}px, 
    100% calc(100% - ${corners[2]}px), 
    calc(100% - ${corners[2] + edgeSlant}px) 100%, 
    ${corners[3]}px 100%, 
    0% calc(100% - ${corners[3] + edgeSlant}px), 
    0% ${corners[0]}px
  )`
}

// Preset configs for different component types
export const CLIP_PATH_CONFIGS = {
  button: { baseCorner: 8, deepCornerExtra: 4, maxEdgeSlant: 2 },
  panel: { baseCorner: 12, deepCornerExtra: 6, maxEdgeSlant: 3 },
  card: { baseCorner: 8, deepCornerExtra: 4, maxEdgeSlant: 2 },
} as const
