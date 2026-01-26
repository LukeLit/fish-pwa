/**
 * Game page
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from '@/components/GameCanvas';
import DevTools from '@/components/DevTools';
import { EssenceManager } from '@/lib/meta/essence';

export default function GamePage() {
  const router = useRouter();
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [endScore, setEndScore] = useState(0);
  const [endEssence, setEndEssence] = useState(0);
  const essenceManager = new EssenceManager();

  const handleGameEnd = (score: number, essence: number) => {
    setEndScore(score);
    setEndEssence(essence);
    setShowEndScreen(true);
  };

  const handleContinue = () => {
    router.push('/');
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <GameCanvas onGameEnd={handleGameEnd} />
      <DevTools />
      
      {showEndScreen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-blue-600">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Run Complete!</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-blue-200">Score:</span>
                <span className="text-white font-bold">{endScore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Essence Earned:</span>
                <span className="text-yellow-400 font-bold">+{endEssence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Total Essence:</span>
                <span className="text-yellow-400 font-bold">{essenceManager.getAmount().toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleContinue}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowEndScreen(false);
                  window.location.reload();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
