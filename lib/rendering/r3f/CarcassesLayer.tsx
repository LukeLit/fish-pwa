/**
 * CarcassesLayer - Renders carcass entities as textured planes
 */
'use client';

import { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameContext } from './GameContext';
import { getCarcassSprite } from '@/lib/game/carcass';
import type { CarcassEntity } from '@/lib/game/canvas-state';

interface CarcassMesh {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  texture: THREE.CanvasTexture | null;
}

function createCarcassMesh(c: CarcassEntity): CarcassMesh {
  const sprite = getCarcassSprite();
  const texture = sprite ? new THREE.CanvasTexture(sprite) : null;
  if (texture) texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    color: 0x503c3c,
    transparent: true,
    opacity: c.opacity * 0.8,
    side: THREE.DoubleSide,
  });
  if (texture) {
    material.map = texture;
    material.color.setHex(0xffffff);
  }
  const aspect = sprite && sprite.width && sprite.height
    ? sprite.height / sprite.width
    : 0.6;
  const w = c.size;
  const h = c.size * aspect;
  const geometry = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geometry, material);
  return { mesh, material, texture };
}

function updateCarcassMesh(c: CarcassEntity, cm: CarcassMesh) {
  const now = performance.now();
  const phase = (c.bobPhase ?? 0) + (now / 4200) * Math.PI * 2;
  const bobY = Math.sin(phase * 1.1) * 4;
  const rotation = Math.sin(phase * 0.4) * 0.12;
  // Game uses Y-down; Three.js uses Y-up — negate Y
  cm.mesh.position.set(c.x, -(c.y + bobY), 0);
  cm.mesh.rotation.z = rotation;
  cm.material.opacity = c.opacity * 0.8;
}

export function CarcassesLayer() {
  const { gameStateRef } = useGameContext();
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<string, CarcassMesh>>(new Map());

  useLayoutEffect(() => {
    return () => {
      meshesRef.current.forEach((cm) => {
        cm.mesh.geometry.dispose();
        cm.material.dispose();
        cm.texture?.dispose();
      });
      meshesRef.current.clear();
    };
  }, []);

  useFrame(() => {
    const state = gameStateRef.current;
    const group = groupRef.current;
    if (!state || !group) return;

    const carcasses = state.carcasses ?? [];
    const activeIds = new Set(carcasses.map((c) => c.carcassId));

    for (const c of carcasses) {
      let cm = meshesRef.current.get(c.carcassId);
      if (!cm) {
        cm = createCarcassMesh(c);
        meshesRef.current.set(c.carcassId, cm);
        group.add(cm.mesh);
      }
      updateCarcassMesh(c, cm);
    }

    meshesRef.current.forEach((cm, id) => {
      if (!activeIds.has(id)) {
        group.remove(cm.mesh);
        cm.mesh.geometry.dispose();
        cm.material.dispose();
        cm.texture?.dispose();
        meshesRef.current.delete(id);
      }
    });
  });

  return <group ref={groupRef} />;
}
