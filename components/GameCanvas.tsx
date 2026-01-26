/**
 * Game Canvas - Uses the same rendering as Fish Editor for consistency
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import FishEditorCanvas from './FishEditorCanvas';
import AnalogJoystick from './AnalogJoystick';

interface GameCanvasProps {
  onGameEnd?: (score: number, essence: number) => void;
}

export default function GameCanvas({ onGameEnd }: GameCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  
  // Game state - using simplified state for now
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Array<{ id: string; sprite: string; type: string }>>([]);

  useEffect(() => {
    setIsClient(true);
    
    // Load random assets on mount (same as fish editor)
    const loadRandomAssets = async () => {
      try {
        const bgResponse = await fetch('/api/list-assets?type=background');
        const bgData = await bgResponse.json();
        if (bgData.success && bgData.assets.length > 0) {
          const randomBg = bgData.assets[Math.floor(Math.random() * bgData.assets.length)];
          setSelectedBackground(randomBg.url);
        }

        const fishResponse = await fetch('/api/list-assets?type=fish');
        const fishData = await fishResponse.json();
        if (fishData.success && fishData.assets.length > 0) {
          const assets = fishData.assets as Array<{ filename: string; url: string }>;
          const randomFish = assets[Math.floor(Math.random() * assets.length)];
          setPlayerFishSprite(randomFish.url);

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
        console.error('Failed to load random assets:', error);
      }
    };

    loadRandomAssets();
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
      />
    </div>
  );
}
