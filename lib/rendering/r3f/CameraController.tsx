/**
 * CameraController - Orthographic camera synced to game state
 * Converts 2D world coordinates to screen space for the R3F scene
 */
'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useGameContext } from './GameContext';

export function CameraController() {
  const { gameStateRef, animatedZoomRef } = useGameContext();

  useFrame((state) => {
    const state_ = gameStateRef.current;
    if (!state_) return;

    const zoom = animatedZoomRef.current;
    const { width, height } = state.size;
    const halfW = width / 2 / zoom;
    const halfH = height / 2 / zoom;

    const cam = state.camera as THREE.OrthographicCamera;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.zoom = 1;
    // Game uses Y-down (canvas coords); Three.js uses Y-up — negate Y
    const cx = state_.camera.effectiveX;
    const cy = -state_.camera.effectiveY;
    cam.position.set(cx, cy, 1000);
    cam.lookAt(cx, cy, 0);
    cam.updateProjectionMatrix();
  });

  return (
    <OrthographicCamera
      makeDefault
      position={[0, 0, 1000]}
      near={0.1}
      far={10000}
    />
  );
}
