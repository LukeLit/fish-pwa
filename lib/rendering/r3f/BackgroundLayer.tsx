/**
 * BackgroundLayer - Parallax background image or gradient
 * Renders behind all game entities in world space.
 *
 * The plane is dynamically sized to the current camera view (+ a small margin
 * for parallax). This ensures the texture maps 1:1 to the visible area so the
 * background looks sharp instead of being zoomed into a giant oversized plane.
 */
'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameContext } from './GameContext';
import { RENDERING, WORLD_BOUNDS } from '@/lib/game/canvas-constants';

export function BackgroundLayer() {
  const { gameStateRef, backgroundImageRef, animatedZoomRef } = useGameContext();

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1e40af'); // Top - match original canvas fallback
    gradient.addColorStop(1, '#1e3a8a'); // Bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const bgTextureRef = useRef<THREE.Texture | null>(null);
  const lastBgImageRef = useRef<HTMLImageElement | null>(null);

  // Unit plane (1x1) – scaled dynamically each frame to match camera view
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: gradientTexture,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
      }),
    [gradientTexture]
  );

  const meshRef = useRef<THREE.Mesh | null>(null);

  useFrame((state) => {
    const img = backgroundImageRef.current;
    const hasLevelBg = img && img.complete && img.naturalWidth > 0;

    if (hasLevelBg && img !== lastBgImageRef.current) {
      bgTextureRef.current?.dispose();
      const tex = new THREE.Texture(img);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const maxAnisotropy = (state.gl as THREE.WebGLRenderer).capabilities?.getMaxAnisotropy?.() ?? 1;
      tex.anisotropy = Math.min(16, maxAnisotropy);
      tex.needsUpdate = true;
      material.map = tex;
      bgTextureRef.current = tex;
      lastBgImageRef.current = img;
    } else if (!hasLevelBg && bgTextureRef.current) {
      bgTextureRef.current.dispose();
      bgTextureRef.current = null;
      lastBgImageRef.current = null;
      material.map = gradientTexture;
    }

    const gameState = gameStateRef.current;
    if (!gameState) return;

    const zoom = animatedZoomRef.current;
    const { width, height } = state.size; // CSS pixels

    // View dimensions in world units (matches CameraController frustum)
    const viewW = width / zoom;
    const viewH = height / zoom;

    // Scale plane slightly larger than view to provide parallax margin
    const bgScale = RENDERING.BACKGROUND_SCALE; // 1.3
    const planeW = viewW * bgScale;
    const planeH = viewH * bgScale;

    const cx = gameState.camera.effectiveX;
    const cy = -gameState.camera.effectiveY; // Y-up for Three.js

    // Bounded parallax: background lags behind camera, clamped to margin so
    // edges never become visible.  Normalize camera position to world extents
    // so the full parallax range is used across the playable area.
    const marginX = (planeW - viewW) / 2;
    const marginY = (planeH - viewH) / 2;
    const worldRangeX = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX; // e.g. 3000
    const worldRangeY = WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY; // e.g. 2400
    const halfRangeX = worldRangeX / 2 || 1;
    const halfRangeY = worldRangeY / 2 || 1;
    const rawParallaxX = -(cx / halfRangeX) * marginX;
    const rawParallaxY = -(cy / halfRangeY) * marginY;
    const parallaxX = Math.max(-marginX, Math.min(marginX, rawParallaxX));
    const parallaxY = Math.max(-marginY, Math.min(marginY, rawParallaxY));

    if (meshRef.current) {
      meshRef.current.scale.set(planeW, planeH, 1);
      meshRef.current.position.set(cx + parallaxX, cy + parallaxY, 0);
      meshRef.current.renderOrder = -1000;
      meshRef.current.visible = true;
    }

    // Reset any stale UV offset from the old approach (texture covers full plane 0-1)
    if (material.map && 'offset' in material.map) {
      material.map.offset.set(0, 0);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={material} position={[0, 0, 0]} />
    </group>
  );
}
