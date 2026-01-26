/**
 * Improved virtual joystick controls for touch devices
 * Better UX with smooth analog-style movement
 */
'use client';

import { useRef, useState, useEffect } from 'react';

interface GameControlsProps {
  onMove: (direction: 'up' | 'down' | 'left' | 'right' | null) => void;
}

export default function GameControls({ onMove }: GameControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [currentDirection, setCurrentDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistance = 50;

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

  return (
    <div
      className="absolute bottom-6 right-6 z-10"
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
  );
}
