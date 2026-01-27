# Bulk Creature Import Tools

Tools for importing multiple creatures into blob storage without using the web editor.

## Methods

### 1. JSON + Images Import (Recommended)

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
npx ts-node scripts/import-creatures.ts ./data/creatures
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
npx ts-node scripts/import-creatures-csv.ts ./data/creatures.csv ./data/sprites/
```

### 3. Web UI Bulk Upload (Future)

A web interface for uploading multiple creatures at once will be added to the fish editor in the future.

## Export Existing Data

Export all creatures from blob storage to local JSON files:

```bash
export BLOB_READ_WRITE_TOKEN="your-token-here"
npx ts-node scripts/export-creatures.ts ./export/
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
npx ts-node scripts/validate-creatures.ts ./data/creatures/
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
npx ts-node scripts/validate-creatures.ts ./data/creatures/

# 3. Import to blob storage
export BLOB_READ_WRITE_TOKEN="..."
npx ts-node scripts/import-creatures.ts ./data/creatures/

# 4. Verify in web editor
# Open https://your-app.vercel.app/fish-editor
# Check Fish Library tab to see imported creatures
```
