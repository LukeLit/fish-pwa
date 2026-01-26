/**
 * Bottom Sheet Component - Google Earth-style draggable bottom sheet
 * Works on both mobile and desktop
 */
'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';

interface BottomSheetProps {
  children: ReactNode;
  /** Default height as percentage (0-100) */
  defaultHeight?: number;
  /** Minimum height as percentage (0-100) */
  minHeight?: number;
  /** Maximum height as percentage (0-100) */
  maxHeight?: number;
  /** Height of the handle/drag area in pixels */
  handleHeight?: number;
}

export default function BottomSheet({
  children,
  defaultHeight = 30,
  minHeight = 10,
  maxHeight = 90,
  handleHeight = 40,
}: BottomSheetProps) {
  const [height, setHeight] = useState(defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const touchIdRef = useRef<number | null>(null);

  const handleDragStart = (clientY: number, identifier?: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = height;
    if (identifier !== undefined) {
      touchIdRef.current = identifier;
    }
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging || !containerRef.current) return;

    const containerHeight = window.innerHeight;
    const deltaY = startYRef.current - clientY; // Inverted: dragging up increases height
    const deltaPercent = (deltaY / containerHeight) * 100;
    const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaPercent));
    
    setHeight(newHeight);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    touchIdRef.current = null;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleDragStart(touch.clientY, touch.identifier);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) {
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        e.preventDefault();
        handleDragMove(touch.clientY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        handleDragEnd();
      }
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl z-30 flex flex-col"
      style={{
        height: `${height}vh`,
        transition: isDragging ? 'none' : 'height 0.2s ease-out',
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ 
          height: `${handleHeight}px`,
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Handle Bar */}
        <div className="w-16 h-1.5 bg-gray-600 rounded-full" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
