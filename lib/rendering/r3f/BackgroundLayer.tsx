/**
 * BackgroundLayer - Parallax background image or gradient, vignette
 * Renders behind all game entities in world space
 * Uses view-sized gradient quad when no level image for guaranteed visibility
 */
'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameContext } from './GameContext';
import { RENDERING } from '@/lib/game/canvas-constants';

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
    return tex;
  }, []);

  const vignetteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 60, 128, 128, 140);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)'); // Lighter vignette
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const bgTextureRef = useRef<THREE.Texture | null>(null);
  const lastBgImageRef = useRef<HTMLImageElement | null>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(10000, 10000), []);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: gradientTexture,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    [gradientTexture]
  );

  const vignetteMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: vignetteTexture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    [vignetteTexture]
  );

  const meshRef = useRef<THREE.Mesh | null>(null);
  const vignetteRef = useRef<THREE.Mesh | null>(null);
  const viewGradientRef = useRef<THREE.Mesh | null>(null);
  const viewGradientGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  useFrame((state) => {
    const img = backgroundImageRef.current;
    const hasLevelBg = img && img.complete && img.width > 0;

    if (hasLevelBg && img !== lastBgImageRef.current) {
      bgTextureRef.current?.dispose();
      const tex = new THREE.CanvasTexture(img);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
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

    const cx = gameState.camera.effectiveX;
    const cy = -gameState.camera.effectiveY;
    const zoom = animatedZoomRef.current;
    const vw = state.size.width / zoom;
    const vh = state.size.height / zoom;

    // Large plane for level image or gradient
    if (meshRef.current) {
      meshRef.current.position.set(cx, cy, 0);
      meshRef.current.renderOrder = -1000;
      meshRef.current.visible = true;
    }

    // View-sized gradient quad (guaranteed visible when no level image)
    if (viewGradientRef.current) {
      viewGradientRef.current.visible = !hasLevelBg;
      if (!hasLevelBg) {
        viewGradientRef.current.position.set(cx, cy, -0.5);
        viewGradientRef.current.scale.set(vw, vh, 1);
        viewGradientRef.current.renderOrder = -1001;
      }
    }

    if (vignetteRef.current) {
      vignetteRef.current.position.set(cx, cy, 0.1);
      vignetteRef.current.renderOrder = -999;
    }

    if (material.map && 'offset' in material.map) {
      const parallax = RENDERING.BACKGROUND_PARALLAX_FACTOR;
      material.map.offset.set(cx * 0.0001 * parallax, cy * 0.0001 * parallax);
    }
  });

  const viewGradientMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: gradientTexture,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    [gradientTexture]
  );

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={material} position={[0, 0, 0]} />
      <mesh
        ref={viewGradientRef}
        geometry={viewGradientGeo}
        material={viewGradientMaterial}
        position={[0, 0, -0.5]}
      />
      <mesh
        ref={vignetteRef}
        geometry={geometry}
        material={vignetteMaterial}
        position={[0, 0, 0.1]}
      />
    </group>
  );
}
