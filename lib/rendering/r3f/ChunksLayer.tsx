/**
 * ChunksLayer - Renders collectible chunks (meat + essence) as textured planes
 */
'use client';

import { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameContext } from './GameContext';
import { getChunkSprite, getChunkColor } from '@/lib/game/essence-chunks';
import type { ChunkEntity } from '@/lib/game/canvas-state';

const CHUNK_LIFETIME = 30_000;
const CHUNK_FADE_DURATION = 2_000;

function parseColor(hexOrName: string): number {
  if (hexOrName.startsWith('#')) {
    return parseInt(hexOrName.slice(1), 16);
  }
  const color = getChunkColor(hexOrName);
  return parseInt(color.slice(1), 16);
}

interface ChunkMesh {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  texture: THREE.CanvasTexture | null;
}

function createChunkMesh(chunk: ChunkEntity): ChunkMesh {
  const spriteKey =
    chunk.chunkKind === 'meat'
      ? 'meat'
      : `essence_${chunk.essenceType ?? 'shallow'}`;
  let sprite = getChunkSprite(spriteKey);
  if (!sprite && chunk.chunkKind === 'essence') {
    sprite = getChunkSprite('essence_shallow');
  }
  const texture = sprite ? new THREE.CanvasTexture(sprite) : null;
  const color = chunk.chunkKind === 'meat'
    ? parseColor(getChunkColor('meat'))
    : parseColor(chunk.essenceType ?? 'shallow');
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });
  if (texture) {
    material.map = texture;
    material.color.setHex(0xffffff);
  }
  const aspect = sprite && sprite.width && sprite.height
    ? sprite.height / sprite.width
    : 1;
  const w = chunk.size;
  const h = chunk.size * aspect;
  const geometry = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geometry, material);
  return { mesh, material, texture };
}

function updateChunkMesh(chunk: ChunkEntity, cm: ChunkMesh) {
  const now = performance.now();
  const age = now - chunk.spawnTime;
  let alpha = 1;
  const fadeStart = CHUNK_LIFETIME - CHUNK_FADE_DURATION;
  if (age > fadeStart) {
    alpha = Math.max(0, 1 - (age - fadeStart) / CHUNK_FADE_DURATION);
  }
  const phase = (chunk.bobPhase ?? 0) + (now / 2000) * Math.PI * 2;
  const bobY = Math.sin(phase * 1.2) * 3;
  const rotation = Math.sin(phase * 0.5) * 0.15;
  // Game uses Y-down; Three.js uses Y-up — negate Y
  cm.mesh.position.set(chunk.x, -(chunk.y + bobY), 0);
  cm.mesh.rotation.z = rotation;
  cm.material.opacity = alpha;
}

export function ChunksLayer() {
  const { gameStateRef } = useGameContext();
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<string, ChunkMesh>>(new Map());

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

    const chunks = state.chunks ?? [];
    const activeIds = new Set(chunks.map((c) => c.chunkId));

    for (const chunk of chunks) {
      let cm = meshesRef.current.get(chunk.chunkId);
      if (!cm) {
        cm = createChunkMesh(chunk);
        meshesRef.current.set(chunk.chunkId, cm);
        group.add(cm.mesh);
      }
      updateChunkMesh(chunk, cm);
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
