# Background Quality Verification Checklist

Based on the code changes in `BackgroundLayer.tsx`, here's what should be visible at http://localhost:3000/fish-editor:

## Expected Fixes (Item 1 - Background Quality)

### 1. **Background Visibility** ✓
- **What to look for**: A blue gradient background should be visible
- **Expected**: Top color `#1e40af` (blue-700) fading to bottom `#1e3a8a` (blue-900)
- **Why**: Default gradient is created in `gradientTexture` (lines 20-34)

### 2. **Background Quality** ✓
- **What to look for**: The background should look **sharp and crisp**, not zoomed-in or blurry
- **Expected**: Smooth gradient with no pixelation or artifacts
- **Why**: 
  - Plane is now dynamically sized to camera view (not fixed 4000x4000)
  - Texture maps 1:1 to visible area (line 114: scale matches view dimensions)
  - UV coordinates reset to 0-1 range (lines 121-123)
  - High-quality filtering with anisotropic filtering up to 16x (lines 66-69)

### 3. **Parallax Effect** ✓
- **What to look for**: When you move around, background should move slightly slower than fish
- **Expected**: Subtle lag effect (bounded to prevent edges showing)
- **Why**: Parallax offset calculated based on camera position (lines 99-115)

## Other Visual Elements to Check

### 4. **Fish Visibility**
- Should see the player fish in center
- May see AI fish if they've spawned

### 5. **HUD/Overlay**
- Top: Hunger bar (green), Stamina bar (yellow/orange)
- May see timer, score, or other UI elements
- Bottom-right: Stats panel or controls

### 6. **Console Errors**
- Open DevTools (F12) → Console tab
- Look for any Three.js errors, texture loading errors, or rendering warnings

## Testing Steps

1. Navigate to http://localhost:3000/fish-editor
2. Wait 3+ seconds for full load
3. Check background appearance (gradient, sharpness)
4. Try zooming in/out (mouse wheel) - background should stay sharp
5. Move around (WASD or arrow keys) - observe parallax
6. Check console for errors

## Code Changes Summary

**File**: `lib/rendering/r3f/BackgroundLayer.tsx`

Key changes:
- ✅ Unit plane (1x1) scaled dynamically to camera view each frame
- ✅ Texture maps at native resolution (no stretching/zooming)
- ✅ Anisotropic filtering for maximum sharpness
- ✅ UV offset reset to ensure proper texture coverage
- ✅ Parallax calculation bounded to prevent edge visibility

**Result**: Background should render at full quality without zoom artifacts.
