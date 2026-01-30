/**
 * UIPanel - Unified panel component with vector-backed irregular shapes
 * Based on DICE VADERS aesthetic with asymmetric chamfered corners
 */
'use client'

import { HTMLAttributes, forwardRef, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { generateClipPath, CLIP_PATH_CONFIGS } from '@/lib/utils/vector-shapes'

export interface UIPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'cyan' | 'purple' | 'teal' | 'black' | 'red' | 'yellow' | 'default'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
  hover?: boolean
}

const UIPanel = forwardRef<HTMLDivElement, UIPanelProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md',
    glow = true,
    hover = false,
    children,
    ...props 
  }, ref) => {
    // Generate consistent clip-path for this instance
    const clipPath = useMemo(() => generateClipPath(CLIP_PATH_CONFIGS.panel), [])
    
    // Size classes
    const sizeClasses = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }
    
    // Variant classes
    const variantClasses = {
      default: cn(
        'bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-blue-900/90',
        'backdrop-blur-sm border-indigo-400/50',
        glow && 'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]',
      ),
      cyan: cn(
        'bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-blue-900/90',
        'backdrop-blur-sm border-cyan-400',
        glow && 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]',
      ),
      purple: cn(
        'bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-blue-900/90',
        'backdrop-blur-sm border-purple-400',
        glow && 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]',
      ),
      teal: cn(
        'bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-blue-900/90',
        'backdrop-blur-sm border-teal-400',
        glow && 'shadow-[0_0_20px_rgba(20,184,166,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]',
      ),
      black: cn(
        'bg-black/80 backdrop-blur-sm border-cyan-600',
        glow && 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]',
      ),
      red: cn(
        'bg-gradient-to-br from-red-900/90 via-rose-900/90 to-red-900/90',
        'backdrop-blur-sm border-red-400',
        glow && 'shadow-[0_0_20px_rgba(248,113,113,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(248,113,113,0.5)]',
      ),
      yellow: cn(
        'bg-gradient-to-br from-yellow-900/90 via-amber-900/90 to-yellow-900/90',
        'backdrop-blur-sm border-yellow-400',
        glow && 'shadow-[0_0_20px_rgba(250,204,21,0.3)]',
        hover && 'hover:shadow-[0_0_30px_rgba(250,204,21,0.5)]',
      ),
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'border-4 transition-all duration-300',
          // Size
          sizeClasses[size],
          // Variant
          variantClasses[variant],
          // Custom classes
          className
        )}
        style={{ clipPath }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

UIPanel.displayName = 'UIPanel'

export { UIPanel }
