# Bug Fix: Blocking Analog Joystick Removed

## Issue
The FishEditorCanvas component was rendering an on-touch AnalogJoystick that appeared anywhere on the screen when touched. This joystick had z-index 20, which conflicted with the GameControls (also z-index 20), causing it to block the dash button and auto-dash toggle on mobile devices.

## Root Cause
FishEditorCanvas had two purposes:
1. **Edit Mode**: Testing fish sprites in a playground environment (needs its own analog joystick)
2. **Game Mode**: Actual gameplay (should use GameControls for input)

The component was always rendering its AnalogJoystick regardless of mode, causing overlap in game mode.

## Solution
Added conditional rendering to only show the AnalogJoystick when NOT in game mode:

```tsx
{/* Only show analog joystick in edit mode (not game mode, as GameControls provides controls) */}
{!gameMode && (
  <div style={{ pointerEvents: paused ? 'none' : 'auto', position: 'absolute', inset: 0, zIndex: 20 }}>
    <AnalogJoystick onChange={handleJoystickChange} mode="on-touch" disabled={paused} />
  </div>
)}
```

## Result

### Before Fix
- **Edit Mode**: AnalogJoystick appears on touch ✅ (correct)
- **Game Mode**: AnalogJoystick appears on touch ❌ (wrong - blocks GameControls)

### After Fix
- **Edit Mode**: AnalogJoystick appears on touch ✅ (correct)
- **Game Mode**: AnalogJoystick does NOT appear ✅ (correct - GameControls handles input)

## Mobile Controls Layout (After Fix)

```
┌─────────────────────────────────────┐
│                                     │
│          Game Canvas                │
│                                     │
│                                     │
└─────────────────────────────────────┘
  ┌────┐                      ┌──────┐
  │ 🕹️ │                      │Auto  │
  │    │                      │ON/OFF│
  └────┘                      └──────┘
  Joystick                    ┌──────┐
  (bottom-left)               │ DASH │
                              │      │
                              └──────┘
                              Dash Button
                              (bottom-right)
```

No overlapping controls - dash button is now fully accessible!

## Files Modified
- `components/FishEditorCanvas.tsx` - Added `!gameMode` condition to AnalogJoystick rendering

## Commit
- e15f986: "Remove blocking analog joystick in game mode - only show in edit mode"
