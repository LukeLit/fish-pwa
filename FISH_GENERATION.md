# Fish Generation System

> **NEW**: Use the [Fish Editor](./FISH_EDITOR.md) from the main menu for live AI asset testing with a playable scene!

## Current Status: AI Sprite & Background Generation

The game uses **Vercel AI Gateway** with multiple model options:
- **Google Imagen 4.0 Fast** (Recommended - fast and reliable)
- **Google Imagen 4.0** (Higher quality, slower)
- **Black Forest Labs Flux 2 Pro** (Alternative option)

## Setup

1. Get your Vercel AI gateway key (starts with `vck_`)
2. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=your_vercel_gateway_key_here
   ```
3. Restart dev server

## How It Works

### Modular Prompt System
- Prompts are built from reusable chunks defined in:
  - `docs/MODULAR_PROMPT_SYSTEM.md`
  - `docs/ART_STYLE_PROMPT_CHUNKS.md`
  - `docs/VISUAL_MOTIFS.md`
- Core implementation lives in:
  - `lib/ai/prompt-chunks.ts` – shared style/format/biome/essence/ability chunks
  - `lib/ai/prompt-builder.ts` – `composeFishPrompt()` to turn fish data into a final string
  - `lib/ai/fish-sprite-service.ts` – uses modular prompts when `fishData` is provided
- Each fish contributes:
  - `descriptionChunks`: modular descriptive phrases
  - `visualMotif`: high-level visual theme
  - `essence` + `EssenceData.visualChunks`: visual flavor tied to currencies

### AI Asset Generation
- Supports multiple models through Vercel AI Gateway
- Generates both fish sprites and underwater backgrounds
- Returns base64 encoded images directly
- Uses a cache key derived from the composed prompt to avoid regenerating identical fish
- Falls back to procedural generation if API fails

### Dev Tools Features
- Model selection (Imagen Fast/Standard, Flux)
- Editable prompts for fish and backgrounds
- Real-time preview with composite view
- Save individual assets or composited image
- Background removal challenge (manual trimming needed)

### Procedural Fallback
- `FishGenerator` class creates algorithmic fish shapes
- Used when AI is disabled or fails
- Works offline, costs $0

## Fish Types

1. **Prey Fish** - Small, swift, greenish
2. **Predator Fish** - Large, aggressive, sharp teeth
3. **Mutant Fish** - Bizarre features, glowing eyes

## Cost Analysis

### Google Imagen via Vercel AI Gateway (Current - Recommended)
- ✅ **Works great according to user testing**
- ✅ Fast generation with Imagen 4.0 Fast
- ✅ High quality results
- ✅ Works with Vercel gateway key
- ✅ Supports both sprites and backgrounds

### Black Forest Labs Flux 2 Pro (Alternative)
- ✅ **~$0.04-0.06 per image**
- ✅ High quality results comparable to DALL-E
- ✅ Can generate 17-25 unique fish for $1
- ✅ Works with existing Vercel gateway funds

### Failed Alternatives

#### Tencent Hunyuan 3D
- ❌ Region configuration nightmare
- ❌ Concurrent job limits
- ❌ Chinese UI, confusing errors
- ❌ Wasted $10-15

#### Meshy.ai 3D
- ❌ Killed free tier ($120/year minimum)
- ❌ Wasted $5

**Total wasted: ~$20** before finding Vercel AI Gateway with Imagen

## Why Sprites > 3D Models?

1. **Much cheaper**: $0.04 vs $0.50+ per model
2. **Faster**: 3-10 sec vs 1-2 min
3. **Reliable**: No region errors or subscription walls
4. **Better for 2D game**: Sprites work great in your current setup
5. **Can upgrade later**: Easy to add 3D later if needed

## Usage

### Fish Editor (Recommended)
Access from main menu: **"Fish Editor (AI Testing)"**

The Fish Editor is a full live testing environment:
- Generate fish sprites with AI (Imagen/Flux)
- Generate underwater backgrounds
- **Spawn fish into live scene** to test swimming behavior
- **Set as player fish** to test controls
- **Apply backgrounds** to test visual composition
- Save assets directly to game directories

See [FISH_EDITOR.md](./FISH_EDITOR.md) for detailed guide.

**Benefits over old DevTools:**
- See fish swimming in real-time before saving
- Test multiple fish together in a scene
- Immediately spot transparency or sizing issues
- Test backgrounds with actual gameplay
- No more guessing if a fish will look good

### In Game
AssetManager automatically handles generation and caching

## Future Options

If you want 3D later:
- **Tripo AI** - 50 free credits/month (untested)
- **CSM** - Limited free tier (untested)
- **Blender scripts** - Free but requires setup

For now, Google Imagen via Vercel AI Gateway is the sweet spot of quality/cost/reliability.
