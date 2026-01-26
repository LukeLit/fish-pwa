/**
 * Game page
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas, { type GameCanvasHandle } from '@/components/GameCanvas';
import { EssenceManager } from '@/lib/meta/essence';

export default function GamePage() {
  const router = useRouter();
  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [endScore, setEndScore] = useState(0);
  const [endEssence, setEndEssence] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const essenceManager = new EssenceManager();

  const handleLevelComplete = (score: number, level: number) => {
    setEndScore(score);
    setCurrentLevel(level);
    setShowLevelComplete(true);
  };

  const handleGameOver = async (score: number, essence: number) => {
    setEndScore(score);
    setEndEssence(essence);
    setShowGameOver(true);
  };

  const handleContinue = () => {
    router.push('/');
  };

  const handleNextLevel = () => {
    setShowLevelComplete(false);
    // Call nextLevel on the game canvas
    if (gameCanvasRef.current) {
      gameCanvasRef.current.nextLevel();
    }
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <GameCanvas 
        ref={gameCanvasRef}
        onLevelComplete={handleLevelComplete}
        onGameOver={handleGameOver}
      />
      
      {/* Menu Button (top right) */}
      <button
        onClick={() => router.push('/fish-editor')}
        className="fixed top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-40 border border-gray-600"
      >
        Fish Editor
      </button>
      
      {/* Level Complete Screen */}
      {showLevelComplete && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-green-600">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Level {currentLevel} Complete!</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-green-200">Score:</span>
                <span className="text-white font-bold">{endScore.toLocaleString()}</span>
              </div>
              <p className="text-green-200 text-center">
                Choose an upgrade or continue to next level
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleNextLevel}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Next Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {showGameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-red-900 to-rose-900 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-red-600">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">Game Over</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-red-200">Final Score:</span>
                <span className="text-white font-bold">{endScore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-200">Essence Earned:</span>
                <span className="text-yellow-400 font-bold">+{endEssence}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleContinue}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Main Menu
              </button>
              <button
                onClick={() => {
                  setShowGameOver(false);
                  window.location.reload();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
