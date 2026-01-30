/**
 * UICard - Smaller card component for list items and selections
 * Based on DICE VADERS aesthetic with asymmetric chamfered corners
 */
'use client'

import { HTMLAttributes, forwardRef, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { generateClipPath, CLIP_PATH_CONFIGS } from '@/lib/utils/vector-shapes'

export interface UICardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'cyan' | 'purple' | 'teal' | 'black' | 'red' | 'yellow' | 'green' | 'default'
  selected?: boolean
  hoverable?: boolean
  glow?: boolean
}

const UICard = forwardRef<HTMLDivElement, UICardProps>(
  ({ 
    className, 
    variant = 'default', 
    selected = false,
    hoverable = true,
    glow = true,
    children,
    ...props 
  }, ref) => {
    // Generate consistent clip-path for this instance
    const clipPath = useMemo(() => generateClipPath(CLIP_PATH_CONFIGS.card), [])
    
    // Variant classes
    const variantClasses = {
      default: cn(
        'bg-gray-900/80 backdrop-blur-sm border-gray-600',
        glow && 'shadow-[0_0_15px_rgba(75,85,99,0.3)]',
      ),
      cyan: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-cyan-400' : 'border-cyan-600/50',
        glow && selected && 'shadow-[0_0_20px_rgba(34,211,238,0.4)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(34,211,238,0.2)]',
      ),
      purple: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-purple-400' : 'border-purple-600/50',
        glow && selected && 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
      ),
      teal: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-teal-400' : 'border-teal-600/50',
        glow && selected && 'shadow-[0_0_20px_rgba(20,184,166,0.4)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(20,184,166,0.2)]',
      ),
      black: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-cyan-500' : 'border-gray-700',
        glow && selected && 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(34,211,238,0.15)]',
      ),
      red: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-red-400' : 'border-red-600/50',
        glow && selected && 'shadow-[0_0_20px_rgba(248,113,113,0.4)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(248,113,113,0.2)]',
      ),
      yellow: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-yellow-400' : 'border-yellow-600/50',
        glow && selected && 'shadow-[0_0_20px_rgba(250,204,21,0.4)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(250,204,21,0.2)]',
      ),
      green: cn(
        'bg-black/80 backdrop-blur-sm',
        selected ? 'border-green-400' : 'border-green-600/50',
        glow && selected && 'shadow-[0_0_20px_rgba(74,222,128,0.4)]',
        glow && !selected && 'shadow-[0_0_15px_rgba(74,222,128,0.2)]',
      ),
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'border-4 p-3 transition-all duration-300',
          // Hover effect
          hoverable && 'hover:scale-[1.02]',
          // Variant
          variantClasses[variant],
          // Selected state glow boost
          hoverable && !selected && 'hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]',
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

UICard.displayName = 'UICard'

export { UICard }
