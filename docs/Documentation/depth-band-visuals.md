# Depth band visuals

Visual overlay that shows depth zones (e.g. Level 1-1, 1-2, 1-3) in the game world: gradient tint per zone, dotted boundaries, and debug labels. Used for debugging and to communicate depth to the player.

## Source of truth

- **Config:** [lib/game/data/level-config.json](../../lib/game/data/level-config.json) – `depth_bands` and `runs`. Each band has `min_meters`, `max_meters`, and optional `sub_depths`.
- **Loader:** [lib/game/data/level-loader.ts](../../lib/game/data/level-loader.ts) – `getRunConfig(runId)`, `getDepthBandRules(depthBandId)`.
- **Rendering:** [lib/game/canvas-renderer.ts](../../lib/game/canvas-renderer.ts) – depth band overlay is drawn in **world space** (before the final zoom restore) when `showDepthBandOverlay` is true.

## What is drawn

1. **Gradient tint per band**  
   For each band in the current run (e.g. shallow_run steps 1-1, 1-2, 1-3), a vertical linear gradient fill is drawn over that band’s world Y range. The gradient fades at the top and bottom of each band. Band 1-1 is lightest, 1-2 medium, 1-3 darkest (configurable alphas in the renderer).

2. **Horizontal dotted lines**  
   At each boundary between bands (and at the top/bottom of the run’s depth range), a horizontal dotted line is drawn across the world width (with margin). Style: light color, 8/8 dash pattern, 2px line width.

3. **Debug labels above each horizontal line**  
   Centered above each horizontal boundary:
   - **Level X/X** – Band id with hyphen replaced by slash (e.g. `Level 1/3`).
   - **Depth X/X** – Metric range from config (e.g. `0.5–1.2 m` from the band’s `min_meters` and `max_meters`).

4. **Vertical dotted lines (left and right)**  
   Two vertical dotted lines at the world bounds: `minX` and `maxX`, from `minY` to `maxY`. Same stroke style as the horizontal boundaries. These mark the left and right playable edges.

## World-space mapping

The overlay is drawn in **world coordinates** so it moves with the camera and correctly marks depth as the player swims up or down.

- The **run’s** depth range (min and max of all band `min_meters` / `max_meters`) is mapped linearly to the full world Y range (`WORLD_BOUNDS.minY` to `maxY`).
- Example: shallow_run 0.2–1.2 m maps to world Y from minY to maxY, so band 1-1 is near the top of the world, 1-3 spans toward the bottom.

Constants: [lib/game/canvas-constants.ts](../../lib/game/canvas-constants.ts) – `WORLD_BOUNDS` (minX, maxX, minY, maxY).

## Toggle and where it appears

- **Game (`/game`):** Always available. Toggle in the right drawer **Settings** – “Depth bands” checkbox. State lives in [components/GameCanvas.tsx](../../components/GameCanvas.tsx) and is passed to `FishEditorCanvas` as `showDepthBandOverlay` and to [components/SettingsDrawer.tsx](../../components/SettingsDrawer.tsx) for the checkbox.
- **Fish editor:** Toggle in Pause menu → Settings → Scene Controls – “Show Depth Bands”. Persisted in `localStorage` key `fish_editor_show_depth_band_overlay`. Default on.
- **Props:** `FishEditorCanvas` accepts `showDepthBandOverlay` and `runId` (e.g. `'shallow_run'`). The run’s `steps` (band ids) determine which bands are drawn.

## Related docs

- [Fish metrics and depth bands](../plans/LEVEL-REFACTOR/FISH_METRICS_AND_DEPTH_BANDS.md) – Band-fit rules and meter ranges.
- [Canvas systems](canvas-systems.md) – Where `renderGame` and the overlay fit in the canvas architecture.
