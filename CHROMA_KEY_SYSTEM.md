# Chroma Key Background Removal System

## Overview

The Fish Editor uses a **chroma key** approach to remove backgrounds from AI-generated fish sprites, similar to green screen technology used in film production.

## Why Chroma Key?

AI image generators **cannot create true transparency**. When you ask for "transparent background", they generate:
- Fake checkered patterns that look like transparency
- White backgrounds
- Light gray backgrounds

These don't actually have alpha transparency, making them impossible to composite cleanly.

## Solution: Bright Magenta (#FF00FF)

We use **bright magenta (#FF00FF)** as our chroma key color because:
1. It's highly distinctive and rare in natural fish colors
2. Easy for the AI to generate consistently
3. Simple to detect and remove programmatically
4. Standard in video production (alternative to green screen)

## How It Works

### 1. Generation Phase
All fish prompts specify: `"isolated on solid bright magenta background (#FF00FF)"`

**Example prompt:**
```
A small swift fish with greenish scales, isolated on solid bright
magenta background (#FF00FF), no other background elements, game sprite
```

### 2. Processing Phase (components/FishEditorCanvas.tsx:18)

When a fish sprite loads:
1. Image drawn to hidden canvas
2. Each pixel's color compared to magenta (#FF00FF)
3. Color distance calculated using Euclidean distance formula:
   ```
   distance = √[(R-255)² + (G-0)² + (B-255)²]
   ```
4. If distance < tolerance: pixel becomes fully transparent (alpha = 0)
5. If distance < tolerance × 1.5: pixel gets feathered edge (smooth transparency transition)

### 3. Result
Clean fish sprite with true alpha transparency, ready to composite over any background.

## Adjustable Sensitivity

**Background Removal Sensitivity Slider** (10-150):
- **Lower values (10-30)**: Precise removal, only removes exact magenta
  - Use if fish has pink/purple colors that shouldn't be removed
- **Middle values (40-60)**: Default, balanced removal
  - Good for most fish sprites
- **Higher values (70-150)**: Aggressive removal
  - Use if magenta background has slight color variations or gradients

## Color Distance Formula

```typescript
const diff = Math.sqrt(
  Math.pow(r - 255, 2) +  // Red channel difference
  Math.pow(g - 0, 2) +    // Green channel difference
  Math.pow(b - 255, 2)    // Blue channel difference
);
```

- Perfect magenta = distance 0
- Similar colors = low distance
- Different colors = high distance

## Edge Feathering

To avoid harsh cutouts, pixels near the tolerance threshold get partial transparency:

```typescript
if (diff < tolerance * 1.5) {
  // Smooth transition from opaque to transparent
  const alpha = ((diff - tolerance) / (tolerance * 0.5)) * 255;
  pixel_alpha = min(current_alpha, alpha);
}
```

This creates anti-aliased edges that blend smoothly with backgrounds.

## Prompts Using Chroma Key

### Fish Sprites
- `lib/ai/fish-sprite-service.ts:90` - Default fish prompt builder
- `components/FishEditorControls.tsx:15` - Editor fish prompts
- All specify: `"solid bright magenta background (#FF00FF)"`

### Why Not Green?

Green is too common in fish (greenish scales, algae, seaweed). Bright magenta is:
- Unnatural (rare in aquatic life)
- High contrast
- Easy to specify to AI

## Troubleshooting

### Problem: Fish has pink/purple colors being removed
**Solution**: Lower sensitivity slider (20-40)

### Problem: Magenta background not fully removed
**Solution**: Increase sensitivity slider (60-100)

### Problem: Rough, jagged edges
**Solution**: Increase tolerance slightly for better feathering

### Problem: AI generates wrong background color
**Solution**:
1. Be very explicit in prompt: `"solid bright magenta background (#FF00FF)"`
2. Try different AI model (Imagen vs Flux)
3. Regenerate until background is correct

## Technical Files

- **Chroma key removal**: `components/FishEditorCanvas.tsx:18-48`
- **Fish prompts**: `components/FishEditorControls.tsx:15-19`
- **Service prompts**: `lib/ai/fish-sprite-service.ts:90-113`
- **Tolerance UI**: `components/FishEditorControls.tsx:226-239`

## Performance

- Processing happens once on image load
- Average processing time: <50ms per sprite
- No runtime overhead (processed sprites cached as canvas elements)
- Works in real-time for live editing

## Future Improvements

Possible enhancements:
1. **Smart edge detection** - Detect fish outline first, then remove exterior
2. **Multiple chroma keys** - Allow user to pick custom color
3. **AI-powered removal** - Use ML model for sophisticated background removal
4. **Manual touch-up** - In-editor pixel painting for fine-tuning

For now, chroma key + adjustable tolerance provides excellent results for game sprites.
