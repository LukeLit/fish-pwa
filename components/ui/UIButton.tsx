/**
 * UIButton - Unified button component with vector-backed irregular shapes
 * Based on DICE VADERS aesthetic with asymmetric corners and slight edge slants
 */
'use client'

import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { generateClipPath, CLIP_PATH_CONFIGS } from '@/lib/utils/vector-shapes'

type BaseProps = {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'disabled'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  glow?: boolean
  children?: React.ReactNode
}

type ButtonAsButton = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never
}

type ButtonAsLink = BaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
  href: string
}

export type UIButtonProps = ButtonAsButton | ButtonAsLink

const UIButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, UIButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md',
    fullWidth = false,
    glow = true,
    disabled,
    children,
    href,
    ...props 
  }, ref) => {
    // Generate consistent clip-path for this instance
    const clipPath = useMemo(() => generateClipPath(CLIP_PATH_CONFIGS.button), [])
    
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
    
    const baseClasses = cn(
      // Base styles
      'group relative font-bold text-center uppercase tracking-wider',
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
    )
    
    const content = (
      <>
        <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {children}
        </span>
        {!disabled && (
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </>
    )
    
    if (href && !disabled) {
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={baseClasses}
          style={{ clipPath }}
          {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      )
    }
    
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={disabled}
        className={baseClasses}
        style={{ clipPath }}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    )
  }
)

UIButton.displayName = 'UIButton'

export { UIButton }
