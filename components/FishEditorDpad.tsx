'use client';

import { useCallback, useRef } from 'react';

export type DpadDirection = 'up' | 'down' | 'left' | 'right';

interface FishEditorDpadProps {
  onDirection: (dir: DpadDirection, pressed: boolean) => void;
  /** Show only on touch devices / mobile (optional) */
  mobileOnly?: boolean;
}

export default function FishEditorDpad({ onDirection, mobileOnly = false }: FishEditorDpadProps) {
  const activeRef = useRef<Set<DpadDirection>>(new Set());

  const handlePointer = useCallback(
    (dir: DpadDirection, down: boolean) => {
      if (down) {
        if (activeRef.current.has(dir)) return;
        activeRef.current.add(dir);
        onDirection(dir, true);
      } else {
        if (!activeRef.current.has(dir)) return;
        activeRef.current.delete(dir);
        onDirection(dir, false);
      }
    },
    [onDirection]
  );

  const btn = (dir: DpadDirection, label: string, classNames: string) => (
    <button
      type="button"
      aria-label={dir}
      className={`absolute flex items-center justify-center rounded-lg bg-gray-800/80 border-2 border-gray-500/60 active:bg-blue-600/50 active:border-blue-400/70 select-none transition-colors ${classNames}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handlePointer(dir, true);
      }}
      onPointerUp={(e) => {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        handlePointer(dir, false);
      }}
      onPointerCancel={(e) => {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        handlePointer(dir, false);
      }}
    >
      <span className="text-white/90 text-xl font-bold">{label}</span>
    </button>
  );

  return (
    <div
      className={
        mobileOnly
          ? 'absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-md:block md:hidden'
          : 'absolute bottom-6 left-1/2 -translate-x-1/2 z-10'
      }
      style={{ touchAction: 'none' }}
      aria-hidden
    >
      <div className="relative w-40 h-40">
        {/* Up */}
        {btn('up', '↑', 'w-14 h-12 top-0 left-1/2 -translate-x-1/2 rounded-t-lg rounded-b-sm')}
        {/* Down */}
        {btn('down', '↓', 'w-14 h-12 bottom-0 left-1/2 -translate-x-1/2 rounded-b-lg rounded-t-sm')}
        {/* Left */}
        {btn('left', '←', 'h-14 w-12 left-0 top-1/2 -translate-y-1/2 rounded-l-lg rounded-r-sm')}
        {/* Right */}
        {btn('right', '→', 'h-14 w-12 right-0 top-1/2 -translate-y-1/2 rounded-r-lg rounded-l-sm')}
        {/* Center (visual only) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-gray-800/50 border-2 border-gray-600/40" />
        </div>
      </div>
    </div>
  );
}
