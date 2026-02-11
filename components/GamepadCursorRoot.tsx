'use client';

import { GamepadCursorProvider } from '@/lib/gamepad-cursor-context';
import GamepadVirtualCursor from './GamepadVirtualCursor';

export default function GamepadCursorRoot({ children }: { children: React.ReactNode }) {
  return (
    <GamepadCursorProvider>
      {children}
      <GamepadVirtualCursor />
    </GamepadCursorProvider>
  );
}
