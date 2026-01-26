/**
 * Fish Selection Screen Component
 * Character select style layout inspired by DICE VADERS
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loadPlayerState } from '@/lib/game/player-state';
import { getCreature } from '@/lib/game/data/creatures';
import type { PlayerState, Creature } from '@/lib/game/types';

export default function FishSelectionScreen() {
  const router = useRouter();
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [selectedFishId, setSelectedFishId] = useState<string>('goldfish_starter');
  const [selectedFish, setSelectedFish] = useState<Creature | null>(null);

  useEffect(() => {
    // Load player state to get unlocked fish
    const state = loadPlayerState();
    setPlayerState(state);
    
    // Set initial selected fish to first unlocked fish
    if (state.unlockedFish.length > 0) {
      setSelectedFishId(state.unlockedFish[0]);
    }
  }, []);

  useEffect(() => {
    // Load selected fish data
    const fish = getCreature(selectedFishId);
    if (fish) {
      setSelectedFish(fish);
    }
  }, [selectedFishId]);

  const handleBack = () => {
    router.push('/');
  };

  const handleDive = () => {
    // Store selected fish in session storage for game to use
    sessionStorage.setItem('selected_fish_id', selectedFishId);
    router.push('/game');
  };

  const handleSelectFish = (fishId: string) => {
    setSelectedFishId(fishId);
  };

  if (!playerState || !selectedFish) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-black flex items-center justify-center">
        <div className="text-cyan-300 text-2xl">Loading...</div>
      </div>
    );
  }

  const unlockedFish = playerState.unlockedFish.map(id => getCreature(id)).filter(Boolean) as Creature[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-black flex flex-col p-8 relative overflow-hidden">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white tracking-wider drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
            SELECT YOUR FISH
          </h1>
        </div>

        {/* Main Layout: Left Panel + Central Card */}
        <div className="flex-1 flex gap-8 mb-8">
          {/* Left Panel - Biome Info */}
          <div className="w-64 flex flex-col gap-4">
            <div className="bg-cyan-900/30 backdrop-blur-sm rounded-lg p-6 border-4 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <h2 className="text-2xl font-bold text-cyan-300 mb-3 uppercase tracking-wide">
                Mission
              </h2>
              <div className="text-cyan-200 space-y-2">
                <p className="text-xl font-semibold">SHALLOWS 1-1</p>
                <p className="text-sm">Survive and grow!</p>
                <p className="text-xs text-cyan-300/70 mt-4">
                  Eat smaller fish to increase your size. Avoid larger predators.
                </p>
              </div>
            </div>

            {/* Stats Info */}
            <div className="bg-purple-900/30 backdrop-blur-sm rounded-lg p-4 border-4 border-purple-500/40 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
              <h3 className="text-sm font-bold text-purple-300 mb-2 uppercase">Legend</h3>
              <div className="text-xs text-purple-200 space-y-1">
                <p>• <span className="text-cyan-300">Size</span>: Fish dimensions</p>
                <p>• <span className="text-green-300">Speed</span>: Movement velocity</p>
                <p>• <span className="text-red-300">Health</span>: Hit points</p>
                <p>• <span className="text-yellow-300">Damage</span>: Attack power</p>
              </div>
            </div>
          </div>

          {/* Central Fish Card */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative bg-gradient-to-br from-cyan-900/40 to-purple-900/40 backdrop-blur-sm rounded-2xl p-8 border-4 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.4)] w-full max-w-2xl">
              {/* Fish Name and Level */}
              <div className="text-center mb-6">
                <h2 className="text-5xl font-bold text-white uppercase tracking-wider drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]">
                  {selectedFish.name}
                </h2>
                <p className="text-2xl text-cyan-300 mt-2 font-semibold">LV 1</p>
              </div>

              {/* Fish Sprite */}
              <div className="relative h-64 flex items-center justify-center mb-6 bg-black/30 rounded-lg border-2 border-cyan-400/30">
                {selectedFish.sprite && (
                  <div className="relative w-48 h-48">
                    <Image
                      src={selectedFish.sprite}
                      alt={selectedFish.name}
                      fill
                      className="object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              {/* Fish Description */}
              <p className="text-center text-lg text-blue-200 mb-6 italic">
                {selectedFish.description}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-cyan-900/40 rounded-lg p-4 border-2 border-cyan-500/40">
                  <div className="text-xs text-cyan-300 uppercase mb-1">Size</div>
                  <div className="text-2xl font-bold text-white">{selectedFish.stats.size}</div>
                </div>
                <div className="bg-green-900/40 rounded-lg p-4 border-2 border-green-500/40">
                  <div className="text-xs text-green-300 uppercase mb-1">Speed</div>
                  <div className="text-2xl font-bold text-white">{selectedFish.stats.speed}</div>
                </div>
                <div className="bg-red-900/40 rounded-lg p-4 border-2 border-red-500/40">
                  <div className="text-xs text-red-300 uppercase mb-1">Health</div>
                  <div className="text-2xl font-bold text-white">{selectedFish.stats.health}</div>
                </div>
                <div className="bg-yellow-900/40 rounded-lg p-4 border-2 border-yellow-500/40">
                  <div className="text-xs text-yellow-300 uppercase mb-1">Damage</div>
                  <div className="text-2xl font-bold text-white">{selectedFish.stats.damage}</div>
                </div>
              </div>

              {/* Primary Essence Type */}
              <div className="text-center mt-4">
                <span className="inline-block bg-cyan-600/40 px-4 py-2 rounded-full border-2 border-cyan-400/50 text-cyan-200 text-sm uppercase font-semibold">
                  Essence: {selectedFish.essenceTypes[0]?.type || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Carousel */}
        <div className="mb-8">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border-4 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 uppercase tracking-wide text-center">
              Available Fish
            </h3>
            <div className="flex gap-4 justify-center items-center">
              {unlockedFish.map((fish) => (
                <button
                  key={fish.id}
                  onClick={() => handleSelectFish(fish.id)}
                  className={`relative w-32 h-32 rounded-lg border-4 transition-all transform hover:scale-105 ${
                    selectedFishId === fish.id
                      ? 'border-cyan-400 bg-cyan-900/60 shadow-[0_0_25px_rgba(34,211,238,0.6)] scale-105'
                      : 'border-cyan-700/50 bg-cyan-900/30 hover:border-cyan-500'
                  }`}
                  aria-label={`Select ${fish.name}`}
                >
                  {fish.sprite && (
                    <Image
                      src={fish.sprite}
                      alt={fish.name}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2 text-xs text-white text-center">
                    {fish.name}
                  </div>
                </button>
              ))}
              
              {/* Show locked slots for visual balance */}
              {unlockedFish.length < 4 && (
                Array.from({ length: 4 - unlockedFish.length }).map((_, i) => (
                  <div
                    key={`locked-${i}`}
                    className="relative w-32 h-32 rounded-lg border-4 border-gray-700/50 bg-gray-900/30 flex items-center justify-center"
                  >
                    <div className="text-4xl text-gray-600">🔒</div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2 text-xs text-gray-500 text-center">
                      LOCKED
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-6 justify-center">
          <button
            onClick={handleBack}
            className="group relative bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-12 rounded-lg text-xl uppercase tracking-wider transition-all transform hover:scale-105 border-4 border-gray-500/50 shadow-[0_0_20px_rgba(75,85,99,0.4)] hover:shadow-[0_0_30px_rgba(75,85,99,0.6)]"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Back</span>
            <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          
          <button
            onClick={handleDive}
            className="group relative bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold py-4 px-12 rounded-lg text-xl uppercase tracking-wider transition-all transform hover:scale-105 border-4 border-red-400/50 shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)]"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Dive</span>
            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
