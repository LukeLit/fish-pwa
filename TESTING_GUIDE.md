# Testing Guide - Vertical Slice (Issues 13-18)

## Test Environment Setup

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000`

2. **Clear Browser State (for fresh testing):**
   - Open DevTools → Application → Local Storage
   - Clear all `fish_game_*` keys
   - Refresh page

## Test Cases

### 1. Main Menu (Meta Hub)

**Test: Initial State**
- [ ] Menu displays title "FISH ODYSSEY"
- [ ] "Start Game" button is visible and clickable
- [ ] "Continue" button is disabled/grayed out (no active run)
- [ ] How to Play section is visible
- [ ] Vertical Slice notice is displayed

**Test: Navigation**
- [ ] Click "Start Game" → navigates to Fish Selection
- [ ] Back button returns to main menu

---

### 2. Fish Selection Screen

**Test: Display**
- [ ] Shows available starter fish (Goldfish)
- [ ] Fish preview renders correctly
- [ ] Fish stats display (Size, Speed, Health, Damage)
- [ ] Essence type badge shows "Shallow"

**Test: Selection**
- [ ] Click Goldfish → highlights with cyan border
- [ ] "Start Run" button becomes enabled
- [ ] Click "Start Run" → navigates to game

**Test: Back Navigation**
- [ ] "Back" button returns to main menu
- [ ] No run state is created until "Start Run" is clicked

---

### 3. Gameplay - Level 1-1 (60 seconds)

**Test: Biome and Background**
- [ ] Shallow biome background loads (gradient blue)
- [ ] Coral and seaweed stage elements render at bottom
- [ ] Parallax effect works (background moves slower than player)
- [ ] Lighting tint applies (bright overlay)

**Test: Player Controls**
- [ ] WASD / Arrow keys move player fish
- [ ] Touch controls work on mobile (analog joystick)
- [ ] Player fish animates (tail wag, body deformation)
- [ ] Player stays within world bounds

**Test: Creature Spawning**
- [ ] Fish spawn near player (200-600px away)
- [ ] Multiple creature types appear (tiny, small, medium, predator)
- [ ] Spawn weights respected (more tiny fish than large predators)
- [ ] Fish AI moves naturally (random wandering)
- [ ] Max 50 entities at once

**Test: Essence Orbs**
- [ ] Essence orbs spawn periodically (every ~6 seconds with 0.5 spawn rate)
- [ ] Orbs are cyan colored (shallow essence)
- [ ] Orbs float and can be collected
- [ ] Collection shows "+X Shallow" floating text

**Test: Eating Mechanics**
- [ ] Can eat fish smaller than player (green fish turn into food)
- [ ] Cannot eat fish larger than player (red fish damage player)
- [ ] Size comparison is visually clear (color coding)
- [ ] Eating fish increases player size
- [ ] Score increases when eating

**Test: Hunger System**
- [ ] Hunger bar visible in HUD (top-left)
- [ ] Hunger decreases over time
- [ ] Low hunger shows red warning tint and vignette
- [ ] Eating fish restores hunger
- [ ] Hunger reaching 0 triggers death (starvation)

**Test: HUD Display**
- [ ] Timer counts down from 60 seconds
- [ ] Score displays and updates
- [ ] Hunger bar visible and updates
- [ ] Current level shown (1-1)

**Test: FPS Counter**
- [ ] Press F key → FPS counter appears (top-right)
- [ ] Click "FPS" button → toggles counter
- [ ] FPS displays ~60 (or current frame rate)
- [ ] Counter updates smoothly

**Test: Level Completion (60s timer expires)**
- [ ] Timer reaches 0
- [ ] Game transitions to Digestion Screen

---

### 4. Digestion Screen

**Test: Display**
- [ ] Shows essence collected breakdown (Shallow: X)
- [ ] Shows total essence count
- [ ] "Digesting..." animation or progress indicator
- [ ] Chunky cyan border (DICE VADERS aesthetic)

**Test: Level-Up Detection**
- [ ] If essence ≥ 10 for any type → level-up triggered
- [ ] Shows level-up announcement for each essence type
- [ ] Multiple level-ups stack (if shallow reached 20+)

**Test: Continue Flow**
- [ ] "Continue" button becomes enabled after animation
- [ ] Click "Continue" → proceeds to Upgrade Selection (if level-up) or Evolution

---

### 5. Upgrade Selection Screen

**Test: Display**
- [ ] Shows 3 random upgrades from appropriate tree (Shallow)
- [ ] Each upgrade shows:
  - Name and description
  - Impact level indicator
  - Cost in essence
  - Effects preview
- [ ] Rerolls remaining counter displays (3/3)
- [ ] Purple gradient background with chunky borders

**Test: Selection**
- [ ] Click upgrade card → highlights
- [ ] Click again → confirms selection
- [ ] Upgrade is applied to run state
- [ ] If more level-ups → shows next upgrade selection
- [ ] If no more level-ups → transitions to Evolution Screen

**Test: Reroll**
- [ ] Click "Reroll" button → generates 3 new upgrades
- [ ] Rerolls counter decrements (2/3, 1/3, 0/3)
- [ ] Reroll button disabled when 0 rerolls remain
- [ ] Rerolls persist across level-ups in same run

**Test: Edge Cases**
- [ ] All rerolls used → can only select from current options
- [ ] Multiple level-ups → processes all sequentially
- [ ] Same upgrade doesn't appear twice in same selection

---

### 6. Evolution Screen

**Test: Display**
- [ ] Shows current evolution level
- [ ] Shows run stats (Size, Fish Eaten, Time Survived, Essence)
- [ ] "Your fish is evolving!" message
- [ ] Evolution animation or visual effect
- [ ] Gradient background with borders

**Test: Continue**
- [ ] "Continue" button proceeds to next level (1-2)
- [ ] Run state is saved with evolution level incremented

---

### 7. Level 1-2 (75 seconds)

**Test: Difficulty Scaling**
- [ ] Timer is 75 seconds (15s longer than 1-1)
- [ ] More fish spawn (15 vs 10 in 1-1)
- [ ] Spawn interval slightly faster
- [ ] Player keeps stats from previous level
- [ ] Upgrades still active

**Test: Progression**
- [ ] Can complete level normally
- [ ] Digestion screen shows cumulative essence
- [ ] Level-ups calculated from total essence

---

### 8. Level 1-3 (90 seconds)

**Test: Final Level**
- [ ] Timer is 90 seconds
- [ ] Maximum fish spawn (20)
- [ ] Difficulty is highest in vertical slice
- [ ] Completing 1-3 should be challenging but achievable

---

### 9. Death - Eaten by Predator

**Test: Trigger**
- [ ] Collide with fish significantly larger than player
- [ ] Player health drops below 0 or instant death
- [ ] Game transitions to Death Screen

**Test: Death Screen Display**
- [ ] Shows "YOU WERE EATEN" message
- [ ] Red border and glow effect
- [ ] Displays final stats:
  - Size
  - Fish Eaten
  - Essence Collected
  - Time Survived
- [ ] Calculates score: `(Size × 10) + (Fish Eaten × 5) + (Time × 2) + (Essence × 3)`
- [ ] Calculates Evo Points: `Score / 10` (min 1)
- [ ] Shows Evo Points awarded
- [ ] Shows total Evo Points

**Test: Return to Menu**
- [ ] "Return to Menu" button → navigates to main menu
- [ ] Run state is cleared (localStorage)
- [ ] "Continue" button on menu is disabled again
- [ ] Evo Points are saved to player state

---

### 10. Death - Starvation

**Test: Trigger**
- [ ] Hunger reaches 0
- [ ] Game transitions to Death Screen

**Test: Death Screen Display**
- [ ] Shows "YOU STARVED" message
- [ ] Yellow border and glow effect
- [ ] Same stats display as eaten death
- [ ] Score and Evo Points calculated

---

### 11. Continue Run (State Persistence)

**Test: Save and Resume**
- [ ] Start a run (level 1-1)
- [ ] Complete level 1-1 → Digestion screen
- [ ] Close browser tab or refresh page
- [ ] Reopen game
- [ ] "Continue" button is now enabled on main menu
- [ ] Click "Continue" → resumes from Digestion screen
- [ ] All state preserved (essence, upgrades, level)

**Test: Mid-Level Refresh**
- [ ] Start level 1-1
- [ ] Play for 30 seconds (don't finish)
- [ ] Refresh page
- [ ] "Continue" might restart level (expected behavior)
- [ ] Run state persists (essence from previous levels)

---

### 12. Edge Cases and Bugs

**Test: Multiple Level-Ups**
- [ ] Collect 30+ shallow essence in one level
- [ ] Triggers multiple level-ups (e.g., levels 1, 2, 3)
- [ ] Upgrade selection appears 3 times sequentially
- [ ] Evolution screen shows final evolution level

**Test: No Essence Collected**
- [ ] Complete level without collecting any essence
- [ ] Digestion screen shows 0 essence
- [ ] No level-up triggered
- [ ] Proceeds directly to Evolution screen

**Test: All Rerolls Used**
- [ ] Use all 3 rerolls in first upgrade selection
- [ ] Reroll button disabled
- [ ] Must select from current options
- [ ] Subsequent level-ups have 0 rerolls (per-run limit)

**Test: Spawn Limit**
- [ ] Check entity count doesn't exceed 50
- [ ] Spawning stops when limit reached
- [ ] Spawning resumes when entities die/despawn

**Test: World Bounds**
- [ ] Player cannot move beyond world edges
- [ ] Fish don't spawn outside bounds
- [ ] Essence orbs clamp to bounds

**Test: Performance**
- [ ] Monitor FPS with counter (should be ~60)
- [ ] No significant lag with 50 entities
- [ ] Smooth animations and movement

---

## Known Issues (Document if Found)

### Critical Bugs
- None found during implementation

### Minor Issues
- Font loading fails in build (network-dependent, use fallback)
- Background images might not load offline (PWA behavior)

### Limitations (By Design)
- Only Shallow biome implemented (vertical slice scope)
- Only 6 creature types (sufficient for testing)
- No audio (Issue 16 skipped)
- No meta upgrade tree UI (post-vertical slice)

---

## Success Criteria

**Vertical Slice is Complete When:**
- [ ] All 12 test sections pass
- [ ] Player can complete levels 1-1, 1-2, 1-3
- [ ] Core loop works: Play → Digest → Upgrade → Evolve → Repeat
- [ ] Death screen triggers correctly (starved or eaten)
- [ ] State persistence works (continue run)
- [ ] Performance is acceptable (≥30 FPS)
- [ ] UI is consistent (DICE VADERS aesthetic)

---

## Manual Testing Checklist

### Quick Smoke Test (5 minutes)
1. Start game → Fish Selection → Start Run
2. Play level 1-1 for 60 seconds
3. Complete Digestion screen
4. Select upgrade (if level-up)
5. View Evolution screen
6. Start level 1-2
7. Verify everything works

### Full Test Run (20 minutes)
1. Test all main menu buttons
2. Complete levels 1-1, 1-2, 1-3
3. Test starvation death (don't eat)
4. Test eaten death (collide with large fish)
5. Test state persistence (refresh mid-run)
6. Test reroll mechanics
7. Test multiple level-ups
8. Check FPS counter
9. Verify all UI screens

### Edge Case Testing (10 minutes)
1. No essence run
2. Max rerolls test
3. Multiple level-ups
4. World bounds test
5. Spawn limit test

---

## Automated Testing (Future)

**Recommended Test Framework:** Jest + React Testing Library

**Priority Test Coverage:**
1. Run state management (create, save, load, clear)
2. Upgrade selection logic (random, weighted, no duplicates)
3. Essence calculation (level-ups, totals)
4. Score calculation (death screen)
5. Spawn weight distribution
6. Biome data loading

**Integration Tests:**
1. Complete game loop (start → level → digest → upgrade → evolve)
2. Death flows (starved, eaten)
3. State persistence across sessions

---

## Performance Benchmarks

**Target FPS:** 60 FPS
**Acceptable FPS:** ≥30 FPS
**Entity Count:** Max 50 (configurable)
**World Size:** 4000×4000 pixels

**Performance Notes:**
- FPS counter uses 60-frame rolling average
- Browser tab throttling affects FPS when inactive
- Mobile performance may vary (test on target devices)

---

## Browser Compatibility

**Tested Browsers:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

**Known Issues:**
- Safari may have canvas performance differences
- iOS requires user interaction for audio (not implemented yet)
- PWA install prompt varies by browser

---

## Reporting Bugs

**Bug Report Template:**
```
Title: [Brief description]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected Behavior: [What should happen]
Actual Behavior: [What actually happens]
Environment:
- Browser: [Chrome 120]
- OS: [Windows 11]
- Device: [Desktop / Mobile]
Screenshots/Logs: [If available]
```

---

## Next Steps After Testing

1. Fix critical bugs found
2. Balance difficulty (essence yields, spawn rates, hunger drain)
3. Polish animations and transitions
4. Add audio (Issue 16 - post-vertical slice)
5. Implement meta upgrade tree UI
6. Add more biomes (Deep Sea, Tropical, etc.)
7. Expand creature roster
8. Add more upgrade varieties

---

**Last Updated:** 2025-01-27
**Test Status:** Ready for manual testing
