/**
 * Fish Selection Screen Component
 * Clean design with animated fish preview over biome background
 * Uses shared fish-renderer for consistent display across the game
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loadPlayerState } from '@/lib/game/player-state';
import { getPlayableCreaturesFromLocal } from '@/lib/storage/local-fish-storage';
import { clearRunState } from '@/lib/game/run-state';
import { loadFishSprite, drawFishWithDeformation } from '@/lib/rendering/fish-renderer';
import type { Creature } from '@/lib/game/types';

// Biome to background color mapping (fallback gradients)
const BIOME_COLORS: Record<string, { top: string; bottom: string }> = {
  shallow: { top: '#1e90ff', bottom: '#006994' },
  deep: { top: '#1a365d', bottom: '#0d1b2a' },
  deep_sea: { top: '#0f172a', bottom: '#020617' },
  abyssal: { top: '#0c0a1d', bottom: '#000000' },
  tropical: { top: '#06b6d4', bottom: '#0e7490' },
  polluted: { top: '#4a5568', bottom: '#1a202c' },
};

export default function FishSelectionScreen() {
  const router = useRouter();
  const [selectedFishId, setSelectedFishId] = useState<string>('');
  const [selectedFish, setSelectedFish] = useState<Creature | null>(null);
  const [playableFish, setPlayableFish] = useState<Creature[]>([]);
  const [loading, setLoading] = useState(true);
  const [biomeBackground, setBiomeBackground] = useState<string | null>(null);

  // Canvas refs for animated preview
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement | null>(null);
  const animTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  // Load fish data
  useEffect(() => {
    const loadData = async () => {
      loadPlayerState();
      const localFish = getPlayableCreaturesFromLocal();

      try {
        const response = await fetch('/api/list-creatures?playable=true');
        const data = await response.json();

        if (data.success && data.creatures?.length > 0) {
          const combinedFish = [...data.creatures];
          localFish.forEach(local => {
            if (!data.creatures.find((f: Creature) => f.id === local.id)) {
              combinedFish.push(local);
            }
          });
          setPlayableFish(combinedFish);
          setSelectedFishId(combinedFish[0].id);
          setSelectedFish(combinedFish[0]);
        } else if (localFish.length > 0) {
          setPlayableFish(localFish);
          setSelectedFishId(localFish[0].id);
          setSelectedFish(localFish[0]);
        }
      } catch {
        if (localFish.length > 0) {
          setPlayableFish(localFish);
          setSelectedFishId(localFish[0].id);
          setSelectedFish(localFish[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update selected fish when ID changes
  useEffect(() => {
    if (selectedFishId && playableFish.length > 0) {
      const fish = playableFish.find(f => f.id === selectedFishId);
      if (fish) setSelectedFish(fish);
    }
  }, [selectedFishId, playableFish]);

  // Load sprite and biome background when selected fish changes
  useEffect(() => {
    if (!selectedFish?.sprite) return;

    // Load fish sprite using shared renderer (handles chroma key removal)
    loadFishSprite(selectedFish.sprite).then(processedSprite => {
      spriteRef.current = processedSprite;
    }).catch(err => {
      console.error('Failed to load fish sprite:', err);
    });

    // Load biome background
    const loadBiomeBackground = async () => {
      try {
        const biome = selectedFish.biomeId || 'shallow';
        const response = await fetch(`/api/list-assets?type=background&biome=${biome}`);
        const data = await response.json();

        if (data.success && data.assets?.length > 0) {
          const bgUrl = data.assets[0].url;
          setBiomeBackground(bgUrl);

          // Preload background image
          const bgImg = new window.Image();
          bgImg.crossOrigin = 'anonymous';
          bgImg.onload = () => {
            backgroundImageRef.current = bgImg;
          };
          bgImg.src = bgUrl;
        } else {
          setBiomeBackground(null);
          backgroundImageRef.current = null;
        }
      } catch {
        setBiomeBackground(null);
        backgroundImageRef.current = null;
      }
    };

    loadBiomeBackground();
  }, [selectedFish]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size if needed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const height = rect.height;

    // Clear and draw background
    ctx.clearRect(0, 0, width, height);

    if (backgroundImageRef.current) {
      // Draw biome background with blur
      ctx.save();
      ctx.filter = 'blur(3px)';
      const img = backgroundImageRef.current;
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;

      let drawW, drawH, drawX, drawY;
      if (imgAspect > canvasAspect) {
        drawH = height;
        drawW = height * imgAspect;
        drawX = (width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = width;
        drawH = width / imgAspect;
        drawX = 0;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Slight overlay for contrast
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // Fallback gradient
      const biome = selectedFish?.biomeId || 'shallow';
      const colors = BIOME_COLORS[biome] || BIOME_COLORS.shallow;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, colors.top);
      gradient.addColorStop(1, colors.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw animated fish with same deformation as in-game
    if (spriteRef.current) {
      animTimeRef.current += 0.06;
      const fishSize = Math.min(width, height) * 0.45;
      drawFishWithDeformation(
        ctx,
        spriteRef.current,
        width / 2,
        height / 2,
        fishSize,
        animTimeRef.current,
        true,
        { intensity: 1.0 }
      );
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [selectedFish]);

  // Start/stop animation
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate]);

  const handleBack = () => router.push('/');

  const handleDive = () => {
    clearRunState();
    sessionStorage.setItem('selected_fish_id', selectedFishId);
    router.push('/game');
  };

  if (loading || !selectedFish) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-cyan-300 text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="text-center py-4 bg-black/50">
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wider">
          SELECT YOUR FISH
        </h1>
      </div>

      {/* Main Preview Area - Animated Fish over Biome Background */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Fish Name Overlay */}
        <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {selectedFish.name}
          </h2>
          <p className="text-lg md:text-xl text-cyan-300 mt-1 font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            LV 1
          </p>
        </div>

        {/* Stats Overlay - Bottom of preview */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
            <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-1 border border-cyan-500/50">
              <span className="text-xs text-cyan-300">SIZE</span>
              <span className="text-lg font-bold text-white ml-2">{selectedFish.stats.size}</span>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-1 border border-green-500/50">
              <span className="text-xs text-green-300">SPD</span>
              <span className="text-lg font-bold text-white ml-2">{selectedFish.stats.speed}</span>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-1 border border-red-500/50">
              <span className="text-xs text-red-300">HP</span>
              <span className="text-lg font-bold text-white ml-2">{selectedFish.stats.health}</span>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-1 border border-yellow-500/50">
              <span className="text-xs text-yellow-300">DMG</span>
              <span className="text-lg font-bold text-white ml-2">{selectedFish.stats.damage}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fish Carousel - Compact */}
      <div className="bg-black/80 p-3">
        <div className="flex gap-2 justify-center items-center overflow-x-auto pb-1">
          {playableFish.map((fish) => (
            <button
              key={fish.id}
              onClick={() => setSelectedFishId(fish.id)}
              className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 transition-all flex-shrink-0 ${selectedFishId === fish.id
                ? 'border-cyan-400 bg-cyan-900/60 shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-110'
                : 'border-gray-600 bg-gray-800/50 hover:border-cyan-500'
                }`}
            >
              {fish.sprite && (
                <Image
                  src={fish.sprite}
                  alt={fish.name}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-4 justify-center p-4 bg-black/50">
        <button
          onClick={handleBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-lg uppercase tracking-wider transition-all border-2 border-gray-500"
        >
          Back
        </button>
        <button
          onClick={handleDive}
          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg text-lg uppercase tracking-wider transition-all border-2 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
        >
          Dive
        </button>
      </div>
    </div>
  );
}
