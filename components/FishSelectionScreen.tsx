/**
 * Fish Selection Screen Component
 * Clean design with animated fish preview over biome background
 * Uses shared fish-renderer for consistent display across the game
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { loadPlayerState } from '@/lib/game/player-state';
import { getPlayableCreaturesFromLocal } from '@/lib/storage/local-fish-storage';
import { clearRunState } from '@/lib/game/run-state';
import { loadFishSprite, drawFishWithDeformation, getSpriteUrlForSize } from '@/lib/rendering/fish-renderer';
import {
  loadBackground,
  drawBiomeFallback,
  drawCaustics,
  type LoadedBackground,
} from '@/lib/rendering/background-renderer';
import type { Creature } from '@/lib/game/types';
import { getCreatureSizeRange } from '@/lib/game/data/creature-loader';
import { cacheBust } from '@/lib/utils/cache-bust';

function sortFishBySize(creatures: Creature[]) {
  return [...creatures].sort((a, b) => {
    const sizeA = a.metrics?.base_meters ?? (a.stats?.size ?? 60) / 100;
    const sizeB = b.metrics?.base_meters ?? (b.stats?.size ?? 60) / 100;
    return sizeA - sizeB;
  });
}

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
  const backgroundRef = useRef<LoadedBackground | null>(null);

  // Embla carousel - dragFree enables proper momentum on fast swipes (snap mode was rubber-banding)
  const scrollToIndexRef = useRef<number | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    dragFree: true, // Momentum scroll - swipes work; without this fast swipes rubber-band back
    loop: false,
    duration: 35,
  });

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
          const sorted = sortFishBySize(combinedFish);
          setPlayableFish(sorted);
          setSelectedFishId(sorted[0].id);
          setSelectedFish(sorted[0]);
        } else if (localFish.length > 0) {
          const sorted = sortFishBySize(localFish);
          setPlayableFish(sorted);
          setSelectedFishId(sorted[0].id);
          setSelectedFish(sorted[0]);
        }
      } catch {
        if (localFish.length > 0) {
          const sorted = sortFishBySize(localFish);
          setPlayableFish(sorted);
          setSelectedFishId(sorted[0].id);
          setSelectedFish(sorted[0]);
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

  // Load sprite and biome background when selected fish changes (growth-stage aware)
  useEffect(() => {
    if (!selectedFish?.sprite) return;

    const size = selectedFish.stats?.size ?? 60;
    const spriteUrl = getSpriteUrlForSize(selectedFish, size);

    loadFishSprite(spriteUrl).then(processedSprite => {
      spriteRef.current = processedSprite;
    }).catch(err => {
      console.error('Failed to load fish sprite:', err);
    });

    // Load biome background using shared renderer
    const loadBiomeBackground = async () => {
      try {
        const biome = selectedFish.biomeId || 'shallow';
        const response = await fetch(`/api/list-assets?type=background&biome=${biome}`);
        const data = await response.json();

        if (data.success && data.assets?.length > 0) {
          const bgUrl = data.assets[0].url;
          setBiomeBackground(bgUrl);

          // Load using shared background renderer (handles caching)
          const loaded = await loadBackground(bgUrl);
          backgroundRef.current = loaded;
        } else {
          setBiomeBackground(null);
          backgroundRef.current = null;
        }
      } catch {
        setBiomeBackground(null);
        backgroundRef.current = null;
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

    // Enable high-quality image smoothing for better fish rendering on mobile
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const width = rect.width;
    const height = rect.height;

    // Clear and draw background (same approach as fish-editor)
    ctx.clearRect(0, 0, width, height);

    const biome = selectedFish?.biomeId || 'shallow';

    if (backgroundRef.current) {
      const img = backgroundRef.current.image;

      // Calculate scaling to maintain aspect ratio (cover mode) - same as fish-editor
      const imgAspect = img.width / img.height;
      const screenAspect = width / height;

      let drawWidth, drawHeight;
      if (imgAspect > screenAspect) {
        // Image is wider than screen - scale by height to cover
        drawHeight = height;
        drawWidth = drawHeight * imgAspect;
      } else {
        // Image is taller than screen - scale by width to cover
        drawWidth = width;
        drawHeight = drawWidth / imgAspect;
      }

      // Center the background
      const bgX = (width - drawWidth) / 2;
      const bgY = (height - drawHeight) / 2;

      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.drawImage(img, bgX, bgY, drawWidth, drawHeight);
      ctx.restore();

      // Slight overlay for contrast
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);

      // Add caustic light rays for shallow biomes
      if (biome === 'shallow' || biome === 'shallow_tropical' || biome === 'tropical') {
        drawCaustics(ctx, width, height, animTimeRef.current, 0.15);
      }
    } else {
      // Fallback gradient using shared renderer
      drawBiomeFallback(ctx, width, height, biome);
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

  // Sync Embla selection with selectedFishId
  useEffect(() => {
    if (!emblaApi || playableFish.length === 0) return;
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap();
      const fish = playableFish[idx];
      if (fish) setSelectedFishId(fish.id);
    };
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, playableFish]);

  // When carousel settles (momentum stops), snap to nearest slide and center it
  useEffect(() => {
    if (!emblaApi || playableFish.length === 0) return;
    const onSettle = () => {
      const nearestIdx = emblaApi.selectedScrollSnap();
      const fish = playableFish[nearestIdx];
      if (fish) setSelectedFishId(fish.id);
      emblaApi.scrollTo(nearestIdx);
    };
    emblaApi.on('settle', onSettle);
    return () => {
      emblaApi.off('settle', onSettle);
    };
  }, [emblaApi, playableFish]);

  // When user CLICKS a fish, scroll carousel to it (don't fight swipe - only scroll on explicit click)
  useEffect(() => {
    if (!emblaApi || scrollToIndexRef.current === null) return;
    const idx = scrollToIndexRef.current;
    scrollToIndexRef.current = null;
    if (idx >= 0 && idx !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(idx);
    }
  }, [emblaApi, selectedFishId, playableFish]);

  const handleBack = () => router.push('/');

  const handleDive = () => {
    clearRunState();
    sessionStorage.setItem('selected_fish_id', selectedFishId);
    router.push('/game');
  };

  if (loading || !selectedFish) {
    return (
      <div className="min-h-screen dv-bg-cosmic flex items-center justify-center">
        <div className="dv-card dv-card-cyan p-8">
          <div className="text-cyan-300 text-2xl dv-title animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden dv-bg-cosmic-alt">
      {/* Full-screen background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
      />

      {/* UI Layer - positioned on top of canvas */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="text-center py-4 sm:py-6 animate-scale-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl dv-title animate-glow-pulse">
            SELECT YOUR FISH
          </h1>
        </div>

        {/* Main Preview Area - Fish Name and Stats overlays */}
        <div className="flex-1 relative pointer-events-none">
          {/* Fish Name Overlay */}
          <div className="absolute top-4 left-0 right-0 text-center animate-slide-in">
            <h2 className="text-4xl sm:text-5xl md:text-6xl dv-title">
              {selectedFish.name}
            </h2>
            <p className="text-xl sm:text-2xl dv-subtitle mt-2">
              LV 1
            </p>
          </div>

          {/* Stats Overlay - Bottom of preview */}
          <div className="absolute bottom-4 left-4 right-4 animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
              <div className="dv-card-cyan px-3 sm:px-4 py-2 border-2 backdrop-blur-md bg-black/80">
                <span className="text-xs sm:text-sm text-cyan-300 font-bold">SIZE</span>
                <span className="text-xl sm:text-2xl font-bold text-white ml-2">
                  {(() => {
                    const { minMeters, maxMeters } = getCreatureSizeRange(selectedFish);
                    return `${minMeters.toFixed(1)}–${maxMeters.toFixed(1)} m`;
                  })()}
                </span>
              </div>
              <div className="px-3 sm:px-4 py-2 border-2 border-green-400 rounded-lg backdrop-blur-md bg-black/80 dv-glow-cyan">
                <span className="text-xs sm:text-sm text-green-300 font-bold">SPD</span>
                <span className="text-xl sm:text-2xl font-bold text-white ml-2">{selectedFish.stats.speed}</span>
              </div>
              <div className="px-3 sm:px-4 py-2 border-2 border-red-400 rounded-lg backdrop-blur-md bg-black/80 dv-glow-cyan">
                <span className="text-xs sm:text-sm text-red-300 font-bold">HP</span>
                <span className="text-xl sm:text-2xl font-bold text-white ml-2">{selectedFish.stats.health}</span>
              </div>
              <div className="px-3 sm:px-4 py-2 border-2 border-yellow-400 rounded-lg backdrop-blur-md bg-black/80 dv-glow-cyan">
                <span className="text-xs sm:text-sm text-yellow-300 font-bold">DMG</span>
                <span className="text-xl sm:text-2xl font-bold text-white ml-2">{selectedFish.stats.damage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fish Carousel - Embla prize-wheel style with center snap and inertia */}
        <div className="px-2 sm:px-4 py-3 animate-slide-in flex items-center gap-1" style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous fish"
            className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-900/80 hover:bg-cyan-900/60 border-2 border-cyan-500/50 hover:border-cyan-400 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-all shadow-lg z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="embla-fish flex-1 min-w-0">
            <div className="embla-fish__viewport" ref={emblaRef}>
              <div className="embla-fish__container">
                {playableFish.map((fish, idx) => (
                  <div key={fish.id} className="embla-fish__slide">
                    <button
                      type="button"
                      onClick={() => {
                        scrollToIndexRef.current = idx;
                        setSelectedFishId(fish.id);
                      }}
                      className={`relative w-full aspect-square rounded-lg border-4 transition-all duration-200 block ${selectedFishId === fish.id
                        ? 'border-cyan-400 bg-cyan-900/60 shadow-[0_0_20px_rgba(34,211,238,0.8)] scale-125'
                        : 'border-purple-600/50 bg-gray-900/80 hover:border-cyan-500 hover:scale-105'
                        }`}
                    >
                      {fish.sprite && (
                        <Image
                          src={cacheBust(getSpriteUrlForSize(fish, fish.stats?.size ?? 60))}
                          alt={`${fish.name} fish`}
                          fill
                          className="object-contain p-1 rounded-lg"
                          unoptimized
                        />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next fish"
            className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-900/80 hover:bg-cyan-900/60 border-2 border-cyan-500/50 hover:border-cyan-400 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-all shadow-lg z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-3 sm:gap-4 justify-center p-4 pb-6 sm:pb-8 pointer-events-auto animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleBack}
            className="dv-button bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border-gray-500/50 text-base sm:text-lg md:text-xl py-3 sm:py-4 px-6 sm:px-8"
            style={{ boxShadow: '0 0 20px rgba(107, 114, 128, 0.4)' }}
          >
            Back
          </button>
          <button
            onClick={handleDive}
            className="dv-button dv-button-primary text-base sm:text-lg md:text-xl py-3 sm:py-4 px-6 sm:px-8 animate-glow-pulse"
          >
            Dive
          </button>
        </div>
      </div>
    </div>
  );
}
