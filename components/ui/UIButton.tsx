/**
 * UIButton - Unified button component with vector-backed irregular shapes
 * Based on DICE VADERS aesthetic with asymmetric corners and slight edge slants
 */
'use client'

import { ButtonHTMLAttributes, forwardRef, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'

export interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'disabled'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  glow?: boolean
}

/**
 * Generate a unique irregular clip-path for each button instance
 * Creates slight variations in corners while maintaining the vector aesthetic
 */
function generateClipPath(seed: number = Math.random()): string {
  // Base corner chamfer sizes - one corner is always deeper
  const baseCorner = 8
  const deepCornerIndex = Math.floor(seed * 4) // 0-3 for which corner is deeper
  
  // Generate corner sizes with variation
  const corners = [
    baseCorner + (deepCornerIndex === 0 ? 4 : 0),
    baseCorner + (deepCornerIndex === 1 ? 4 : 0),
    baseCorner + (deepCornerIndex === 2 ? 4 : 0),
    baseCorner + (deepCornerIndex === 3 ? 4 : 0),
  ]
  
  // Add slight random variation to edges (0-2px slant)
  const edgeSlant = Math.floor((seed * 10) % 3)
  
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

const UIButton = forwardRef<HTMLButtonElement, UIButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md',
    fullWidth = false,
    glow = true,
    disabled,
    children,
    ...props 
  }, ref) => {
    // Generate consistent clip-path for this instance
    const clipPath = useMemo(() => generateClipPath(), [])
    
    // Size classes
    const sizeClasses = {
      sm: 'text-sm py-2 px-4',
      md: 'text-base py-3 px-5',
      lg: 'text-lg py-4 px-6',
      xl: 'text-xl py-5 px-8',
    }
    
    // Variant classes
    const variantClasses = {
      primary: cn(
        'bg-gradient-to-r from-red-600 to-pink-600',
        'hover:from-red-500 hover:to-pink-500',
        'text-white border-red-400/50',
        glow && 'shadow-[0_0_25px_rgba(220,38,38,0.4)]',
        glow && 'hover:shadow-[0_0_35px_rgba(220,38,38,0.6)]',
      ),
      secondary: cn(
        'bg-gradient-to-r from-purple-600 to-indigo-600',
        'hover:from-purple-500 hover:to-indigo-500',
        'text-white border-purple-400/50',
        glow && 'shadow-[0_0_25px_rgba(147,51,234,0.4)]',
        glow && 'hover:shadow-[0_0_35px_rgba(147,51,234,0.6)]',
      ),
      success: cn(
        'bg-gradient-to-r from-green-600 to-emerald-600',
        'hover:from-green-500 hover:to-emerald-500',
        'text-white border-green-400/50',
        glow && 'shadow-[0_0_25px_rgba(34,197,94,0.4)]',
        glow && 'hover:shadow-[0_0_35px_rgba(34,197,94,0.6)]',
      ),
      danger: cn(
        'bg-gradient-to-r from-red-700 to-red-600',
        'hover:from-red-600 hover:to-red-500',
        'text-white border-red-500/50',
        glow && 'shadow-[0_0_25px_rgba(220,38,38,0.4)]',
        glow && 'hover:shadow-[0_0_35px_rgba(220,38,38,0.6)]',
      ),
      warning: cn(
        'bg-gradient-to-r from-orange-600 to-yellow-600',
        'hover:from-orange-500 hover:to-yellow-500',
        'text-white border-orange-400/50',
        glow && 'shadow-[0_0_25px_rgba(234,88,12,0.4)]',
        glow && 'hover:shadow-[0_0_35px_rgba(234,88,12,0.6)]',
      ),
      ghost: cn(
        'bg-gray-800/50 hover:bg-gray-700/60',
        'text-gray-300 hover:text-white border-gray-600/50',
        glow && 'shadow-[0_0_15px_rgba(107,114,128,0.3)]',
        glow && 'hover:shadow-[0_0_25px_rgba(107,114,128,0.5)]',
      ),
      disabled: 'bg-gray-800/50 text-gray-600 border-gray-700/50 cursor-not-allowed opacity-60',
    }
    
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          'relative font-bold text-center uppercase tracking-wider',
          'transition-all transform',
          'border-4',
          // Hover effects
          !disabled && 'hover:scale-105',
          // Size
          sizeClasses[size],
          // Variant
          disabled ? variantClasses.disabled : variantClasses[variant],
          // Full width
          fullWidth && 'w-full',
          // Custom classes
          className
        )}
        style={{ clipPath }}
        {...props}
      >
        <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {children}
        </span>
        {!disabled && (
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    )
  }
)

UIButton.displayName = 'UIButton'

export { UIButton }
