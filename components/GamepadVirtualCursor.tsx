'use client';

import { useEffect, useRef, useState } from 'react';
import { pollGamepadCursorState } from '@/lib/game/gamepad-poller';
import { useGamepadCursor } from '@/lib/gamepad-cursor-context';

const CURSOR_SPEED = 350;
const CURSOR_SIZE = 20;

/**
 * Virtual cursor for gamepad UI interaction.
 * Active when gamepad is connected and not disabled (e.g. during active level gameplay).
 * Right stick: move cursor. A/Cross: click.
 */
export default function GamepadVirtualCursor() {
  const { disabled } = useGamepadCursor();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);
  const lastAPressedRef = useRef(false);
  const initializedRef = useRef(false);
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (disabled) {
      setVisible(false);
      return;
    }

    const animate = () => {
      const state = pollGamepadCursorState();
      if (!state) {
        setVisible(false);
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const { rightStick, aPressed } = state;

      // Show cursor when gamepad has any cursor input
      if (rightStick.x !== 0 || rightStick.y !== 0 || aPressed) {
        setVisible(true);
      }

      // Initialize position to center on first use
      if (!initializedRef.current && (rightStick.x !== 0 || rightStick.y !== 0 || aPressed)) {
        initializedRef.current = true;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        positionRef.current = { x: cx, y: cy };
        setPosition({ x: cx, y: cy });
      }

      // Move cursor (use delta time for consistent speed)
      const dt = 1 / 60;
      const prev = positionRef.current;
      let nextX = prev.x + rightStick.x * CURSOR_SPEED * dt;
      let nextY = prev.y + rightStick.y * CURSOR_SPEED * dt;
      nextX = Math.max(0, Math.min(window.innerWidth, nextX));
      nextY = Math.max(0, Math.min(window.innerHeight, nextY));
      positionRef.current = { x: nextX, y: nextY };
      setPosition({ x: nextX, y: nextY });

      // Click on A press (edge-triggered)
      if (aPressed && !lastAPressedRef.current) {
        const element = document.elementFromPoint(nextX, nextY);
        if (element) {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: nextX,
            clientY: nextY,
            view: window,
          });
          element.dispatchEvent(clickEvent);
        }
      }
      lastAPressedRef.current = aPressed;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [disabled]);

  // Reset visibility when disabled to avoid reusing stale position
  useEffect(() => {
    if (disabled) {
      initializedRef.current = false;
    }
  }, [disabled]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-[99999]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: CURSOR_SIZE,
        height: CURSOR_SIZE,
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
      >
        <path d="M5 3l14 9-7 2-2 7-5-18z" />
      </svg>
    </div>
  );
}
