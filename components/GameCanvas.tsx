/**
 * Game Canvas - Uses the same rendering as Fish Editor for consistency
 * Now integrated with Run State Management System
 */
'use client';

import { useEffect, useState } from 'react';
import FishEditorCanvas from './FishEditorCanvas';
import type { RunState, Creature } from '@/lib/game/types';
import { 
  loadRunState, 
  saveRunState, 
  createNewRunState,
  clearRunState 
} from '@/lib/game/run-state';
import { getCreature, DEFAULT_STARTER_FISH_ID } from '@/lib/game/data';
import { getCreaturesByBiome } from '@/lib/game/data/creatures';

interface GameCanvasProps {
  onGameEnd?: (score: number, essence: number) => void;
  onGameOver?: (stats: { score: number; cause: 'starved' | 'eaten'; size: number; fishEaten: number; essenceCollected: number; timeSurvived: number }) => void;
  onLevelComplete?: () => void;
}

export default function GameCanvas({ onGameEnd, onGameOver, onLevelComplete }: GameCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  const [runState, setRunState] = useState<RunState | null>(null);
  
  // Game state - using simplified state for now
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Creature[]>([]);
  const [levelDuration, setLevelDuration] = useState<number>(60000);
  const [currentLevel, setCurrentLevel] = useState<string>('1-1');

  useEffect(() => {
    setIsClient(true);
    
    // Initialize or load run state
    const initializeRunState = () => {
      let currentRunState = loadRunState();
      
      if (!currentRunState) {
        // No existing run, create new one with default starter fish
        currentRunState = createNewRunState(DEFAULT_STARTER_FISH_ID);
        if (!currentRunState) {
          console.error(`Failed to create new run state with fish ID: ${DEFAULT_STARTER_FISH_ID}`);
          return null;
        }
        saveRunState(currentRunState);
      }
      
      setRunState(currentRunState);
      return currentRunState;
    };
    
    // Load assets based on run state
    const loadGameAssets = async (currentRunState: RunState) => {
      try {
        // Parse level to get difficulty scaling
        const level = parseLevelString(currentRunState.currentLevel);
        setCurrentLevel(currentRunState.currentLevel);
        
        // Calculate level-based difficulty
        const duration = 60000 + (level.levelNum - 1) * 15000; // 60s, 75s, 90s
        const fishCount = 10 + (level.levelNum - 1) * 5; // 10, 15, 20
        setLevelDuration(duration);
        
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

        // Spawn prey fish based on current level using creature definitions
        const biomeCreatures = getCreaturesByBiome('shallow'); // Use shallow biome for now
        if (biomeCreatures.length > 0) {
          // Filter for prey creatures
          const preyCreatures = biomeCreatures.filter(c => c.type === 'prey');
          const pool = preyCreatures.length > 0 ? preyCreatures : biomeCreatures;
          
          // Spawn fish based on level difficulty, using creature definitions
          const spawned: Creature[] = [];
          for (let i = 0; i < fishCount; i++) {
            const creature = pool[i % pool.length];
            spawned.push(creature);
          }
          setSpawnedFish(spawned);
        }
      } catch (error) {
        console.error('Failed to load game assets:', error);
      }
    };
    
    // Helper to parse level string (e.g., "1-1" -> {biome: 1, levelNum: 1})
    const parseLevelString = (levelStr: string): { biome: number; levelNum: number } => {
      const parts = levelStr.split('-');
      if (parts.length !== 2) {
        return { biome: 1, levelNum: 1 };
      }
      return {
        biome: parseInt(parts[0], 10) || 1,
        levelNum: parseInt(parts[1], 10) || 1,
      };
    };

    const currentRunState = initializeRunState();
    if (currentRunState) {
      loadGameAssets(currentRunState);
    }
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
      {/* Level Display */}
      <div className="absolute top-4 left-4 z-40 bg-black/70 px-4 py-2 rounded-lg border border-cyan-400">
        <div className="text-cyan-400 font-bold text-lg">Level {currentLevel}</div>
      </div>
      
      <FishEditorCanvas
        background={selectedBackground}
        playerFishSprite={playerFishSprite}
        spawnedFish={spawnedFish}
        chromaTolerance={50}
        zoom={1}
        enableWaterDistortion={false}
        deformationIntensity={1}
        gameMode={true}
        levelDuration={levelDuration}
        onGameOver={(stats) => {
          clearRunState();
          if (onGameOver) {
            onGameOver(stats);
          }
        }}
        onLevelComplete={(score) => {
          // Save run state on level complete
          if (runState) {
            saveRunState(runState);
          }
          // Trigger digestion sequence instead of old flow
          if (onLevelComplete) {
            onLevelComplete();
          } else if (onGameEnd) {
            onGameEnd(score, 0);
          }
        }}
      />
    </div>
  );
}
