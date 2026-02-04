/**
 * Dash button for touch devices
 * Rendered in HUD (z-40) so it stays above AnalogJoystick overlay
 * Movement uses AnalogJoystick in FishEditorCanvas (appears where you tap)
 */
'use client';

import { useRef, useState } from 'react';

interface DashButtonProps {
  onDash?: (dashing: boolean) => void;
}

export function DashButton({ onDash }: DashButtonProps) {
  const [isDashing, setIsDashing] = useState(false);
  const dashTouchIdRef = useRef<number | null>(null);

  // Dash button handlers
  const handleDashStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if ('touches' in e && e.touches.length > 0) {
      dashTouchIdRef.current = e.touches[0].identifier;
    }

    setIsDashing(true);
    if (onDash) onDash(true);
  };

  const handleDashEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if ('changedTouches' in e) {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === dashTouchIdRef.current);
      if (!touch) return;
      dashTouchIdRef.current = null;
    }

    setIsDashing(false);
    if (onDash) onDash(false);
  };

  return (
    <div
      className={`
        w-20 h-20 rounded-full border-2 flex items-center justify-center
        transition-all duration-100 select-none cursor-pointer
        ${isDashing
          ? 'bg-orange-500 border-orange-400 scale-105 shadow-[0_0_20px_rgba(249,115,22,0.6)]'
          : 'bg-orange-600/40 border-orange-400/60 backdrop-blur-sm hover:bg-orange-600/60'
        }
      `}
      style={{ touchAction: 'none' }}
      onTouchStart={handleDashStart}
      onTouchEnd={handleDashEnd}
      onMouseDown={handleDashStart}
      onMouseUp={handleDashEnd}
      onMouseLeave={handleDashEnd}
      title="Dash (hold)"
      role="button"
    >
      <span className="text-white font-bold text-sm">DASH</span>
    </div>
  );
}

export default DashButton;
