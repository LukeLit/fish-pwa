# Fish Editor & Asset Management System - Complete Guide

## Overview

The fish editor has been comprehensively overhauled to support advanced asset management, full creature editing, and background management with both images and videos. All assets are stored in Vercel Blob Storage with support for overwrites and complete CRUD operations.

## Table of Contents

1. [Blob Storage Architecture](#blob-storage-architecture)
2. [Creature Management](#creature-management)
3. [Fish Editor Interface](#fish-editor-interface)
4. [Background Management](#background-management)
5. [API Reference](#api-reference)
6. [Testing Guide](#testing-guide)

---

## Blob Storage Architecture

### Universal Overwrite Support

All blob storage operations now support `allowOverwrite: true`, enabling seamless asset updates:

```typescript
// In lib/storage/blob-storage.ts
await put(path, data, {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,  // ✅ Always enabled
});
```

### Storage Structure

```
assets/
├── creatures/
│   ├── {creatureId}.png      # Sprite image
│   └── {creatureId}.json     # Complete metadata
├── fish/
│   └── {fishId}.png          # Legacy fish sprites
└── backgrounds/
    ├── {backgroundId}.png    # Background images
    └── {backgroundId}.mp4    # Background videos

game-data/
└── biomes/
    └── {biomeId}.json        # Biome definitions with background associations
```

---

## Creature Management

### Complete Creature Data Structure

All creatures now support the full `Creature` interface from `DATA_STRUCTURE.md`:

```typescript
interface Creature {
  // Identity
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  playable: boolean;
  
  // Visual
  sprite: string;
  biomeId: string;
  
  // Stats (all starting/scalable values)
  stats: {
    size: number;      // 20-200
    speed: number;     // 1-10
    health: number;    // 1-100
    damage: number;    // 1-50
  };
  
  // Essence system
  essenceTypes: Array<{
    type: string;
    baseYield: number;
  }>;
  
  // Spawn rules
  spawnRules: {
    canAppearIn: string[];     // Biome IDs
    spawnWeight: number;       // 1-100
    minDepth?: number;         // Optional meters
    maxDepth?: number;         // Optional meters
  };
  
  // Advanced features
  grantedAbilities?: string[];
  unlockRequirement?: {
    biomeUnlocked: string[];
    essenceSpent?: Record<string, number>;
  };
}
```

### CRUD Operations

#### Create/Update Creature

```typescript
// From fish editor
const formData = new FormData();
formData.append('creatureId', 'my-fish');
formData.append('sprite', imageBlob, 'my-fish.png');
formData.append('metadata', JSON.stringify(creatureData));

const response = await fetch('/api/save-creature', {
  method: 'POST',
  body: formData,
});
```

#### Read Creature

```typescript
// Get single creature
const response = await fetch('/api/get-creature?id=my-fish');
const { creature, spriteUrl } = await response.json();

// List all creatures
const response = await fetch('/api/list-creatures');
const { creatures, total } = await response.json();

// Filter creatures
const response = await fetch('/api/list-creatures?biome=deep&rarity=rare');
```

#### Delete Creature

```typescript
const response = await fetch('/api/delete-creature?id=my-fish', {
  method: 'DELETE',
});
const { deleted } = await response.json();
// deleted: ['sprite-url', 'metadata-url']
```

### LocalStorage Fallback

If blob storage is unavailable (no `BLOB_READ_WRITE_TOKEN` or offline), the system automatically falls back to localStorage:

```typescript
// Automatic fallback in FishEditOverlay
if (result.requiresToken) {
  saveCreatureToLocal(creatureData);
  setSaveMessage('✓ Saved to local storage (blob storage not configured)');
}
```

---

## Fish Editor Interface

### Three Tabs

1. **Controls** - AI generation and scene controls
2. **Fish Library** - Browse and select saved creatures
3. **Backgrounds** - Manage images/videos and biome associations

### Fish Library Features

- Displays all creatures from blob storage
- Shows metadata: name, type, rarity, biome, essence types
- Click to select and edit any creature
- Real-time updates when creatures are saved

### Full Creature Editing

The edit overlay now includes:

#### Basic Info
- Name
- Description
- Type (prey/predator/mutant)
- Rarity (common/rare/epic/legendary)
- Playable checkbox

#### Biome & Location
- Biome selection
- Spawn biomes (multi-select)
- Min/Max depth (optional)

#### Starting Stats (with tooltips)
- Size (20-200) ⓘ "Base values that may scale with upgrades"
- Speed (1-10)
- Health (1-100)
- Damage (1-50)

#### Essence Types
- Seven essence types: shallow, deep_sea, tropical, polluted, cosmic, demonic, robotic
- Set base yield for each type (0 to remove)
- All types are always granted when creature is consumed

#### Spawn Rules
- Spawn weight (1-100) - relative frequency
- Can appear in biomes (checkbox list)
- Optional depth constraints

#### Advanced Features
- Granted abilities (comma-separated IDs)
- Unlock requirements (biome unlocks)

---

## Background Management

### Background Tab Features

#### Image Backgrounds
- **Upload**: Click "Choose Image File" to upload PNG/JPG
- **AI Generation**: Use main controls to generate with Imagen

#### Video Backgrounds
- **Upload**: Click "Choose Video File" to upload MP4
- **AI Generation**: Use Google Veo 3.1
  - Enter descriptive prompt
  - Click "Generate Video with AI"
  - System polls for completion (may take several minutes)
  - Automatically downloads and saves to blob storage

#### Biome Association
- Select target biome from dropdown
- Click "Save to Biome"
- Associates background (image or video) with biome definition
- Stored in `game-data/biomes/{biomeId}.json`

### Biome Definition Format

```json
{
  "id": "deep_polluted",
  "backgroundAssets": {
    "backgroundImage": "https://blob.vercel-storage.com/.../biome_deep_polluted_bg.png",
    "backgroundVideo": "https://blob.vercel-storage.com/.../video_12345.mp4"
  }
}
```

---

## API Reference

### Creature APIs

#### POST /api/save-creature
Saves both sprite and metadata.

**Request**: FormData with:
- `creatureId`: string
- `sprite`: File (optional)
- `metadata`: JSON string (Creature object)

**Response**:
```json
{
  "success": true,
  "creatureId": "my-fish",
  "spriteUrl": "https://...",
  "metadataUrl": "https://...",
  "metadata": { /* Creature */ }
}
```

#### GET /api/get-creature?id={id}
Fetches complete creature data.

**Response**:
```json
{
  "success": true,
  "creature": { /* Creature with sprite URL */ },
  "spriteUrl": "https://...",
  "metadata": { /* Creature without sprite */ }
}
```

#### GET /api/list-creatures?biome={biome}&rarity={rarity}&playable={bool}
Lists creatures with optional filters.

**Response**:
```json
{
  "success": true,
  "creatures": [/* Creature[] */],
  "total": 42
}
```

#### DELETE /api/delete-creature?id={id}
Deletes creature sprite and metadata.

**Response**:
```json
{
  "success": true,
  "deleted": ["sprite-url", "metadata-url"],
  "creatureId": "my-fish"
}
```

### Background APIs

#### POST /api/save-sprite
Handles both images and videos.

**For Images** (JSON):
```json
{
  "imageBase64": "data:image/png;base64,...",
  "filename": "background.png",
  "type": "background"
}
```

**For Videos** (FormData):
- `video`: File
- `filename`: string

**Response**:
```json
{
  "success": true,
  "localPath": "https://...",
  "cached": false,
  "size": 123456
}
```

#### POST /api/generate-video
Starts video generation with Google Veo 3.1.

**Request**:
```json
{
  "prompt": "Underwater coral reef scene",
  "model": "veo-3.1-generate-preview",
  "aspectRatio": "16:9",
  "resolution": "720p"
}
```

**Response**:
```json
{
  "success": true,
  "operation": "operations/xyz123",
  "status": "processing"
}
```

#### GET /api/generate-video?operation={operationName}
Polls video generation status.

**Response** (processing):
```json
{
  "success": true,
  "status": "processing",
  "operation": "operations/xyz123"
}
```

**Response** (completed):
```json
{
  "success": true,
  "status": "completed",
  "video": {
    "uri": "https://generativelanguage.googleapis.com/...",
    "mimeType": "video/mp4"
  }
}
```

#### POST /api/download-video
Downloads video from URI and saves to blob storage.

**Request**:
```json
{
  "uri": "https://generativelanguage.googleapis.com/..."
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://blob.vercel-storage.com/...",
  "filename": "backgrounds/video_12345.mp4"
}
```

#### POST /api/save-game-data
Saves biome metadata and associations.

**Request**:
```json
{
  "key": "biomes/deep_polluted",
  "data": {
    "id": "deep_polluted",
    "backgroundAssets": {
      "backgroundImage": "https://...",
      "backgroundVideo": "https://..."
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://..."
}
```

---

## Testing Guide

### Testing Creature CRUD

1. **Create a Creature**:
   - Go to Fish Editor (`/fish-editor`)
   - Generate or spawn a fish
   - Click edit icon
   - Fill in all fields (name, description, stats, essence types, etc.)
   - Click "Save to Game (Persistent)"
   - Verify success message

2. **View in Library**:
   - Switch to "Fish Library" tab
   - Verify creature appears with correct metadata
   - Check thumbnail, name, type, rarity badges

3. **Edit Existing Creature**:
   - Click creature in library
   - Modify fields
   - Save again
   - Verify changes persist (refresh page)

4. **Delete Creature** (via API):
   ```bash
   curl -X DELETE 'http://localhost:3000/api/delete-creature?id=my-fish'
   ```

### Testing Background Management

1. **Upload Image**:
   - Go to "Backgrounds" tab
   - Select "Image" type
   - Click "Choose Image File"
   - Select image
   - Choose biome
   - Click "Save to Biome"

2. **Upload Video**:
   - Select "Video" type
   - Click "Choose Video File"
   - Select MP4 file
   - Wait for upload
   - Save to biome

3. **Generate Video with AI** (requires GEMINI_API_KEY):
   - Select "Video" type
   - Enter prompt: "Gentle underwater scene with coral and fish"
   - Click "Generate Video with AI"
   - Wait for generation (2-5 minutes)
   - System auto-downloads and displays
   - Save to biome

4. **Verify Biome Association**:
   ```bash
   curl 'http://localhost:3000/api/load-game-data?key=biomes/shallow'
   ```
   Should return biome with `backgroundAssets`.

### Testing Offline/Fallback

1. **LocalStorage Fallback**:
   - Remove `BLOB_READ_WRITE_TOKEN` from environment
   - Restart server
   - Try saving creature
   - Should see: "✓ Saved to local storage (blob storage not configured)"

2. **Offline Mode**:
   - Open DevTools > Network
   - Enable "Offline" mode
   - Try saving creature
   - Should gracefully fall back to localStorage

### Testing Overwrites

1. **Image Overwrite**:
   - Upload background with name "test_bg.png"
   - Note the URL
   - Upload different image with same name
   - Verify URL stays the same but content changes

2. **Creature Overwrite**:
   - Save creature with ID "test-fish"
   - Modify stats
   - Save again with same ID
   - Fetch creature - should have new stats

---

## Environment Variables

Required for full functionality:

```bash
# Blob Storage (required for persistent storage)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# AI Generation (optional)
OPENAI_API_KEY=vck_xxx           # For Imagen via Vercel AI Gateway
GEMINI_API_KEY=xxx               # For Veo video generation
```

Without these, the system falls back to localStorage.

---

## Known Limitations

1. **Video Playback**: Currently backgrounds are set as static images. Video playback in game requires additional implementation.

2. **Video Generation Time**: Google Veo can take 2-5 minutes to generate videos. The UI polls every 5 seconds.

3. **Asset Size**: Large videos may take time to upload/download. Consider compression for production.

4. **Browser Compatibility**: Video backgrounds require modern browsers with `<video>` support.

---

## Migration from Old System

If you have existing fish data in the old format:

1. **Fish with Basic Stats**: Will work immediately, missing fields get defaults
2. **LocalStorage Fish**: Use "Save to Game" to migrate to blob storage
3. **Public Folder Sprites**: Use fish editor to load and re-save

---

## Troubleshooting

### "Blob storage not configured"
- Check `BLOB_READ_WRITE_TOKEN` is set
- Verify token has read/write permissions
- System will use localStorage as fallback

### "Failed to generate video"
- Check `GEMINI_API_KEY` is set
- Verify API quota is not exceeded
- Check console for detailed error messages

### Creature not appearing in library
- Check browser console for API errors
- Verify creature was saved successfully
- Try refreshing the page

### Background not saving to biome
- Ensure background is loaded first
- Check selected biome is valid
- Verify `save-game-data` API is working

---

## Future Enhancements

- [ ] Video background playback in game canvas
- [ ] Batch import/export of creatures
- [ ] Advanced filtering in fish library
- [ ] Creature cloning/duplication
- [ ] Background preview gallery
- [ ] Drag-and-drop file uploads
- [ ] Progress bars for video generation
- [ ] Creature search functionality

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify environment variables
3. Test API endpoints directly
4. Check blob storage dashboard on Vercel
5. Review DATA_STRUCTURE.md for interface details
