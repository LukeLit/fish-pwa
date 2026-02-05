# Fish Editor Quick Start Guide

## 🎮 What's New

The fish editor now supports:
- ✅ Full creature metadata editing (all fields from DATA_STRUCTURE.md)
- ✅ Image AND video backgrounds
- ✅ AI video generation with Google Veo 3.1
- ✅ Biome-background associations
- ✅ Persistent storage in Vercel Blob
- ✅ Automatic localStorage fallback when offline

## 🚀 Quick Start

### 1. Access the Fish Editor

Navigate to `/fish-editor` from the main menu or directly via URL.

### 2. Three Main Tabs

#### Controls Tab
- Generate AI fish (Imagen Fast/Standard, Flux Pro)
- Generate AI backgrounds (images)
- Scene controls (zoom, water distortion, chroma key)
- Spawn/clear fish
- Set player fish

#### Fish Library Tab
- Browse all saved creatures
- Click any fish to select and edit
- View metadata: name, type, rarity, biome, essence

#### Backgrounds Tab (NEW!)
- Upload image backgrounds
- Upload video backgrounds
- Generate AI video backgrounds
- Associate backgrounds with biomes

## 📝 Creating a Complete Creature

1. **Generate or Spawn a Fish**
   - Use AI generation or spawn a fish in the scene
   
2. **Click Edit Icon**
   - Opens the edit overlay
   
3. **Fill Basic Info**
   - Name: "Crimson Predator"
   - Description: "A fierce hunter of the deep"
   - Type: Predator
   - Rarity: Rare
   - Playable: ✓ (if selectable by player)
   
4. **Select Biome**
   - Choose home biome: "Deep"
   
5. **Set Starting Stats** (with ℹ️ tooltips)
   - Size: 120
   - Speed: 3
   - Health: 50
   - Damage: 20
   
6. **Configure Essence Types**
   - Deep Sea: 30
   - Shallow: 6
   - (Set to 0 to remove)
   
7. **Set Spawn Rules**
   - Spawn Weight: 20 (lower = rarer)
   - Can Appear In: [Deep, Abyssal] ✓
   - Min Depth: 200m
   - Max Depth: 1000m
   
8. **Advanced Options** (Optional)
   - Granted Abilities: "bioluminescence, shield"
   - Unlock Requirements: "deep, abyssal"
   
9. **Save**
   - Click "Save to Game (Persistent)"
   - If blob storage configured: Saves to Vercel Blob
   - If offline: Auto-saves to localStorage

## 🎨 Managing Backgrounds

### Upload Image Background

1. Go to **Backgrounds** tab
2. Click **Image** type
3. Click "Choose Image File"
4. Select your PNG/JPG
5. Select target biome
6. Click "Save to Biome"

### Upload Video Background

1. Go to **Backgrounds** tab
2. Click **Video** type
3. Click "Choose Video File"
4. Select your MP4 file
5. Wait for upload to complete
6. Select target biome
7. Click "Save to Biome"

### Generate AI Video Background

1. Go to **Backgrounds** tab
2. Click **Video** type
3. Under "AI Video Generation"
4. Enter prompt: 
   ```
   Gentle underwater scene with coral reefs, 
   tropical fish swimming, soft sunlight filtering through water
   ```
5. Click "Generate Video with AI"
6. Wait 2-5 minutes (polls automatically)
7. When complete, select biome and save

## 🔍 Finding and Editing Creatures

1. Switch to **Fish Library** tab
2. Browse the list of saved creatures
3. Look for badges:
   - **Type**: prey/predator/mutant (colored)
   - **Rarity**: common/rare/epic/legendary
   - **Biome**: shallow/deep/etc.
   - **Playable**: blue badge
4. Click any creature to edit it
5. Make changes and save

## 💾 Storage System

### With Blob Storage (Recommended)
- Requires `BLOB_READ_WRITE_TOKEN` environment variable
- Creatures saved to `assets/creatures/{id}.json` and `.png`
- Backgrounds saved to `assets/backgrounds/`
- Biome data saved to `game-data/biomes/{id}.json`
- Supports overwrites
- Accessible across devices

### Without Blob Storage (Fallback)
- Uses browser localStorage
- Limited to 5-10MB typically
- Only accessible on same browser
- Good for offline development
- Auto-detected and used when needed

## 🎯 Best Practices

### Creating Balanced Creatures

1. **Prey Fish** (food for player):
   - Size: 40-80
   - Speed: 4-6
   - Health: 10-30
   - Damage: 1-5
   - Essence: Moderate (5-15)

2. **Predator Fish** (dangerous):
   - Size: 100-180
   - Speed: 2-4
   - Health: 40-80
   - Damage: 15-40
   - Essence: High (20-50)

3. **Mutant Fish** (special/weird):
   - Size: 60-140
   - Speed: 3-5
   - Health: 25-60
   - Damage: 8-25
   - Essence: Variable

### Essence Distribution

Each creature should grant multiple essence types:
- **Primary**: 70-80% of total
- **Secondary**: 15-25% of total
- **Tertiary**: 5-10% of total

Example for Deep Sea Predator:
- Deep Sea: 30 (primary)
- Shallow: 6 (secondary)
- Polluted: 2 (tertiary)

### Spawn Rules

Balance spawn rates:
- **Common prey**: 70-100 weight
- **Rare prey**: 40-60 weight
- **Common predators**: 30-50 weight
- **Rare predators**: 10-20 weight
- **Legendary**: 1-5 weight

## 🐛 Troubleshooting

### "Blob storage not configured"
✅ **Normal** - System is using localStorage fallback
⚠️ Set `BLOB_READ_WRITE_TOKEN` for persistent cloud storage

### "Failed to save creature"
1. Check browser console for errors
2. Try saving to local instead
3. Verify image is not too large (< 5MB)
4. Check network connection

### Creature not in library
1. Refresh the page
2. Check "Fish Library" tab
3. Look for save success message
4. Check browser console

### Video generation stuck
1. Check console for errors
2. Verify `GEMINI_API_KEY` is set
3. Wait full 5 minutes (can take time)
4. Check API quota limits

### Background not showing
1. Verify it was saved successfully
2. Check biome metadata in API:
   ```
   GET /api/load-game-data?key=biomes/{biomeId}
   ```
3. Refresh fish editor
4. Try re-uploading

## 🎓 Advanced Features

### Multiple Biome Spawning

Creatures can spawn in multiple biomes:
- Check multiple "Can Appear In" biomes
- Adjust spawn weight per biome if needed
- Use depth constraints to limit further

### Granted Abilities

When player eats this creature, they gain abilities:
```
bioluminescence, shield, speed_boost
```
- Comma-separated ability IDs
- Passive abilities only
- Must be defined in abilities system

### Unlock Requirements

Player must unlock specific biomes first:
```
deep, deep_polluted
```
- Comma-separated biome IDs
- Prevents early access
- Progressive gameplay

## 📚 Related Documentation

- **DATA_STRUCTURE.md** - Complete interface definitions
- **FISH_EDITOR_ASSET_MANAGEMENT_GUIDE.md** - Full technical guide
- **ROGUELITE_DESIGN.md** - Game design and progression

## 🎉 Tips & Tricks

1. **Test creatures immediately**: Spawn them in the editor scene
2. **Use descriptive names**: Makes library browsing easier
3. **Set playable flag**: Only for player-selectable fish
4. **Biome consistency**: Match creature theme to biome
5. **Video backgrounds**: Keep under 30 seconds for performance
6. **AI prompts**: Be specific about "underwater", "game background"
7. **Save often**: Changes are permanent in blob storage
8. **Use library**: Don't recreate existing creatures

## 🔗 Quick Links

- Fish Editor: `/fish-editor`
- API Docs: See FISH_EDITOR_ASSET_MANAGEMENT_GUIDE.md
- Data Structure: See DATA_STRUCTURE.md
- Test Script: Run `./test-asset-management.sh`
