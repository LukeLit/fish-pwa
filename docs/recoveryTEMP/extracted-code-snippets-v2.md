# Extracted Code Snippets from Copypasta
Generated: 2026-02-09T15:59:01.422Z
Total files: 25

---

## FishEditorCanvas.tsx
*Found 4 snippet(s), merged from lines 315 to 856*

### Added Code
```typescript
setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },      });
setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },
carcasses: gameStateRef.current.carcasses,
chunks: gameStateRef.current.chunks,      });
import { tickGameState } from '@/lib/game/canvas-game-loop';import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';
// Listen for Sprite Lab shared sprites (carcass, chunks) refresh so in-game sprites update without reload  useEffect(() => {    const
handleRefreshShared = () => {      invalidateSharedSpriteCaches();      preloadCarcassAndChunkSprites();
Shared sprite cache invalidation + refresh event
Sprite Lab Save buttons for Carcass & Essence Chunks
```

### Removed Code
```typescript
// In editor mode, use creature's actual size or base size      const
playerSize =
gameMode        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 315
Removed:
```typescript
// In editor mode, use creature's actual size or base size      const
playerSize =
gameMode        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);
```

#### Snippet at line 450
```typescript
setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },      });
setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },
carcasses: gameStateRef.current.carcasses,
chunks: gameStateRef.current.chunks,      });
```

#### Snippet at line 852
```typescript
import { tickGameState } from '@/lib/game/canvas-game-loop';import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';
```

#### Snippet at line 856
```typescript
// Listen for Sprite Lab shared sprites (carcass, chunks) refresh so in-game sprites update without reload  useEffect(() => {    const
handleRefreshShared = () => {      invalidateSharedSpriteCaches();      preloadCarcassAndChunkSprites();
Shared sprite cache invalidation + refresh event
Sprite Lab Save buttons for Carcass & Essence Chunks
```

</details>

---

## README.md
*Found 2 snippet(s), merged from lines 961 to 1010*

### Added Code
```typescript
## Creature stats analysis (combat balance)Combat scales damage by `attacker.size/40` and size-ratio modifiers. If base health/damage vary too much across fish, battles feel inconsistent (instant vs drag). To pull blob creature data and analyze
stats:```bash
Summary of what’s in
place:
1.
Script: scripts/analyze-creature-stats.ts
Fetch from
blob: Calls GET /api/list-creatures (dev server must be running at FISH_PWA_BASE_URL or
http://localhost:3000).
Or use
snapshot: With --from-snapshot, reads docs/plans/LEVEL-REFACTOR/blob-snapshot.json (no dev server).
Normalization: Uses normalizeCreature from lib/game/data/creature-loader.ts so stats match what the game uses (defaults: size 60, health 20, damage 5).
Analysis: Computes min/max/mean for size, health, and damage (overall and by
type: prey, predator, mutant).
Suggested
stats: Proposes a narrow band so size drives
combat: health 20, damage 4 (prey), 6 (predator), 5 (mutant).
2. Outputs
docs/plans/CREATURE_STATS_ANALYSIS.md — Report with overall and per-type tables and a per-creature table (current → suggested).
scripts/creature-stats-analysis.json — Same data as JSON (overall, byType, rows with suggested health/damage) for a future batch-update script.
3. Run
From snapshot (already run):
npx tsx scripts/analyze-creature-stats.ts --from-snapshot
From live
blob: start dev server, then
npx tsx scripts/analyze-creature-stats.ts
4. Snapshot run
Used the existing snapshot (65 creatures). Current
spread: size 20–120, health 15–80, damage 3–35. Suggested values are in the report and JSON.
#!/usr/bin/env tsx/** * Patch blob-stored creatures with equalized health and damage from * scripts/creature-stats-analysis.json (based on analyze-creature-stats.ts). * Combat scales by size, so we set base health/damage to a tight range.
Running a dry run to verify the patch, then applying it.
cd /d
d:\Prototyping\fish-pwa && npx tsx scripts/patch-creature-stats.ts --dry-run
The token '&&' is not a valid statement separator in this version.
+
CategoryInfo          :
ParserError: (:) [], ParentContainsErrorRecordException
FullyQualifiedErrorId : InvalidEndOfLine
Set-Location
d:\Prototyping\fish-pwa; npx tsx scripts/patch-creature-stats.ts --dry-run
Updated: 37
Skipped (no patch or already equal): 30
Failed: 0
Total: 67
Running the patch for real (dev server must be running).
npx tsx scripts/patch-creature-stats.ts
Patch completed. Adding a short note to the scripts README about the new
script:
**Apply suggested stats to blob creatures (equalize health/damage):**```bash# Dev server must be runningnpx tsx scripts/patch-creature-stats.ts --dry-run   # preview changes
Summary:
Patch script added and run
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 961
```typescript
## Creature stats analysis (combat balance)Combat scales damage by `attacker.size/40` and size-ratio modifiers. If base health/damage vary too much across fish, battles feel inconsistent (instant vs drag). To pull blob creature data and analyze
stats:```bash
Summary of what’s in
place:
1.
Script: scripts/analyze-creature-stats.ts
Fetch from
blob: Calls GET /api/list-creatures (dev server must be running at FISH_PWA_BASE_URL or
http://localhost:3000).
Or use
snapshot: With --from-snapshot, reads docs/plans/LEVEL-REFACTOR/blob-snapshot.json (no dev server).
Normalization: Uses normalizeCreature from lib/game/data/creature-loader.ts so stats match what the game uses (defaults: size 60, health 20, damage 5).
Analysis: Computes min/max/mean for size, health, and damage (overall and by
type: prey, predator, mutant).
Suggested
stats: Proposes a narrow band so size drives
combat: health 20, damage 4 (prey), 6 (predator), 5 (mutant).
2. Outputs
docs/plans/CREATURE_STATS_ANALYSIS.md — Report with overall and per-type tables and a per-creature table (current → suggested).
scripts/creature-stats-analysis.json — Same data as JSON (overall, byType, rows with suggested health/damage) for a future batch-update script.
3. Run
From snapshot (already run):
npx tsx scripts/analyze-creature-stats.ts --from-snapshot
From live
blob: start dev server, then
npx tsx scripts/analyze-creature-stats.ts
4. Snapshot run
Used the existing snapshot (65 creatures). Current
spread: size 20–120, health 15–80, damage 3–35. Suggested values are in the report and JSON.
#!/usr/bin/env tsx/** * Patch blob-stored creatures with equalized health and damage from * scripts/creature-stats-analysis.json (based on analyze-creature-stats.ts). * Combat scales by size, so we set base health/damage to a tight range.
Running a dry run to verify the patch, then applying it.
cd /d
d:\Prototyping\fish-pwa && npx tsx scripts/patch-creature-stats.ts --dry-run
The token '&&' is not a valid statement separator in this version.
+
CategoryInfo          :
ParserError: (:) [], ParentContainsErrorRecordException
+
FullyQualifiedErrorId : InvalidEndOfLine
Set-Location
d:\Prototyping\fish-pwa; npx tsx scripts/patch-creature-stats.ts --dry-run
Updated: 37
Skipped (no patch or already equal): 30
Failed: 0
Total: 67
Running the patch for real (dev server must be running).
npx tsx scripts/patch-creature-stats.ts
Updated: 37
Skipped (no patch or already equal): 30
Failed: 0
Total: 67
Patch completed. Adding a short note to the scripts README about the new
script:
```

#### Snippet at line 1010
```typescript
**Apply suggested stats to blob creatures (equalize health/damage):**```bash# Dev server must be runningnpx tsx scripts/patch-creature-stats.ts --dry-run   # preview changes
Summary:
Patch script added and run
```

</details>

---

## SpriteGenerationLab.tsx
*Found 5 snippet(s), merged from lines 861 to 879*

### Context
```If target.maxHealth is missing: maxHealth = 100.
So any fish that doesn’t get creatureData or maxHealth set (e.g. from a different spawn path) becomes a low-damage attacker and/or a 100-HP tank, which can make some fights feel like they drag.
Player damage
Player damage is runState?.fishState.damage ?? 5. If run state isn’t set or has no fishState.damage, the player is stuck at 5, which again can make fights feel slow.
Summary
Damage is driven by fish (and player) data: creatureData.stats.damage, attacker.size, target.size, and target.maxHealth (from creature health or default 100).
The combination of (a) large spread in health/damage, (b) size scaling and size-ratio multipliers, and (c) fallbacks to 5 damage and 100 HP is what makes some battles end almost instantly and others drag.
If you want, we can next trace exactly where each fish gets creatureData / health / maxHealth (e.g. in canvas-game-loop.ts around 1225–1247) so you can see which spawn paths might be using the 5/100 defaults and tune formulas or defaults.
hmm, we should probably do a pass and bring our fish stats closer to eachother in data, since we are scaling everything based on size.  I am thinking we should use our tools to pull the fish data down from blob and analuyze

Searching for how creature data is stored and fetched from blob storage and for any analysis tools.
Creating a script to fetch creature data from the API and analyze combat stats (size, health, damage), then adding a short README note on how to run it.
Create script to fetch blob creatures and analyze stats
Output analysis report and suggested normalized stats
analyze-creature-stats.ts(new)```

### Added Code
```typescript
const
saveCarcassSprite = async (key: string) => {    const
dataUrl = carcassSprites[key];    if (!dataUrl || !isIndexedDBAvailable()) return;    try {      const
blob = await dataUrlToBlob(dataUrl);
await saveSharedSprite(key, blob);      }
await saveSharedSprite(`essence_${essenceId}`, blob);      }
#!/usr/bin/env tsx/** * Pull creature data from blob (via /api/list-creatures) and analyze combat stats * (size, health, damage). Outputs a report and suggested normalized stats so that * size-based scaling in combat dominates and battles feel more consistent.
cd
d:\Prototyping\fish-pwa; npx tsx scripts/analyze-creature-stats.ts --from-snapshot
npm notice New major version of npm available! 10.8.2 -> 11.9.0
npm notice
Changelog:
https://github.com/npm/cli/releases/tag/v11.9.0
npm notice To update
run: npm install -g npm@11.9.0
```

### Removed Code
```typescript
</div>                  <button
onClick={() => generateCarcassSprite(key)}
disabled={carcassGenerating !== null}
className="w-full px-3 py-2 bg-amber-600/80
hover:bg-amber-600 text-white rounded text-xs font-medium
disabled:opacity-50"                  >
<button
disabled:opacity-50"                  >                    {carcassGenerating ===
key ? 'Generating...' : 'Generate'}                  </button>                  </div>
onClick={() => generateEssenceChunkSprite(essence.id)}
disabled={essenceChunkGenerating !== null}
className="w-full px-3 py-2 rounded text-xs font-medium
disabled:opacity-50"
style={{
backgroundColor: essence.color + '40',
color: essence.color,                    }}                  >                    {essenceChunkGenerating === essence.id ? 'Generating...' : 'Generate'}                  </button>                  </div>
Dispatching refreshSharedSprites after Generate so the game picks up new sprites without clicking Save.
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 861
```typescript
const
saveCarcassSprite = async (key: string) => {    const
dataUrl = carcassSprites[key];    if (!dataUrl || !isIndexedDBAvailable()) return;    try {      const
blob = await dataUrlToBlob(dataUrl);
```

#### Snippet at line 864
Removed:
```typescript
</div>                  <button
onClick={() => generateCarcassSprite(key)}
disabled={carcassGenerating !== null}
className="w-full px-3 py-2 bg-amber-600/80
hover:bg-amber-600 text-white rounded text-xs font-medium
disabled:opacity-50"                  >
<button
onClick={() => generateCarcassSprite(key)}
disabled={carcassGenerating !== null}
className="w-full px-3 py-2 bg-amber-600/80
hover:bg-amber-600 text-white rounded text-xs font-medium
disabled:opacity-50"                  >                    {carcassGenerating ===
key ? 'Generating...' : 'Generate'}                  </button>                  </div>
```

#### Snippet at line 869
Removed:
```typescript
</div>                  <button
onClick={() => generateEssenceChunkSprite(essence.id)}
disabled={essenceChunkGenerating !== null}
className="w-full px-3 py-2 rounded text-xs font-medium
disabled:opacity-50"
style={{
<button
onClick={() => generateEssenceChunkSprite(essence.id)}
disabled={essenceChunkGenerating !== null}
className="w-full px-3 py-2 rounded text-xs font-medium
disabled:opacity-50"
style={{
backgroundColor: essence.color + '40',
color: essence.color,                    }}                  >                    {essenceChunkGenerating === essence.id ? 'Generating...' : 'Generate'}                  </button>                  </div>
Dispatching refreshSharedSprites after Generate so the game picks up new sprites without clicking Save.
```

#### Snippet at line 875
```typescript
await saveSharedSprite(key, blob);      }
```

#### Snippet at line 879
```typescript
await saveSharedSprite(`essence_${essenceId}`, blob);      }
#!/usr/bin/env tsx/** * Pull creature data from blob (via /api/list-creatures) and analyze combat stats * (size, health, damage). Outputs a report and suggested normalized stats so that * size-based scaling in combat dominates and battles feel more consistent.
cd
d:\Prototyping\fish-pwa; npx tsx scripts/analyze-creature-stats.ts --from-snapshot
npm notice New major version of npm available! 10.8.2 -> 11.9.0
npm notice
Changelog:
https://github.com/npm/cli/releases/tag/v11.9.0
npm notice To update
run: npm install -g npm@11.9.0
npm notice
```

</details>

---

## canvas-collision.ts
*Found 7 snippet(s), merged from lines 455 to 1185*

### Added Code
```typescript
/** * Get body radius for physical separation (center circle). Prevents overlap; head colliders stay for combat. */export function getBodyRadius(size: number): number {  return size * COLLISION.BODY_RADIUS_RATIO;
Adding the body-separation pass and updating the game-loop
import:
```

### Removed Code
```typescript
* Collision System for Canvas Game * Handles fish-fish and player-fish collision detection and resolution
* Handles fish-fish and player-fish collision detection and resolution * Collision System for Canvas Game * Handles fish-fish and player-fish collision detection and resolution. * * In game mode, combat and death (health damage, carcass, essence chunks) are * handled by the game loop (resolveAttack, spawnCarcass, spawnChunksFromFish).
// Predator can eat KO prey      if (aKo && bIsPredator && fishB.isDashing) {        eatenIds.add(fishA.id);        const
eatX = (fishA.x + fishB.x) * 0.5;        const
eatY = (fishA.y + fishB.y) * 0.5;
eatY = (fishA.y + fishB.y) * 0.5;        const
effMult = Math.max(0.05, 1 / (1 + (fishB.size / fishA.size) * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, fishB.size + fishA.size * 0.15 * effMult);        fishUpdates.set(fishB.id, {
size: newSize });        if (fishB.animationSprite?.hasAction?.('bite')) {          fishB.animationSprite.triggerAction('bite');        }        for (let
b = 0; b < 12; b++) {          bloodParticles.push({
x: eatX + (Math.random() - 0.5) * fishA.size * 1.2,
y: eatY + (Math.random() - 0.5) * fishA.size * 1.2,
life: 1,
radius: 4 + Math.random() * 8,          });        }        continue;      }      if (bKo && aIsPredator && fishA.isDashing) {        eatenIds.add(fishB.id);        const
effMult = Math.max(0.05, 1 / (1 + (fishA.size / fishB.size) * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, fishA.size + fishB.size * 0.15 * effMult);        fishUpdates.set(fishA.id, {
size: newSize });        if (fishA.animationSprite?.hasAction?.('bite')) {          fishA.animationSprite.triggerAction('bite');        }        for (let
x: eatX + (Math.random() - 0.5) * fishB.size * 1.2,
y: eatY + (Math.random() - 0.5) * fishB.size * 1.2,
radius: 4 + Math.random() * 8,          });        }        continue;      }
}      } else if (sizeRatio >= ATTACK_SIZE_RATIO) {        // Predator eats prey        eatenIds.add(prey.id);        const
eatX = (predator.x + prey.x) * 0.5;        const
eatY = (predator.y + prey.y) * 0.5;
} else if (sizeRatio >= ATTACK_SIZE_RATIO) {        // Predator eats prey        eatenIds.add(prey.id);        const
eatY = (predator.y + prey.y) * 0.5;        const
effMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, predator.size + prey.size * 0.15 * effMult);        fishUpdates.set(predator.id, {
size: newSize });        if (predator.animationSprite?.hasAction?.('bite')) {          predator.animationSprite.triggerAction('bite');        }        for (let
x: eatX + (Math.random() - 0.5) * prey.size * 1.2,
y: eatY + (Math.random() - 0.5) * prey.size * 1.2,
radius: 4 + Math.random() * 8,          });        }      } else if (sizeRatio <= 1 / ATTACK_SIZE_RATIO) {        // Prey eats predator        eatenIds.add(predator.id);        const
invRatio = prey.size / predator.size;        const
effMult = Math.max(0.05, 1 / (1 + invRatio * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.15 * effMult);        fishUpdates.set(prey.id, {
size: newSize });        if (prey.animationSprite?.hasAction?.('bite')) {          prey.animationSprite.triggerAction('bite');        }        for (let
x: eatX + (Math.random() - 0.5) * predator.size * 1.2,
y: eatY + (Math.random() - 0.5) * predator.size * 1.2,
radius: 4 + Math.random() * 8,          });        }        }
if (predKo) {          eatenIds.add(predator.id);          const
eatX = (predator.x + prey.x) * 0.5;          const
eatY = (predator.y + prey.y) * 0.5;          const
newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);          fishUpdates.set(prey.id, {
size: newSize });
eatenIds.add(predator.id);          const
size: newSize });          if (prey.animationSprite?.hasAction?.('bite')) {            prey.animationSprite.triggerAction('bite');          }          for (let
b = 0; b < 10; b++) {            bloodParticles.push({
x: eatX + (Math.random() - 0.5) * 20,
y: eatY + (Math.random() - 0.5) * 20,
radius: 4 + Math.random() * 6,            });          }        } else if (preyKo) {        if (predKo) {
Removing the gameMode "eat KO" and "player eats fish" (size-based) branches from detectPlayerFishCollision.
if (gameMode) {    // KO fish can be eaten (dash required)    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {      const
eatX = (fish.x + player.x) * 0.5;      const
eatY = (fish.y + player.y) * 0.5;      const
sizeRatio = player.size / fish.size;
// KO fish can be eaten (dash required)    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {      const
sizeRatio = player.size / fish.size;      const
efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));      const
sizeGain = fish.size * 0.15 * efficiencyMult;      const
hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);      for (let
b = 0; b < 10; b++) {        bloodParticles.push({
radius: 4 + Math.random() * 6,        });      }      if (fish.creatureData?.essenceTypes) {        fish.creatureData.essenceTypes.forEach((ec: {
type: string;
baseYield: number },
i: number) => {          const
et = ESSENCE_TYPES[ec.type];          if (et) {            chompParticles.push({
x: eatX + (Math.random() - 0.5) * 24,
y: eatY - 20 - (i * 18),
life: 1.5,
scale: 1.4,
text: `+${ec.baseYield} ${et.name}`,
color: et.color,
punchScale: 1.8,            });          }        });      }      return {
type: 'eat',
eatenIds: new Set([fish.id]),        bloodParticles,        chompParticles,
playerUpdates: {
size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),
hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),
chompPhase: 1,
chompEndTime: now + 280,        },      };    }    const
canSwallow = player.size >= fish.size * SWALLOW_SIZE_RATIO;  if (gameMode) {
} else if (playerAttacking) {      // Player eats fish      const
efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
// Player eats fish      const
hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
triggerAnimationAction?.('bite');      // Chomp particles      for (let
k = 0; k < 5; k++) {        chompParticles.push({
x: eatX + (Math.random() - 0.5) * 16,
y: eatY + (Math.random() - 0.5) * 16,
scale: 1 + Math.random() * 0.5,
text:
k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4],
punchScale: 1.5,        });      }      // Essence particles      if (fish.creatureData?.essenceTypes) {        fish.creatureData.essenceTypes.forEach((essenceConfig: {
idx: number) => {          const
essenceType = ESSENCE_TYPES[essenceConfig.type];          if (essenceType) {            chompParticles.push({
y: eatY - 20 - (idx * 18),
text: `+${essenceConfig.baseYield} ${essenceType.name}`,
color: essenceType.color,
punchScale: 1.8,            });          }        });      }      // Hunger restore notification      if (hungerRestore > 0) {        chompParticles.push({
x: player.x,
y: player.y - player.size * 0.6,
scale: 1.2,
text: `+${Math.ceil(hungerRestore)}`,
color: '#4ade80',
punchScale: 1.6,        });      }      // Blood particles      for (let
b = 0; b < 22; b++) {        bloodParticles.push({
x: eatX + (Math.random() - 0.5) * fish.size * 1.2,
y: eatY + (Math.random() - 0.5) * fish.size * 1.2,
radius: 4 + Math.random() * 10,        });      }      return {
chompEndTime: now + 280,        },      };    } else if (playerAttacking) {
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 455
Removed:
```typescript
* Collision System for Canvas Game * Handles fish-fish and player-fish collision detection and resolution
* Handles fish-fish and player-fish collision detection and resolution * Collision System for Canvas Game * Handles fish-fish and player-fish collision detection and resolution. * * In game mode, combat and death (health damage, carcass, essence chunks) are * handled by the game loop (resolveAttack, spawnCarcass, spawnChunksFromFish).
```

#### Snippet at line 460
Removed:
```typescript
// Predator can eat KO prey      if (aKo && bIsPredator && fishB.isDashing) {        eatenIds.add(fishA.id);        const
eatX = (fishA.x + fishB.x) * 0.5;        const
eatY = (fishA.y + fishB.y) * 0.5;
// Predator can eat KO prey      if (aKo && bIsPredator && fishB.isDashing) {        eatenIds.add(fishA.id);        const
eatX = (fishA.x + fishB.x) * 0.5;        const
eatY = (fishA.y + fishB.y) * 0.5;        const
effMult = Math.max(0.05, 1 / (1 + (fishB.size / fishA.size) * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, fishB.size + fishA.size * 0.15 * effMult);        fishUpdates.set(fishB.id, {
size: newSize });        if (fishB.animationSprite?.hasAction?.('bite')) {          fishB.animationSprite.triggerAction('bite');        }        for (let
b = 0; b < 12; b++) {          bloodParticles.push({
x: eatX + (Math.random() - 0.5) * fishA.size * 1.2,
y: eatY + (Math.random() - 0.5) * fishA.size * 1.2,
life: 1,
radius: 4 + Math.random() * 8,          });        }        continue;      }      if (bKo && aIsPredator && fishA.isDashing) {        eatenIds.add(fishB.id);        const
eatX = (fishA.x + fishB.x) * 0.5;        const
eatY = (fishA.y + fishB.y) * 0.5;        const
effMult = Math.max(0.05, 1 / (1 + (fishA.size / fishB.size) * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, fishA.size + fishB.size * 0.15 * effMult);        fishUpdates.set(fishA.id, {
size: newSize });        if (fishA.animationSprite?.hasAction?.('bite')) {          fishA.animationSprite.triggerAction('bite');        }        for (let
b = 0; b < 12; b++) {          bloodParticles.push({
x: eatX + (Math.random() - 0.5) * fishB.size * 1.2,
y: eatY + (Math.random() - 0.5) * fishB.size * 1.2,
life: 1,
radius: 4 + Math.random() * 8,          });        }        continue;      }
```

#### Snippet at line 465
Removed:
```typescript
}      } else if (sizeRatio >= ATTACK_SIZE_RATIO) {        // Predator eats prey        eatenIds.add(prey.id);        const
eatX = (predator.x + prey.x) * 0.5;        const
eatY = (predator.y + prey.y) * 0.5;
} else if (sizeRatio >= ATTACK_SIZE_RATIO) {        // Predator eats prey        eatenIds.add(prey.id);        const
eatX = (predator.x + prey.x) * 0.5;        const
eatY = (predator.y + prey.y) * 0.5;        const
effMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, predator.size + prey.size * 0.15 * effMult);        fishUpdates.set(predator.id, {
size: newSize });        if (predator.animationSprite?.hasAction?.('bite')) {          predator.animationSprite.triggerAction('bite');        }        for (let
b = 0; b < 12; b++) {          bloodParticles.push({
x: eatX + (Math.random() - 0.5) * prey.size * 1.2,
y: eatY + (Math.random() - 0.5) * prey.size * 1.2,
life: 1,
radius: 4 + Math.random() * 8,          });        }      } else if (sizeRatio <= 1 / ATTACK_SIZE_RATIO) {        // Prey eats predator        eatenIds.add(predator.id);        const
eatX = (predator.x + prey.x) * 0.5;        const
eatY = (predator.y + prey.y) * 0.5;        const
invRatio = prey.size / predator.size;        const
effMult = Math.max(0.05, 1 / (1 + invRatio * 0.4));        const
newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.15 * effMult);        fishUpdates.set(prey.id, {
size: newSize });        if (prey.animationSprite?.hasAction?.('bite')) {          prey.animationSprite.triggerAction('bite');        }        for (let
b = 0; b < 12; b++) {          bloodParticles.push({
x: eatX + (Math.random() - 0.5) * predator.size * 1.2,
y: eatY + (Math.random() - 0.5) * predator.size * 1.2,
life: 1,
radius: 4 + Math.random() * 8,          });        }        }
```

#### Snippet at line 469
Removed:
```typescript
if (predKo) {          eatenIds.add(predator.id);          const
eatX = (predator.x + prey.x) * 0.5;          const
eatY = (predator.y + prey.y) * 0.5;          const
newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);          fishUpdates.set(prey.id, {
size: newSize });
eatenIds.add(predator.id);          const
eatX = (predator.x + prey.x) * 0.5;          const
eatY = (predator.y + prey.y) * 0.5;          const
newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);          fishUpdates.set(prey.id, {
size: newSize });          if (prey.animationSprite?.hasAction?.('bite')) {            prey.animationSprite.triggerAction('bite');          }          for (let
b = 0; b < 10; b++) {            bloodParticles.push({
x: eatX + (Math.random() - 0.5) * 20,
y: eatY + (Math.random() - 0.5) * 20,
life: 1,
radius: 4 + Math.random() * 6,            });          }        } else if (preyKo) {        if (predKo) {
Removing the gameMode "eat KO" and "player eats fish" (size-based) branches from detectPlayerFishCollision.
```

#### Snippet at line 475
Removed:
```typescript
if (gameMode) {    // KO fish can be eaten (dash required)    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {      const
eatX = (fish.x + player.x) * 0.5;      const
eatY = (fish.y + player.y) * 0.5;      const
sizeRatio = player.size / fish.size;
// KO fish can be eaten (dash required)    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {      const
eatX = (fish.x + player.x) * 0.5;      const
eatY = (fish.y + player.y) * 0.5;      const
sizeRatio = player.size / fish.size;      const
efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));      const
sizeGain = fish.size * 0.15 * efficiencyMult;      const
hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);      for (let
b = 0; b < 10; b++) {        bloodParticles.push({
x: eatX + (Math.random() - 0.5) * 20,
y: eatY + (Math.random() - 0.5) * 20,
life: 1,
radius: 4 + Math.random() * 6,        });      }      if (fish.creatureData?.essenceTypes) {        fish.creatureData.essenceTypes.forEach((ec: {
type: string;
baseYield: number },
i: number) => {          const
et = ESSENCE_TYPES[ec.type];          if (et) {            chompParticles.push({
x: eatX + (Math.random() - 0.5) * 24,
y: eatY - 20 - (i * 18),
life: 1.5,
scale: 1.4,
text: `+${ec.baseYield} ${et.name}`,
color: et.color,
punchScale: 1.8,            });          }        });      }      return {
type: 'eat',
eatenIds: new Set([fish.id]),        bloodParticles,        chompParticles,
playerUpdates: {
size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),
hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),
chompPhase: 1,
chompEndTime: now + 280,        },      };    }    const
canSwallow = player.size >= fish.size * SWALLOW_SIZE_RATIO;  if (gameMode) {
```

#### Snippet at line 480
Removed:
```typescript
} else if (playerAttacking) {      // Player eats fish      const
eatX = (fish.x + player.x) * 0.5;      const
eatY = (fish.y + player.y) * 0.5;      const
sizeRatio = player.size / fish.size;      const
efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
// Player eats fish      const
eatX = (fish.x + player.x) * 0.5;      const
eatY = (fish.y + player.y) * 0.5;      const
sizeRatio = player.size / fish.size;      const
efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));      const
sizeGain = fish.size * 0.15 * efficiencyMult;      const
hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
triggerAnimationAction?.('bite');      // Chomp particles      for (let
k = 0; k < 5; k++) {        chompParticles.push({
x: eatX + (Math.random() - 0.5) * 16,
y: eatY + (Math.random() - 0.5) * 16,
life: 1,
scale: 1 + Math.random() * 0.5,
text:
k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4],
punchScale: 1.5,        });      }      // Essence particles      if (fish.creatureData?.essenceTypes) {        fish.creatureData.essenceTypes.forEach((essenceConfig: {
type: string;
baseYield: number },
idx: number) => {          const
essenceType = ESSENCE_TYPES[essenceConfig.type];          if (essenceType) {            chompParticles.push({
x: eatX + (Math.random() - 0.5) * 24,
y: eatY - 20 - (idx * 18),
life: 1.5,
scale: 1.4,
text: `+${essenceConfig.baseYield} ${essenceType.name}`,
color: essenceType.color,
punchScale: 1.8,            });          }        });      }      // Hunger restore notification      if (hungerRestore > 0) {        chompParticles.push({
x: player.x,
y: player.y - player.size * 0.6,
life: 1.5,
scale: 1.2,
text: `+${Math.ceil(hungerRestore)}`,
color: '#4ade80',
punchScale: 1.6,        });      }      // Blood particles      for (let
b = 0; b < 22; b++) {        bloodParticles.push({
x: eatX + (Math.random() - 0.5) * fish.size * 1.2,
y: eatY + (Math.random() - 0.5) * fish.size * 1.2,
life: 1,
radius: 4 + Math.random() * 10,        });      }      return {
type: 'eat',
eatenIds: new Set([fish.id]),        bloodParticles,        chompParticles,
playerUpdates: {
size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),
hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),
chompPhase: 1,
chompEndTime: now + 280,        },      };    } else if (playerAttacking) {
```

#### Snippet at line 1185
```typescript
/** * Get body radius for physical separation (center circle). Prevents overlap; head colliders stay for combat. */export function getBodyRadius(size: number): number {  return size * COLLISION.BODY_RADIUS_RATIO;
Adding the body-separation pass and updating the game-loop
import:
```

</details>

---

## canvas-constants.ts
*Found 5 snippet(s), merged from lines 335 to 1361*

### Context
```  PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this  PREY_FLEE_AFTER_HIT_MS: 5000, // Prey flees from attacker for this long after taking damage (any size)  WANDER_JITTER: 0.05, // Random velocity nudge when no target```

### Added Code
```typescript
// Combat / hit impact constantsexport const
COMBAT = {
HIT_FLASH_DURATION: 200, // ms
HIT_PUNCH_SCALE: 1.15,
HIT_PUNCH_DURATION: 150, // ms
CHUNK_EAT_DURATION_MS: 200,
AUTO_AIM_CLOSE_RANGE_MULT: 1.5, // times combined head radius
HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)
IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)  /** Body
collider: circle at center; used for separation so entities don't overlap. Head remains for combat. */
BODY_RADIUS_RATIO: 0.4, // Body radius (40% of size) for physical separation
// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
// Player
health: lower so big predator kills in 1-2 chomps (combat scales by size)export const
PLAYER_BASE_MAX_HEALTH = 30;// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this
WANDER_JITTER: 0.05, // Random velocity nudge when no target
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 335
```typescript
// Combat / hit impact constantsexport const
COMBAT = {
HIT_FLASH_DURATION: 200, // ms
HIT_PUNCH_SCALE: 1.15,
HIT_PUNCH_DURATION: 150, // ms
```

#### Snippet at line 826
```typescript
CHUNK_EAT_DURATION_MS: 200,
AUTO_AIM_CLOSE_RANGE_MULT: 1.5, // times combined head radius
```

#### Snippet at line 1181
```typescript
HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)
IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)  /** Body
collider: circle at center; used for separation so entities don't overlap. Head remains for combat. */
BODY_RADIUS_RATIO: 0.4, // Body radius (40% of size) for physical separation
IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
```

#### Snippet at line 1235
```typescript
// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
// Player
health: lower so big predator kills in 1-2 chomps (combat scales by size)export const
PLAYER_BASE_MAX_HEALTH = 30;// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
```

#### Snippet at line 1361
```typescript
PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this
WANDER_JITTER: 0.05, // Random velocity nudge when no target
```

</details>

---

## canvas-game-loop.ts
*Found 32 snippet(s), merged from lines 311 to 1390*

### Context
```fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS (5s).
In prey AI, we add to the flee vector for any entity that is either a bigger predator or matches fleeFromId and now < fleeFromUntil.
So larger prey only run once they’ve been hit; after that they flee from the player for 5 seconds.
Where we set fleeFromId / fleeFromUntil
Player vs fish (both dashing): when the player hits the fish (prey).
Player vs fish (one-sided): when the player hits the fish (prey), in the same block where we handle stamina/exhausted.
Fish vs fish: inside applyAttack, when the target is prey, after applying the attack.
2. Larger fleeing prey don’t counterattack
When both are dashing and the fish is prey and larger than the player (fish.type === 'prey' && player.size < fish.size), we:
Apply the player’s attack on the fish (and set the fish’s fleeFromId / fleeFromUntil when it’s hit).
Do not apply the fish’s attack on the player (playerResult = null).
So when you dash at a bigger prey, they can’t damage you; they only flee after you hit them.
3. Constant
AI.PREY_FLEE_AFTER_HIT_MS: 5000 in lib/game/canvas-constants.ts so the flee-from-attacker duration is tunable.
Lint is clean. Result: larger prey stay until you hit them, then flee for 5s and no longer counterattack when you’re the smaller one.```

### Added Code
```typescript
const
animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;  const
newFish:
FishEntity = {
animationSprite: animSprite,
baseHealth = creature.stats?.health ?? 20;  const
health: baseHealth,
import { getSpawnPositionInBand } from './spawn-position';
: 0;  }
if (gameMode) {    const
nowMs = Date.now();    updateCarcasses(state, nowMs);    updateChunks(state, nowMs);    const
runState = loadRunState();
Adding an optional damage override for the player (from run state). Checking how the renderer is
structured:
onPushChomp: (p) => state.particles.chomp.push({ ...p,
punchScale: p.punchScale ?? 1 }),
onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;        const
dx = ch.x - player.x;        const
dy = ch.y - player.y;        const
d = Math.sqrt(dx * dx + dy * dy) || 1;
Adding chunk-eat scale to the player in the renderer.
}
}    if (gameMode && player.isDashing) {      const
playerHead = getHeadPosition(player);      const
playerHeadR = getHeadRadius(player.size);      let
nearestDist = Infinity;      let
nearestDx = 0;
Adding AI auto-aim for
predators: snap facing when in close range.
fish.vy = (dy / len) * maxSpeed;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
fish.vy = (dy / len) * maxSpeed;            const
targetHeadR =
targetId === 'player' ? getHeadRadius(player.size) : getHeadRadius(others.find((f) => f.id === targetId)?.size ?? fish.size);            const
closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + targetHeadR);            if (distToTarget <= closeRange) fish.facingRight = dx > 0;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
Adding prey close-range facing
snap: set facing from velocity when threatened and within close range. Checking the prey block for a clean insertion
point:
fish.vy = (fleeY / mag) * maxSpeed;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
fish.vy = (fleeY / mag) * maxSpeed;            if (nearestThreatDist < Infinity && nearestThreatDist <= COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + getHeadRadius(fish.size) * 1.5)) {              fish.facingRight = fish.vx > 0;            }            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
Summary of what was
implemented:
player.lungeVy = 0;    } else {
fish.lungeVy = 0;      } else {
if (gameMode) {
if (gameMode) {    // Body
separation: prevent player and fish bodies from overlapping (head colliders stay for combat)    const
bodyPlayer = {
x: player.x,
y: player.y,
size: player.size };    for (const fish of state.fish) {      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed') continue;      resolveBodyOverlap(bodyPlayer, fish);
(attacker as {
attackFlashEndTime: number }).attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;        const
dx = target.x - attacker.x;
attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;          const
}        } else {
}          if (target === fish && fish.type === 'prey') {            fish.fleeFromId = 'player';            fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;          }        } else {
Adding flee-from when a prey is hit in fish-fish
combat:
}          return result;
}          if (target.type === 'prey') {            target.fleeFromId = attacker.id;            target.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;          }          return result;
Summary of
changes:
1. Prey flee only after being hit
```

### Removed Code
```typescript
restoreHunger,  applyAttackToTarget,  applyStaminaCost,} from './stamina-hunger';
DASH_ATTACK_STAMINA_COST,  SWALLOW_SIZE_RATIO,  ATTACK_SIZE_RATIO,
import { getHeadPosition, getHeadRadius } from './canvas-collision';import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME } from './canvas-constants';import {
// Fish-fish collisions (game mode only) - inline head-based logic  if (gameMode) {    const
fishList = state.fish;    const
eatenIds = new Set<string>();
// Fish-fish collisions (game mode only) - inline head-based logic    const
eatenIds = new Set<string>();  // Fish-fish collisions (game mode only) - health-based; death -> carcass + chunks  if (gameMode) {    const
fishList = state.fish;
Replacing the player-fish collision
block: handling KO + player dash, then one-sided and both-dashing attacks.
state.gameMode.fishEaten += 1;        state.eatenIds.add(fish.id);        state.fish.splice(idx, 1);
state.eatenIds.add(fish.id);        state.gameMode.fishEaten += 1;        const
carcassId = spawnCarcass(state, {
x: fish.x,
y: fish.y }, {
size: fish.size });        spawnChunksFromFish(state, fish, {
y: fish.y }, carcassId);        state.fish.splice(idx, 1);
Checking what follows the replaced
block:
Adding updateCarcasses, updateChunks, and checkChunkCollection to the game tick (when gameMode).
if (oneSidedAttack) {
} else if (evenlyMatched && bothDashing) {        const
fishDied = resolveAttack(player, fish, now);        const
playerDied = resolveAttack(fish, player, now);
} else if (playerAttacking) {        const
fishDied = resolveAttack(player, fish, now);        if (fishDied) {
const
canAttack = player.size > fish.size * ATTACK_SIZE_RATIO;      const
playerAttacking = player.isDashing && canAttack;      const
fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;
playerCanAttack = player.size > fish.size;      const
playerAttacking = player.isDashing && playerCanAttack;      const
onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;        const
dx = ch.x - player.x;
updateChunks(state, nowMs);    const
runState = loadRunState();    const
essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));    const
essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));    checkChunkCollection(state, player, runState, {
onPushChomp: (p) => state.particles.chomp.push({ ...p,
punchScale: p.punchScale ?? 1 }),
onChunkCollected: (ch) => {        player.chunkEatEndTime = performance.now() + COMBAT.CHUNK_EAT_DURATION_MS;        const
dx = ch.x - player.x;        const
dy = ch.y - player.y;        const
d = Math.sqrt(dx * dx + dy * dy) || 1;        player.vx += (dx / d) * COMBAT.CHUNK_LUNGE_STRENGTH;        player.vy += (dy / d) * COMBAT.CHUNK_LUNGE_STRENGTH;      },    }, essenceNames, essenceColors);    updateChunks(state, nowMs);
import type { Creature } from './types';import { getHeadPosition, getHeadRadius } from './canvas-collision';import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME, COMBAT } from './canvas-constants';
closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fHeadR);        if (dist <= closeRange && dist < nearestDist) {
nearestDist = dist;
}          if (player.size > fish.size * 1.2) {            const
pdx = fish.x - player.x;            const
pdy = fish.y - player.y;            const
pd = Math.sqrt(pdx * pdx + pdy * pdy);            if (pd < AI_DETECTION_RANGE) {
if (player.size > fish.size * 1.2) {            const
pd = Math.sqrt(pdx * pdx + pdy * pdy);            if (pd < AI_DETECTION_RANGE) {              if (pd < nearestThreatDist)
nearestThreatDist = pd;              if (pd > 0) {                fleeX += pdx / pd;                fleeY += pdy / pd;              }          }
let
nearestThreatDist = Infinity;
nearestThreatDist = Infinity;          const
pdx = fish.x - player.x;          const
pdy = fish.y - player.y;          const
pd = Math.sqrt(pdx * pdx + pdy * pdy);          const
now = performance.now();          const
fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;
Removing the redundant now — the game loop already defines it. Checking its
scope:
if (bothDashingPf) {        const
fishResult =
playerCooldownOk ? applyPlayerFishAttack(player, fish, {
attackerDamage: playerDamage }) : null;        const
playerResult =
fishCooldownOk ? applyPlayerFishAttack(fish, player, {}) : null;
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 311
```typescript
const
animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;  const
newFish:
FishEntity = {
animationSprite: animSprite,
const
animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;  const
baseHealth = creature.stats?.health ?? 20;  const
newFish:
FishEntity = {
animationSprite: animSprite,
health: baseHealth,
```

#### Snippet at line 326
```typescript
import { getSpawnPositionInBand } from './spawn-position';
```

#### Snippet at line 330
```typescript
: 0;  }
```

#### Snippet at line 343
Removed:
```typescript
restoreHunger,  applyAttackToTarget,  applyStaminaCost,} from './stamina-hunger';
```

#### Snippet at line 348
Removed:
```typescript
DASH_ATTACK_STAMINA_COST,  SWALLOW_SIZE_RATIO,  ATTACK_SIZE_RATIO,
```

#### Snippet at line 352
Removed:
```typescript
import { getHeadPosition, getHeadRadius } from './canvas-collision';import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME } from './canvas-constants';import {
```

#### Snippet at line 358
Removed:
```typescript
// Fish-fish collisions (game mode only) - inline head-based logic  if (gameMode) {    const
fishList = state.fish;    const
eatenIds = new Set<string>();
// Fish-fish collisions (game mode only) - inline head-based logic    const
eatenIds = new Set<string>();  // Fish-fish collisions (game mode only) - health-based; death -> carcass + chunks  if (gameMode) {    const
fishList = state.fish;
Replacing the player-fish collision
block: handling KO + player dash, then one-sided and both-dashing attacks.
```

#### Snippet at line 364
Removed:
```typescript
state.gameMode.fishEaten += 1;        state.eatenIds.add(fish.id);        state.fish.splice(idx, 1);
state.eatenIds.add(fish.id);        state.gameMode.fishEaten += 1;        const
carcassId = spawnCarcass(state, {
x: fish.x,
y: fish.y }, {
size: fish.size });        spawnChunksFromFish(state, fish, {
x: fish.x,
y: fish.y }, carcassId);        state.fish.splice(idx, 1);
Checking what follows the replaced
block:
Adding updateCarcasses, updateChunks, and checkChunkCollection to the game tick (when gameMode).
```

#### Snippet at line 371
```typescript
if (gameMode) {    const
nowMs = Date.now();    updateCarcasses(state, nowMs);    updateChunks(state, nowMs);    const
runState = loadRunState();
Adding an optional damage override for the player (from run state). Checking how the renderer is
structured:
```

#### Snippet at line 381
Removed:
```typescript
if (oneSidedAttack) {
```

#### Snippet at line 386
Removed:
```typescript
} else if (evenlyMatched && bothDashing) {        const
fishDied = resolveAttack(player, fish, now);        const
playerDied = resolveAttack(fish, player, now);
```

#### Snippet at line 391
Removed:
```typescript
} else if (playerAttacking) {        const
fishDied = resolveAttack(player, fish, now);        if (fishDied) {
```

#### Snippet at line 537
Removed:
```typescript
const
canAttack = player.size > fish.size * ATTACK_SIZE_RATIO;      const
playerAttacking = player.isDashing && canAttack;      const
fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;
const
canAttack = player.size > fish.size * ATTACK_SIZE_RATIO;      const
playerAttacking = player.isDashing && canAttack;      const
playerCanAttack = player.size > fish.size;      const
playerAttacking = player.isDashing && playerCanAttack;      const
fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;
```

#### Snippet at line 621
```typescript
onPushChomp: (p) => state.particles.chomp.push({ ...p,
punchScale: p.punchScale ?? 1 }),
onPushChomp: (p) => state.particles.chomp.push({ ...p,
punchScale: p.punchScale ?? 1 }),
onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;        const
dx = ch.x - player.x;        const
dy = ch.y - player.y;        const
d = Math.sqrt(dx * dx + dy * dy) || 1;
Adding chunk-eat scale to the player in the renderer.
```

#### Snippet at line 644
```typescript
}
}    if (gameMode && player.isDashing) {      const
playerHead = getHeadPosition(player);      const
playerHeadR = getHeadRadius(player.size);      let
nearestDist = Infinity;      let
nearestDx = 0;
Adding AI auto-aim for
predators: snap facing when in close range.
```

#### Snippet at line 649
```typescript
fish.vy = (dy / len) * maxSpeed;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
fish.vy = (dy / len) * maxSpeed;            const
targetHeadR =
targetId === 'player' ? getHeadRadius(player.size) : getHeadRadius(others.find((f) => f.id === targetId)?.size ?? fish.size);            const
closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + targetHeadR);            if (distToTarget <= closeRange) fish.facingRight = dx > 0;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
Adding prey close-range facing
snap: set facing from velocity when threatened and within close range. Checking the prey block for a clean insertion
point:
```

#### Snippet at line 654
```typescript
fish.vy = (fleeY / mag) * maxSpeed;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
fish.vy = (fleeY / mag) * maxSpeed;            if (nearestThreatDist < Infinity && nearestThreatDist <= COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + getHeadRadius(fish.size) * 1.5)) {              fish.facingRight = fish.vx > 0;            }            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
Summary of what was
implemented:
```

#### Snippet at line 699
Removed:
```typescript
onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;        const
dx = ch.x - player.x;
```

#### Snippet at line 705
```typescript
player.lungeVy = 0;    } else {
```

#### Snippet at line 709
```typescript
fish.lungeVy = 0;      } else {
```

#### Snippet at line 830
Removed:
```typescript
updateChunks(state, nowMs);    const
runState = loadRunState();    const
essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));    const
essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));    checkChunkCollection(state, player, runState, {
onPushChomp: (p) => state.particles.chomp.push({ ...p,
punchScale: p.punchScale ?? 1 }),
const
runState = loadRunState();    const
essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));    const
essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));    checkChunkCollection(state, player, runState, {
onPushChomp: (p) => state.particles.chomp.push({ ...p,
punchScale: p.punchScale ?? 1 }),
onChunkCollected: (ch) => {        player.chunkEatEndTime = performance.now() + COMBAT.CHUNK_EAT_DURATION_MS;        const
dx = ch.x - player.x;        const
dy = ch.y - player.y;        const
d = Math.sqrt(dx * dx + dy * dy) || 1;        player.vx += (dx / d) * COMBAT.CHUNK_LUNGE_STRENGTH;        player.vy += (dy / d) * COMBAT.CHUNK_LUNGE_STRENGTH;      },    }, essenceNames, essenceColors);    updateChunks(state, nowMs);
```

#### Snippet at line 1189
Removed:
```typescript
import type { Creature } from './types';import { getHeadPosition, getHeadRadius } from './canvas-collision';import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME, COMBAT } from './canvas-constants';
```

#### Snippet at line 1194
```typescript
if (gameMode) {
if (gameMode) {    // Body
separation: prevent player and fish bodies from overlapping (head colliders stay for combat)    const
bodyPlayer = {
x: player.x,
y: player.y,
size: player.size };    for (const fish of state.fish) {      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed') continue;      resolveBodyOverlap(bodyPlayer, fish);
```

#### Snippet at line 1198
Removed:
```typescript
const
closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fHeadR);        if (dist <= closeRange && dist < nearestDist) {
nearestDist = dist;
```

#### Snippet at line 1203
```typescript
(attacker as {
attackFlashEndTime: number }).attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;        const
dx = target.x - attacker.x;
```

#### Snippet at line 1207
```typescript
attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;          const
dx = target.x - attacker.x;
```

#### Snippet at line 1329
Removed:
```typescript
}          if (player.size > fish.size * 1.2) {            const
pdx = fish.x - player.x;            const
pdy = fish.y - player.y;            const
pd = Math.sqrt(pdx * pdx + pdy * pdy);            if (pd < AI_DETECTION_RANGE) {
if (player.size > fish.size * 1.2) {            const
pdx = fish.x - player.x;            const
pdy = fish.y - player.y;            const
pd = Math.sqrt(pdx * pdx + pdy * pdy);            if (pd < AI_DETECTION_RANGE) {              if (pd < nearestThreatDist)
nearestThreatDist = pd;              if (pd > 0) {                fleeX += pdx / pd;                fleeY += pdy / pd;              }          }
```

#### Snippet at line 1369
Removed:
```typescript
let
nearestThreatDist = Infinity;
let
nearestThreatDist = Infinity;          const
pdx = fish.x - player.x;          const
pdy = fish.y - player.y;          const
pd = Math.sqrt(pdx * pdx + pdy * pdy);          const
now = performance.now();          const
fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;
Removing the redundant now — the game loop already defines it. Checking its
scope:
```

#### Snippet at line 1375
Removed:
```typescript
const
pd = Math.sqrt(pdx * pdx + pdy * pdy);          const
now = performance.now();          const
fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;
```

#### Snippet at line 1380
Removed:
```typescript
if (bothDashingPf) {        const
fishResult =
playerCooldownOk ? applyPlayerFishAttack(player, fish, {
attackerDamage: playerDamage }) : null;        const
playerResult =
fishCooldownOk ? applyPlayerFishAttack(fish, player, {}) : null;
```

#### Snippet at line 1385
```typescript
}        } else {
}          if (target === fish && fish.type === 'prey') {            fish.fleeFromId = 'player';            fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;          }        } else {
Adding flee-from when a prey is hit in fish-fish
combat:
```

#### Snippet at line 1390
```typescript
}          return result;
}          if (target.type === 'prey') {            target.fleeFromId = attacker.id;            target.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;          }          return result;
Summary of
changes:
1. Prey flee only after being hit
```

</details>

---

## canvas-renderer.ts
*Found 19 snippet(s), merged from lines 416 to 820*

### Context
```Flash FX: blend modes for hit/attack ellipse
Chunk eating: hold dash + cooldown```

### Added Code
```typescript
setLastPlayerAnimAction: (action: string | null) => void;}
setLastPlayerAnimAction: (action: string | null) => void;
carcasses?: CarcassEntity[];
chunks?: ChunkEntity[];}
setLastPlayerAnimAction,  } = options;
setLastPlayerAnimAction,
carcasses = [],
chunks = [],  } = options;  const
currentTime =
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    ctx.globalAlpha = fishOpacity;
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    ctx.globalAlpha = fishOpacity;
drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);
drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);    if (hitFlash) {      ctx.save();      ctx.globalAlpha = 0.55;      ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';      ctx.beginPath();
// Draw player
// Draw carcasses and essence chunks (world layer)  drawCarcasses(ctx, carcasses);  drawChunks(ctx, chunks, essenceColors);  // Draw player
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const
playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  ctx.save();  if (playerHitPunch) {
}
}  if (playerHitFlash) {    ctx.save();    ctx.globalAlpha = 0.55;    ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';    ctx.beginPath();
const
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  ctx.save();
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  ctx.save();  if (playerChunkEat) {    ctx.translate(player.x, player.y);
Implementing squash/stretch: adding lunge-stretch and hit-squash for fish.
: 0;  const
essenceColors = Object.fromEntries(
: 0;  // Combat/animation timers are set with performance.now() in the game loop; use same clock so stretch/squash expire correctly  const
wallNow = typeof performance !== 'undefined' ? performance.now() : Date.now();  const
ctx.save();      ctx.globalAlpha = 0.55;      ctx.save();
ctx.save();      ctx.globalCompositeOperation = 'multiply';      ctx.globalAlpha = 0.55;      ctx.save();      ctx.globalCompositeOperation = 'screen';
ctx.save();    ctx.globalAlpha = 0.55;    ctx.save();
ctx.save();    ctx.globalCompositeOperation = 'multiply';    ctx.globalAlpha = 0.55;    ctx.save();    ctx.globalCompositeOperation = 'screen';
```

### Removed Code
```typescript
import { computeEffectiveMaxStamina } from './stamina-hunger';import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';import { getRunConfig, getDepthBandRules } from './data/level-loader';import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';
const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    const
lungeStretch =
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && wallNow < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && wallNow < fishEntity.hitFlashEndTime!;    const
}    const
attackFlash = (fishEntity.attackFlashEndTime ?? 0) > 0 && currentTime < fishEntity.attackFlashEndTime!;    if (attackFlash) {
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const
playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  const
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && wallNow < player.hitPunchScaleEndTime!;
Setting chunkEatEndTime with performance.now() in the game loop so it matches the renderer.
ctx.globalAlpha = fishOpacity;    if (lungeStretch) {      ctx.translate(fishEntity.x, fishEntity.y);      ctx.rotate(fishAngle);
if (lungeStretch) {    ctx.globalAlpha = fishOpacity;    // One transform at a time so we always return to
normal: prefer hit squash over lunge stretch    if (hitPunch) {      ctx.translate(fishEntity.x, fishEntity.y);      ctx.rotate(fishAngle);
}  if (playerLungeStretch) {    ctx.translate(player.x, player.y);    ctx.rotate(playerAngle);
if (playerLungeStretch) {  }  // One combat transform at a time so we always return to
normal: prefer hit squash over lunge stretch  if (playerHitPunch) {    ctx.translate(player.x, player.y);    ctx.rotate(playerAngle);
Summary of
changes:
1. Time base mismatch (root cause)
Combat timers are set with performance.now() in the game loop, but the renderer was using currentTime (game-relative ms). So currentTime < lungeStartTime + 120 was effectively always true and stretch/squash never turned off.
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 416
```typescript
setLastPlayerAnimAction: (action: string | null) => void;}
setLastPlayerAnimAction: (action: string | null) => void;
carcasses?: CarcassEntity[];
chunks?: ChunkEntity[];}
```

#### Snippet at line 420
```typescript
setLastPlayerAnimAction,  } = options;
setLastPlayerAnimAction,
carcasses = [],
chunks = [],  } = options;  const
currentTime =
```

#### Snippet at line 424
Removed:
```typescript
import { computeEffectiveMaxStamina } from './stamina-hunger';import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';import { getRunConfig, getDepthBandRules } from './data/level-loader';import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';
```

#### Snippet at line 430
```typescript
const
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    ctx.globalAlpha = fishOpacity;
const
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    ctx.globalAlpha = fishOpacity;
```

#### Snippet at line 434
```typescript
drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);
drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);    if (hitFlash) {      ctx.save();      ctx.globalAlpha = 0.55;      ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';      ctx.beginPath();
```

#### Snippet at line 438
```typescript
// Draw player
// Draw carcasses and essence chunks (world layer)  drawCarcasses(ctx, carcasses);  drawChunks(ctx, chunks, essenceColors);  // Draw player
```

#### Snippet at line 442
```typescript
const
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);
const
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const
playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  ctx.save();  if (playerHitPunch) {
```

#### Snippet at line 446
```typescript
}
}  if (playerHitFlash) {    ctx.save();    ctx.globalAlpha = 0.55;    ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';    ctx.beginPath();
```

#### Snippet at line 626
```typescript
const
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  ctx.save();
const
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  ctx.save();  if (playerChunkEat) {    ctx.translate(player.x, player.y);
Implementing squash/stretch: adding lunge-stretch and hit-squash for fish.
```

#### Snippet at line 631
Removed:
```typescript
const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;
```

#### Snippet at line 637
Removed:
```typescript
const
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
```

#### Snippet at line 679
```typescript
: 0;  const
essenceColors = Object.fromEntries(
: 0;  // Combat/animation timers are set with performance.now() in the game loop; use same clock so stretch/squash expire correctly  const
wallNow = typeof performance !== 'undefined' ? performance.now() : Date.now();  const
essenceColors = Object.fromEntries(
```

#### Snippet at line 683
Removed:
```typescript
const
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    const
lungeStretch =
const
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    const
clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const
hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && wallNow < fishEntity.hitPunchScaleEndTime!;    const
hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && wallNow < fishEntity.hitFlashEndTime!;    const
lungeStretch =
```

#### Snippet at line 688
Removed:
```typescript
}    const
attackFlash = (fishEntity.attackFlashEndTime ?? 0) > 0 && currentTime < fishEntity.attackFlashEndTime!;    if (attackFlash) {
```

#### Snippet at line 693
Removed:
```typescript
const
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const
playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  const
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const
playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  const
playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const
playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  const
playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const
playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && wallNow < player.hitPunchScaleEndTime!;
Setting chunkEatEndTime with performance.now() in the game loop so it matches the renderer.
```

#### Snippet at line 714
Removed:
```typescript
ctx.globalAlpha = fishOpacity;    if (lungeStretch) {      ctx.translate(fishEntity.x, fishEntity.y);      ctx.rotate(fishAngle);
if (lungeStretch) {    ctx.globalAlpha = fishOpacity;    // One transform at a time so we always return to
normal: prefer hit squash over lunge stretch    if (hitPunch) {      ctx.translate(fishEntity.x, fishEntity.y);      ctx.rotate(fishAngle);
```

#### Snippet at line 719
Removed:
```typescript
}  if (playerLungeStretch) {    ctx.translate(player.x, player.y);    ctx.rotate(playerAngle);
if (playerLungeStretch) {  }  // One combat transform at a time so we always return to
normal: prefer hit squash over lunge stretch  if (playerHitPunch) {    ctx.translate(player.x, player.y);    ctx.rotate(playerAngle);
Summary of
changes:
1. Time base mismatch (root cause)
Combat timers are set with performance.now() in the game loop, but the renderer was using currentTime (game-relative ms). So currentTime < lungeStartTime + 120 was effectively always true and stretch/squash never turned off.
```

#### Snippet at line 816
```typescript
ctx.save();      ctx.globalAlpha = 0.55;      ctx.save();
ctx.save();      ctx.globalCompositeOperation = 'multiply';      ctx.globalAlpha = 0.55;      ctx.save();      ctx.globalCompositeOperation = 'screen';
```

#### Snippet at line 820
```typescript
ctx.save();    ctx.globalAlpha = 0.55;    ctx.save();
ctx.save();    ctx.globalCompositeOperation = 'multiply';    ctx.globalAlpha = 0.55;    ctx.save();    ctx.globalCompositeOperation = 'screen';
```

</details>

---

## canvas-spawn-sync.ts
*Found 1 snippet(s), merged from lines 1291 to 1291*

### Added Code
```typescript
const
newFish = {
isDashing: false,
baseHealth =
creatureForSprite?.stats?.health ?? 20;          const
health: baseHealth,
Making combat always persist health so targets that lack health get it set on first
hit:
```

---

## canvas-state.ts
*Found 14 snippet(s), merged from lines 242 to 1365*

### Added Code
```typescript
chaseStartTime?: number;
health?: number;
maxHealth?: number;
hitFlashEndTime?: number;
hitPunchScaleEndTime?: number;
deathStartTime?: number;
animations?: CreatureAnimations;
Creating carcass and essence-chunks modules with types and
stubs:
import type { FishLifecycleState } from './combat-states';export type { FishLifecycleState };
import type { FishLifecycleState } from './combat-states';import type { CarcassEntity } from './carcass';import type { ChunkEntity } from './essence-chunks';export type { FishLifecycleState };
lastSmallPreyRespawnTime: number;
carcasses: CarcassEntity[];
chunks: ChunkEntity[];
isExhausted: false,    };
isExhausted: false,
health: 100,
maxHealth: 100,    };
this.lastSmallPreyRespawnTime = 0;  }
this.lastSmallPreyRespawnTime = 0;    this.carcasses = [];    this.chunks = [];  }
this.dashHoldDurationMs = 0;  }
this.dashHoldDurationMs = 0;    this.carcasses = [];    this.chunks = [];  }
this.player.isExhausted = false;
this.player.isExhausted = false;    const
runState = typeof
loadRunState === 'function' ? (loadRunState as () => {
fishState: {
health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {
Checking canvas-state imports and fixing resetPlayer so we don't call loadRunState from canvas-state (avoid circular deps).
Removing the loadRunState call from resetPlayer and setting default health.
chunkEatEndTime?: number;}
chunkEatEndTime?: number;  /** When set, prey flees from this entity (id or 'player') until fleeFromUntil. Set when prey takes damage. */
fleeFromId?: string;
fleeFromUntil?: number;}
```

### Removed Code
```typescript
this.player.isExhausted = false;    const
runState = typeof
loadRunState === 'function' ? (loadRunState as () => {
fishState: {
health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {
const
health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {      this.player.health = 100;      this.player.maxHealth = 100;    }    this.player.isExhausted = false;
Initializing fish health in addFishToState and player health from run state in FishEditorCanvas.
import { HUNGER_MAX, HUNGER_DRAIN_RATE } from './hunger-constants';import { PARTICLES, WORLD_BOUNDS, STAMINA } from './canvas-constants';import { computeEffectiveMaxStamina } from './stamina-hunger';
isExhausted: false,
health: 100,
maxHealth: 100,    };
maxHealth: 100,
health: PLAYER_BASE_MAX_HEALTH,
maxHealth: PLAYER_BASE_MAX_HEALTH,    };
this.player.isExhausted = false;    this.player.health = 100;    this.player.maxHealth = 100;  }
this.player.health = 100;    this.player.maxHealth = 100;    this.player.isExhausted = false;    this.player.health = PLAYER_BASE_MAX_HEALTH;    this.player.maxHealth = PLAYER_BASE_MAX_HEALTH;  }
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 242
```typescript
chaseStartTime?: number;
chaseStartTime?: number;
health?: number;
maxHealth?: number;
hitFlashEndTime?: number;
hitPunchScaleEndTime?: number;
deathStartTime?: number;
```

#### Snippet at line 246
```typescript
animations?: CreatureAnimations;
animations?: CreatureAnimations;
health?: number;
maxHealth?: number;
hitFlashEndTime?: number;
hitPunchScaleEndTime?: number;
deathStartTime?: number;
Creating carcass and essence-chunks modules with types and
stubs:
```

#### Snippet at line 279
```typescript
import type { FishLifecycleState } from './combat-states';export type { FishLifecycleState };
import type { FishLifecycleState } from './combat-states';import type { CarcassEntity } from './carcass';import type { ChunkEntity } from './essence-chunks';export type { FishLifecycleState };
```

#### Snippet at line 283
```typescript
lastSmallPreyRespawnTime: number;
lastSmallPreyRespawnTime: number;
carcasses: CarcassEntity[];
chunks: ChunkEntity[];
```

#### Snippet at line 287
```typescript
isExhausted: false,    };
isExhausted: false,
health: 100,
maxHealth: 100,    };
```

#### Snippet at line 291
```typescript
this.lastSmallPreyRespawnTime = 0;  }
this.lastSmallPreyRespawnTime = 0;    this.carcasses = [];    this.chunks = [];  }
```

#### Snippet at line 295
```typescript
this.dashHoldDurationMs = 0;  }
this.dashHoldDurationMs = 0;    this.carcasses = [];    this.chunks = [];  }
```

#### Snippet at line 299
```typescript
this.player.isExhausted = false;
this.player.isExhausted = false;    const
runState = typeof
loadRunState === 'function' ? (loadRunState as () => {
fishState: {
health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {
Checking canvas-state imports and fixing resetPlayer so we don't call loadRunState from canvas-state (avoid circular deps).
Removing the loadRunState call from resetPlayer and setting default health.
```

#### Snippet at line 305
Removed:
```typescript
this.player.isExhausted = false;    const
runState = typeof
loadRunState === 'function' ? (loadRunState as () => {
fishState: {
health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {
const
runState = typeof
loadRunState === 'function' ? (loadRunState as () => {
fishState: {
health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {      this.player.health = 100;      this.player.maxHealth = 100;    }    this.player.isExhausted = false;
Initializing fish health in addFishToState and player health from run state in FishEditorCanvas.
```

#### Snippet at line 835
```typescript
chunkEatEndTime?: number;}
```

#### Snippet at line 1239
Removed:
```typescript
import { HUNGER_MAX, HUNGER_DRAIN_RATE } from './hunger-constants';import { PARTICLES, WORLD_BOUNDS, STAMINA } from './canvas-constants';import { computeEffectiveMaxStamina } from './stamina-hunger';
```

#### Snippet at line 1244
Removed:
```typescript
isExhausted: false,
health: 100,
maxHealth: 100,    };
health: 100,
maxHealth: 100,
isExhausted: false,
health: PLAYER_BASE_MAX_HEALTH,
maxHealth: PLAYER_BASE_MAX_HEALTH,    };
```

#### Snippet at line 1249
Removed:
```typescript
this.player.isExhausted = false;    this.player.health = 100;    this.player.maxHealth = 100;  }
this.player.health = 100;    this.player.maxHealth = 100;    this.player.isExhausted = false;    this.player.health = PLAYER_BASE_MAX_HEALTH;    this.player.maxHealth = PLAYER_BASE_MAX_HEALTH;  }
```

#### Snippet at line 1365
```typescript
chunkEatEndTime?: number;}
chunkEatEndTime?: number;  /** When set, prey flees from this entity (id or 'player') until fleeFromUntil. Set when prey takes damage. */
fleeFromId?: string;
fleeFromUntil?: number;}
```

</details>

---

## carcass.ts
*Found 5 snippet(s), merged from lines 251 to 841*

### Added Code
```typescript
/** * Carcass
system: spawn, update, and draw carcasses left when a fish dies. * Uses Sprite Lab shared sprite 'carcass'. Carcass fades when all chunks collected or decay time elapses. */
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';
/** * Clear the carcass sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearCarcassSpriteCache(): void {
carcassSpriteCache = null;
```

### Removed Code
```typescript
/** * Draw carcasses to canvas context (camera and zoom applied by caller). */export function drawCarcasses(
ctx: CanvasRenderingContext2D,
* Draw carcasses to canvas context (camera and zoom applied by caller).export function drawCarcasses(
carcasses: CarcassEntity[],
camera: {
x: number;
y: number },
zoom: number): void {/** * Draw carcasses to canvas context (ctx already in world coords with zoom applied by caller). */
img.onload = () => {      const
canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const
ctx = canvas.getContext('2d');      if (ctx) {
const
ctx = canvas.getContext('2d');      if (ctx) {        ctx.drawImage(img, 0, 0);
carcassSpriteCache = canvas;      }    img.onload = () => {
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 251
```typescript
/** * Carcass
system: spawn, update, and draw carcasses left when a fish dies. * Uses Sprite Lab shared sprite 'carcass'. Carcass fades when all chunks collected or decay time elapses. */
```

#### Snippet at line 405
Removed:
```typescript
/** * Draw carcasses to canvas context (camera and zoom applied by caller). */export function drawCarcasses(
ctx: CanvasRenderingContext2D,
* Draw carcasses to canvas context (camera and zoom applied by caller).export function drawCarcasses(
ctx: CanvasRenderingContext2D,
carcasses: CarcassEntity[],
camera: {
x: number;
y: number },
zoom: number): void {/** * Draw carcasses to canvas context (ctx already in world coords with zoom applied by caller). */
```

#### Snippet at line 518
```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';
```

#### Snippet at line 522
Removed:
```typescript
img.onload = () => {      const
canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const
ctx = canvas.getContext('2d');      if (ctx) {
const
canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const
ctx = canvas.getContext('2d');      if (ctx) {        ctx.drawImage(img, 0, 0);
carcassSpriteCache = canvas;      }    img.onload = () => {
```

#### Snippet at line 841
```typescript
/** * Clear the carcass sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearCarcassSpriteCache(): void {
carcassSpriteCache = null;
```

</details>

---

## combat-states.ts
*Found 1 snippet(s), merged from lines 238 to 238*

### Added Code
```typescript
* Combat (subset of active): exhausted, knocked_out */  | 'knocked_out'
* Combat (subset of active): exhausted, knocked_out *
Death: dying (brief state before remove and spawn carcass + chunks) */  | 'knocked_out'  | 'dying'
```

---

## combat.ts
*Found 6 snippet(s), merged from lines 338 to 1338*

### Context
```Now prey also treat the player as a threat when the player is dashing and within detection range (player.isDashing && pd < AI_DETECTION_RANGE), regardless of size.
So: threat = (player is larger) or (player is dashing and in range). In both cases we add the player to the flee vector and update nearestThreatDist, so larger prey run when you dash at them.
2. Damage ramp vs smaller fish – lib/game/combat.ts
Introduced sizeRatioDamageMultiplier(sizeRatio):
sizeRatio >= 1.5: multiplier ramps from 1.5 at 1.5 up to 3.0 at 3.0 (linear: 1.5 + min(sizeRatio - 1.5, 1.5)).
sizeRatio >= 1.2 (and &lt; 1.5): 1.2 (unchanged).
sizeRatio < 0.8: 0.5 (unchanged).
computeHealthDamage and the attackerDamage branch in resolveAttack both use this multiplier.
At 2× size (target half yours), multiplier is 2.0, so e.g. base 6, size 80 → 6×2×2 = 24 damage, which one-shots 20 HP. Bigger size gaps give more damage (up to 3× at 3× size).
Lint is clean. Prey should flee when you dash at them even if they’re bigger, and half-size fish should die in one hit.
now larger prey flee right away, only an attack should trigger the fleeing.  I also just killed myself by attacking a larger prey, seems their dash is triggering an attack

Implementing both fixes: making prey flee only when attacked (set fleeFromId/fleeFromUntil on hit) and preventing fleeing larger prey from counterattacking.
Checking where to set flee-from on hit in the one-sided attack path:
Implementing: adding the constant and FishEntity fields, then updating prey AI and combat.```

### Added Code
```typescript
/** * Combat
resolution: health damage, knockback, hit flash/punch. * Single source for resolveAttack used by the game loop. */
Reading the full fish–fish and player–fish collision sections to replace combat logic.
Adding combat, carcass, and chunk imports to the game
loop:
```

### Removed Code
```typescript
* Does not drain stamina by default. * @returns true if target died (health <= 0).
now: number,
options: {
staminaCost?: number;
knockback?: number;
hitFlashMs?: number;
hitPunchMs?: number } = {}
hitPunchMs?: number } = {} * Does not drain stamina by default. * @param options.attackerDamage - Override damage (e.g. player damage from run state). * @returns true if target died (health <= 0).
const
currentHealth = target.health ?? maxHealth;  const
damage =    options.attackerDamage !=
null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);
null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);  const
currentHealth = target.health ?? maxHealth;  let
damage: number;
Adding carcasses and chunks to the renderer and implementing hit flash and punch. Locating where to draw
them:
Checking camera usage in the
renderer:
if ('health' in target && typeof (target as {
health: number }).health === 'number') {    (target as {
health: number }).health = newHealth;
/** * Size-ratio damage multiplier when attacking smaller targets. Ramps so ~2x size (target half ours) one-shots. */function sizeRatioDamageMultiplier(sizeRatio: number): number {  if (sizeRatio >= 1.5) {
let
d = options.attackerDamage * (attacker.size / 40);    if (sizeRatio >= 1.5) d *= 1.5;    else if (sizeRatio >= 1.2) d *= 1.2;    else if (sizeRatio < 0.8) d *= 0.5;
damage = Math.max(1, Math.floor(d));
if (sizeRatio >= 1.5) d *= 1.5;    else if (sizeRatio >= 1.2) d *= 1.2;    else if (sizeRatio < 0.8) d *= 0.5;    let
d = options.attackerDamage * (attacker.size / 40);    d *= sizeRatioDamageMultiplier(sizeRatio);
Summary of
changes:
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 338
```typescript
/** * Combat
resolution: health damage, knockback, hit flash/punch. * Single source for resolveAttack used by the game loop. */
Reading the full fish–fish and player–fish collision sections to replace combat logic.
Adding combat, carcass, and chunk imports to the game
loop:
```

#### Snippet at line 375
Removed:
```typescript
* Does not drain stamina by default. * @returns true if target died (health <= 0).
now: number,
options: {
staminaCost?: number;
knockback?: number;
hitFlashMs?: number;
hitPunchMs?: number } = {}
options: {
staminaCost?: number;
knockback?: number;
hitFlashMs?: number;
hitPunchMs?: number } = {} * Does not drain stamina by default. * @param options.attackerDamage - Override damage (e.g. player damage from run state). * @returns true if target died (health <= 0).
now: number,
```

#### Snippet at line 397
Removed:
```typescript
const
currentHealth = target.health ?? maxHealth;  const
damage =    options.attackerDamage !=
null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);
const
damage =    options.attackerDamage !=
null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);  const
currentHealth = target.health ?? maxHealth;  let
damage: number;
Adding carcasses and chunks to the renderer and implementing hit flash and punch. Locating where to draw
them:
Checking camera usage in the
renderer:
```

#### Snippet at line 1296
Removed:
```typescript
if ('health' in target && typeof (target as {
health: number }).health === 'number') {    (target as {
health: number }).health = newHealth;
```

#### Snippet at line 1334
Removed:
```typescript
/** * Size-ratio damage multiplier when attacking smaller targets. Ramps so ~2x size (target half ours) one-shots. */function sizeRatioDamageMultiplier(sizeRatio: number): number {  if (sizeRatio >= 1.5) {
```

#### Snippet at line 1338
Removed:
```typescript
let
d = options.attackerDamage * (attacker.size / 40);    if (sizeRatio >= 1.5) d *= 1.5;    else if (sizeRatio >= 1.2) d *= 1.2;    else if (sizeRatio < 0.8) d *= 0.5;
damage = Math.max(1, Math.floor(d));
if (sizeRatio >= 1.5) d *= 1.5;    else if (sizeRatio >= 1.2) d *= 1.2;    else if (sizeRatio < 0.8) d *= 0.5;    let
d = options.attackerDamage * (attacker.size / 40);    d *= sizeRatioDamageMultiplier(sizeRatio);
damage = Math.max(1, Math.floor(d));
Summary of
changes:
```

</details>

---

## dash-constants.ts
*Found 1 snippet(s), merged from lines 485 to 485*

### Context
```Removed SWALLOW_SIZE_RATIO import.
Removed “predator eats KO prey” and “prey eats predator” size-based eat branches in detectFishFishCollisions.
Removed “predator eats prey” and “prey eats predator” size-ratio eat branches; in the stamina battle, removed eatenIds.add(predator.id) and size gain, and only apply KO updates for both.
In detectPlayerFishCollision (gameMode): removed “KO fish can be eaten” and the canSwallow/SWALLOW-based branch; playerAttacking now uses only canAttack (ATTACK_SIZE_RATIO). Removed the “player eats fish” size-based return; for playerAttacking we now return null (combat handled by game loop).
dash-constants.ts: Documented that SWALLOW_SIZE_RATIO is unused by the canvas game loop.
All plan to-dos are done. Lint is clean on the modified files.
ok cool, I see those spawning, we''ll need to use the same rendering style on these sprites that we do on fish, to remove the magenta.

I am seeing inconsistent behaviour when it comes to the player attacking other fish, And he doesnt seem able to only be able to attack fish the same size

Fixing magenta on carcass/chunk sprites and reviewing player attack conditions. Checking how fish sprites are drawn and how combat branches run.
Checking where head overlap is enforced in the player–fish loop and fixing both issues.
Implementing both fixes: applying fish-style magenta removal to carcass and chunk sprites, then relaxing player attack so we can attack any smaller fish.
Apply removeBackground to carcass/chunk sprites to fix magenta
Fix player attack conditions for consistent behavior```

### Added Code
```typescript
// Size thresholdsexport const
SWALLOW_SIZE_RATIO = 2.0;  // Can swallow if ≥2x target size
```

---

## docs/plans/COMBAT_DEATH_CARCASS_ADDENDUM.md
*Found 1 snippet(s), merged from lines 130 to 130*

### Context
```
Here’s what’s going on and how to fix it.
Why you get addendums instead of an updated plan
Plan mode doesn’t allow edits
In Plan (and Ask) mode, the agent is not allowed to change files. So when you say “update the plan,” it can only output new plan text. It can’t actually rewrite the plan file. That’s why you got the full new plan in chat and the tool said it couldn’t write the file.
Two different “homes” for the plan
The plan tool puts the plan in Cursor’s plan storage (e.g. c:\Users\lukel\.cursor\plans\health_combat_and_hit_impact_396f7e4c.plan.md).
Addendums are usually created in the repo (e.g. docs/plans/COMBAT_DEATH_CARCASS_ADDENDUM.md).
So the “real” plan and the corrections live in different places, and later agents see the old plan and maybe one addendum, not one merged doc.
Agents prefer adding over rewriting
Updating a long plan in place is error‑prone, so agents often add a new doc instead of editing the original. That’s why you end up with a mess when you pass it to a new agent.
How to get a single, up‑to‑date plan (and have agents “write” it)
You can’t have the plan tool “write a new plan” in Plan mode in the sense of editing a file — Plan mode is read‑only. You can get one canonical plan file that agents do update, by making the repo the source of truth and using Agent mode for edits.
Keep one plan in the repo
Put the canonical plan in the repo, e.g.```

### Added Code
```typescript
## Module
structure: new scripts (avoid bloating existing code)Implement carcass and chunk behaviour in **dedicated modules**; keep [canvas-game-loop.ts](lib/game/canvas-game-loop.ts), [canvas-state.ts](lib/game/canvas-state.ts), and [canvas-renderer.ts](lib/game/canvas-renderer.ts) thin by delegating to these modules.### New modules
COMBAT_DEATH_CARCASS_ADDENDUM.md(new)
1. **State**
Implement using the **new scripts** above ([lib/game/carcass.ts](lib/game/carcass.ts) and [lib/game/essence-chunks.ts](lib/game/essence-chunks.ts)); keep game loop and renderer thin by calling into these modules.1. **State**
```

### Removed Code
```typescript
3. **Carcass fade**   - Each frame (or in a dedicated update): for each carcass, if (now - spawnTime >= decayTime) **or** (carcass has no remaining chunks), fade out (e.g. opacity over 1–2 s) then remove from `state.carcasses`.4. **Rendering**   - Draw carcasses (position, optional carcass sprite, opacity).
- Each frame (or in a dedicated update): for each carcass, if (now - spawnTime >= decayTime) **or** (carcass has no remaining chunks), fade out (e.g. opacity over 1–2 s) then remove from `state.carcasses`.   - Draw carcasses (position, optional carcass sprite, opacity).   - Draw chunks (position, essence-colored orb or meat chunk sprite).3. **Carcass fade**   - Handled in [lib/game/carcass.ts](lib/game/carcass.ts): `updateCarcasses(state, now)` — for each carcass, if (now - spawnTime >= decayTime) **or** (carcass has no remaining chunks), fade out (e.g. opacity over 1–2 s) then remove from `state.carcasses`.4. **Rendering**
Summary of what was added to the
addendum:
```

---

## docs/plans/COMBAT_HEALTH_CARCASS_HIT_IMPACT.md
*Found 1 snippet(s), merged from lines 204 to 204*

### Context
```Creating a single consolidated plan with CreatePlan. We can't delete files in Plan mode — we'll create the new plan and tell you to remove the old plan and addendum (or switch to Agent mode to delete them).
Single consolidated plan: health-based combat (attack lowers health; health <= 0 means death). On death, spawn carcass and physical essence chunks; essence only from collecting chunks; carcass fades when chunks gone or decay. Remove all size-based instant-remove. Decouple stamina from bites. Add hit/death impact. New scripts for carcass and essence-chunks.
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

Implementing the plan step by step. Checking existing todos and the codebase.
Implementing step 1: adding health and carcass/chunk state. Checking combat-states and spawn/init paths.
Add health/maxHealth and carcass/chunk state; init health on spawn
Implement carcass.ts and essence-chunks.ts; wire Sprite Lab sprites
Implement resolveAttack; replace combat branches in game loop
Add knockback, hit flash, punch, dying state; renderer integration
Align canvas-collision.ts with health-based resolution
Checking where the player is initialized from run state and how resetForRun works:
Implementing step 1: adding 'dying' to FishLifecycleState and health/hit/carcass state.```

---

## essence-chunks.ts
*Found 13 snippet(s), merged from lines 254 to 849*

### Added Code
```typescript
/** * Essence
chunks: physical drops when a fish dies. Player collects by overlap to gain essence. * Uses Sprite Lab shared sprites (meatOrb or per-essence). Links to carcass for fade-when-done. */
Fixing essence-chunks: use CarcassEntity and setCarcassRemainingChunks.
/** * Preload carcass and chunk sprites from Sprite Lab (call once at level start). */export function preloadCarcassAndChunkSprites(): void {  import('./carcass').then((m) => m.preloadCarcassSprite()).catch(() => {});
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
onPushChomp?: (p: ChompParticleLike) => void;  },
if (ch.carcassId) decrementCarcassChunks(state, ch.carcassId);      state.chunks.splice(i, 1);
/** * Clear the chunk (meat orb) sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearChunkSpriteCache(): void {
meatOrbSpriteCache = null;
```

### Removed Code
```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
export function spawnChunksFromFish(
state: {
chunks: ChunkEntity[];
carcasses: {
carcassId: string;
remainingChunks: number }[] },
deadFish: {
creatureData?: Creature;
x: number;
y: number;
size: number },  }
remainingChunks: number }[] },export function spawnChunksFromFish(
state: CanvasStateWithCarcasses & {
chunks: ChunkEntity[] },
*/export function updateChunks(state: {
now: number): void {  for (let
i = state.chunks.length - 1; i >= 0; i--) {      if (ch.carcassId) {
export function updateChunks(state: {
now: number): void { */export function updateChunks(state: CanvasStateWithCarcasses & {
export function checkChunkCollection(
state: CanvasStateWithCarcasses,
player: {
size: number },): void {
state: CanvasStateWithCarcasses,export function checkChunkCollection(
/** * Draw chunks to canvas context. */
chunks: ChunkEntity[],
* Draw chunks to canvas context./** * Draw chunks to canvas context (ctx already in world coords). */
Implementing renderer
changes: adding RenderOptions and hit flash/punch.
img.onload = () => {      const
canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const
ctx = canvas.getContext('2d');      if (ctx) {
const
ctx = canvas.getContext('2d');      if (ctx) {        ctx.drawImage(img, 0, 0);
meatOrbSpriteCache = canvas;      }    img.onload = () => {
Fixing player attack logic so we can attack any smaller fish when
dashing:
import { removeBackground } from '@/lib/rendering/fish-renderer';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 254
```typescript
/** * Essence
chunks: physical drops when a fish dies. Player collects by overlap to gain essence. * Uses Sprite Lab shared sprites (meatOrb or per-essence). Links to carcass for fade-when-done. */
Fixing essence-chunks: use CarcassEntity and setCarcassRemainingChunks.
```

#### Snippet at line 258
Removed:
```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
```

#### Snippet at line 263
Removed:
```typescript
export function spawnChunksFromFish(
state: {
chunks: ChunkEntity[];
carcasses: {
carcassId: string;
remainingChunks: number }[] },
deadFish: {
creatureData?: Creature;
x: number;
y: number;
size: number },  }
state: {
chunks: ChunkEntity[];
carcasses: {
carcassId: string;
remainingChunks: number }[] },export function spawnChunksFromFish(
state: CanvasStateWithCarcasses & {
chunks: ChunkEntity[] },
deadFish: {
creatureData?: Creature;
x: number;
y: number;
size: number },  }
```

#### Snippet at line 268
Removed:
```typescript
*/export function updateChunks(state: {
chunks: ChunkEntity[] },
now: number): void {  for (let
i = state.chunks.length - 1; i >= 0; i--) {      if (ch.carcassId) {
export function updateChunks(state: {
chunks: ChunkEntity[] },
now: number): void { */export function updateChunks(state: CanvasStateWithCarcasses & {
chunks: ChunkEntity[] },
now: number): void {  for (let
i = state.chunks.length - 1; i >= 0; i--) {      if (ch.carcassId) {
```

#### Snippet at line 273
Removed:
```typescript
export function checkChunkCollection(
state: CanvasStateWithCarcasses,
player: {
x: number;
y: number;
size: number },): void {
state: CanvasStateWithCarcasses,export function checkChunkCollection(
state: CanvasStateWithCarcasses & {
chunks: ChunkEntity[] },
player: {
x: number;
y: number;
size: number },): void {
```

#### Snippet at line 323
```typescript
/** * Preload carcass and chunk sprites from Sprite Lab (call once at level start). */export function preloadCarcassAndChunkSprites(): void {  import('./carcass').then((m) => m.preloadCarcassSprite()).catch(() => {});
```

#### Snippet at line 410
Removed:
```typescript
/** * Draw chunks to canvas context. */
chunks: ChunkEntity[],
* Draw chunks to canvas context./** * Draw chunks to canvas context (ctx already in world coords). */
chunks: ChunkEntity[],
Implementing renderer
changes: adding RenderOptions and hit flash/punch.
```

#### Snippet at line 527
```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
```

#### Snippet at line 531
Removed:
```typescript
img.onload = () => {      const
canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const
ctx = canvas.getContext('2d');      if (ctx) {
const
canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const
ctx = canvas.getContext('2d');      if (ctx) {        ctx.drawImage(img, 0, 0);
meatOrbSpriteCache = canvas;      }    img.onload = () => {
Fixing player attack logic so we can attack any smaller fish when
dashing:
```

#### Snippet at line 613
```typescript
onPushChomp?: (p: ChompParticleLike) => void;  },
```

#### Snippet at line 617
```typescript
if (ch.carcassId) decrementCarcassChunks(state, ch.carcassId);      state.chunks.splice(i, 1);
```

#### Snippet at line 844
Removed:
```typescript
import { removeBackground } from '@/lib/rendering/fish-renderer';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
```

#### Snippet at line 849
```typescript
/** * Clear the chunk (meat orb) sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearChunkSpriteCache(): void {
meatOrbSpriteCache = null;
```

</details>

---

## lib/game/canvas-collision.ts
*Found 1 snippet(s), merged from lines 1215 to 1215*

### Context
```Added getBodyRadius(size), BodyEntity interface, and resolveBodyOverlap(a, b) that pushes overlapping body circles apart (each moves half the overlap).```

---

## lib/game/canvas-constants.ts
*Found 2 snippet(s), merged from lines 1213 to 1274*

### Context
```Added PLAYER_BASE_MAX_HEALTH = 30 (tunable in one place).```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 1213

#### Snippet at line 1274

</details>

---

## lib/game/canvas-game-loop.ts
*Found 3 snippet(s), merged from lines 1217 to 1227*

### Context
```In applyPlayerFishAttack: after resolving the attack, set (attacker as { facingRight: boolean }).facingRight = (target.x - attacker.x) > 0.
In fish–fish applyAttack: after resolving the attack, set attacker.facingRight = (target.x - attacker.x) > 0.
Lints are clean. You can tune BODY_RADIUS_RATIO, the 0.2 facing threshold, or drop the f.size < player.size check if you want homing on same-size targets.
Ok i tuned it a little and that feels pretty good.  Can you patch the health as we discussed earlier?  

Running the creature-stats patch and lowering the player's max health so big predators can kill in 1–2 chomps.
Adding a player health constant and running the creature-stats patch.```

<details>
<summary>All individual snippets (click to expand)</summary>

#### Snippet at line 1217

#### Snippet at line 1223

#### Snippet at line 1227

</details>

---

## lib/game/canvas-spawn-sync.ts
*Found 1 snippet(s), merged from lines 1309 to 1309*

### Context
```When creating each fish, set health and maxHealth from creature data, with a default of 20:
baseHealth = creatureForSprite?.stats?.health ?? 20
Add health: baseHealth and maxHealth: baseHealth to the new fish object.```

---

## lib/game/canvas-state.ts
*Found 1 snippet(s), merged from lines 1276 to 1276*

### Context
```Initial state and resetPlayer() now use PLAYER_BASE_MAX_HEALTH instead of 100 for health and maxHealth.
2. Creature stats patch (blob fish)
Ran npx tsx scripts/patch-creature-stats.ts against the dev server.
3 creatures updated (abyssal_mutant_original_abyssal, barreleye_abyssal, rare_tropical) to the suggested health/damage from the analysis.
64 skipped (already at suggested values).
Big predators should now kill the player in about 1–2 chomps, and blob fish use the equalized stats. To change player toughness, edit PLAYER_BASE_MAX_HEALTH in canvas-constants.ts.
ok something aint right, fish seem imortal.  does <0 equal death?  either the fish have a godly amount of health or they are going into the negatives

Checking how death is determined and how health is applied in combat:
Checking whether fish entities have a health property and where it's initialized:
Checking where game-loop fish are created and whether they include health/maxHealth:
Checking how fish are added in canvas-spawn-sync (initial load):
Identifying the cause: fish created in canvas-spawn-sync lack health and maxHealth. Checking the combat path when those are missing:
Identifying the cause: fish created in canvas-spawn-sync.ts (level load) don't have health or maxHealth. Combat uses target.health ?? maxHealth (so undefined → 100) and only writes back when 'health' in target, so their health is never updated and they stay at 100 HP. Adding health and maxHealth when creating fish in canvas-spawn-sync.```

---

## lib/game/carcass.ts
*Found 1 snippet(s), merged from lines 545 to 545*

### Context
```Import removeBackground from @/lib/rendering/fish-renderer.
In preloadCarcassSprite(), after the image loads, set the cache to removeBackground(img) instead of a raw copy of the image. The carcass sprite is drawn from this processed canvas, so the magenta background is removed.```

---

## lib/game/combat.ts
*Found 1 snippet(s), merged from lines 1313 to 1313*

### Context
```Always write the new health back to the target (when it’s a non-null object) so that:
Death is consistent: died: newHealth <= 0 matches the stored health.
Any fish that still gets created without health gets it set on the first hit.
So: death is when health ≤ 0. The bug was that many fish never had health set and combat never updated it. With the spawn-sync fix and the combat write fix, fish now have the correct health (e.g. 20 from your patch) and take damage and die as intended. New games or level loads will see this immediately; already-spawned fish in a running session will only get correct behavior after they’re removed and respawned (or after a reload).
ok lookin better.  Let's address two remaining issues:

1. Prey that are larger than me just sit there and get eaten.  we should have them flee if they get attacked, no matter the size difference.

2. Let's increase the damage bonus on smaller fish to ramp up based on the size difference.  I figure if the fish is half the size, it should go down in one hit



Implementing both changes: locating prey flee logic and the combat damage formula.
Checking the full prey threat loop for context:
Implementing both changes.```

---

## lib/game/essence-chunks.ts
*Found 1 snippet(s), merged from lines 548 to 548*

### Context
```Checking key spots to confirm what's implemented and what's left:
Creating the plan:
Plan that lists what is already implemented from the Combat Polish spec and what remains (squash/stretch, auto-aim, chunk-eating lunge and animation), with concrete steps to finish the remaining work.
Implementing the plan's remaining items: marking the first todo in progress and starting chunk-eating lunge + animation.
Cooldown + remove size gates
Flashes and hurt (red hit, white attack, trigger hurt)
Damage numbers (push particle, float up + fade)
Lunge (dart + rubberband)
Squash/stretch in renderer
Auto-aim (player + AI close range)
Chunk-eating (lunge, animation, essence numbers)
Chunk-eating lunge + animation
Squash/stretch in renderer
Auto-aim (player + AI close range)
Implementing chunk-eating: adding the callback in essence-chunks and wiring it in the game loop.```

---

## scripts/patch-creature-stats.ts
*Found 1 snippet(s), merged from lines 1015 to 1015*

### Context
```Only update nearestDist / nearestDx / nearestDy when dist <= closeRange && dist < nearestDist && facingDot > 0 (or > 0.2). Optionally add && f.size < player.size.
That gives you:
Proper body collision (no overlapping bodies; head colliders unchanged).
Homing only on targets the player is facing (and optionally only on smaller prey).
If you switch to Agent mode, I can apply these edits in the repo for you.
Yeah, we are gonna plan this first.  Oh and your note about the lock on assist from hungry shark is a good observation, we can probably use that too in order to get closer to hungry shark gameplay.  

Gathering the exact code locations and flow so we can produce an accurate plan that includes bite-time assist.
Checking AI predator homing for consistency:
Creating the plan.
Add body colliders with separation so fish/player do not overlap, restrict movement homing to targets the attacker is facing (and optionally smaller prey), and add bite-time lock-on (snap facing toward target when the bite triggers) for Hungry Shark-style feel.
Implementing the plan step by step: checking todos and applying changes.
Add body collision (separation) so fish/player bodies do not overlap
Restrict homing to targets the attacker is facing only
Bite-time lock-on (snap facing toward target when bite connects)```

---

