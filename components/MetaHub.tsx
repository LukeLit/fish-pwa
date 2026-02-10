/**
 * Main menu / Meta Hub component
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasActiveRun } from '@/lib/game/run-state';
import FeedbackButton from './FeedbackButton';
import { UIButton, UIPanel } from './ui';

/** Static fallback backgrounds from public assets */
const STATIC_BACKGROUNDS = ['/backgrounds/shallow.svg'];

export default function MetaHub() {
  const [hasRun, setHasRun] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Load run state
    const fetchData = () => {
      const runExists = hasActiveRun();
      setHasRun(runExists);
    };

    fetchData();

    // Detect if device is mobile/touch-enabled
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;
      const isMobileViewport = window.innerWidth < 768;
      setIsMobile(hasTouchScreen || isMobileViewport);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Update on focus (in case run state changed in another tab)
    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Load random background from library (blob storage or static fallback)
  useEffect(() => {
    let cancelled = false;
    const loadBackground = async () => {
      try {
        const res = await fetch('/api/list-assets?type=background&includeMetadata=true');
        const data = await res.json();
        const list = data.backgrounds ?? data.assets ?? [];
        const images = list.filter((a: { url?: string; filename?: string; type?: string }) => {
          if (a.type === 'video') return false;
          const fn = String(a.filename ?? '');
          return !fn.endsWith('.json') && !fn.endsWith('.mp4') && !fn.endsWith('.webm');
        });
        const sources = images.length > 0
          ? images.map((a: { url: string }) => a.url)
          : STATIC_BACKGROUNDS;
        if (cancelled || sources.length === 0) return;
        const random = sources[Math.floor(Math.random() * sources.length)];
        setBackgroundUrl(random);
      } catch {
        if (!cancelled) setBackgroundUrl(STATIC_BACKGROUNDS[0]);
      }
    };
    loadBackground();
    return () => { cancelled = true; };
  }, []);

  const handleContinue = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasRun) {
      router.push('/game');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-gray-900"
      style={
        backgroundUrl
          ? {
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
          : undefined
      }
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="max-w-2xl w-full space-y-6 sm:space-y-8 relative z-10">
        {/* Title */}
        <div className="text-center space-y-2 sm:space-y-4 mb-8 sm:mb-12 animate-scale-in">
          <h1 className="text-5xl sm:text-7xl dv-title mb-2 sm:mb-4">
            FISH ODYSSEY
          </h1>
          <p className="text-lg sm:text-xl dv-subtitle">
            EAT. GROW. EVOLVE. CONQUER THE DEPTHS.
          </p>
        </div>

        {/* Main Menu Buttons - Vertically Stacked */}
        <div className="flex flex-col gap-3 sm:gap-4 animate-slide-in">
          {/* Start Game Button */}
          <UIButton variant="primary" size="xl" fullWidth href="/fish-select">
            Start Game
          </UIButton>

          {/* Continue Button */}
          <UIButton
            variant={hasRun ? "warning" : "disabled"}
            size="xl"
            fullWidth
            onClick={handleContinue}
            disabled={!hasRun}
            aria-label={hasRun ? "Continue current game" : "No active game to continue"}
          >
            Continue
          </UIButton>

          {/* Tech Tree / Upgrades Button */}
          <UIButton variant="secondary" size="xl" fullWidth href="/tech-tree">
            Upgrades
          </UIButton>

          {/* Options Button */}
          <UIButton
            variant="disabled"
            size="xl"
            fullWidth
            disabled
            aria-label="Options (coming soon)"
          >
            Options
          </UIButton>

          {/* Fish Editor Button */}
          <UIButton
            variant="secondary"
            size="xl"
            fullWidth
            href="/fish-editor"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-cyan-400/50"
          >
            Fish Editor
          </UIButton>
        </div>

        {/* How to Play Section */}
        <UIPanel variant="cyan" className="mt-6 sm:mt-8 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl sm:text-2xl dv-subtitle mb-3 sm:mb-4 uppercase">How to Play</h2>
          <ul className="space-y-2 text-sm sm:text-base text-blue-200">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 flex-shrink-0">▸</span>
              <span>Use <kbd className="bg-cyan-900/50 px-2 py-1 rounded border border-cyan-600 text-xs sm:text-sm">{isMobile ? 'Touch Controls' : 'WASD'}</kbd> {isMobile ? '' : 'or Arrow Keys'} to move</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 flex-shrink-0">▸</span>
              <span>Eat smaller fish to grow larger</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 flex-shrink-0">▸</span>
              <span>Avoid larger fish that can eat you</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 flex-shrink-0">▸</span>
              <span>Collect mutations to gain powerful abilities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 flex-shrink-0">▸</span>
              <span>Earn Essence on death to unlock permanent upgrades</span>
            </li>
          </ul>
        </UIPanel>

        {/* Mobile Control Instructions */}
        {isMobile && (
          <UIPanel variant="teal" className="mt-4 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg sm:text-xl dv-subtitle mb-3 uppercase flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Touch Controls
            </h3>
            <div className="space-y-3 text-cyan-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-cyan-600/30 rounded-full border-2 border-cyan-400/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-cyan-100">Virtual Joystick</p>
                  <p className="text-sm text-cyan-300/80">Tap and drag on screen to move your fish in any direction</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-cyan-600/30 rounded-full border-2 border-cyan-400/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-cyan-100">Tap to Navigate</p>
                  <p className="text-sm text-cyan-300/80">The joystick appears wherever you touch on the screen</p>
                </div>
              </div>
            </div>
          </UIPanel>
        )}

        {/* Feedback Button */}
        <div className="flex justify-center mt-6">
          <FeedbackButton variant="icon" />
        </div>
      </div>
    </div>
  );
}
