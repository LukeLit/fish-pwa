/**
 * Fish Editor - Live testing environment for AI-generated assets
 */
'use client';

export const dynamic = 'force-dynamic';
export const ssr = false;

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FishEditorCanvas from '@/components/FishEditorCanvas';
import FishEditorControls from '@/components/FishEditorControls';

export default function FishEditorPage() {
  const router = useRouter();
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [playerFishSprite, setPlayerFishSprite] = useState<string | null>(null);
  const [spawnedFish, setSpawnedFish] = useState<Array<{ id: string; sprite: string; type: string }>>([]);
  const [chromaTolerance, setChromaTolerance] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(1);
  const [enableWaterDistortion, setEnableWaterDistortion] = useState<boolean>(false);
  const [deformationIntensity, setDeformationIntensity] = useState<number>(1);

  // Load random background, player fish, and spawn default prey on mount
  useEffect(() => {
    function createDefaultPreyDataUrl(): string {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 40;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(35, 20, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(10, 20);
      ctx.lineTo(0, 8);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fill();
      return c.toDataURL('image/png');
    }

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

          const preyCandidates = assets.filter((a) =>
            a.filename.toLowerCase().includes('prey')
          );
          const pool = preyCandidates.length >= 4 ? preyCandidates : assets;
          const defaults = [];
          for (let i = 0; i < 4; i++) {
            const pick = pool[i % pool.length];
            defaults.push({
              id: `default_prey_${Date.now()}_${i}`,
              sprite: pick.url,
              type: 'prey' as const,
            });
          }
          setSpawnedFish(defaults);
        } else {
          // No saved fish: spawn 4 default prey (simple green oval) for testing
          const fallbackSprite = createDefaultPreyDataUrl();
          const defaults = [];
          for (let i = 0; i < 4; i++) {
            defaults.push({
              id: `default_prey_${Date.now()}_${i}`,
              sprite: fallbackSprite,
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

  const handleSpawnFish = (sprite: string, type: string) => {
    const newFish = {
      id: `fish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sprite,
      type,
    };
    setSpawnedFish((prev) => [...prev, newFish]);
  };

  const handleClearFish = () => {
    setSpawnedFish([]);
  };

  const handleBackToMenu = () => {
    router.push('/');
  };

  return (
    <div className="relative w-full h-screen bg-black flex overflow-hidden">
      {/* Left Panel - Controls */}
      <div className="w-80 bg-gray-900 border-r border-gray-700 overflow-y-auto flex-shrink-0">
        <FishEditorControls
          onBackToMenu={handleBackToMenu}
          onSpawnFish={handleSpawnFish}
          onClearFish={handleClearFish}
          onSetBackground={setSelectedBackground}
          onSetPlayerFish={setPlayerFishSprite}
          spawnedFishCount={spawnedFish.length}
          chromaTolerance={chromaTolerance}
          onChromaToleranceChange={setChromaTolerance}
          zoom={zoom}
          onZoomChange={setZoom}
          enableWaterDistortion={enableWaterDistortion}
          onWaterDistortionChange={setEnableWaterDistortion}
          deformationIntensity={deformationIntensity}
          onDeformationChange={setDeformationIntensity}
        />
      </div>

      {/* Right Panel - Game Canvas - Fills remaining space */}
      <div className="flex-1 relative">
        <FishEditorCanvas
          background={selectedBackground}
          playerFishSprite={playerFishSprite}
          spawnedFish={spawnedFish}
          chromaTolerance={chromaTolerance}
          zoom={zoom}
          enableWaterDistortion={enableWaterDistortion}
          deformationIntensity={deformationIntensity}
        />
      </div>
    </div>
  );
}
