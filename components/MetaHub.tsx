/**
 * Main menu / Meta Hub component
 */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GameStorage } from '@/lib/meta/storage';
import { EssenceManager } from '@/lib/meta/essence';

export default function MetaHub() {
  const [essence, setEssence] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const storage = GameStorage.getInstance();
  const essenceManager = new EssenceManager();

  useEffect(() => {
    // Load data asynchronously
    const loadData = async () => {
      const currentEssence = await essenceManager.getAmount();
      const currentHighScore = await storage.getHighScore();
      setEssence(currentEssence);
      setHighScore(currentHighScore);
    };
    
    loadData();

    // Update on focus (in case essence changed in another tab)
    const handleFocus = async () => {
      const currentEssence = await essenceManager.getAmount();
      const currentHighScore = await storage.getHighScore();
      setEssence(currentEssence);
      setHighScore(currentHighScore);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-white mb-2">Fish Odyssey</h1>
          <p className="text-xl text-blue-200">Eat. Grow. Evolve. Conquer the Depths.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-800/50 backdrop-blur rounded-lg p-6 border border-blue-600">
            <div className="text-blue-200 text-sm mb-1">Essence</div>
            <div className="text-3xl font-bold text-yellow-400">{essence.toLocaleString()}</div>
          </div>
          <div className="bg-blue-800/50 backdrop-blur rounded-lg p-6 border border-blue-600">
            <div className="text-blue-200 text-sm mb-1">High Score</div>
            <div className="text-3xl font-bold text-green-400">{highScore.toLocaleString()}</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/game"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-6 px-8 rounded-lg text-center text-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Start Run
          </Link>
          <Link
            href="/tech-tree"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-6 px-8 rounded-lg text-center text-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Tech Tree
          </Link>
          <Link
            href="/fish-editor"
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold py-6 px-8 rounded-lg text-center text-xl transition-all transform hover:scale-105 shadow-lg md:col-span-2"
          >
            Fish Editor (AI Testing)
          </Link>
        </div>

        {/* Instructions */}
        <div className="bg-blue-800/30 backdrop-blur rounded-lg p-6 border border-blue-600">
          <h2 className="text-xl font-bold text-white mb-4">How to Play</h2>
          <ul className="space-y-2 text-blue-200">
            <li>• Use <kbd className="bg-blue-900 px-2 py-1 rounded">WASD</kbd> or Arrow Keys to move</li>
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
