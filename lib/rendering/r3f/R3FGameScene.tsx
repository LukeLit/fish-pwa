/**
 * R3FGameScene - Root scene component for the R3F rendering layer
 * Composes background, carcasses, chunks, entities, and UI layers
 */
'use client';

import { CameraController } from './CameraController';
import { BackgroundLayer } from './BackgroundLayer';
import { CarcassesLayer } from './CarcassesLayer';
import { ChunksLayer } from './ChunksLayer';
import { EntityLayer } from './EntityLayer';

export function R3FGameScene() {
  return (
    <>
      <CameraController />
      <BackgroundLayer />
      <CarcassesLayer />
      <ChunksLayer />
      <EntityLayer />
    </>
  );
}
