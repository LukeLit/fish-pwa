# GitHub Issues for Roguelite Vertical Slice

This file contains all GitHub issues for the vertical slice implementation. Copy each issue into GitHub as a new issue.

## Epic Issue

---

### [EPIC] Roguelite Fish Game Vertical Slice Implementation

**Type**: Epic  
**Labels**: `epic`, `vertical-slice`, `roguelite`

#### Description

Implement the complete vertical slice of the roguelite fish game, covering the core gameplay loop from main menu through level progression, digestion, upgrades, and evolution.

**Goal**: Create a playable vertical slice that demonstrates the complete core loop and provides a foundation for the full game.

#### Documentation References

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md) - Complete vertical slice specification
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md) - Full game design document
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Technical specifications
- [RESEARCH_GAME_MECHANICS.md](./RESEARCH_GAME_MECHANICS.md) - Research and inspiration

#### Success Criteria

- ✅ Complete core loop from main menu to level 1-2
- ✅ All 9 steps of the gameplay flow working
- ✅ New player can understand and complete 1-2 levels
- ✅ Challenging but doable without meta upgrades
- ✅ Satisfying progression and visual feedback
- ✅ Stable 60 FPS gameplay
- ✅ Professional presentation matching DICE VADERS aesthetic

#### Implementation Phases

1. **Phase 1: Core Loop (MVP)** - Main menu, fish selection, basic gameplay, survival/death
2. **Phase 2: Progression** - Digestion, upgrade selection, evolution, level progression
3. **Phase 3: Polish** - UI/UX refinement, art generation optimization, audio, performance

---

## Sub-Issues (In Implementation Order)

---

### Issue 1: Main Menu Implementation

**Type**: Task  
**Labels**: `phase-1`, `ui`, `main-menu`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High

#### Description

Create the main menu screen with navigation to Start Game, Continue (grayed out for new players), Options, and Fish Editor.

#### Requirements

- Main menu UI matching DICE VADERS aesthetic (chunky borders, glowing effects, sci-fi style)
- Vertically stacked buttons: Start Game, Continue, Options, Fish Editor
- Dark cosmic/underwater background
- "Continue" button state management (enabled if run exists, grayed out otherwise)
- Navigation to appropriate screens

#### Acceptance Criteria

- [ ] Main menu displays with correct layout and styling
- [ ] All buttons are clickable and navigate correctly
- [ ] "Continue" button is grayed out for new players
- [ ] "Continue" button is enabled when a run exists
- [ ] Visual style matches reference aesthetic

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-1-main-menu)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#gameplay-loop)

---

### Issue 2: Fish Selection Screen

**Type**: Task  
**Labels**: `phase-1`, `ui`, `fish-selection`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 1

#### Description

Create the fish selection screen where players choose their starting fish before a run. Only "Goldfish" is unlocked for new players.

#### Requirements

- Character select style layout (inspired by DICE VADERS)
- Central large fish card displaying:
  - Fish name ("GOLDFISH")
  - Level/Stats (LV 1)
  - Large fish sprite/art
  - Fish description
  - Current stats (Size, Speed, Health, Damage)
  - Primary essence type indicator
- Bottom carousel with available fish (only Goldfish for new players)
- Left panel showing biome info ("SHALLOWS 1-1") and mission objective
- Bottom buttons: "BACK" (return to main menu) and "DIVE" (start level 1-1)
- Goldfish starter data loaded from creature definitions

#### Acceptance Criteria

- [ ] Fish selection screen displays with correct layout
- [ ] Goldfish is the only available fish for new players
- [ ] Fish stats and description display correctly
- [ ] "DIVE" button starts level 1-1
- [ ] "BACK" button returns to main menu
- [ ] Visual style matches reference aesthetic

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-3-fish-selection-menu)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#starter-creature-vertical-slice)
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#creature-enhanced-fishdata-structure)

---

### Issue 3: Run State Management System

**Type**: Task  
**Labels**: `phase-1`, `backend`, `state-management`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 2

#### Description

Implement run state management system to track current run progress, fish state, collected essence, selected upgrades, and run statistics.

#### Requirements

- Create `RunState` interface (see DATA_STRUCTURE.md)
- Implement run state storage (local storage or API)
- Run state includes:
  - Current level (e.g., "1-1")
  - Selected fish ID
  - Fish state (size, speed, health, damage, sprite)
  - Collected essence (by type)
  - Selected upgrades
  - Rerolls remaining
  - Evolution level
  - Hunger (0-100)
  - Stats (fish eaten, time survived, max size)
- Save/load run state functionality
- Initialize new run state on "Start Game"

#### Acceptance Criteria

- [ ] RunState interface matches DATA_STRUCTURE.md specification
- [ ] Run state can be saved and loaded
- [ ] New run state initializes correctly
- [ ] Run state persists across page refreshes
- [ ] "Continue" button works based on run state existence

#### Documentation

- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#run-state)
- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-2-new-run-selection)

---

### Issue 4: Level 1-1 Gameplay Core

**Type**: Task  
**Labels**: `phase-1`, `gameplay`, `core-mechanics`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 3

#### Description

Implement the core gameplay for level 1-1: player spawns as small Goldfish, can move, collect essence orbs, eat smaller fish, and avoid larger predators.

#### Requirements

- Player spawns as Goldfish (size 20, much smaller than most fish)
- Shallow biome environment (bright, colorful coral reef background)
- Movement system (analog joystick or keyboard)
- Essence orb spawning and collection
- Fish spawning (smaller, similar size, larger predators)
- Size-based collision detection (can only eat fish 20% smaller)
- Auto-eat when touching smaller fish
- Growth system (size increases when eating)
- Visual feedback for growth, essence collection

#### Acceptance Criteria

- [ ] Player spawns correctly as small Goldfish
- [ ] Movement works smoothly
- [ ] Essence orbs spawn and can be collected
- [ ] Fish spawn with appropriate sizes
- [ ] Can eat smaller fish (size check works)
- [ ] Cannot eat similar/larger fish
- [ ] Size increases when eating
- [ ] Visual feedback for all actions

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-4-level-1-1-gameplay)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#gameplay-loop)

---

### Issue 5: Hunger System

**Type**: Task  
**Labels**: `phase-1`, `gameplay`, `hunger`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 4

#### Description

Implement the hunger system that adds time pressure to each level. Hunger decreases over time and must be maintained above 0% to survive.

#### Requirements

- Hunger meter UI element (top center of HUD)
- Hunger starts at 100%
- Hunger decreases over time (~1-2% per second, adjustable)
- Eating fish restores hunger (amount based on fish size)
- Death condition: Hunger reaches 0% → Player dies (starvation)
- Visual warning at 25% hunger (screen tint, pulsing, audio cue)
- Color-coded hunger meter (green → yellow → red)
- Hunger refill feedback (particles when eating)

#### Acceptance Criteria

- [ ] Hunger meter displays and updates correctly
- [ ] Hunger decreases over time
- [ ] Eating fish restores hunger
- [ ] Death occurs when hunger reaches 0%
- [ ] Visual warning appears at 25% hunger
- [ ] Hunger meter color-coding works

#### Documentation

- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#hunger-system)
- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#gameplay-mechanics)

---

### Issue 6: Survival Conditions and Death System

**Type**: Task  
**Labels**: `phase-1`, `gameplay`, `survival`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 5

#### Description

Implement survival conditions for completing a level and death conditions with score calculation and Evo Points conversion.

#### Requirements

- Survival conditions (win level):
  - Time limit (e.g., 60-90 seconds)
  - Keep hunger above 0%
  - Optional: Eat all smaller fish
  - Optional: Reach target size (e.g., size 40)
- Death conditions:
  - Hunger reaches 0% (starvation)
  - Eaten by larger predator
- Death screen with:
  - Death message ("YOU WERE EATEN" or "YOU STARVED")
  - Final stats display (size, fish eaten, essence collected, time survived)
  - Score calculation: `(Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)`
  - Evo Points conversion: `Score / 10` (rounded down, minimum 1)
- Meta progression screen (on death):
  - Display earned Evo Points
  - Show available meta upgrades
  - Allow spending on permanent upgrades
  - "Return to Main Menu" button

#### Acceptance Criteria

- [ ] Level completes when survival conditions are met
- [ ] Death occurs when death conditions are met
- [ ] Death screen displays correctly with all stats
- [ ] Score calculation is correct
- [ ] Evo Points conversion is correct
- [ ] Meta progression screen displays and functions
- [ ] Evo Points are saved to player data

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-5-survivaldeath)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#evo-points-system)

---

### Issue 7: Digestion Sequence

**Type**: Task  
**Labels**: `phase-2`, `progression`, `digestion`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 6

#### Description

Implement the digestion sequence that converts collected essence into level-ups for each essence type after completing a level.

#### Requirements

- Digestion screen UI with:
  - Essence display (collected amounts by type)
  - Digestion animation area
  - Level-up notifications (collectible)
- Digestion formula:
  - Level-up threshold: 30 essence per level (example)
  - Level-ups: `floor(collected / threshold)`
  - Remaining essence: `collected % threshold` (carries over)
- Gamified elements:
  - Essence orbs float into "digestion" area
  - Math calculation visualization
  - Click/tap to collect each level-up separately
  - Particle effects on collection
  - Sound effects
- Process each essence type independently
- Store remaining essence for next digestion

#### Acceptance Criteria

- [ ] Digestion screen displays correctly
- [ ] Essence is converted to level-ups using correct formula
- [ ] Each level-up can be collected separately
- [ ] Remaining essence carries over correctly
- [ ] Visual feedback is satisfying
- [ ] Multiple essence types process independently

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-6-digestion-sequence)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#digestion-system)

---

### Issue 8: Upgrade Selection System

**Type**: Task  
**Labels**: `phase-2`, `progression`, `upgrades`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 7

#### Description

Implement the upgrade selection screen where players choose from 3 random upgrades after essence level-up, with limited rerolls.

#### Requirements

- Upgrade selection screen UI:
  - Header showing essence type that leveled up
  - Three upgrade cards (name, description, icon, effect preview)
  - Reroll button with remaining count display
- Randomization:
  - Select 3 random upgrades from essence category's upgrade pool
  - Weighted by rarity (common more likely)
  - No duplicates
- Reroll system:
  - Starting rerolls: 2-3 per run
  - Free (limited by count, not essence)
  - Display remaining rerolls
- Selection:
  - Click/tap upgrade card → Apply upgrade
  - Visual feedback: Upgrade "equipped"
  - Upgrade persists for entire run
- Handle multiple level-ups (process one at a time)

#### Acceptance Criteria

- [ ] Upgrade selection screen displays correctly
- [ ] 3 random upgrades shown from correct category
- [ ] Reroll system works (limited rerolls)
- [ ] Upgrades can be selected and applied
- [ ] Selected upgrades persist for run
- [ ] Multiple level-ups process correctly

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-7-upgrade-selection)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#upgrade-selection-system)
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#upgradenode)

---

### Issue 9: Evolution Sequence

**Type**: Task  
**Labels**: `phase-2`, `progression`, `evolution`, `ai-generation`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 8

#### Description

Implement the evolution sequence that updates fish art based on selected upgrades using AI generation.

#### Requirements

- Evolution screen with transformation animation
- Art generation:
  - Use existing fish art as base
  - Generate new image using AI (existing fish generation system)
  - Prompt includes: base fish, upgrades selected, essence type, evolution level
- Art caching:
  - Check if art exists for upgrade combination
  - Use cached version if exists
  - Generate and cache if not
  - Cache key: `{fishId}_{upgradeIds}_ev{level}`
- Evolution animation:
  - Current art → Transformation → New art
  - Duration: 2-3 seconds
  - Particle effects, glow, morphing
- Essence discard:
  - Remaining unspent essence is "discarded"
  - Visual: Essence orbs fade away
  - Message: "Unspent essence discarded"
- Update fish sprite/art in run state

#### Acceptance Criteria

- [ ] Evolution screen displays correctly
- [ ] Art generation works (or uses cached art)
- [ ] Art is cached for performance
- [ ] Evolution animation is smooth and satisfying
- [ ] Essence discard is visualized
- [ ] Fish sprite updates in run state

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-8-evolution-sequence)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#evolution-system)

---

### Issue 10: Level Progression System

**Type**: Task  
**Labels**: `phase-2`, `progression`, `levels`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: Issue 9

#### Description

Implement level progression system allowing players to continue from 1-1 to 1-2, 1-3, etc., with increasing difficulty.

#### Requirements

- Level structure: `{Biome}-{LevelNumber}` (e.g., "1-1", "1-2", "1-3")
- Difficulty scaling per level:
  - More fish spawn
  - Larger average predator size
  - Longer time limit (or higher size goal)
  - More essence orb spawns
- Level transition:
  - After completing level → Show stats → Digestion → Upgrade → Evolution → Next level
  - After death → Death screen → Evo Points → Main menu
- Run state updates:
  - Current level increments
  - Fish state persists (size, upgrades, etc.)
  - Collected essence resets (after digestion)
- Example scaling (Shallow):
  - 1-1: 10-15 fish, 60s time limit, size goal 40
  - 1-2: 15-20 fish, 75s time limit, size goal 50
  - 1-3: 20-25 fish, 90s time limit, size goal 60

#### Acceptance Criteria

- [ ] Level progression works (1-1 → 1-2 → 1-3)
- [ ] Difficulty scales correctly per level
- [ ] Run state updates correctly
- [ ] Level transitions are smooth
- [ ] Death path returns to main menu correctly

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-9-continue-to-next-level)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#level-progression-system)

---

### Issue 11: Player State and Meta Progression

**Type**: Task  
**Labels**: `phase-2`, `backend`, `meta-progression`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Medium  
**Depends on**: Issue 6

#### Description

Implement player state management and meta progression system for Evo Points and permanent upgrades.

#### Requirements

- Create `PlayerState` interface (see DATA_STRUCTURE.md)
- Player state includes:
  - Evo Points
  - Permanent essence totals
  - Meta upgrade levels
  - Unlocked fish
  - Unlocked biomes
  - Bestiary (discovered creatures)
  - High score
  - Total runs
- API endpoints:
  - `GET/POST /api/player/evo-points`
  - `POST /api/player/purchase-meta-upgrade`
  - `GET/POST /api/player/run-state`
  - `POST /api/player/calculate-score`
- Meta upgrades (examples):
  - Starting Size +5 (cost: 50 Evo Points)
  - Starting Speed +1 (cost: 40 Evo Points)
  - Essence Multiplier +10% (cost: 100 Evo Points)
  - Hunger Drain -10% (cost: 60 Evo Points)
- Save/load player state (hybrid: local + cloud sync)

#### Acceptance Criteria

- [ ] PlayerState interface matches specification
- [ ] Evo Points are saved and loaded correctly
- [ ] Meta upgrades can be purchased
- [ ] Meta upgrades affect gameplay (starting stats, etc.)
- [ ] Player state persists across sessions
- [ ] API endpoints work correctly

#### Documentation

- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#player-state)
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#evo-points-system)

---

### Issue 12: Essence System Implementation

**Type**: Task  
**Labels**: `phase-2`, `backend`, `essence`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Medium  
**Depends on**: Issue 4

#### Description

Implement the essence system with multiple essence types, collection during runs, and storage.

#### Requirements

- Essence types: Shallow, Deep Sea, Tropical, Polluted (core types)
- Essence collection:
  - Essence orbs spawn in levels
  - Creatures drop essence orbs when consumed
  - All essence types from creature are collected (no chance-based)
- Essence storage:
  - Collected essence stored in run state
  - Permanent essence stored in player state
  - Display essence totals in UI
- Essence yield formula:
  - Base yield = Creature Size × Biome Multiplier
  - Quality multiplier (Standard: 1.0x, Perfect: 1.5x, Combo: 2.0x)
  - Rarity multiplier (Common: 1.0x, Rare: 1.5x, Epic: 2.0x, Legendary: 3.0x)
- Essence orb spawning:
  - Spawn rate based on biome
  - Visual: Glowing orbs (color matches essence type)
  - Collection feedback (particles, sound)

#### Acceptance Criteria

- [ ] Essence types are defined correctly
- [ ] Essence collection works (orbs and creatures)
- [ ] Essence yield formula is correct
- [ ] Essence is stored correctly (run state and player state)
- [ ] Essence orbs spawn and can be collected
- [ ] Visual feedback is clear

#### Documentation

- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#essence-system)
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#essencetype)

---

### Issue 13: Biome System and Background Assets

**Type**: Task  
**Labels**: `phase-2`, `assets`, `biomes`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Medium  
**Depends on**: Issue 4

#### Description

Implement the biome system with base depths and modifiers, including background assets and stage elements.

#### Requirements

- Biome structure: Base depth + Modifiers
- Core biomes:
  - Shallow (starting biome)
  - Shallow + Tropical
  - Medium
  - Medium + Polluted
  - Deep
- Biome data includes:
  - Background image URL
  - Stage element asset URLs
  - Lighting configuration
  - Essence orb spawn rate
  - Creature spawn rules
- Load and display:
  - Background images
  - Stage elements (coral, rocks, plants)
  - Lighting effects
- Biome definitions loaded from blob storage or local files

#### Acceptance Criteria

- [ ] Biome system structure matches specification
- [ ] Shallow biome displays correctly with background
- [ ] Stage elements render correctly
- [ ] Lighting effects work
- [ ] Biome data can be loaded from storage
- [ ] Essence orb spawn rate works per biome

#### Documentation

- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#biome-system)
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#biome)

---

### Issue 14: Creature System and Spawning

**Type**: Task  
**Labels**: `phase-2`, `gameplay`, `creatures`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Medium  
**Depends on**: Issue 4, Issue 13

#### Description

Implement the creature system with proper spawning, essence yields, and size-based interactions.

#### Requirements

- Creature data structure matches DATA_STRUCTURE.md
- Creature spawning:
  - Spawn rules (canAppearIn, spawnWeight, minDepth, maxDepth)
  - Size distribution (smaller, similar, larger)
  - Spawn rates balanced for challenge
- Essence yields:
  - Each creature provides all essence types it contains
  - Base yield calculation
  - Quality and rarity multipliers
- Creature AI:
  - Movement patterns
  - Predator behavior (chase smaller fish)
  - Prey behavior (flee from predators)
- Size-based interactions:
  - Can only eat fish 20% smaller
  - Can be eaten by fish 20% larger
  - Collision detection updates with size

#### Acceptance Criteria

- [ ] Creature data structure is correct
- [ ] Creatures spawn according to rules
- [ ] Size distribution is balanced
- [ ] Essence yields are correct
- [ ] Creature AI behaves appropriately
- [ ] Size-based interactions work correctly

#### Documentation

- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#creature-system)
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#creature-enhanced-fishdata-structure)

---

### Issue 15: UI/UX Polish and DICE VADERS Aesthetic

**Type**: Task  
**Labels**: `phase-3`, `polish`, `ui`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Medium  
**Depends on**: All Phase 1 and Phase 2 issues

#### Description

Polish all UI/UX elements to match the DICE VADERS aesthetic and ensure professional presentation.

#### Requirements

- Main menu: Chunky borders, glowing effects, sci-fi style
- Fish selection: Teal/purple borders, dark background, glowing selected fish
- Gameplay HUD: Minimal, non-intrusive, clear icons
- Digestion screen: Satisfying animations, clear math visualization
- Upgrade selection: Card-based, clear borders, hover/selection states
- Evolution screen: Dramatic transformation, particle effects
- All screens: Consistent visual style, clear hierarchy, readable text
- Transitions: Smooth between all screens
- Responsive design: Works on mobile and desktop

#### Acceptance Criteria

- [ ] All UI elements match DICE VADERS aesthetic
- [ ] Visual hierarchy is clear
- [ ] Text is readable
- [ ] Transitions are smooth
- [ ] Responsive design works
- [ ] Professional presentation

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#uiux-specifications)

---

### Issue 16: Audio Integration

**Type**: Task  
**Labels**: `phase-3`, `polish`, `audio`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Low  
**Depends on**: All Phase 1 and Phase 2 issues

#### Description

Integrate audio assets (music and SFX) throughout the game.

#### Requirements

- Music:
  - Main menu theme
  - Gameplay theme
  - Digestion sequence theme
- SFX:
  - Button clicks
  - Essence collection
  - Eating fish
  - Growth/size increase
  - Death
  - Evolution transformation
  - Hunger warning
  - Level complete
- Audio system:
  - Volume controls
  - Music/SFX toggle
  - Smooth transitions
  - Performance optimization

#### Acceptance Criteria

- [ ] Music plays in appropriate screens
- [ ] SFX play for all actions
- [ ] Volume controls work
- [ ] Audio doesn't impact performance
- [ ] Transitions are smooth

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#art--asset-requirements)

---

### Issue 17: Performance Optimization

**Type**: Task  
**Labels**: `phase-3`, `polish`, `performance`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: Medium  
**Depends on**: All Phase 1 and Phase 2 issues

#### Description

Optimize game performance to achieve stable 60 FPS and smooth gameplay.

#### Requirements

- Frame rate: Target 60 FPS
- Fish count: Optimize for 20-30 fish on screen
- Particle effects: Efficient rendering
- Art loading: Async loading, caching
- State management: Efficient updates
- Memory management: Prevent leaks
- Profiling: Identify and fix bottlenecks

#### Acceptance Criteria

- [ ] Stable 60 FPS during gameplay
- [ ] No frame drops with 20-30 fish
- [ ] Particle effects don't impact performance
- [ ] Art loads efficiently
- [ ] No memory leaks
- [ ] Smooth gameplay on target devices

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#technical-requirements)

---

### Issue 18: Testing and Bug Fixes

**Type**: Task  
**Labels**: `phase-3`, `testing`, `bug-fixes`  
**Epic**: [EPIC] Roguelite Fish Game Vertical Slice Implementation  
**Priority**: High  
**Depends on**: All other issues

#### Description

Comprehensive testing of the vertical slice and fixing all bugs.

#### Requirements

- Test all 9 steps of the core loop
- Test edge cases:
  - Very short runs
  - Very long runs
  - Multiple level-ups
  - Multiple rerolls
  - Death at various points
- Test state persistence:
  - Run state saves/loads correctly
  - Player state persists
  - Continue button works
- Test performance:
  - Frame rate
  - Memory usage
  - Loading times
- Fix all bugs found
- Balance testing:
  - Difficulty without meta upgrades
  - Progression feels good
  - Essence yields are balanced

#### Acceptance Criteria

- [ ] All core loop steps work correctly
- [ ] Edge cases are handled
- [ ] State persistence works
- [ ] Performance is acceptable
- [ ] No critical bugs
- [ ] Game is balanced

#### Documentation

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#success-criteria)

---

## Issue Dependencies Graph

```
Issue 1 (Main Menu)
  └─> Issue 2 (Fish Selection)
      └─> Issue 3 (Run State)
          └─> Issue 4 (Level 1-1 Gameplay)
              ├─> Issue 5 (Hunger System)
              ├─> Issue 12 (Essence System)
              └─> Issue 13 (Biome System)
                  └─> Issue 14 (Creature System)
              └─> Issue 5 (Hunger System)
                  └─> Issue 6 (Survival/Death)
                      ├─> Issue 11 (Player State)
                      └─> Issue 7 (Digestion)
                          └─> Issue 8 (Upgrade Selection)
                              └─> Issue 9 (Evolution)
                                  └─> Issue 10 (Level Progression)

Phase 3 (Polish):
  Issue 15 (UI/UX Polish) - Depends on all Phase 1 & 2
  Issue 16 (Audio) - Depends on all Phase 1 & 2
  Issue 17 (Performance) - Depends on all Phase 1 & 2
  Issue 18 (Testing) - Depends on all issues
```

---

## Notes for Creating Issues

1. Copy each issue markdown into GitHub as a new issue
2. Set the appropriate labels
3. Link sub-issues to the epic issue
4. Set dependencies where specified
5. Assign priorities (High/Medium/Low)
6. Reference documentation files in each issue
7. Use checkboxes in acceptance criteria for tracking
