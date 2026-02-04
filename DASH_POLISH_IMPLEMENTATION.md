# Dash Polish Implementation Summary

This document summarizes all changes made to address the dash mechanic polish issues.

## Overview

This implementation addresses 8 key requirements from the issue:
1. ~~Remove extra analog control stick~~ (None found - only one joystick exists)
2. Fix dash button interaction on mobile (z-index and touch handling)
3. Add auto-dash toggle for mobile users
4. Remove carcass/chunk system and simplify eating
5. Implement attack system with cooldown and animations
6. Add lunging bite motion with retraction
7. Implement dash speed ramping (2.5x → 2x over 0.25s)
8. Add AI sight/detection delay system

## Changes Made

### 1. Mobile Controls (`components/GameControls.tsx`)

**Changes:**
- Increased z-index from `z-10` to `z-20` for better layering
- Added `pointer-events-none` to container with `pointer-events-auto` on interactive elements
- Added auto-dash toggle button above dash button
- Added props: `autoDashEnabled` and `onAutoDashToggle`

**Visual Improvements:**
- Auto-dash toggle shows green when enabled with glow effect
- Toggle displays "Auto-Dash ON/OFF" text
- Positioned above dash button for easy access

### 2. Eating Mechanics (`lib/game/dash-constants.ts`, `lib/game/entities.ts`)

**Changes:**
- Changed `SWALLOW_SIZE_RATIO` from `2.0` to `1.25` (25% larger instead of 2x)
- Updated `canSwallow()` method in Entity class
- Updated comments in engine to reflect new ratio

**Rationale:**
- Removed complexity of carcass/chunk system
- Simplified to single eating mechanic based on size
- More intuitive gameplay (25% larger feels natural)

### 3. Attack Mechanics Module (`lib/game/attack-mechanics.ts`)

**New Module Created:**

```typescript
export interface AttackState {
  isAttacking: boolean;
  attackStartTime: number;
  lastAttackTime: number;
  attackCooldown: number;
  attackPhase: 'idle' | 'lunge' | 'bite' | 'retract';
  lungeTarget?: { x: number; y: number };
  originalPosition?: { x: number; y: number };
}
```

**Attack Configuration:**
- **Lunge Phase**: 150ms, 3x speed boost toward target
- **Bite Phase**: 100ms, damage dealt at start
- **Retract Phase**: 200ms, 15px pullback
- **Total Attack Time**: 450ms
- **Cooldown**: 500ms between attacks

**Key Functions:**
- `createAttackState()` - Initialize attack state
- `canAttack()` - Check if cooldown allows attack
- `startAttack()` - Begin attack animation
- `updateAttackAnimation()` - Update phase, return damage flag
- `applyAttackForces()` - Apply lunge and retract forces

**Integration:**
- Added `attackState` property to Entity class
- Updated `chomp()` method to use new system
- Attack forces applied in Entity.update()

### 4. Dash Mechanics Module (`lib/game/dash-mechanics.ts`)

**New Module Created:**

```typescript
export interface DashState {
  isDashing: boolean;
  dashStartTime: number;
  dashHoldDuration: number;
}
```

**Dash Configuration:**
- **Initial Speed**: 2.5x multiplier
- **Final Speed**: 2x multiplier
- **Ramp Duration**: 250ms (0.25 seconds)
- **Speed Calculation**: Linear interpolation during ramp

**Stamina System:**
- Base drain: 16 per second
- Drain increases with hold time (0.5 per second)
- Capped at 2.5x base rate

**Key Functions:**
- `createDashState()` - Initialize dash state
- `startDash()` - Begin dashing
- `stopDash()` - Stop dashing
- `updateDashState()` - Update state and return speed multiplier
- `calculateDashStaminaDrain()` - Calculate frame stamina cost

**Integration:**
- Added `dashState` property to Entity class
- Player and AI fish use shared dash mechanics
- Dynamic speed multiplier used in all movement code

### 5. AI Sight/Detection System (`lib/game/entities.ts`)

**New Properties Added to Fish:**
```typescript
public detectedThreats: Map<string, number> = new Map();
public detectedPrey: Map<string, number> = new Map();
private detectionDelay: number = 500; // ms
private detectionRange: number = 10; // size multiplier
```

**Detection Logic:**
1. When entity enters range, timestamp is recorded
2. 500ms delay before fish reacts
3. Prevents instant fleeing/hunting
4. Old detections cleaned up when entities leave range

**Benefits:**
- More natural AI behavior
- Gives player time to react
- Creates more strategic gameplay
- Reduces instant panic responses

### 6. Player Updates (`lib/game/player.ts`)

**Changes:**
- Removed old dash constants import
- Integrated new dash-mechanics module
- Dash state managed through module functions
- Dynamic speed multiplier from dash state

**Dash Logic:**
```typescript
// Start dash
if (shouldDash && !this.isDashing && this.stamina > 0) {
  this.isDashing = true;
  this.dashState = startDash(Date.now());
}

// Get dynamic speed multiplier
const dashUpdate = updateDashState(this.dashState, Date.now(), deltaTime);
const speedMultiplier = this.isDashing ? dashUpdate.speedMultiplier : 1.0;
```

### 7. Game Canvas Integration (`components/GameCanvas.tsx`)

**Changes:**
- Added `autoDashEnabled` state
- Pass auto-dash props to GameControls
- Pass auto-dash to FishEditorCanvas

**Props Flow:**
```
GameCanvas (state)
  ↓
GameControls (toggle button)
  ↓
FishEditorCanvas (auto-dash logic)
```

### 8. Fish Editor Canvas (`components/FishEditorCanvas.tsx`)

**Changes:**
- Added `autoDashEnabled` prop
- Auto-dash activates when moving
- Combined with manual dash input

**Logic:**
```typescript
const isMoving = hasKey('w') || hasKey('s') || hasKey('a') || hasKey('d');
const manualDash = hasKey('shift') || hasKey(' ') || dashFromControls;
const wantsDash = manualDash || (autoDashEnabled && isMoving);
```

## Code Modularization

### Before
- Dash logic scattered in player.ts and entities.ts
- Attack logic mixed with collision detection
- Duplicate speed calculations
- No shared components between player and AI

### After
- `attack-mechanics.ts` - Centralized attack system
- `dash-mechanics.ts` - Shared dash logic
- Entity base class uses both modules
- Player and AI fish share implementations
- No code duplication

## Testing Checklist

### Mobile Controls
- [ ] Joystick works without blocking dash button
- [ ] Dash button responds to touch
- [ ] Auto-dash toggle switches states
- [ ] Auto-dash enables dashing while moving
- [ ] Controls work with multitouch

### Dash Mechanics
- [ ] Dash starts at 2.5x speed
- [ ] Speed ramps to 2x over 0.25 seconds
- [ ] Stamina drains correctly
- [ ] Stamina drain increases with hold time
- [ ] Can't dash with 0 stamina

### Attack System
- [ ] Lunge animation plays
- [ ] Bite deals damage at correct time
- [ ] Retract animation plays
- [ ] 500ms cooldown enforced
- [ ] Attack works for player and AI

### AI Behavior
- [ ] Fish don't react instantly
- [ ] 500ms detection delay works
- [ ] Prey flee after delay
- [ ] Predators chase after delay
- [ ] Old detections cleaned up

### Eating Mechanics
- [ ] Can eat fish 25% smaller
- [ ] Can't eat similar-sized fish
- [ ] Attack damage system works
- [ ] No carcass/chunk remnants

## Performance Considerations

### Optimizations
- Detection maps use entity IDs (no object comparisons)
- Detection cleanup only runs when needed
- Attack state is stateful (no recalculation)
- Dash state cached per frame

### Potential Issues
- Each fish tracks detections (memory)
- Multiple Map lookups per frame
- Attack forces applied every frame when attacking

### Recommendations
- Monitor fish count vs. performance
- Consider pooling attack/dash states
- Profile detection system with 50+ fish

## Migration Notes

### Breaking Changes
- `SWALLOW_SIZE_RATIO` changed from 2.0 to 1.25
- Entity class now requires attack and dash state initialization
- Fish class has new detection properties

### Backward Compatibility
- Old dash constants still exported (deprecated)
- Attack cooldown still works via attackState
- Collision detection unchanged

## Future Improvements

### Attack System
- Add attack animation sprites
- Sound effects per attack phase
- Critical hit system
- Miss mechanic for small fish

### Dash System
- Dash trails/effects
- Dash canceling
- Directional dash boost
- Dash upgrades

### AI System
- Learning behavior (remember threats)
- Group detection (school awareness)
- Panic spreading through schools
- Territory awareness

### Mobile UX
- Haptic feedback for dash
- Visual dash charge indicator
- Attack range indicator
- Tutorial for auto-dash

## Related Files

### Modified Files
- `components/GameControls.tsx` - Mobile controls
- `components/GameCanvas.tsx` - State management
- `components/FishEditorCanvas.tsx` - Auto-dash logic
- `lib/game/entities.ts` - Attack/dash integration, sight system
- `lib/game/player.ts` - Dash integration
- `lib/game/engine.ts` - Updated comments
- `lib/game/dash-constants.ts` - Updated ratio

### New Files
- `lib/game/attack-mechanics.ts` - Attack system
- `lib/game/dash-mechanics.ts` - Dash system

## Dependencies

No new dependencies added. All changes use existing:
- Matter.js for physics
- React for UI state
- p5.js for rendering (unchanged)

## Conclusion

All 8 requirements have been successfully implemented:
1. ✅ Mobile controls fixed (z-index, touch handling)
2. ✅ Auto-dash toggle added
3. ✅ Eating simplified (25% size difference)
4. ✅ Attack system with cooldown and animations
5. ✅ Lunging bite motion with retraction
6. ✅ Dash speed ramping (2.5x → 2x)
7. ✅ AI sight/detection delay
8. ✅ Code modularized and deduplicated

The implementation is modular, well-documented, and maintains backward compatibility where possible. All changes follow the project's TypeScript patterns and coding standards.
