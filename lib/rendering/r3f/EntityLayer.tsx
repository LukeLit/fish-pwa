/**
 * EntityLayer - Renders fish and player as textured planes with deformation animation
 * Uses drawFishWithDeformation for spine-based wave animation
 */
'use client';

import { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameContext } from './GameContext';
import { drawFishWithDeformation, getSegmentsSmooth, PLAYER_SEGMENT_MULTIPLIER } from '@/lib/rendering/fish-renderer';
import type { FishEntity, PlayerEntity } from '@/lib/game/canvas-state';

interface EntityMesh {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  texture: THREE.CanvasTexture | null;
  spriteSource: HTMLCanvasElement | null;
  /** Offscreen canvas for deformation rendering */
  deformationCanvas: HTMLCanvasElement | null;
  deformationCtx: CanvasRenderingContext2D | null;
}

function createMesh(color: string): EntityMesh {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return { mesh, material, texture: null, spriteSource: null, deformationCanvas: null, deformationCtx: null };
}

function ensureDeformationCanvas(em: EntityMesh, size: number, animatedZoom: number): void {
  const pad = size * 0.6; // Extra for wave deformation
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const resolutionScale = Math.max(2, Math.min(4, animatedZoom * dpr));
  const w = Math.ceil((size + pad) * resolutionScale);
  const h = Math.ceil((size + pad) * resolutionScale);
  if (!em.deformationCanvas || em.deformationCanvas.width < w || em.deformationCanvas.height < h) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(w, 64);
    canvas.height = Math.max(h, 64);
    em.deformationCanvas = canvas;
    em.deformationCtx = canvas.getContext('2d');
  }
}

function updateMesh(
  entity: FishEntity | PlayerEntity,
  em: EntityMesh,
  isPlayer: boolean,
  animatedZoom: number,
  deformationIntensity: number
) {
  const sprite = entity.sprite;
  const scale = entity.size;
  const rotation = entity.facingRight ? -entity.verticalTilt : entity.verticalTilt;

  if (!sprite) {
    em.material.map = null;
    em.spriteSource = null;
    em.texture?.dispose();
    em.texture = null;
    const color = isPlayer ? 0x60a5fa : (entity as FishEntity).type === 'prey' ? 0x4ade80 : 0xf87171;
    em.material.color.setHex(color);
  } else {
    const screenSize = scale * animatedZoom;
    const segments = isPlayer
      ? Math.round(getSegmentsSmooth(screenSize) * PLAYER_SEGMENT_MULTIPLIER)
      : getSegmentsSmooth(screenSize);
    const speed = Math.min(1, Math.sqrt(entity.vx ** 2 + entity.vy ** 2) / 1.5);
    const chompPhase = isPlayer && 'chompPhase' in entity ? entity.chompPhase : 0;
    const koTilt = (entity as FishEntity).lifecycleState === 'knocked_out' ? Math.PI / 2 : 0;

    ensureDeformationCanvas(em, scale, animatedZoom);
    const canvas = em.deformationCanvas!;
    const ctx = em.deformationCtx!;
    if (sprite !== em.spriteSource) {
      em.spriteSource = sprite;
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const resolutionScale = Math.max(2, Math.min(4, animatedZoom * dpr));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(resolutionScale, resolutionScale);
    drawFishWithDeformation(
      ctx,
      sprite,
      canvas.width / 2 / resolutionScale,
      canvas.height / 2 / resolutionScale,
      scale,
      entity.animTime,
      entity.facingRight,
      {
        speed,
        chompPhase,
        intensity: deformationIntensity,
        verticalTilt: entity.verticalTilt + koTilt,
        segments: segments < 2 ? 8 : segments,
      }
    );
    ctx.restore();

    if (!em.texture || em.texture.image !== canvas) {
      em.texture?.dispose();
      em.texture = new THREE.CanvasTexture(canvas);
      em.material.map = em.texture;
    }
    em.texture.needsUpdate = true;
    em.material.color.setHex(0xbbbbbb);
  }

  const opacity = 'opacity' in entity ? (entity.opacity ?? 1) : 1;
  em.material.opacity = opacity;

  // Game uses Y-down; Three.js uses Y-up — negate Y
  em.mesh.position.set(entity.x, -entity.y, 1);
  em.mesh.rotation.z = rotation;
  em.mesh.scale.set(scale, scale, 1);
}

export function EntityLayer() {
  const { gameStateRef, animatedZoomRef, deformationIntensity } = useGameContext();
  const groupRef = useRef<THREE.Group>(null);
  const entityMeshesRef = useRef<Map<string, EntityMesh>>(new Map());
  const playerMeshRef = useRef<EntityMesh | null>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const playerMesh = createMesh('#60a5fa');
    group.add(playerMesh.mesh);
    playerMeshRef.current = playerMesh;

    return () => {
      group.remove(playerMesh.mesh);
      playerMesh.mesh.geometry.dispose();
      playerMesh.material.dispose();
      playerMesh.texture?.dispose();
      playerMeshRef.current = null;
      entityMeshesRef.current.forEach((em) => {
        group.remove(em.mesh);
        em.mesh.geometry.dispose();
        em.material.dispose();
        em.texture?.dispose();
      });
      entityMeshesRef.current.clear();
    };
  }, []);

  useFrame(() => {
    const state = gameStateRef.current;
    const group = groupRef.current;
    if (!state || !group) return;

    const { player, fish } = state;
    const activeIds = new Set<string>();

    fish.forEach((f) => {
      if (f.lifecycleState === 'removed') return;
      activeIds.add(f.id);

      let em = entityMeshesRef.current.get(f.id);
      if (!em) {
        em = createMesh(f.type === 'prey' ? '#4ade80' : '#f87171');
        entityMeshesRef.current.set(f.id, em);
        group.add(em.mesh);
      }
      updateMesh(f, em, false, animatedZoomRef.current, deformationIntensity);
    });

    entityMeshesRef.current.forEach((em, id) => {
      if (!activeIds.has(id)) {
        group.remove(em.mesh);
        em.mesh.geometry.dispose();
        em.material.dispose();
        em.texture?.dispose();
        entityMeshesRef.current.delete(id);
      }
    });

    if (playerMeshRef.current) {
      const pm = playerMeshRef.current;
      if (player.lifecycleState === 'dead') {
        pm.mesh.visible = false;
      } else {
        pm.mesh.visible = true;
        updateMesh(player, pm, true, animatedZoomRef.current, deformationIntensity);
      }
    }
  });

  return <group ref={groupRef} />;
}
