# Bulk Creature & Art Tools

Tools for importing multiple creatures into blob storage and for batch-generating AI art from the biome documentation.

## Methods

### 1. JSON + Images Import (Existing, Recommended)

Organize your creatures in a directory with paired JSON and image files:

```
data/creatures/
├── goldfish.json
├── goldfish.png
├── pufferfish.json
├── pufferfish.png
└── ...
```

**JSON format** (`goldfish.json`):
```json
{
  "id": "goldfish",
  "name": "Goldfish",
  "description": "A common orange fish",
  "type": "prey",
  "stats": {
    "size": 60,
    "speed": 5,
    "health": 20,
    "damage": 5
  },
  "rarity": "common",
  "biomeId": "shallow",
  "essenceTypes": [
    { "type": "shallow", "baseYield": 10 }
  ],
  "spawnRules": {
    "canAppearIn": ["shallow"],
    "spawnWeight": 50
  }
}
```

**Run import**:
```bash
# Set your blob storage token
export BLOB_READ_WRITE_TOKEN="your-token-here"

# Import all creatures
npx tsx scripts/import-creatures.ts ./data/creatures
```

### 2. CSV Import (Quick & Simple)

Create a CSV file with basic creature data:

```csv
id,name,description,type,size,speed,health,damage,rarity,biomeId,spriteFile
goldfish,Goldfish,A common orange fish,prey,60,5,20,5,common,shallow,goldfish.png
pufferfish,Pufferfish,A spiky defensive fish,prey,70,4,30,15,uncommon,shallow,pufferfish.png
```

**Run import**:
```bash
export BLOB_READ_WRITE_TOKEN="your-token-here"
npx tsx scripts/import-creatures-csv.ts ./data/creatures.csv ./data/sprites/
```

### 3. Web UI Bulk Upload (Future)

A web interface for uploading multiple creatures at once will be added to the fish editor in the future.

## Batch Generation from Biome Docs (Modular Prompt System)

The modular prompt system lets you define fish visually in markdown and generate both sprites and metadata in one pass.

### Step 1: Author Fish in Biome Docs

- Edit `docs/biomes/*.md` using the formats described in:
  - `docs/MODULAR_PROMPT_SYSTEM.md`
  - `docs/FISH_DATA_STRUCTURE_BATCH.md`
  - `docs/VISUAL_MOTIFS.md`
- Each fish entry includes:
  - `Description Chunks`
  - `Visual Motif`
  - `Essence` object
  - `Size Tier` and `Rarity`

### Step 2: Parse Biome Docs

Use the markdown parser to turn biome docs into JSON fish data:

```bash
npx tsx scripts/parse-biome-fish.ts > /tmp/biome-fish.json
```

This produces objects of the form:

```json
{
  "id": "lanternfish_abyssal_common",
  "name": "Lanternfish",
  "biome": "abyssal",
  "rarity": "common",
  "sizeTier": "prey",
  "essence": { "shallow": 2, "deep_sea": 15, "tropical": 0, "polluted": 0, "cosmic": 0, "demonic": 0, "robotic": 0 },
  "descriptionChunks": [
    "bulbous head with glowing lure",
    "needle-like teeth"
  ],
  "visualMotif": "bioluminescent spots"
}
```

### Step 3: Convert to Creature Structures

`scripts/convert-fish-to-creature.ts` maps parsed fish into the in-game `Creature` type, filling in:
- `stats` (based on `sizeTier`)
- `type` (`prey`/`predator` derived from size tier)
- `essence` (new `EssenceData` format)
- `essenceTypes` (legacy compatibility)

### Step 4: Batch Generate & Upload

`scripts/batch-generate-fish.ts` orchestrates the full pipeline:

**Prerequisites:**
1. Dev server must be running: `npm run dev` (on `http://localhost:3000`)
2. Environment variables set:
   ```bash
   export BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
   export OPENAI_API_KEY="your-vercel-ai-gateway-key"
   ```

**Run batch generation:**
```bash
# Optionally override the base URL if your dev server is elsewhere
export FISH_PWA_BASE_URL="http://localhost:3000"

# Run the batch script
npx tsx scripts/batch-generate-fish.ts
```

**What it does:**
- Parses all `docs/biomes/*.md` files
- Converts each fish entry to `Creature` data structure
- Composes modular prompts using `composeFishPrompt()` from `lib/ai/prompt-builder.ts`
- Calls `/api/generate-fish-image` to generate sprites (uses Imagen Fast by default)
- Calls `/api/save-creature` to upload sprite + metadata to Vercel Blob Storage
- Shows progress: `🧬 Generating creature: <id> (<name>) [<biome]>`
- Logs success ✅ or failure ❌ for each fish
- Prints final summary: total success/fail counts

**Expected output:**
```
🧬 Generating creature: bluegill_sunfish_shallow_common (Bluegill Sunfish) [shallow]
  ✅ Uploaded creature bluegill_sunfish_shallow_common

🧬 Generating creature: largemouth_bass_shallow_common (Largemouth Bass) [shallow]
  ✅ Uploaded creature largemouth_bass_shallow_common

...

========================================
✅ Success: 40
❌ Failed: 0
Total: 40
```

**Tips:**
- The script processes all fish sequentially (one at a time) to avoid API rate limits
- If a fish fails, the script continues with the next one
- Failed fish can be re-run later (they won't overwrite successfully uploaded ones)
- Check the console output for any error messages if generation fails

## Export Existing Data

Export all creatures from blob storage to local JSON files:

```bash
export BLOB_READ_WRITE_TOKEN="your-token-here"
npx tsx scripts/export-creatures.ts ./export/
```

This creates:
```
export/
├── goldfish.json
├── goldfish.png
├── pufferfish.json
├── pufferfish.png
└── ...
```

## Validation

Before importing, validate your creature data:

```bash
npx tsx scripts/validate-creatures.ts ./data/creatures/
```

This checks:
- Required fields present
- Valid types and rarities
- Sprite files exist
- JSON syntax is valid

## Tips

1. **Organize locally first**: Create all your creature files locally, test them, then bulk import
2. **Use consistent IDs**: Keep IDs lowercase with hyphens (e.g., `great-white-shark`)
3. **Version control**: Keep your creature JSON files in git for easy tracking
4. **Backup**: Export from blob storage periodically to have local backups
5. **Iterate**: Use the web editor for fine-tuning, bulk import for initial setup

## Environment Variables

All scripts require:
```bash
export BLOB_READ_WRITE_TOKEN="vercel_blob_token_here"
```

Get your token from Vercel dashboard → Project → Storage → Blob.

## Example Workflow

```bash
# 1. Create creature data locally
mkdir -p data/creatures
# ... create JSON files and sprites ...

# 2. Validate before import
npx tsx scripts/validate-creatures.ts ./data/creatures/

# 3. Import to blob storage
export BLOB_READ_WRITE_TOKEN="..."
npx tsx scripts/import-creatures.ts ./data/creatures/

# 4. Verify in web editor
# Open https://your-app.vercel.app/fish-editor
# Check Fish Library tab to see imported creatures
```
