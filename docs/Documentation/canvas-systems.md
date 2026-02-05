# Canvas game systems

Overview of the systems that power the playable canvas in the Fish Editor: game loop, rendering, spawn sync, input, and related modules.

## Architecture

- **`FishEditorCanvas`** (`components/FishEditorCanvas.tsx`) – React component that owns the canvas, refs, and UI. It wires together:
  - **Game loop** – One `useEffect` sets up the canvas, resize, input listeners, and `requestAnimationFrame`. Each frame it calls `tickGameState()` (game logic) then `renderGame()` (drawing).
  - **Spawn sync** – `useCanvasSpawnSync(spawnedFish, refs)` (from `lib/game/canvas-spawn-sync.ts`) keeps the canvas fish list and spawn pool in sync with editor spawns: adds new fish, updates sprites when URL/size changes, removes fish no longer in `spawnedFish`. Runs when `spawnedFish` changes.
  - **Input** – Keyboard, joystick, zoom (wheel/pinch), and pan (when paused) are handled by `InputManager`; the component attaches listeners and passes input state into the tick.

- **`lib/game/`** – Game logic and shared state:
  - **`canvas-state.ts`** – `CanvasGameState`: player, fish list, camera, particles, spawn pool, caches, and game-mode fields. Single mutable object stored in a ref.
  - **`canvas-constants.ts`** – Centralized constants (physics, AI, camera, spawn, UI, collision, animation, rendering, stamina, art).
  - **`canvas-game-loop.ts`** – **Game loop tick.** `tickGameState(params)` runs one frame of game logic: delta time and pause tracking, game/level init and timer, dash and stamina, player movement (joystick/keyboard), chomp phase, hunger (and starvation), fish–fish and player–fish collision (eating, KO, stamina battles), particle decay, game-mode respawn from spawn pool, player bounds, score/stats callbacks, AI (predator chase, prey flee, KO drift), fish bounds and opacity/lifecycle, dash multi-entity particles, camera target, and removal of despawned fish. Takes `state`, `input`, `options`, `playerCreature`, `callbacks` (e.g. `onReloadPlayerSprite` for growth-stage sprite reload), and `helpers`. Returns `false` if the loop should stop (game over or level complete).
  - **`canvas-renderer.ts`** – `renderGame(options)`: draws background, fish, particles, and UI overlays from current state and options.
  - **`canvas-input.ts`** – `InputManager`: keys, joystick, wantsDash, zoom target/animated, and pan drag state.
  - **`canvas-physics.ts`** – Player movement and bounds; **`canvas-ai.ts`** – AI movement for prey/predator; **`canvas-collision.ts`** – Head-based collision helpers (used elsewhere; main loop uses inline collision in the tick).
  - **`canvas-stamina.ts`** – Stamina update for player and AI (dash drain, regen, KO).
  - **`canvas-config.ts`** – Base config (e.g. spawn fade duration) used by the component.
  - **`canvas-sprite-manager.ts`** – Sprite loading/cache used by the component.
  - **`canvas-spawn-sync.ts`** – **Spawn sync hook.** `useCanvasSpawnSync(spawnedFish, refs)` syncs game state fish list and spawn pool with the editor’s `spawnedFish`: spawn pool update, loadSprite helper (resolution-aware, chroma removal), per-fish add/update/remove (growth stage, resolution, lifecycle), filter fish and clear eaten set. Ref types: `gameStateRef`, `fishSpriteUrlsRef`, `spriteVersionRef`, `zoomRef`, `chromaToleranceRef`, `fishDataRef`, optional `canvasRef`.

- **`lib/rendering/`** – Drawing and assets:
  - **`fish-renderer.ts`** – Draw fish with deformation, segments, growth/resolution sprite selection, clip mode.
  - **`sprite-selector.ts`** – Centralized sprite swapping (growth stage, resolution, animation mode).
  - **`animation-sprite.ts`** – Animation sprite manager and per-entity animation state.
  - **`dash-particles.ts`** / **`multi-entity-dash-particles.ts`** – Dash trail particles.

## Data flow

1. **Props** – Background, player sprite/creature, `spawnedFish`, game/edit mode, pause, callbacks (`onGameOver`, `onLevelComplete`, `onStatsUpdate`, `onEditFish`), etc.
2. **Refs** – Props and volatile values (zoom, pause, edit mode, selected fish, etc.) are mirrored in refs so the game loop and callbacks see current values without re-running the whole effect.
3. **Spawn sync** – When `spawnedFish` changes, the sync effect updates `gameStateRef.current.spawnPool`, adds/removes/updates fish entities and sprites (including growth stage and resolution).
4. **Game loop** – Each frame: `tickGameState({ state, input, options, callbacks, helpers })` mutates `state` (player, fish, camera, particles, game mode, respawn); then `renderGame(...)` reads state and refs and draws. If `tickGameState` returns `false`, the loop stops.
5. **Rendering** – `renderGame` uses camera (effective position), zoom, and options to draw background, all fish, particles, and edit/game UI. It also fills `editButtonPositions` for click detection.

## Key behaviors

- **Camera** – In play mode, camera follows the player. When paused or in edit mode, it either follows the selected fish or stays in free pan; target is set in the tick, smoothing is applied in the component (zoom and camera lerp).
- **Collision** – Head-based hitboxes; predator/prey eating, stamina battles, and KO state are resolved in the game loop (inline in `tickGameState`).
- **Respawn** – In game mode, fish are respawned from `spawnPool` on a timer, with weighted preference for small prey; new fish use the same growth/resolution rules as the spawn sync.
- **Growth stage** – When the player (or in editor mode, any fish) crosses a size threshold, the tick can request a sprite reload via `onReloadPlayerSprite`; the component loads the growth-stage image and applies chroma removal, then assigns the result to the player sprite.

## Adding to this doc

As you extract or add systems (e.g. spawn sync hook, more collision reuse), update this file and the README so the new docs stay the single source of truth.
