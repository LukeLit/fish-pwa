# Dash Polish - Testing Guide

This guide provides step-by-step instructions for testing all the changes made in the dash polish implementation.

## Prerequisites

1. Build the project: `npm run build`
2. Start development server: `npm run dev`
3. Open browser at `http://localhost:3000/game`
4. For mobile testing, use device or Chrome DevTools mobile emulation

## Test Suite

### 1. Mobile Controls Testing

#### 1.1 Touch Controls Accessibility
**Expected Behavior:**
- Joystick on bottom-left is accessible
- Dash button on bottom-right is clickable
- No overlap or blocking

**Test Steps:**
1. Open game on mobile device or mobile emulator
2. Tap and hold joystick - verify fish moves
3. Release joystick - verify movement stops
4. Tap and hold dash button - verify "DASH" button lights up orange
5. Release dash button - verify button returns to normal
6. Simultaneously use joystick AND dash button - verify both work

**Pass Criteria:**
- ✅ Both controls respond to touch
- ✅ No visual blocking between controls
- ✅ Multitouch works (joystick + dash simultaneously)

#### 1.2 Auto-Dash Toggle
**Expected Behavior:**
- Toggle button appears above dash button
- Shows "Auto-Dash ON" when enabled
- Fish dashes automatically when moving

**Test Steps:**
1. Locate "Auto-Dash OFF" button above dash button
2. Tap toggle button
3. Verify text changes to "Auto-Dash ON" with green background
4. Move fish with joystick (without pressing dash button)
5. Observe fish speed - should be dashing
6. Stop moving - dash should stop
7. Toggle OFF - verify normal speed when moving

**Pass Criteria:**
- ✅ Toggle button is visible and clickable
- ✅ Visual feedback shows current state
- ✅ Fish dashes when moving with auto-dash ON
- ✅ Normal speed with auto-dash OFF

### 2. Dash Speed Ramping Testing

#### 2.1 Speed Burst
**Expected Behavior:**
- Dash starts at 2.5x speed
- Ramps down to 2x over 0.25 seconds
- Smooth transition (no sudden changes)

**Test Steps:**
1. Start game, position fish in open area
2. Hold dash button (Shift/Space on desktop, dash button on mobile)
3. Observe initial burst of speed (should feel fast)
4. Continue holding for 1 second
5. Notice slight slowdown but still faster than normal

**Pass Criteria:**
- ✅ Initial dash feels significantly faster
- ✅ Speed stabilizes after ~0.25 seconds
- ✅ Still faster than normal movement
- ✅ Smooth transition (no jarring speed changes)

#### 2.2 Stamina Drain Escalation
**Expected Behavior:**
- Stamina drains faster the longer dash is held
- Base rate: 16 per second
- Increases by 0.5 per second held
- Caps at 2.5x base rate

**Test Steps:**
1. Start game with full stamina bar (visible in UI)
2. Hold dash for 1 second, release
3. Note stamina decrease
4. Wait for stamina to regenerate
5. Hold dash for 5+ seconds
6. Observe faster stamina drain over time
7. Stamina should hit zero if held long enough

**Pass Criteria:**
- ✅ Stamina drains while dashing
- ✅ Drain rate increases over time
- ✅ Can't dash when stamina depleted
- ✅ Stamina regenerates when not dashing

### 3. Attack System Testing

#### 3.1 Attack Cooldown
**Expected Behavior:**
- 500ms cooldown between attacks
- Prevents spam attacks
- Allows animations to play

**Test Steps:**
1. Find a smaller fish
2. Hold dash and approach it
3. Collide with it repeatedly
4. Count attacks - should not be instant
5. Verify ~0.5 second gap between attacks

**Pass Criteria:**
- ✅ Cannot attack more than twice per second
- ✅ Cooldown feels responsive (not too long)
- ✅ Works for both player and AI fish

#### 3.2 Lunge Animation
**Expected Behavior:**
- Fish lunges toward target at 3x speed
- Lasts 150ms
- Then bites (100ms)
- Then retracts (200ms)

**Test Steps:**
1. Find a small fish
2. Hold dash and approach slowly
3. When attack triggers, observe movement:
   - Quick burst forward (lunge)
   - Brief pause (bite)
   - Slight pullback (retract)
4. Total animation ~450ms

**Pass Criteria:**
- ✅ Visible forward lunge
- ✅ Brief pause at collision point
- ✅ Slight backward motion after bite
- ✅ Animation feels natural and smooth

### 4. Eating Mechanics Testing

#### 4.1 Size Threshold
**Expected Behavior:**
- Can eat fish 25% smaller or more
- Cannot eat fish similar size
- Size comparison visible in game

**Test Steps:**
1. Start game, note player size
2. Find fish of various sizes
3. Try to eat:
   - Much smaller fish (should work)
   - Slightly smaller fish (should work if 25%+ smaller)
   - Similar-sized fish (should not work - attack instead)
   - Larger fish (should take damage)

**Pass Criteria:**
- ✅ Can eat fish that are 25%+ smaller
- ✅ Attack (not eat) fish within 25% size range
- ✅ Clear feedback when eating vs attacking

### 5. AI Sight System Testing

#### 5.1 Detection Delay
**Expected Behavior:**
- Fish don't react immediately
- 500ms delay before fleeing/hunting
- More natural behavior

**Test Steps:**
1. Start game as small fish
2. Approach a larger predator slowly
3. Observe when it starts chasing:
   - Should NOT react instantly
   - Wait ~0.5 seconds after entering range
   - Then start pursuit
4. Repeat with prey fish (you as predator)

**Pass Criteria:**
- ✅ Predators don't chase instantly
- ✅ Prey don't flee instantly
- ✅ ~500ms delay before reaction
- ✅ Behavior feels more natural

#### 5.2 Detection Cleanup
**Expected Behavior:**
- Fish forget targets when they leave range
- No memory of fish that swam away

**Test Steps:**
1. Enter predator's range, trigger detection
2. Quickly swim away before it chases
3. Swim back into range
4. Should trigger new detection (500ms delay again)

**Pass Criteria:**
- ✅ Fish forget targets that leave
- ✅ Re-detection works correctly
- ✅ No infinite tracking

### 6. Performance Testing

#### 6.1 Frame Rate with Many Fish
**Expected Behavior:**
- Smooth gameplay with 50+ fish
- Detection system doesn't lag
- Dash calculations efficient

**Test Steps:**
1. Play game until many fish spawn (50+)
2. Monitor frame rate (browser DevTools)
3. Dash around with many fish nearby
4. Observe any stuttering or lag

**Pass Criteria:**
- ✅ Maintains 60 FPS with 50+ fish
- ✅ No stuttering during dash
- ✅ Attack animations smooth
- ✅ Detection system performant

#### 6.2 Memory Usage
**Expected Behavior:**
- Detection maps don't leak memory
- Fish states properly cleaned up

**Test Steps:**
1. Play game for 5+ minutes
2. Monitor memory in DevTools
3. Watch for memory leaks (steady increase)
4. Memory should stabilize, not grow indefinitely

**Pass Criteria:**
- ✅ Memory usage stabilizes
- ✅ No continuous growth
- ✅ Fish properly removed when dead

### 7. Desktop Controls Testing

#### 7.1 Keyboard Dash
**Expected Behavior:**
- Shift or Space triggers dash
- Works same as mobile dash button

**Test Steps:**
1. Use WASD to move
2. Hold Shift while moving
3. Verify increased speed
4. Release Shift
5. Verify normal speed
6. Repeat with Space key

**Pass Criteria:**
- ✅ Shift key triggers dash
- ✅ Space key triggers dash
- ✅ Speed ramping works on keyboard
- ✅ Stamina drains correctly

### 8. Integration Testing

#### 8.1 Mobile + Desktop Combo
**Expected Behavior:**
- All controls work together
- No conflicts between input methods

**Test Steps:**
1. On desktop, use keyboard (WASD)
2. Open DevTools, enable touch simulation
3. Use virtual touch controls
4. Verify both work simultaneously

**Pass Criteria:**
- ✅ Keyboard and touch don't conflict
- ✅ Auto-dash works with keyboard
- ✅ All features accessible

#### 8.2 Gameplay Flow
**Expected Behavior:**
- All systems work together naturally
- Game feels polished and responsive

**Test Steps:**
1. Play a full game session (5+ minutes)
2. Use dash to hunt and escape
3. Trigger attacks on various fish
4. Let AI fish attack you
5. Observe overall game feel

**Pass Criteria:**
- ✅ Dash feels powerful but limited (stamina)
- ✅ Attacks feel impactful
- ✅ AI behavior feels natural
- ✅ Eating mechanics intuitive
- ✅ Overall polish level high

## Known Issues / Limitations

### Expected Behavior (Not Bugs)
1. **Stamina runs out**: This is intentional - manage stamina strategically
2. **Can't eat similar-sized fish**: This is by design - use attacks instead
3. **AI reacts after delay**: This is the new sight system - creates strategy
4. **Dash slows down**: Speed ramping is intentional - prevents infinite boost

### Potential Issues to Watch For
1. **Touch conflicts**: If joystick and dash button overlap on very small screens
2. **Memory leaks**: Detection maps growing if fish aren't properly cleaned up
3. **Attack spam**: If cooldown not working, fish can attack too fast
4. **Dash glitches**: If speed multiplier calculation has edge cases

## Reporting Issues

When reporting issues, please include:
1. Device/browser used
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots/video if possible
5. Browser console errors

## Success Metrics

The implementation is successful if:
- ✅ All mobile controls are accessible and responsive
- ✅ Dash speed ramping feels good (2.5x → 2x)
- ✅ Attack animations play smoothly
- ✅ AI behavior feels natural (not robotic)
- ✅ Eating mechanics are intuitive (25% size rule)
- ✅ Performance is good (60 FPS with 50+ fish)
- ✅ No security vulnerabilities (CodeQL clean)
- ✅ No code duplication or technical debt

## Conclusion

This implementation addresses all 8 requirements from the original issue:
1. ✅ Fixed mobile controls (no extra joystick, z-index correct)
2. ✅ Added auto-dash toggle
3. ✅ Removed carcass/chunks (simplified eating)
4. ✅ Attack system with cooldown
5. ✅ Lunging bite with retraction
6. ✅ Dash speed ramping
7. ✅ AI sight/detection delay
8. ✅ Code modularization complete

All tests should pass. If any issues are found, they should be documented and addressed before merging.
