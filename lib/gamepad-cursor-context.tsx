'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface GamepadCursorContextValue {
  disabled: boolean;
  setDisabled: (value: boolean) => void;
}

const GamepadCursorContext = createContext<GamepadCursorContextValue | null>(null);

export function GamepadCursorProvider({ children }: { children: ReactNode }) {
  const [disabled, setDisabled] = useState(false);
  const value: GamepadCursorContextValue = {
    disabled,
    setDisabled: useCallback((v: boolean) => setDisabled(v), []),
  };
  return (
    <GamepadCursorContext.Provider value={value}>
      {children}
    </GamepadCursorContext.Provider>
  );
}

export function useGamepadCursor() {
  const ctx = useContext(GamepadCursorContext);
  if (!ctx) {
    return { disabled: false, setDisabled: () => { } };
  }
  return ctx;
}
