# Vercel Blob Storage Migration - Implementation Notes

## Overview

This implementation replaces all localStorage and local filesystem storage with Vercel Blob Storage for the fish-pwa game.

## What Changed

### Storage Architecture

**Before:**
- Game data stored in localStorage (5 keys)
- Assets saved to `/public/` filesystem directories
- Model cache metadata in localStorage

**After:**
- Game data stored in Vercel Blob Storage via API endpoints
- Assets uploaded to Vercel Blob Storage
- No localStorage usage (except removed references)
- No filesystem writes

### API Changes

All storage methods in `GameStorage`, `EssenceManager`, `UpgradeManager`, and `RunHistoryManager` are now **async**.

**Before:**
```typescript
const essence = storage.getEssence();
storage.setEssence(100);
```

**After:**
```typescript
const essence = await storage.getEssence();
await storage.setEssence(100);
```

### Components That Need Updates

The following components use storage and need to be updated to handle async calls:

1. **components/MetaHub.tsx** - Uses `essenceManager.getAmount()` and `storage.getHighScore()`
2. **components/TechTree.tsx** - Uses `essenceManager`, `upgradeManager`
3. **lib/game/engine.ts** - Uses `storage` for high scores and run history
4. **components/GameCanvas.tsx** - May use storage indirectly through engine

### Update Pattern

For React components, use `useEffect` with async functions:

```typescript
useEffect(() => {
  const loadData = async () => {
    const essence = await essenceManager.getAmount();
    setEssence(essence);
  };
  loadData();
}, []);
```

For game engine code, use async/await directly:

```typescript
async onGameOver() {
  const highScore = await this.storage.getHighScore();
  if (score > highScore) {
    await this.storage.setHighScore(score);
  }
}
```

## Environment Setup

### Required Environment Variables

Create `.env.local` with:

```env
# Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx

# Vercel AI Gateway Key (for image generation)
OPENAI_API_KEY=vck_xxxxxxxxxxxx
```

### Getting the Tokens

1. **BLOB_READ_WRITE_TOKEN**: 
   - Go to Vercel Dashboard → Storage
   - Create/select "fish-art" blob store
   - Copy the Read/Write token

2. **OPENAI_API_KEY**:
   - Already configured for Vercel AI Gateway
   - Starts with `vck_`

## API Endpoints

### Game Data
- `POST /api/save-game-data` - Save game state
- `GET /api/load-game-data?key=<key>` - Load game state

### Assets
- `POST /api/save-sprite` - Upload sprite/background to blob storage
- `POST /api/download-model` - Upload 3D model to blob storage
- `GET /api/list-assets?type=<fish|background>` - List uploaded assets
- `DELETE /api/delete-asset?url=<blob-url>` - Delete asset

## Testing

### Manual Testing Checklist

1. **Game Data Persistence**
   - [ ] Start a game, earn essence, close tab
   - [ ] Reopen - essence should persist
   - [ ] Purchase upgrades - should persist across sessions
   - [ ] Complete runs - run history should save

2. **Asset Storage**
   - [ ] Generate a fish sprite
   - [ ] Verify it's saved to Vercel Blob (check API response)
   - [ ] Generate same fish again - should use cached version
   - [ ] List assets in dev tools - should appear

3. **Audio Settings**
   - [ ] Change volume/mute settings
   - [ ] Close and reopen - settings should persist

### Debugging

Check browser console for:
- `[BlobStorage]` logs - Blob operations
- `[SaveSprite]` logs - Sprite uploads
- `[AssetManager]` logs - Asset caching
- `[GameStorage]` errors - Storage failures

## Migration Notes

### No Data Migration Needed

Since this is likely a development/early version:
- Old localStorage data will remain but not be used
- Users will start fresh with Vercel Blob Storage
- No migration script needed

If you need to preserve existing data:
1. Export localStorage to JSON before deploying
2. Import into Vercel Blob via API endpoints after deployment

### Rollback Plan

If issues arise, can temporarily revert to localStorage:
1. Revert changes to `lib/meta/storage.ts`
2. Revert changes to API routes
3. Keep Blob storage code for future use

## Performance Considerations

### Debounced Saves

Game data saves are debounced (1 second delay) to avoid excessive API calls:
```typescript
save(): void {
  if (this.saveTimeout) clearTimeout(this.saveTimeout);
  this.saveTimeout = setTimeout(() => this.saveAsync(), 1000);
}
```

### Asset Caching

Assets are checked for existence before upload to avoid duplicates:
```typescript
const exists = await assetExists(blobPath);
if (exists) return cached URL;
```

### Lazy Loading

Game data loads on first access, not on initialization:
```typescript
private async ensureLoaded(): Promise<void> {
  if (this.loaded) return;
  await this.load();
}
```

## Security

✅ CodeQL scan completed: **0 vulnerabilities found**

- Blob storage tokens are server-side only
- No sensitive data in client-side code
- All blob operations go through API routes
- Proper error handling prevents data leaks

## Next Steps

1. Update UI components to use async storage methods
2. Test game data persistence thoroughly
3. Verify asset upload/download works in production
4. Monitor Vercel Blob Storage usage/costs
5. Consider adding data export/import features for users

## Support

For issues:
- Check Vercel Dashboard → Storage → fish-art for blob contents
- Review API logs in Vercel Dashboard → Logs
- Check browser console for client-side errors
