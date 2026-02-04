/**
 * Improved virtual joystick controls for touch devices
 * Better UX with smooth analog-style movement
 */
'use client';

import { useRef, useState, useEffect } from 'react';

interface GameControlsProps {
  onMove: (direction: 'up' | 'down' | 'left' | 'right' | null) => void;
  onDash?: (dashing: boolean) => void;
  autoDashEnabled?: boolean;
  onAutoDashToggle?: (enabled: boolean) => void;
}

export default function GameControls({ 
  onMove, 
  onDash,
  autoDashEnabled = false,
  onAutoDashToggle
}: GameControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [currentDirection, setCurrentDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistance = 50;
  
  // Dash button state
  const [isDashing, setIsDashing] = useState(false);
  const dashTouchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Calculate center position
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.width / 2,
        y: rect.height / 2,
      };
    }
  }, []);

  const calculateDirection = (x: number, y: number): 'up' | 'down' | 'left' | 'right' | null => {
    const dx = x - centerRef.current.x;
    const dy = y - centerRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 15) return null; // Dead zone

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - centerRef.current.x;
    const dy = y - centerRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      const newX = centerRef.current.x + Math.cos(angle) * maxDistance;
      const newY = centerRef.current.y + Math.sin(angle) * maxDistance;
      setPosition({ x: newX, y: newY });
    } else {
      setPosition({ x, y });
    }

    const direction = calculateDirection(x, y);
    if (direction !== currentDirection) {
      setCurrentDirection(direction);
      onMove(direction);
    }
  };

  const handleStart = (clientX: number, clientY: number, identifier?: number) => {
    setIsActive(true);
    if (identifier !== undefined) {
      touchIdRef.current = identifier;
    }
    updatePosition(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isActive) {
      updatePosition(clientX, clientY);
    }
  };

  const handleEnd = () => {
    setIsActive(false);
    setPosition({ x: centerRef.current.x, y: centerRef.current.y });
    setCurrentDirection(null);
    onMove(null);
    touchIdRef.current = null;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current === null && e.touches.length > 0) {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) {
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        handleEnd();
      }
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isActive) {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    if (isActive) {
      handleEnd();
    }
  };

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
    <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-between px-6 pointer-events-none">
      {/* Movement joystick - left side */}
      <div
        className="relative pointer-events-auto"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={containerRef}
          className="relative w-32 h-32"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full bg-blue-600/30 border-2 border-blue-400/50 backdrop-blur-sm" />
          
          {/* Center dot */}
          <div
            className="absolute w-6 h-6 rounded-full bg-blue-500 transition-all duration-100"
            style={{
              left: `${position.x - 12}px`,
              top: `${position.y - 12}px`,
              transform: isActive ? 'scale(1.2)' : 'scale(1)',
              boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.6)' : 'none',
            }}
          />

          {/* Direction indicators */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-blue-300/40 text-xs font-bold">
              {currentDirection === 'up' && '↑'}
              {currentDirection === 'down' && '↓'}
              {currentDirection === 'left' && '←'}
              {currentDirection === 'right' && '→'}
            </div>
          </div>
        </div>
      </div>

      {/* Dash button and auto-dash toggle - right side */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto">
        {/* Auto-dash toggle */}
        {onAutoDashToggle && (
          <button
            onClick={() => onAutoDashToggle(!autoDashEnabled)}
            className={`
              px-3 py-1 rounded-lg border text-xs font-semibold
              transition-all duration-200
              ${autoDashEnabled
                ? 'bg-green-500 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                : 'bg-gray-700/50 border-gray-500/50 text-gray-300 backdrop-blur-sm'
              }
            `}
            style={{ touchAction: 'none' }}
          >
            Auto-Dash {autoDashEnabled ? 'ON' : 'OFF'}
          </button>
        )}

        {/* Dash button */}
        <div
          className="relative"
          style={{ touchAction: 'none' }}
        >
          <div
            className={`
              w-20 h-20 rounded-full border-2 flex items-center justify-center
              transition-all duration-100 select-none
              ${isDashing 
                ? 'bg-orange-500 border-orange-400 scale-110 shadow-[0_0_20px_rgba(249,115,22,0.6)]' 
                : 'bg-orange-600/30 border-orange-400/50 backdrop-blur-sm'
              }
            `}
            onTouchStart={handleDashStart}
            onTouchEnd={handleDashEnd}
            onMouseDown={handleDashStart}
            onMouseUp={handleDashEnd}
            onMouseLeave={handleDashEnd}
          >
            <div className="text-white font-bold text-sm">
              DASH
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
