/**
 * Modern Analog Joystick - Appears where user taps and holds
 * Combines tap-to-move and D-pad functionality
 */
'use client';

import { useRef, useState, useCallback } from 'react';

export interface AnalogJoystickOutput {
  /** Direction for keyboard-based controls */
  direction: 'up' | 'down' | 'left' | 'right' | null;
  /** Normalized velocity vector for smooth movement (-1 to 1) */
  velocity: { x: number; y: number };
  /** Whether joystick is currently active */
  isActive: boolean;
}

interface AnalogJoystickProps {
  /** Callback when joystick state changes */
  onChange: (output: AnalogJoystickOutput) => void;
  /** Maximum distance from center (default: 50px) */
  maxDistance?: number;
  /** Dead zone radius (default: 15px) */
  deadZone?: number;
  /** Joystick visibility mode */
  mode?: 'always' | 'on-touch';
}

export default function AnalogJoystick({
  onChange,
  maxDistance = 50,
  deadZone = 15,
  mode = 'on-touch',
}: AnalogJoystickProps) {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [basePosition, setBasePosition] = useState({ x: 0, y: 0 });
  const [currentDirection, setCurrentDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const touchIdRef = useRef<number | null>(null);

  const calculateOutput = useCallback((dx: number, dy: number): AnalogJoystickOutput => {
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < deadZone) {
      return {
        direction: null,
        velocity: { x: 0, y: 0 },
        isActive: true,
      };
    }

    // Normalize velocity
    const velocityX = Math.max(-1, Math.min(1, dx / maxDistance));
    const velocityY = Math.max(-1, Math.min(1, dy / maxDistance));

    // Calculate cardinal direction
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let direction: 'up' | 'down' | 'left' | 'right' | null = null;
    
    if (absDx > absDy) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    return {
      direction,
      velocity: { x: velocityX, y: velocityY },
      isActive: true,
    };
  }, [maxDistance, deadZone]);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - basePosition.x;
    const dy = clientY - basePosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Constrain to max distance
    let finalX = basePosition.x + dx;
    let finalY = basePosition.y + dy;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      finalX = basePosition.x + Math.cos(angle) * maxDistance;
      finalY = basePosition.y + Math.sin(angle) * maxDistance;
    }

    setPosition({ x: finalX, y: finalY });

    const output = calculateOutput(dx, dy);
    if (output.direction !== currentDirection) {
      setCurrentDirection(output.direction);
    }
    onChange(output);
  }, [basePosition, maxDistance, calculateOutput, currentDirection, onChange]);

  const handleStart = useCallback((clientX: number, clientY: number, identifier?: number) => {
    setIsActive(true);
    setBasePosition({ x: clientX, y: clientY });
    setPosition({ x: clientX, y: clientY });
    
    if (identifier !== undefined) {
      touchIdRef.current = identifier;
    }

    onChange({
      direction: null,
      velocity: { x: 0, y: 0 },
      isActive: true,
    });
  }, [onChange]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (isActive) {
      updatePosition(clientX, clientY);
    }
  }, [isActive, updatePosition]);

  const handleEnd = useCallback(() => {
    setIsActive(false);
    setCurrentDirection(null);
    touchIdRef.current = null;
    
    onChange({
      direction: null,
      velocity: { x: 0, y: 0 },
      isActive: false,
    });
  }, [onChange]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null && e.touches.length > 0) {
      e.preventDefault(); // Only prevent when handling the joystick
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    }
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) {
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    }
  }, [handleMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) {
      e.preventDefault(); // Only prevent when handling the joystick
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        handleEnd();
      }
    }
  }, [handleEnd]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Only prevent when handling the joystick
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isActive) {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    }
  }, [isActive, handleMove]);

  const handleMouseUp = useCallback(() => {
    if (isActive) {
      handleEnd();
    }
  }, [isActive, handleEnd]);

  // If mode is 'on-touch' and not active, render an invisible touch area
  if (mode === 'on-touch' && !isActive) {
    return (
      <div
        className="absolute inset-0 z-10"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    );
  }

  // Render joystick at current position
  const joystickSize = 128;
  const knobSize = 24;

  return (
    <>
      {/* Full screen touch area for 'on-touch' mode */}
      {mode === 'on-touch' && (
        <div
          className="absolute inset-0 z-10"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}

      {/* Joystick visualization */}
      {isActive && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${basePosition.x - joystickSize / 2}px`,
            top: `${basePosition.y - joystickSize / 2}px`,
            width: `${joystickSize}px`,
            height: `${joystickSize}px`,
          }}
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full bg-blue-600/20 border-2 border-blue-400/40 backdrop-blur-sm" />

          {/* Knob */}
          <div
            className="absolute rounded-full bg-blue-500 transition-all duration-75"
            style={{
              width: `${knobSize}px`,
              height: `${knobSize}px`,
              left: `${position.x - basePosition.x + joystickSize / 2 - knobSize / 2}px`,
              top: `${position.y - basePosition.y + joystickSize / 2 - knobSize / 2}px`,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)',
            }}
          />

          {/* Direction indicator */}
          <div className="absolute inset-0 flex items-center justify-center text-blue-300/60 text-xl font-bold">
            {currentDirection === 'up' && '↑'}
            {currentDirection === 'down' && '↓'}
            {currentDirection === 'left' && '←'}
            {currentDirection === 'right' && '→'}
          </div>
        </div>
      )}

      {/* Always visible joystick (bottom-right corner) */}
      {mode === 'always' && (
        <div
          className="absolute bottom-6 right-6 z-10"
          style={{ touchAction: 'none' }}
        >
          <div
            className="relative"
            style={{
              width: `${joystickSize}px`,
              height: `${joystickSize}px`,
            }}
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
            
            {/* Knob */}
            <div
              className="absolute rounded-full bg-blue-500 transition-all duration-100"
              style={{
                width: `${knobSize}px`,
                height: `${knobSize}px`,
                left: `${joystickSize / 2 - knobSize / 2 + (isActive ? position.x - basePosition.x : 0)}px`,
                top: `${joystickSize / 2 - knobSize / 2 + (isActive ? position.y - basePosition.y : 0)}px`,
                transform: isActive ? 'scale(1.2)' : 'scale(1)',
                boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.6)' : 'none',
              }}
            />

            {/* Direction indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-blue-300/40 text-xs font-bold">
              {currentDirection === 'up' && '↑'}
              {currentDirection === 'down' && '↓'}
              {currentDirection === 'left' && '←'}
              {currentDirection === 'right' && '→'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
