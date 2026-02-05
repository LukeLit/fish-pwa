# Testing Digestion & Upgrade Selection

## Manual Test Scenarios

### Scenario 1: Normal Level Complete with Level-Ups

**Setup:**
1. Start a new game from main menu
2. Play level 1-1 normally

**Expected Flow:**
1. Collect essence by eating fish (each fish drops shallow essence)
2. Wait 60 seconds for level timer to complete
3. **Digestion Screen** appears showing:
   - Essence collected (e.g., "Shallow: 45")
   - Level-up calculation (e.g., "45 ÷ 30 = 1 Level-Up")
   - Remaining essence (e.g., "15 essence remaining")
4. Click "🎁 Level-Up +1" button to collect
5. Button changes to "✓ Collected"
6. Click "CONTINUE" button
7. **Upgrade Selection Screen** appears showing:
   - Header: "SHALLOW ESSENCE LEVEL UP!"
   - 3 random upgrade cards from shallow pool
   - Each card shows: name, description, effect, rarity (⭐)
   - Reroll button shows "(3 remaining)"
8. Hover over upgrade cards to see "▶ SELECT ◀" prompt
9. Click an upgrade to select it
10. Game returns to level 1-2 with upgrade applied

### Scenario 2: Multiple Level-Ups

**Setup:**
1. Modify localStorage to set high essence:
   ```javascript
   const runState = JSON.parse(localStorage.getItem('fish_game_run_state'));
   runState.collectedEssence = { shallow: 90 };
   localStorage.setItem('fish_game_run_state', JSON.stringify(runState));
   ```
2. Trigger level complete (wait 60 seconds or modify timer)

**Expected Flow:**
1. Digestion screen shows "90 ÷ 30 = 3 Level-Ups"
2. Three "🎁 Level-Up +1" buttons appear
3. Collect each one sequentially
4. First upgrade selection appears (for level-up 1)
5. Select upgrade
6. Second upgrade selection appears (for level-up 2)
7. Select upgrade
8. Third upgrade selection appears (for level-up 3)
9. Select upgrade
10. Return to level 1-2

### Scenario 3: No Level-Ups (Insufficient Essence)

**Setup:**
1. Start game
2. Collect minimal essence (< 30)
3. Wait for level complete

**Expected Flow:**
1. Digestion screen shows essence collected
2. Message: "Not enough essence for any level-ups"
3. "Collect 30 essence to earn a level-up!"
4. "CONTINUE" button appears immediately
5. Click to proceed to next level without upgrades

### Scenario 4: Reroll Mechanic

**Setup:**
1. Play until upgrade selection screen appears

**Expected Flow:**
1. Note the 3 upgrades shown
2. Click "🎲 REROLL (3 remaining)"
3. 3 new random upgrades appear
4. Reroll count decreases: "(2 remaining)"
5. Click reroll again → new upgrades, "(1 remaining)"
6. Click reroll again → new upgrades, "(0 remaining)"
7. Reroll button disabled: "No rerolls remaining"
8. Select an upgrade

### Scenario 5: Upgrade Stat Application

**Setup:**
1. Start game, note starting stats (check DevTools or console)
2. Complete level and select "Coral Speed" (+1 speed)

**Expected Flow:**
1. RunState.selectedUpgrades includes 'coral_speed'
2. RunState.fishState.speed increased by 1
3. Player fish moves faster in next level
4. Stats persist through levels

### Scenario 6: Death (No Digestion)

**Setup:**
1. Start game
2. Get eaten or starve

**Expected Flow:**
1. Death screen appears immediately
2. NO digestion screen
3. NO upgrade selection
4. Only death stats and return to menu

## Visual Validation

### Digestion Screen
- [ ] Gradient background (indigo → purple → blue)
- [ ] Cyan border (4px)
- [ ] "DIGESTION SEQUENCE" header in white
- [ ] Essence display with colored labels (shallow = #4a9eff)
- [ ] Level-up calculation shown clearly
- [ ] Level-up buttons pulse when active
- [ ] "CONTINUE" button appears after all collected
- [ ] Smooth transitions

### Upgrade Selection Screen
- [ ] Border color matches essence type
- [ ] "SHALLOW ESSENCE LEVEL UP!" header
- [ ] 3 cards in grid layout (responsive)
- [ ] Cards have hover effect (scale-105)
- [ ] Impact level shown with stars (⭐⭐⭐)
- [ ] Effect preview in yellow text
- [ ] Reroll button shows count
- [ ] "Click an upgrade card to select it" instruction

## Edge Cases

### Edge Case 1: Exactly 30 Essence
- Input: 30 shallow essence
- Expected: 1 level-up, 0 remaining

### Edge Case 2: Exactly 60 Essence
- Input: 60 shallow essence
- Expected: 2 level-ups, 0 remaining

### Edge Case 3: 29 Essence
- Input: 29 shallow essence
- Expected: 0 level-ups, 29 remaining, "Not enough essence" message

### Edge Case 4: Multiple Essence Types (Future)
- Input: { shallow: 45, deep_sea: 32 }
- Expected: 1 shallow level-up, 1 deep_sea level-up, both shown in sequence

### Edge Case 5: Empty Upgrade Pool
- If no upgrades available for category
- Expected: Error logged, fallback behavior

## Browser Console Tests

```javascript
// Test 1: Set high essence for testing
const runState = JSON.parse(localStorage.getItem('fish_game_run_state'));
runState.collectedEssence = { shallow: 90 };
localStorage.setItem('fish_game_run_state', JSON.stringify(runState));
console.log('Test essence set to 90 shallow');

// Test 2: Check rerolls remaining
const runState = JSON.parse(localStorage.getItem('fish_game_run_state'));
console.log('Rerolls remaining:', runState.rerollsRemaining);

// Test 3: View selected upgrades
const runState = JSON.parse(localStorage.getItem('fish_game_run_state'));
console.log('Selected upgrades:', runState.selectedUpgrades);

// Test 4: Check fish stats after upgrade
const runState = JSON.parse(localStorage.getItem('fish_game_run_state'));
console.log('Fish stats:', runState.fishState);
```

## Success Criteria

- [ ] Digestion screen appears on level complete
- [ ] Level-up calculation is correct (floor(essence / 30))
- [ ] Interactive level-up collection works
- [ ] Upgrade selection shows 3 random upgrades
- [ ] Reroll decrements counter and generates new upgrades
- [ ] Selected upgrade is added to RunState
- [ ] Stat effects are applied to fishState
- [ ] Flow proceeds to next level after selection
- [ ] Death skips digestion entirely
- [ ] DICE VADERS aesthetic is maintained
- [ ] No TypeScript errors
- [ ] No console errors during flow
- [ ] Smooth transitions between screens
