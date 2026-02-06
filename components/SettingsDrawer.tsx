'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FeedbackButton from './FeedbackButton';
import { Z_LAYERS } from '@/lib/ui/z-layers';

/** All depth band ids for level skip cheat (matches level-config depth_bands) */
const DEPTH_BAND_IDS = [
  '1-1', '1-2', '1-3',
  '2-1', '2-2', '2-3',
  '3-1', '3-2', '3-3',
  '4-1', '4-2', '4-3',
] as const;

export type CheatSizeStage = 'juvenile' | 'adult' | 'elder';

interface SettingsDrawerProps {
  /** Whether this is in game mode (shows different options) */
  mode: 'game' | 'editor';
  /** Called when drawer opens or closes */
  onOpenChange?: (open: boolean) => void;
  /** Game only: show depth band overlay on canvas */
  showDepthBandOverlay?: boolean;
  /** Game only: called when depth band overlay toggle changes */
  onDepthBandOverlayChange?: (enabled: boolean) => void;
  /** Game only: current level (e.g. "1-1") for cheat section */
  currentLevel?: string;
  /** Game only: skip to a depth band level */
  onCheatLevel?: (depthBandId: string) => void;
  /** Game only: set player size to a growth stage */
  onCheatSize?: (stage: CheatSizeStage) => void;
}

export default function SettingsDrawer({ mode, onOpenChange, showDepthBandOverlay, onDepthBandOverlayChange, currentLevel, onCheatLevel, onCheatSize }: SettingsDrawerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  // Close drawer with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, { capture: true });
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }
  }, [isOpen, setOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  }, [setOpen]);

  const handleReturnToMenu = () => {
    if (mode === 'game') {
      // Confirm before leaving game
      if (window.confirm('Return to main menu? Your current progress will be saved.')) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  const handleGoToEditor = () => {
    router.push('/fish-editor');
    setOpen(false);
  };

  const handleGoToGame = () => {
    router.push('/fish-select');
    setOpen(false);
  };

  const handleGoToTechTree = () => {
    router.push('/tech-tree');
    setOpen(false);
  };

  return (
    <>
      {/* Menu Button - Positioned absolutely in top-right */}
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white w-10 h-10 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center transition-colors"
        style={{ zIndex: Z_LAYERS.CONTROLS }}
        title="Settings Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Backdrop + Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: Z_LAYERS.DRAWER_BACKDROP }}
          onClick={handleBackdropClick}
        >
          {/* Drawer Panel */}
          <div
            className="absolute top-0 right-0 h-full w-72 bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col animate-slide-in-right"
            style={{ zIndex: Z_LAYERS.DRAWER }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Navigation Section */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</p>

                {mode === 'game' && (
                  <button
                    onClick={handleGoToEditor}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                    <span>Fish Editor</span>
                  </button>
                )}

                {mode === 'editor' && (
                  <button
                    onClick={handleGoToGame}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    <span>Play Game</span>
                  </button>
                )}

                <button
                  onClick={handleGoToTechTree}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-purple-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  <span>Tech Tree</span>
                </button>

                <button
                  onClick={handleReturnToMenu}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  <span>Main Menu</span>
                </button>

                {/* Feedback Button */}
                <FeedbackButton variant="full" />
              </div>

              {/* Cheats Section (game only) */}
              {mode === 'game' && (onCheatLevel != null || onCheatSize != null) && (
                <div className="pt-4 border-t border-gray-700 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cheats</p>

                  {onCheatLevel != null && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 mb-1">Level</p>
                      <div className="grid grid-cols-3 gap-1">
                        {DEPTH_BAND_IDS.map((id) => (
                          <button
                            key={id}
                            onClick={() => onCheatLevel(id)}
                            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              currentLevel === id
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {onCheatSize != null && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 mb-1">Size</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onCheatSize('juvenile')}
                          className="flex-1 px-3 py-2 rounded text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          Juvenile
                        </button>
                        <button
                          onClick={() => onCheatSize('adult')}
                          className="flex-1 px-3 py-2 rounded text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          Adult
                        </button>
                        <button
                          onClick={() => onCheatSize('elder')}
                          className="flex-1 px-3 py-2 rounded text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          Elder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Section */}
              <div className="pt-4 border-t border-gray-700 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Settings</p>

                <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-white bg-gray-800">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                    <span className="text-sm">Sound</span>
                  </div>
                  <span className="text-xs text-gray-500">Coming soon</span>
                </div>

                <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-white bg-gray-800">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    <span className="text-sm">Haptics</span>
                  </div>
                  <span className="text-xs text-gray-500">Coming soon</span>
                </div>

                {mode === 'game' && showDepthBandOverlay !== undefined && onDepthBandOverlayChange && (
                  <label className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-white bg-gray-800 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                      <span className="text-sm">Depth bands</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showDepthBandOverlay}
                      onChange={(e) => onDepthBandOverlayChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                Fish PWA • v0.1.0
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Animation Style */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
