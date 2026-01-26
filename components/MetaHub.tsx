/**
 * Main menu / Meta Hub component
 */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasActiveRun } from '@/lib/game/run-state';

export default function MetaHub() {
  const [hasRun, setHasRun] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load data asynchronously
    async function fetchData() {
      const runExists = hasActiveRun();
      setHasRun(runExists);
    }
    
    fetchData();

    // Update on focus (in case essence changed in another tab)
    const handleFocus = () => {
      fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleContinue = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasRun) {
      router.push('/game');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-black flex items-center justify-center p-8 relative overflow-hidden">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        {/* Title */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-7xl font-bold text-white mb-4 tracking-wider drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
            FISH ODYSSEY
          </h1>
          <p className="text-xl text-cyan-300 font-semibold tracking-wide drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
            EAT. GROW. EVOLVE. CONQUER THE DEPTHS.
          </p>
        </div>

        {/* Main Menu Buttons - Vertically Stacked */}
        <div className="flex flex-col gap-4">
          {/* Start Game Button */}
          <Link
            href="/game"
            className="group relative bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold py-6 px-8 rounded-lg text-center text-2xl uppercase tracking-wider transition-all transform hover:scale-105 border-4 border-red-400/50 shadow-[0_0_25px_rgba(220,38,38,0.4)] hover:shadow-[0_0_35px_rgba(220,38,38,0.6)]"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Start Game</span>
            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!hasRun}
            className={`group relative font-bold py-6 px-8 rounded-lg text-center text-2xl uppercase tracking-wider transition-all border-4 ${
              hasRun
                ? 'bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white transform hover:scale-105 border-orange-400/50 shadow-[0_0_25px_rgba(234,88,12,0.4)] hover:shadow-[0_0_35px_rgba(234,88,12,0.6)] cursor-pointer'
                : 'bg-gray-800/50 text-gray-600 border-gray-700/50 cursor-not-allowed'
            }`}
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Continue</span>
            {hasRun && (
              <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
            )}
          </button>

          {/* Tech Tree / Upgrades Button */}
          <Link
            href="/tech-tree"
            className="group relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-6 px-8 rounded-lg text-center text-2xl uppercase tracking-wider transition-all transform hover:scale-105 border-4 border-purple-400/50 shadow-[0_0_25px_rgba(147,51,234,0.4)] hover:shadow-[0_0_35px_rgba(147,51,234,0.6)]"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Upgrades</span>
            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>

          {/* Options Button */}
          <button
            disabled
            className="group relative bg-gray-800/50 text-gray-600 border-gray-700/50 font-bold py-6 px-8 rounded-lg text-center text-2xl uppercase tracking-wider transition-all border-4 cursor-not-allowed"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Options</span>
          </button>

          {/* Fish Editor Button */}
          <Link
            href="/fish-editor"
            className="group relative bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-6 px-8 rounded-lg text-center text-2xl uppercase tracking-wider transition-all transform hover:scale-105 border-4 border-cyan-400/50 shadow-[0_0_25px_rgba(8,145,178,0.4)] hover:shadow-[0_0_35px_rgba(8,145,178,0.6)]"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Fish Editor</span>
            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
        </div>

        {/* How to Play Section */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border-4 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] mt-8">
          <h2 className="text-2xl font-bold text-cyan-300 mb-4 uppercase tracking-wide">How to Play</h2>
          <ul className="space-y-2 text-blue-200">
            <li>• Use <kbd className="bg-cyan-900/50 px-2 py-1 rounded border border-cyan-600">WASD</kbd> or Arrow Keys to move</li>
            <li>• Eat smaller fish to grow larger</li>
            <li>• Avoid larger fish that can eat you</li>
            <li>• Collect mutations to gain powerful abilities</li>
            <li>• Reach space phase for greater rewards</li>
            <li>• Earn Essence on death to unlock permanent upgrades</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
