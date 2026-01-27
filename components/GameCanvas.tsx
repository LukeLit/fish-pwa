/**
 * Game Canvas - Uses the same rendering as Fish Editor for consistency
 * Now integrated with Run State Management System and GameHUD
 */
'use client';

import { useEffect, useState } from 'react';
import FishEditorCanvas from './FishEditorCanvas';
import GameHUD from './GameHUD';
import type { RunState } from '@/lib/game/types';
import { 
  loadRunState, 
  saveRunState, 
  createNewRunState,
  clearRunState 
} from '@/lib/game/run-state';
import { getCreature, DEFAULT_STARTER_FISH_ID } from '@/lib/game/data';

interface GameCanvasProps {
  onGameEnd?: (score: number, essence: number) => void;
}

export default function GameCanvas({ onGameEnd }: GameCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  const [runState, setRunState] = useState<RunState | null>(null);
  
  // Game state - using simplified state for now
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Array<{ id: string; sprite: string; type: string }>>([]);
  
  // HUD state
  const [score, setScore] = useState(0);
  const [playerSize, setPlayerSize] = useState(20); // Start small for Level 1-1
  const [startTime, setStartTime] = useState(Date.now());
  const [hunger, setHunger] = useState(100);

  useEffect(() => {
    setIsClient(true);
    
    // Initialize or load run state
    const initializeRunState = () => {
      let currentRunState = loadRunState();
      
      if (!currentRunState) {
        // No existing run, create new one with default starter fish (Goldfish, size 20)
        currentRunState = createNewRunState(DEFAULT_STARTER_FISH_ID);
        if (!currentRunState) {
          console.error(`Failed to create new run state with fish ID: ${DEFAULT_STARTER_FISH_ID}`);
          return null;
        }
        // Override size to 20 for Level 1-1 (small Goldfish)
        currentRunState.fishState.size = 20;
        saveRunState(currentRunState);
      }
      
      setRunState(currentRunState);
      setPlayerSize(currentRunState.fishState.size);
      setStartTime(Date.now());
      return currentRunState;
    };
    
    // Load assets based on run state
    const loadGameAssets = async (currentRunState: RunState) => {
      try {
        // Load background
        const bgResponse = await fetch('/api/list-assets?type=background');
        const bgData = await bgResponse.json();
        if (bgData.success && bgData.assets.length > 0) {
          const randomBg = bgData.assets[Math.floor(Math.random() * bgData.assets.length)];
          setSelectedBackground(randomBg.url);
        }

        // Load player fish sprite from run state
        const playerCreature = getCreature(currentRunState.selectedFishId);
        if (!playerCreature) {
          console.error(`Player creature ${currentRunState.selectedFishId} not found`);
          // Fallback to sprite from run state
          setPlayerFishSprite(currentRunState.fishState.sprite);
        } else {
          // Use sprite from run state (may have evolved)
          setPlayerFishSprite(currentRunState.fishState.sprite);
        }

        // Spawn prey fish based on current level
        const fishResponse = await fetch('/api/list-assets?type=fish');
        const fishData = await fishResponse.json();
        if (fishData.success && fishData.assets.length > 0) {
          const assets = fishData.assets as Array<{ filename: string; url: string }>;
          
          // Spawn some prey fish
          const preyCandidates = assets.filter((a) =>
            a.filename.toLowerCase().includes('prey')
          );
          const pool = preyCandidates.length >= 6 ? preyCandidates : assets;
          const defaults = [];
          for (let i = 0; i < 6; i++) {
            const pick = pool[i % pool.length];
            defaults.push({
              id: `prey_${Date.now()}_${i}`,
              sprite: pick.url,
              type: 'prey' as const,
            });
          }
          setSpawnedFish(defaults);
        }
      } catch (error) {
        console.error('Failed to load game assets:', error);
      }
    };

    const currentRunState = initializeRunState();
    if (currentRunState) {
      loadGameAssets(currentRunState);
    }
    
    // Poll for game state updates
    const interval = setInterval(() => {
      const state = loadRunState();
      if (state) {
        setPlayerSize(state.fishState.size);
        setHunger(state.hunger);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black" style={{ minHeight: '600px' }}>
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <FishEditorCanvas
        background={selectedBackground}
        playerFishSprite={playerFishSprite}
        spawnedFish={spawnedFish}
        chromaTolerance={50}
        zoom={1}
        enableWaterDistortion={false}
        deformationIntensity={1}
        gameMode={true}
        levelDuration={60000} // 60 seconds for Level 1-1
        onGameOver={(finalScore) => {
          // Clear run state on game over
          clearRunState();
          if (onGameEnd) {
            onGameEnd(finalScore, 0);
          }
        }}
        onLevelComplete={(finalScore) => {
          // Save run state on level complete
          if (runState) {
            saveRunState(runState);
          }
          setScore(finalScore);
          if (onGameEnd) {
            onGameEnd(finalScore, finalScore);
          }
        }}
      />
      
      {/* Game HUD Overlay */}
      <GameHUD
        score={score}
        playerSize={playerSize}
        levelDuration={60000}
        startTime={startTime}
        hunger={hunger}
        showTimer={true}
      />
    </div>
  );
}
