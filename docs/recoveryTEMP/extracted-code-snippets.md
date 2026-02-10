# Extracted Code Snippets from Copypasta

Generated: 2026-02-09T15:58:32.499Z

Total files: 21

---


## SpriteGenerationLab.tsx

*Found 2 snippet(s), merged from lines 875 to 879*

### Context (before snippet)

```
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
analyze-creature-stats.ts(new)
Adding the body-separation pass and updating the game-loop import:
```

### Added Code

```typescript
await saveSharedSprite(key, blob);
      }
await saveSharedSprite(`essence_${essenceId}`, blob);
      }
#!/usr/bin/env tsx/** * Pull creature data from blob (via /api/list-creatures) and analyze combat stats * (size, health, damage). Outputs a report and suggested normalized stats so that * size-based scaling in combat dominates and battles feel more consistent.
cd d:\Prototyping\fish-pwa;
 npx tsx scripts/analyze-creature-stats.ts --from-snapshot
npm notice New major version of npm available! 10.8.2 -> 11.9.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.9.0
npm notice To update run: npm install -g npm@11.9.0
npm notice
README.md
+18
## Creature stats analysis (combat balance)Combat scales damage by `attacker.size/40` and size-ratio modifiers. If base health/damage vary too much across fish, battles feel inconsistent (instant vs drag). To pull blob creature data and analyze stats:```bash
Summary of what’s in place:
1. Script: scripts/analyze-creature-stats.ts
Fetch from blob: Calls GET /api/list-creatures (dev server must be running at FISH_PWA_BASE_URL or http://localhost:3000).
Or use snapshot: With --from-snapshot, reads docs/plans/LEVEL-REFACTOR/blob-snapshot.json (no dev server).
Normalization: Uses normalizeCreature from lib/game/data/creature-loader.ts so stats match what the game uses (defaults: size 60, health 20, damage 5).
Analysis: Computes min/max/mean for size, health, and damage (overall and by type: prey, predator, mutant).
Suggested stats: Proposes a narrow band so size drives combat: health 20, damage 4 (prey), 6 (predator), 5 (mutant).
2. Outputs
docs/plans/CREATURE_STATS_ANALYSIS.md — Report with overall and per-type tables and a per-creature table (current → suggested).
scripts/creature-stats-analysis.json — Same data as JSON (overall, byType, rows with suggested health/damage) for a future batch-update script.
3. Run
From snapshot (already run):
npx tsx scripts/analyze-creature-stats.ts --from-snapshot
From live blob: start dev server, then
npx tsx scripts/analyze-creature-stats.ts
4. Snapshot run
Used the existing snapshot (65 creatures). Current spread: size 20–120, health 15–80, damage 3–35. Suggested values are in the report and JSON.
5. README
scripts/README.md now has a “Creature stats analysis (combat balance)” section with the commands above.
To refresh blob data before analyzing, run npx tsx scripts/download-blob-snapshot.ts (with dev server), then npx tsx scripts/analyze-creature-stats.ts --from-snapshot. Applying the suggested stats to blob would need a small batch script (e.g. reading creature-stats-analysis.json and calling the save-creature API);
 I can outline or add that next if you want.
We have some patch scripts dont we?  Hopinmg you can just run a patch to equalize the fish Health and damage for now, based on this new combat math
Checking how patch scripts work and whether they can update creature stats (health, damage).
Adding a small patch script that applies the analysis' suggested health/damage to blob creatures via the save-creature API. Checking the save-creature API to see the expected payload:
Creating a patch script that applies the analysis' suggested health and damage to blob creatures.
patch-creature-stats.ts(new)
+129
#!/usr/bin/env tsx/** * Patch blob-stored creatures with equalized health and damage from * scripts/creature-stats-analysis.json (based on analyze-creature-stats.ts). * Combat scales by size, so we set base health/damage to a tight range.
Running a dry run to verify the patch, then applying it.
cd /d d:\Prototyping\fish-pwa && npx tsx scripts/patch-creature-stats.ts --dry-run
The token '&&' is not a valid statement separator in this version.
+ CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
+ FullyQualifiedErrorId : InvalidEndOfLine
Set-Location d:\Prototyping\fish-pwa;
 npx tsx scripts/patch-creature-stats.ts --dry-run
Updated: 37
Skipped (no patch or already equal): 30
Failed: 0
Total: 67
Running the patch for real (dev server must be running).
npx tsx scripts/patch-creature-stats.ts
Patch completed. Adding a short note to the scripts README about the new script:
+10
**Apply suggested stats to blob creatures (equalize health/damage):**```bash# Dev server must be runningnpx tsx scripts/patch-creature-stats.ts --dry-run   # preview changes
Summary:
Patch script added and run
scripts/patch-creature-stats.ts
Reads suggested health/damage from scripts/creature-stats-analysis.json (from analyze-creature-stats.ts).
Fetches creatures from /api/list-creatures, then for each creature that has a row in the analysis, sets stats.health and stats.damage to the suggested values (size/speed unchanged).
POSTs metadata-only to /api/save-creature (no sprite changes).
Supports --dry-run to only log what would change.
Patch run
37 creatures updated with equalized stats (health 20;
 damage 4 prey / 5 mutant / 6 predator).
30 skipped (no analysis row or already at suggested values).
0 failed.
Docs
scripts/README.md now describes how to run the stats patch (dry-run and apply).
How to run again later
# Dev server must be runningnpx tsx scripts/analyze-creature-stats.ts   # refresh analysis if needednpx tsx scripts/patch-creature-stats.ts --dry-run   # previewnpx tsx scripts/patch-creature-stats.ts             # apply
Ok we should probably lower the health, especially the player.  Let's figure it should take 1-2 chomps for a big fish to eat a small fish.
Also, it turns out the homing we added to attacks has a pitfall... i cannot dash away from larger predators, and get stuck.  I also home in on fish i mean to dash by.  Trying to think of a good solution here.
I had a very strange experience where i got stuck inside a predator where he was unable to attack me but I could attack him...
Tracing the combat math, homing logic, and attack/collision behavior so we can tune health and fix the homing and stuck-inside issues.
Checking attack/collision resolution and the "stuck inside" scenario:
Checking the full player–fish combat block and how overlap affects who can attack:
Checking where player maxHealth is set and whether run-state overrides it:
Here’s a concise breakdown and what to change.
1. Health: 1–2 chomps and “especially the player”
Current numbers
Player: health / maxHealth are 100 in canvas-state.ts (init and resetPlayer()).
Fish: blob data uses 20 (from the stats patch).
Damage (lib/game/combat.ts):
baseDamage * (attacker.size / 40) then size-ratio: ≥1.5× → ×1.5, ≥1.2× → ×1.2, &lt;
0.8× → ×0.5.
Rough “big eats small” math
Big predator (e.g. size 100, damage 6) vs small (size 30):
6 * (100/40) * 1.5 = 22.5 → 22 per chomp.
Small fish health 20 → 1 chomp already.
Same big vs player (size ~40–60, health 100):
~22–25 per chomp → ~4–5 chomps to kill.
So “1–2 chomps for a big fish to eat a small fish” is already true for fish;
 the outlier is the player at 100 HP.
Concrete change
Lower player health so a big predator kills in 1–2 chomps (e.g. 2 chomps × 22 ≈ 44 → use ~25–40).
Places to edit:
lib/game/canvas-state.ts: initial health: 100, maxHealth: 100 and the same in resetPlayer() (lines 199–200, 303–304).
Either hardcode something like 25 or 30, or add a constant (e.g. in canvas-constants.ts) and use it here and in resetPlayer().
Optionally lower fish base health (e.g. 10–15) so even mid-sized fish get 1–2 chomps from big ones;
 that would be in the stats patch / creature data (e.g. scripts/creature-stats-analysis.json suggested values and re-run patch-creature-stats.ts), not in canvas-state.
2. Homing: can’t dash away, and homing on fish you’re passing
What the code does
In canvas-game-loop.ts (around 204–243), when player.isDashing the code picks the single nearest fish within closeRange (AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fishHeadR)) and blends velocity 60% toward that fish, regardless of size or intent.
So:
You get pulled toward bigger predators when you’re trying to dash away.
You get pulled toward any nearby fish when you’re trying to dash past.
Fixes that fit the current design
Only home onto valid attack targets (smaller than you)
When building the “nearest” candidate, skip fish with fish.size > player.size (or use the same rule as combat, e.g. ATTACK_SIZE_RATIO). Then homing only pulls you toward things you can actually attack;
 dashing past small fish can still get a bit of pull, but you’re never steered toward a bigger predator.
Never home when the nearest fish is a threat
If the nearest fish in range is larger than the player, don’t apply homing at all (leave velocity as the raw input). That directly fixes “can’t dash away from larger predators.”
Combine both
Consider only fish where fish.size <= player.size (or your chosen attack threshold).
Among those, if the nearest one is still “threat” (e.g. larger than player), still don’t home.
That gives: no homing toward big predators, homing only toward smaller (or same-size) targets when you’re in range.
Softer homing
Reduce the blend (e.g. from 0.6 to 0.3) or shrink AUTO_AIM_CLOSE_RANGE_MULT so homing only kicks in when very close;
 that reduces “sticky” passing-by without changing logic.
Where to implement
Same block in canvas-game-loop.ts where you loop over state.fish, compute closeRange, and choose nearestDist / nearestDx / nearestDy. Add a size check (and optionally “nearest is threat” check) before treating a fish as a homing target and before applying the velocity blend.
3. Stuck inside a predator / he can’t attack but you can
What’s going on
Overlap is detected with head positions and head radii;
 when you’re “inside” each other, dist < playerHeadR + fishHeadR every frame, so you keep entering the combat block.
When both are dashing you apply both attacks in the same frame (applyPlayerFishAttack(player, fish) and applyPlayerFishAttack(fish, player)), then both are on ATTACK_COOLDOWN_MS (400 ms).
So the situation where you can attack and he can’t almost certainly means the predator stopped dashing (e.g. out of stamina → isDashing === false). Then, next frame, only the player is dashing, so only applyPlayerFishAttack(player, fish) runs. The predator keeps taking damage and can’t counter because he’s exhausted and no longer “attacking.”
So it’s less “bug when overlapping” and more “exhausted predator stuck in overlap with a still-dashing player.”
Things that help
Separation when overlapping
When dist < playerHeadR + fishHeadR (and maybe dist very small), apply a small push-apart along the axis between player and fish (e.g. move both apart so they don’t share the same spot). That prevents staying stuck inside each other and can give the predator a chance to get a clean bite or escape when he has stamina again.
Knockback
You already have knockback in resolveAttack. If overlap is deep, knockback might not be enough to separate in one frame. Slightly stronger knockback or an extra separation step when dist is below a threshold could help.
Stamina tuning
So the predator doesn’t exhaust too fast in a head-on fight (e.g. AI_DASH_STAMINA_DRAIN_RATE or prey/predator stamina in dash-constants.ts / AI), if you want him to get 1–2 chomps in before going exhausted.
Implementing the separation (push-apart when overlapping) in the same place you do player–fish collision would address the “stuck inside” feel and work together with the homing change so you can actually dash away from big predators.
how do you think the hungry shark game handles the homing?  Trying to think of other similar games and how they handle it
Here’s how these games usually handle it and how that maps to your homing issues.
How Hungry Shark–style games usually work
Movement
No movement homing. Your shark goes where you steer (tilt/stick). The game doesn’t pull your trajectory toward prey or predators.
So you never get “stuck” moving toward a big predator, and you don’t accidentally curve onto a fish you were trying to pass.
“Lock-on” / assist
Assist is usually at the moment of the bite, not during travel:
Hitbox / overlap: If you’re close and roughly facing the prey when you boost through, the bite counts. No need to curve your path.
Lunge / snap on bite: When you’re in range and the game decides “this is the bite,” it might do a short lunge or snap facing toward that target so the bite feels locked. Your ongoing movement direction is still what you chose;
 the assist is a one-off correction for the attack, not a continuous pull.
So “homing” (if any) is bite-time assist, not steering your dash toward the nearest fish.
Prey vs predator
Prey: you chase by turning toward them;
 no auto-pull.
Predators: you avoid by turning away;
 the game doesn’t pull you toward them.
So in Hungry Shark–style design, homing on movement is exactly what they avoid;
 your problems (can’t dash away, homing onto fish you’re passing) are the direct result of steering being tied to “nearest fish” instead of to input.
Pattern that fits your game
No velocity homing
Dash direction = input only. You can always dash away from big predators and dash past small fish without being pulled.
Assist only when the bite happens
When overlap (or “in range”) is detected and the attack fires:
Snap facing to the target, and/or
Apply the existing lunge toward the target for that one bite.
So the bite feels locked, but your path isn’t bent toward the nearest fish every frame.
Optional: “intent” for who gets the bite
If multiple fish are in range, pick target by:
Facing: who’s most in front of the player, or
Stick/input: who’s closest to the direction you’re holding.
That way “who I’m trying to bite” matches “who I’m moving toward” without changing your velocity.
So: think of it like Hungry Shark — movement = your input;
 “homing” only at bite time (facing + lunge). That’s the clean way to get their feel and fix your homing pitfalls.
the hungry shark player definitely has a lock on of sorts but it's very intuitive and smooth.  I just realized that one of our biggest issues might be the fact that our fish dont have real collision and get stuck overlapping eachother.
I like the idea of homing only working on smaller prey, or a fish you can kill with the next bite, so hold on to that, but let's first see if we can:
1: Get proper collision working so body colliders dont overlap for player/ai fish, and predators/prey.  Head colliders are fine to be kinematic.   This is Unity terminology so I am open to a more react friendly solution
2: Only home in on a target that the attacker is facing.  Between this and proper collision, the player should be able to escape a large predator, and skirt around fish they do not want to eat while dashing
Implementing body collision (separation so fish don't overlap) and restricting homing to targets the attacker is facing. Inspecting the current movement and collision flow.
Checking where positions are updated and the order of operations in the game loop:
Searching for where fish positions are updated in the game loop:
Implementing body collision (separation) and restricting homing to targets the attacker is facing.
Checking the previous edit results and continuing.
Applying the edits.
Edits are being blocked (ask mode). Providing the exact code changes so you can apply them or switch to Agent mode and I’ll apply them.
1. Body collision (separation)
A. lib/game/canvas-constants.ts – add body radius constant:
// Inside COLLISION, after HEAD_RADIUS_RATIO:  /** Body collider: circle at center;
 used for separation so entities don't overlap. Head remains for combat. */  BODY_RADIUS_RATIO: 0.4, // Body radius (40% of size) for physical separation
B. lib/game/canvas-collision.ts – add body radius + separation:
After getHeadRadius, add:
/** * Get body radius for physical separation (center circle). Prevents overlap;
 head colliders stay for combat. */export function getBodyRadius(size: number): number {  return size * COLLISION.BODY_RADIUS_RATIO;
}/** Entity with position and size for body separation (player or fish). */export interface BodyEntity {  x: number;
  y: number;
  size: number;
}/** * Resolve body overlap: push two entities apart so their body circles don't overlap. * Mutates a.x/y and b.x/y. Call after movement each frame. */export function resolveBodyOverlap(a: BodyEntity, b: BodyEntity): void {  const aR = getBodyRadius(a.size);
  const bR = getBodyRadius(b.size);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = aR + bR;
  if (dist >= minDist || dist < 1e-6) return;
  const overlap = minDist - dist;
  const axisX = dx / dist;
  const axisY = dy / dist;
  const half = overlap * 0.5;
  a.x -= axisX * half;
  a.y -= axisY * half;
  b.x += axisX * half;
  b.y += axisY * half;
}
C. lib/game/canvas-game-loop.ts – run separation after movement:
At top: extend the collision import to include getBodyRadius and resolveBodyOverlap from ./canvas-collision.
After the fish movement loop (after fish.y = Math.max(b.minY, Math.min(b.maxY, fish.y));
 and the closing });
 of the fish forEach, around line 1111), add a body separation pass:
// Body separation: prevent player and fish bodies from overlapping (head colliders stay for combat)  if (gameMode) {    const bodyPlayer = { x: player.x, y: player.y, size: player.size };
    for (const fish of state.fish) {      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed') continue;
      resolveBodyOverlap(bodyPlayer, fish);
    }    player.x = bodyPlayer.x;
    player.y = bodyPlayer.y;
    for (let i = 0;
 i < state.fish.length;
 i++) {      const fishA = state.fish[i];
      if ((fishA.opacity ?? 1) < 1 || fishA.lifecycleState === 'removed') continue;
      for (let j = i + 1;
 j < state.fish.length;
 j++) {        const fishB = state.fish[j];
        if ((fishB.opacity ?? 1) < 1 || fishB.lifecycleState === 'removed') continue;
        resolveBodyOverlap(fishA, fishB);
      }    }  }
So: add constant, add getBodyRadius + BodyEntity + resolveBodyOverlap, then run this block once per frame after all fish (and player) have moved.
2. Homing only when attacker is facing the target
lib/game/canvas-game-loop.ts – in the player homing block (where you pick nearestDist / nearestDx / nearestDy):
When considering each fish f, only allow it as a homing target if the player is facing the fish. Facing = direction from player to fish has positive dot with the player’s facing direction.
Player facing direction: (player.facingRight ? 1 : -1) on x, 0 on y (or use head position vs center). So toTargetX = fHead.x - playerHead.x, toTargetY = fHead.y - playerHead.y;
 then facingDot = toTargetX * (player.facingRight ? 1 : -1). Only consider this fish if facingDot > 0 (or > 0.2 for a small tolerance).
Optional (as you said): also require that the target is smaller than the player so we only home onto prey we can kill: f.size < player.size (or use your attack size ratio). Then: only run the “nearest in range” logic for fish that satisfy facing (and optionally size).
Concretely, inside the loop over state.fish where you currently do:
if (dist <= closeRange && dist < nearestDist) {  nearestDist = dist;
  nearestDx = dx;
  nearestDy = dy;
}
Change to:
Compute facingDot = dx * (player.facingRight ? 1 : -1) (dx, dy are already from player head to fish head).
Only update nearestDist / nearestDx / nearestDy when dist <= closeRange && dist < nearestDist && facingDot > 0 (or > 0.2). Optionally add && f.size < player.size.
That gives you:
Proper body collision (no overlapping bodies;
 head colliders unchanged).
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
Bite-time lock-on (snap facing toward target when bite connects)
canvas-constants.ts
+2
HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)  IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)  /** Body collider: circle at center;
 used for separation so entities don't overlap. Head remains for combat. */  BODY_RADIUS_RATIO: 0.4, // Body radius (40% of size) for physical separation  IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
canvas-collision.ts
+36
/** * Get body radius for physical separation (center circle). Prevents overlap;
 head colliders stay for combat. */export function getBodyRadius(size: number): number {  return size * COLLISION.BODY_RADIUS_RATIO;

```

### All Snippets (for reference)

#### Snippet at line 875

```typescript
        await saveSharedSprite(key, blob);      }
```

#### Snippet at line 879

```typescript
        await saveSharedSprite(`essence_${essenceId}`, blob);      }
#!/usr/bin/env tsx/** * Pull creature data from blob (via /api/list-creatures) and analyze combat stats * (size, health, damage). Outputs a report and suggested normalized stats so that * size-based scaling in combat dominates and battles feel more consistent.
cd d:\Prototyping\fish-pwa; npx tsx scripts/analyze-creature-stats.ts --from-snapshot
npm notice New major version of npm available! 10.8.2 -> 11.9.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.9.0
npm notice To update run: npm install -g npm@11.9.0
npm notice
README.md
+18
## Creature stats analysis (combat balance)Combat scales damage by `attacker.size/40` and size-ratio modifiers. If base health/damage vary too much across fish, battles feel inconsistent (instant vs drag). To pull blob creature data and analyze stats:```bash
Summary of what’s in place:
1. Script: scripts/analyze-creature-stats.ts
Fetch from blob: Calls GET /api/list-creatures (dev server must be running at FISH_PWA_BASE_URL or http://localhost:3000).
Or use snapshot: With --from-snapshot, reads docs/plans/LEVEL-REFACTOR/blob-snapshot.json (no dev server).
Normalization: Uses normalizeCreature from lib/game/data/creature-loader.ts so stats match what the game uses (defaults: size 60, health 20, damage 5).
Analysis: Computes min/max/mean for size, health, and damage (overall and by type: prey, predator, mutant).
Suggested stats: Proposes a narrow band so size drives combat: health 20, damage 4 (prey), 6 (predator), 5 (mutant).
2. Outputs
docs/plans/CREATURE_STATS_ANALYSIS.md — Report with overall and per-type tables and a per-creature table (current → suggested).
scripts/creature-stats-analysis.json — Same data as JSON (overall, byType, rows with suggested health/damage) for a future batch-update script.
3. Run
From snapshot (already run):
npx tsx scripts/analyze-creature-stats.ts --from-snapshot
From live blob: start dev server, then
npx tsx scripts/analyze-creature-stats.ts
4. Snapshot run
Used the existing snapshot (65 creatures). Current spread: size 20–120, health 15–80, damage 3–35. Suggested values are in the report and JSON.
5. README
scripts/README.md now has a “Creature stats analysis (combat balance)” section with the commands above.
To refresh blob data before analyzing, run npx tsx scripts/download-blob-snapshot.ts (with dev server), then npx tsx scripts/analyze-creature-stats.ts --from-snapshot. Applying the suggested stats to blob would need a small batch script (e.g. reading creature-stats-analysis.json and calling the save-creature API); I can outline or add that next if you want.
We have some patch scripts dont we?  Hopinmg you can just run a patch to equalize the fish Health and damage for now, based on this new combat math

Checking how patch scripts work and whether they can update creature stats (health, damage).
Adding a small patch script that applies the analysis' suggested health/damage to blob creatures via the save-creature API. Checking the save-creature API to see the expected payload:
Creating a patch script that applies the analysis' suggested health and damage to blob creatures.
patch-creature-stats.ts(new)
+129
#!/usr/bin/env tsx/** * Patch blob-stored creatures with equalized health and damage from * scripts/creature-stats-analysis.json (based on analyze-creature-stats.ts). * Combat scales by size, so we set base health/damage to a tight range.
Running a dry run to verify the patch, then applying it.
cd /d d:\Prototyping\fish-pwa && npx tsx scripts/patch-creature-stats.ts --dry-run
The token '&&' is not a valid statement separator in this version.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : InvalidEndOfLine
 
Set-Location d:\Prototyping\fish-pwa; npx tsx scripts/patch-creature-stats.ts --dry-run
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
Patch completed. Adding a short note to the scripts README about the new script:
README.md
+10
**Apply suggested stats to blob creatures (equalize health/damage):**```bash# Dev server must be runningnpx tsx scripts/patch-creature-stats.ts --dry-run   # preview changes
Summary:
Patch script added and run
scripts/patch-creature-stats.ts
Reads suggested health/damage from scripts/creature-stats-analysis.json (from analyze-creature-stats.ts).
Fetches creatures from /api/list-creatures, then for each creature that has a row in the analysis, sets stats.health and stats.damage to the suggested values (size/speed unchanged).
POSTs metadata-only to /api/save-creature (no sprite changes).
Supports --dry-run to only log what would change.
Patch run
37 creatures updated with equalized stats (health 20; damage 4 prey / 5 mutant / 6 predator).
30 skipped (no analysis row or already at suggested values).
0 failed.
Docs
scripts/README.md now describes how to run the stats patch (dry-run and apply).
How to run again later
# Dev server must be runningnpx tsx scripts/analyze-creature-stats.ts   # refresh analysis if needednpx tsx scripts/patch-creature-stats.ts --dry-run   # previewnpx tsx scripts/patch-creature-stats.ts             # apply
Ok we should probably lower the health, especially the player.  Let's figure it should take 1-2 chomps for a big fish to eat a small fish.  



Also, it turns out the homing we added to attacks has a pitfall... i cannot dash away from larger predators, and get stuck.  I also home in on fish i mean to dash by.  Trying to think of a good solution here.



I had a very strange experience where i got stuck inside a predator where he was unable to attack me but I could attack him...  

Tracing the combat math, homing logic, and attack/collision behavior so we can tune health and fix the homing and stuck-inside issues.
Checking attack/collision resolution and the "stuck inside" scenario:
Checking the full player–fish combat block and how overlap affects who can attack:
Checking where player maxHealth is set and whether run-state overrides it:
Here’s a concise breakdown and what to change.
1. Health: 1–2 chomps and “especially the player”
Current numbers
Player: health / maxHealth are 100 in canvas-state.ts (init and resetPlayer()).
Fish: blob data uses 20 (from the stats patch).
Damage (lib/game/combat.ts):
baseDamage * (attacker.size / 40) then size-ratio: ≥1.5× → ×1.5, ≥1.2× → ×1.2, &lt;0.8× → ×0.5.
Rough “big eats small” math
Big predator (e.g. size 100, damage 6) vs small (size 30):
6 * (100/40) * 1.5 = 22.5 → 22 per chomp.
Small fish health 20 → 1 chomp already.
Same big vs player (size ~40–60, health 100):
~22–25 per chomp → ~4–5 chomps to kill.
So “1–2 chomps for a big fish to eat a small fish” is already true for fish; the outlier is the player at 100 HP.
Concrete change
Lower player health so a big predator kills in 1–2 chomps (e.g. 2 chomps × 22 ≈ 44 → use ~25–40).
Places to edit:
lib/game/canvas-state.ts: initial health: 100, maxHealth: 100 and the same in resetPlayer() (lines 199–200, 303–304).
Either hardcode something like 25 or 30, or add a constant (e.g. in canvas-constants.ts) and use it here and in resetPlayer().
Optionally lower fish base health (e.g. 10–15) so even mid-sized fish get 1–2 chomps from big ones; that would be in the stats patch / creature data (e.g. scripts/creature-stats-analysis.json suggested values and re-run patch-creature-stats.ts), not in canvas-state.
2. Homing: can’t dash away, and homing on fish you’re passing
What the code does
In canvas-game-loop.ts (around 204–243), when player.isDashing the code picks the single nearest fish within closeRange (AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fishHeadR)) and blends velocity 60% toward that fish, regardless of size or intent.
So:
You get pulled toward bigger predators when you’re trying to dash away.
You get pulled toward any nearby fish when you’re trying to dash past.
Fixes that fit the current design
Only home onto valid attack targets (smaller than you)
When building the “nearest” candidate, skip fish with fish.size > player.size (or use the same rule as combat, e.g. ATTACK_SIZE_RATIO). Then homing only pulls you toward things you can actually attack; dashing past small fish can still get a bit of pull, but you’re never steered toward a bigger predator.
Never home when the nearest fish is a threat
If the nearest fish in range is larger than the player, don’t apply homing at all (leave velocity as the raw input). That directly fixes “can’t dash away from larger predators.”
Combine both
Consider only fish where fish.size <= player.size (or your chosen attack threshold).
Among those, if the nearest one is still “threat” (e.g. larger than player), still don’t home.
That gives: no homing toward big predators, homing only toward smaller (or same-size) targets when you’re in range.
Softer homing
Reduce the blend (e.g. from 0.6 to 0.3) or shrink AUTO_AIM_CLOSE_RANGE_MULT so homing only kicks in when very close; that reduces “sticky” passing-by without changing logic.
Where to implement
Same block in canvas-game-loop.ts where you loop over state.fish, compute closeRange, and choose nearestDist / nearestDx / nearestDy. Add a size check (and optionally “nearest is threat” check) before treating a fish as a homing target and before applying the velocity blend.
3. Stuck inside a predator / he can’t attack but you can
What’s going on
Overlap is detected with head positions and head radii; when you’re “inside” each other, dist < playerHeadR + fishHeadR every frame, so you keep entering the combat block.
When both are dashing you apply both attacks in the same frame (applyPlayerFishAttack(player, fish) and applyPlayerFishAttack(fish, player)), then both are on ATTACK_COOLDOWN_MS (400 ms).
So the situation where you can attack and he can’t almost certainly means the predator stopped dashing (e.g. out of stamina → isDashing === false). Then, next frame, only the player is dashing, so only applyPlayerFishAttack(player, fish) runs. The predator keeps taking damage and can’t counter because he’s exhausted and no longer “attacking.”
So it’s less “bug when overlapping” and more “exhausted predator stuck in overlap with a still-dashing player.”
Things that help
Separation when overlapping
When dist < playerHeadR + fishHeadR (and maybe dist very small), apply a small push-apart along the axis between player and fish (e.g. move both apart so they don’t share the same spot). That prevents staying stuck inside each other and can give the predator a chance to get a clean bite or escape when he has stamina again.
Knockback
You already have knockback in resolveAttack. If overlap is deep, knockback might not be enough to separate in one frame. Slightly stronger knockback or an extra separation step when dist is below a threshold could help.
Stamina tuning
So the predator doesn’t exhaust too fast in a head-on fight (e.g. AI_DASH_STAMINA_DRAIN_RATE or prey/predator stamina in dash-constants.ts / AI), if you want him to get 1–2 chomps in before going exhausted.
Implementing the separation (push-apart when overlapping) in the same place you do player–fish collision would address the “stuck inside” feel and work together with the homing change so you can actually dash away from big predators.
how do you think the hungry shark game handles the homing?  Trying to think of other similar games and how they handle it

Here’s how these games usually handle it and how that maps to your homing issues.
How Hungry Shark–style games usually work
Movement
No movement homing. Your shark goes where you steer (tilt/stick). The game doesn’t pull your trajectory toward prey or predators.
So you never get “stuck” moving toward a big predator, and you don’t accidentally curve onto a fish you were trying to pass.
“Lock-on” / assist
Assist is usually at the moment of the bite, not during travel:
Hitbox / overlap: If you’re close and roughly facing the prey when you boost through, the bite counts. No need to curve your path.
Lunge / snap on bite: When you’re in range and the game decides “this is the bite,” it might do a short lunge or snap facing toward that target so the bite feels locked. Your ongoing movement direction is still what you chose; the assist is a one-off correction for the attack, not a continuous pull.
So “homing” (if any) is bite-time assist, not steering your dash toward the nearest fish.
Prey vs predator
Prey: you chase by turning toward them; no auto-pull.
Predators: you avoid by turning away; the game doesn’t pull you toward them.
So in Hungry Shark–style design, homing on movement is exactly what they avoid; your problems (can’t dash away, homing onto fish you’re passing) are the direct result of steering being tied to “nearest fish” instead of to input.
Pattern that fits your game
No velocity homing
Dash direction = input only. You can always dash away from big predators and dash past small fish without being pulled.
Assist only when the bite happens
When overlap (or “in range”) is detected and the attack fires:
Snap facing to the target, and/or
Apply the existing lunge toward the target for that one bite.
So the bite feels locked, but your path isn’t bent toward the nearest fish every frame.
Optional: “intent” for who gets the bite
If multiple fish are in range, pick target by:
Facing: who’s most in front of the player, or
Stick/input: who’s closest to the direction you’re holding.
That way “who I’m trying to bite” matches “who I’m moving toward” without changing your velocity.
So: think of it like Hungry Shark — movement = your input; “homing” only at bite time (facing + lunge). That’s the clean way to get their feel and fix your homing pitfalls.
the hungry shark player definitely has a lock on of sorts but it's very intuitive and smooth.  I just realized that one of our biggest issues might be the fact that our fish dont have real collision and get stuck overlapping eachother.  



I like the idea of homing only working on smaller prey, or a fish you can kill with the next bite, so hold on to that, but let's first see if we can:



1: Get proper collision working so body colliders dont overlap for player/ai fish, and predators/prey.  Head colliders are fine to be kinematic.   This is Unity terminology so I am open to a more react friendly solution



2: Only home in on a target that the attacker is facing.  Between this and proper collision, the player should be able to escape a large predator, and skirt around fish they do not want to eat while dashing

Implementing body collision (separation so fish don't overlap) and restricting homing to targets the attacker is facing. Inspecting the current movement and collision flow.
Checking where positions are updated and the order of operations in the game loop:
Searching for where fish positions are updated in the game loop:
Implementing body collision (separation) and restricting homing to targets the attacker is facing.
Checking the previous edit results and continuing.
Applying the edits.
Edits are being blocked (ask mode). Providing the exact code changes so you can apply them or switch to Agent mode and I’ll apply them.
1. Body collision (separation)
A. lib/game/canvas-constants.ts – add body radius constant:
// Inside COLLISION, after HEAD_RADIUS_RATIO:  /** Body collider: circle at center; used for separation so entities don't overlap. Head remains for combat. */  BODY_RADIUS_RATIO: 0.4, // Body radius (40% of size) for physical separation
B. lib/game/canvas-collision.ts – add body radius + separation:
After getHeadRadius, add:
/** * Get body radius for physical separation (center circle). Prevents overlap; head colliders stay for combat. */export function getBodyRadius(size: number): number {  return size * COLLISION.BODY_RADIUS_RATIO;}/** Entity with position and size for body separation (player or fish). */export interface BodyEntity {  x: number;  y: number;  size: number;}/** * Resolve body overlap: push two entities apart so their body circles don't overlap. * Mutates a.x/y and b.x/y. Call after movement each frame. */export function resolveBodyOverlap(a: BodyEntity, b: BodyEntity): void {  const aR = getBodyRadius(a.size);  const bR = getBodyRadius(b.size);  const dx = b.x - a.x;  const dy = b.y - a.y;  const dist = Math.sqrt(dx * dx + dy * dy);  const minDist = aR + bR;  if (dist >= minDist || dist < 1e-6) return;  const overlap = minDist - dist;  const axisX = dx / dist;  const axisY = dy / dist;  const half = overlap * 0.5;  a.x -= axisX * half;  a.y -= axisY * half;  b.x += axisX * half;  b.y += axisY * half;}
C. lib/game/canvas-game-loop.ts – run separation after movement:
At top: extend the collision import to include getBodyRadius and resolveBodyOverlap from ./canvas-collision.
After the fish movement loop (after fish.y = Math.max(b.minY, Math.min(b.maxY, fish.y)); and the closing }); of the fish forEach, around line 1111), add a body separation pass:
  // Body separation: prevent player and fish bodies from overlapping (head colliders stay for combat)  if (gameMode) {    const bodyPlayer = { x: player.x, y: player.y, size: player.size };    for (const fish of state.fish) {      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed') continue;      resolveBodyOverlap(bodyPlayer, fish);    }    player.x = bodyPlayer.x;    player.y = bodyPlayer.y;    for (let i = 0; i < state.fish.length; i++) {      const fishA = state.fish[i];      if ((fishA.opacity ?? 1) < 1 || fishA.lifecycleState === 'removed') continue;      for (let j = i + 1; j < state.fish.length; j++) {        const fishB = state.fish[j];        if ((fishB.opacity ?? 1) < 1 || fishB.lifecycleState === 'removed') continue;        resolveBodyOverlap(fishA, fishB);      }    }  }
So: add constant, add getBodyRadius + BodyEntity + resolveBodyOverlap, then run this block once per frame after all fish (and player) have moved.
2. Homing only when attacker is facing the target
lib/game/canvas-game-loop.ts – in the player homing block (where you pick nearestDist / nearestDx / nearestDy):
When considering each fish f, only allow it as a homing target if the player is facing the fish. Facing = direction from player to fish has positive dot with the player’s facing direction.
Player facing direction: (player.facingRight ? 1 : -1) on x, 0 on y (or use head position vs center). So toTargetX = fHead.x - playerHead.x, toTargetY = fHead.y - playerHead.y; then facingDot = toTargetX * (player.facingRight ? 1 : -1). Only consider this fish if facingDot > 0 (or > 0.2 for a small tolerance).
Optional (as you said): also require that the target is smaller than the player so we only home onto prey we can kill: f.size < player.size (or use your attack size ratio). Then: only run the “nearest in range” logic for fish that satisfy facing (and optionally size).
Concretely, inside the loop over state.fish where you currently do:
if (dist <= closeRange && dist < nearestDist) {  nearestDist = dist;  nearestDx = dx;  nearestDy = dy;}
Change to:
Compute facingDot = dx * (player.facingRight ? 1 : -1) (dx, dy are already from player head to fish head).
Only update nearestDist / nearestDx / nearestDy when dist <= closeRange && dist < nearestDist && facingDot > 0 (or > 0.2). Optionally add && f.size < player.size.
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
Bite-time lock-on (snap facing toward target when bite connects)
canvas-constants.ts
+2
  HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)  IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
  HEAD_RADIUS_RATIO: 0.25, // Head hitbox radius (25% of size)  /** Body collider: circle at center; used for separation so entities don't overlap. Head remains for combat. */  BODY_RADIUS_RATIO: 0.4, // Body radius (40% of size) for physical separation  IDLE_SPEED_THRESHOLD: 0.2, // Speed below this is considered idle
canvas-collision.ts
+36
/** * Get body radius for physical separation (center circle). Prevents overlap; head colliders stay for combat. */export function getBodyRadius(size: number): number {  return size * COLLISION.BODY_RADIUS_RATIO;
```

---


## canvas-collision.ts

*Found 2 snippet(s), merged from lines 460 to 465*

### Context (before snippet)

```
In detectPlayerFishCollision (gameMode): removed “KO fish can be eaten” and the canSwallow/SWALLOW-based branch; playerAttacking now uses only canAttack (ATTACK_SIZE_RATIO). Removed the “player eats fish” size-based return; for playerAttacking we now return null (combat handled by game loop).
dash-constants.ts: Documented that SWALLOW_SIZE_RATIO is unused by the canvas game loop.
All plan to-dos are done. Lint is clean on the modified files.
ok cool, I see those spawning, we''ll need to use the same rendering style on these sprites that we do on fish, to remove the magenta.

I am seeing inconsistent behaviour when it comes to the player attacking other fish, And he doesnt seem able to only be able to attack fish the same size

Fixing magenta on carcass/chunk sprites and reviewing player attack conditions. Checking how fish sprites are drawn and how combat branches run.
Checking where head overlap is enforced in the player–fish loop and fixing both issues.
Implementing both fixes: applying fish-style magenta removal to carcass and chunk sprites, then relaxing player attack so we can attack any smaller fish.
Apply removeBackground to carcass/chunk sprites to fix magenta
Fix player attack conditions for consistent behavior
```

### Added Code

```typescript
-41
```

### Removed Code

```typescript
}      } else if (sizeRatio >= ATTACK_SIZE_RATIO) {        // Predator eats prey        eatenIds.add(prey.id);
        const eatX = (predator.x + prey.x) * 0.5;
        const eatY = (predator.y + prey.y) * 0.5;

} else if (sizeRatio >= ATTACK_SIZE_RATIO) {        // Predator eats prey        eatenIds.add(prey.id);
        const eatX = (predator.x + prey.x) * 0.5;
        const eatY = (predator.y + prey.y) * 0.5;
        const effMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
        const newSize = Math.min(PLAYER_MAX_SIZE, predator.size + prey.size * 0.15 * effMult);
        fishUpdates.set(predator.id, { size: newSize });
        if (predator.animationSprite?.hasAction?.('bite')) {          predator.animationSprite.triggerAction('bite');
        }        for (let b = 0;
 b < 12;
 b++) {          bloodParticles.push({            x: eatX + (Math.random() - 0.5) * prey.size * 1.2,            y: eatY + (Math.random() - 0.5) * prey.size * 1.2,            life: 1,            radius: 4 + Math.random() * 8,          });
        }      } else if (sizeRatio <= 1 / ATTACK_SIZE_RATIO) {        // Prey eats predator        eatenIds.add(predator.id);
        const eatX = (predator.x + prey.x) * 0.5;
        const eatY = (predator.y + prey.y) * 0.5;
        const invRatio = prey.size / predator.size;
        const effMult = Math.max(0.05, 1 / (1 + invRatio * 0.4));
        const newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.15 * effMult);
        fishUpdates.set(prey.id, { size: newSize });
        if (prey.animationSprite?.hasAction?.('bite')) {          prey.animationSprite.triggerAction('bite');
        }        for (let b = 0;
 b < 12;
 b++) {          bloodParticles.push({            x: eatX + (Math.random() - 0.5) * predator.size * 1.2,            y: eatY + (Math.random() - 0.5) * predator.size * 1.2,            life: 1,            radius: 4 + Math.random() * 8,          });
        }        }
canvas-collision.ts
+8
-17
if (predKo) {          eatenIds.add(predator.id);
          const eatX = (predator.x + prey.x) * 0.5;
          const eatY = (predator.y + prey.y) * 0.5;
          const newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);
          fishUpdates.set(prey.id, { size: newSize });

eatenIds.add(predator.id);
          const eatX = (predator.x + prey.x) * 0.5;
          const eatY = (predator.y + prey.y) * 0.5;
          const newSize = Math.min(PLAYER_MAX_SIZE, prey.size + predator.size * 0.08);
          fishUpdates.set(prey.id, { size: newSize });
          if (prey.animationSprite?.hasAction?.('bite')) {            prey.animationSprite.triggerAction('bite');
          }          for (let b = 0;
 b < 10;
 b++) {            bloodParticles.push({              x: eatX + (Math.random() - 0.5) * 20,              y: eatY + (Math.random() - 0.5) * 20,              life: 1,              radius: 4 + Math.random() * 6,            });
          }        } else if (preyKo) {        if (predKo) {
Removing the gameMode "eat KO" and "player eats fish" (size-based) branches from detectPlayerFishCollision.
+2
-51
if (gameMode) {    // KO fish can be eaten (dash required)    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      const sizeRatio = player.size / fish.size;

// KO fish can be eaten (dash required)    if (fish.lifecycleState === 'knocked_out' && player.isDashing) {      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      const sizeRatio = player.size / fish.size;
      const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
      const sizeGain = fish.size * 0.15 * efficiencyMult;
      const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
      for (let b = 0;
 b < 10;
 b++) {        bloodParticles.push({          x: eatX + (Math.random() - 0.5) * 20,          y: eatY + (Math.random() - 0.5) * 20,          life: 1,          radius: 4 + Math.random() * 6,        });
      }      if (fish.creatureData?.essenceTypes) {        fish.creatureData.essenceTypes.forEach((ec: { type: string;
 baseYield: number }, i: number) => {          const et = ESSENCE_TYPES[ec.type];
          if (et) {            chompParticles.push({              x: eatX + (Math.random() - 0.5) * 24,              y: eatY - 20 - (i * 18),              life: 1.5,              scale: 1.4,              text: `+${ec.baseYield} ${et.name}`,              color: et.color,              punchScale: 1.8,            });
          }        });
      }      return {        type: 'eat',        eatenIds: new Set([fish.id]),        bloodParticles,        chompParticles,        playerUpdates: {          size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),          hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),          chompPhase: 1,          chompEndTime: now + 280,        },      };
    }    const canSwallow = player.size >= fish.size * SWALLOW_SIZE_RATIO;
  if (gameMode) {
-75
} else if (playerAttacking) {      // Player eats fish      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      const sizeRatio = player.size / fish.size;
      const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));

// Player eats fish      const eatX = (fish.x + player.x) * 0.5;
      const eatY = (fish.y + player.y) * 0.5;
      const sizeRatio = player.size / fish.size;
      const efficiencyMult = Math.max(0.05, 1 / (1 + sizeRatio * 0.4));
      const sizeGain = fish.size * 0.15 * efficiencyMult;
      const hungerRestore = Math.min(fish.size * HUNGER_RESTORE_MULTIPLIER, HUNGER_MAX - player.hunger);
      triggerAnimationAction?.('bite');
      // Chomp particles      for (let k = 0;
 k < 5;
 k++) {        chompParticles.push({          x: eatX + (Math.random() - 0.5) * 16,          y: eatY + (Math.random() - 0.5) * 16,          life: 1,          scale: 1 + Math.random() * 0.5,          text: k === 0 ? 'CHOMP' : ['!', '•', '*', '★'][k % 4],          punchScale: 1.5,        });
      }      // Essence particles      if (fish.creatureData?.essenceTypes) {        fish.creatureData.essenceTypes.forEach((essenceConfig: { type: string;
 baseYield: number }, idx: number) => {          const essenceType = ESSENCE_TYPES[essenceConfig.type];
          if (essenceType) {            chompParticles.push({              x: eatX + (Math.random() - 0.5) * 24,              y: eatY - 20 - (idx * 18),              life: 1.5,              scale: 1.4,              text: `+${essenceConfig.baseYield} ${essenceType.name}`,              color: essenceType.color,              punchScale: 1.8,            });
          }        });
      }      // Hunger restore notification      if (hungerRestore > 0) {        chompParticles.push({          x: player.x,          y: player.y - player.size * 0.6,          life: 1.5,          scale: 1.2,          text: `+${Math.ceil(hungerRestore)}`,          color: '#4ade80',          punchScale: 1.6,        });
      }      // Blood particles      for (let b = 0;
 b < 22;
 b++) {        bloodParticles.push({          x: eatX + (Math.random() - 0.5) * fish.size * 1.2,          y: eatY + (Math.random() - 0.5) * fish.size * 1.2,          life: 1,          radius: 4 + Math.random() * 10,        });
      }      return {        type: 'eat',        eatenIds: new Set([fish.id]),        bloodParticles,        chompParticles,        playerUpdates: {          size: Math.min(PLAYER_MAX_SIZE, player.size + sizeGain),          hunger: Math.min(HUNGER_MAX, player.hunger + hungerRestore),          chompPhase: 1,          chompEndTime: now + 280,        },      };
    } else if (playerAttacking) {
dash-constants.ts
+1
// Size thresholdsexport const SWALLOW_SIZE_RATIO = 2.0;
  // Can swallow if ≥2x target size
// Size thresholds/** Unused by canvas game loop (combat is health-based;
 death → carcass + chunks). Used by engine/entities. */export const SWALLOW_SIZE_RATIO = 2.0;
  // Can swallow if ≥2x target size
Summary of what was done:
Todo 3 (finish)
canvas-game-loop.ts: When the player is the attacker, resolveAttack is now called with attackerDamage: runStateForCombat?.fishState.damage ?? 5 in the oneSidedAttack, evenlyMatched bothDashing, and playerAttacking branches. runStateForCombat is read once per pair.
combat.ts: When options.attackerDamage is set, damage uses the same size-ratio multipliers (1.5x, 1.2x, 0.5x) as computeHealthDamage.
Todo 4 (renderer)
RenderOptions: Added optional carcasses and chunks;
 added COMBAT, drawCarcasses, drawChunks, ESSENCE_TYPES;
 compute currentTime and essenceColors in renderGame.
Hit punch: For each fish and the player, if currentTime < hitPunchScaleEndTime the draw is wrapped in a scale transform using COMBAT.HIT_PUNCH_SCALE.
Hit flash: After drawing each fish/player, if currentTime < hitFlashEndTime a red/white ellipse overlay is drawn.
Carcasses/chunks: After “dash particles behind fish”, drawCarcasses(ctx, carcasses) and drawChunks(ctx, chunks, essenceColors) are called (ctx is already in world coords).
carcass.ts / essence-chunks.ts: drawCarcasses and drawChunks no longer take camera;
 they draw at world positions.
FishEditorCanvas.tsx: renderGame is called with carcasses: gameStateRef.current.carcasses and chunks: gameStateRef.current.chunks.
Todo 5 (canvas-collision)
canvas-collision.ts:
Comment at top: in game mode, combat and death are handled by the game loop;
 this module provides getHeadPosition/getHeadRadius;
 detect* do not perform size-based removal.
Removed SWALLOW_SIZE_RATIO import.
Removed “predator eats KO prey” and “prey eats predator” size-based eat branches in detectFishFishCollisions.
Removed “predator eats prey” and “prey eats predator” size-ratio eat branches;
 in the stamina battle, removed eatenIds.add(predator.id) and size gain, and only apply KO updates for both.
```

### All Snippets (for reference)

#### Snippet at line 460

```typescript
-41
```

#### Snippet at line 465

---


## canvas-constants.ts

*Found 3 snippet(s), merged from lines 826 to 1361*

### Description

eeing larger prey from counterattacking. Checking where to set flee-from on hit in the one-sided attack path: Implementing: adding the constant and FishEntity fields, then updating prey AI and combat.


### Context (before snippet)

```
PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this  PREY_FLEE_AFTER_HIT_MS: 5000, // Prey flees from attacker for this long after taking damage (any size)  WANDER_JITTER: 0.05, // Random velocity nudge when no target
```

### Added Code

```typescript
CHUNK_EAT_DURATION_MS: 200,  AUTO_AIM_CLOSE_RANGE_MULT: 1.5, // times combined head radius
// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
// Player health: lower so big predator kills in 1-2 chomps (combat scales by size)export const PLAYER_BASE_MAX_HEALTH = 30;
// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
canvas-state.ts
-1
PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this  WANDER_JITTER: 0.05, // Random velocity nudge when no target
```

### All Snippets (for reference)

#### Snippet at line 826

```typescript
  CHUNK_EAT_DURATION_MS: 200,  AUTO_AIM_CLOSE_RANGE_MULT: 1.5, // times combined head radius
```

#### Snippet at line 1235

```typescript
// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
// Player health: lower so big predator kills in 1-2 chomps (combat scales by size)export const PLAYER_BASE_MAX_HEALTH = 30;// Art/Rendering constants - Size thresholds, LOD, sprite resolution, growth stages
canvas-state.ts
-1
```

#### Snippet at line 1361

```typescript
  PREY_DASH_DISTANCE_MULTIPLIER: 8, // Prey starts dash when threat within fish.size * this  WANDER_JITTER: 0.05, // Random velocity nudge when no target
```

---


## canvas-game-loop.ts

*Found 11 snippet(s), merged from lines 537 to 1390*

### Description

Adding flee-from when a prey is hit in fish-fish combat:


### Context (before snippet)

```
Prey is fleeing from this attacker (see below).
Flee-from-attacker state
Added on FishEntity: fleeFromId?: string and fleeFromUntil?: number.
When a prey takes damage from an attacker, we set
fish.fleeFromId = attacker.id (or 'player') and
fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS (5s).
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
Lint is clean. Result: larger prey stay until you hit them, then flee for 5s and no longer counterattack when you’re the smaller one.
```

### Added Code

```typescript
-2
const canAttack = player.size > fish.size * ATTACK_SIZE_RATIO;
      const playerAttacking = player.isDashing && canAttack;
      const fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;

onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),
onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),      onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;
        const dx = ch.x - player.x;
        const dy = ch.y - player.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;

Adding chunk-eat scale to the player in the renderer.
canvas-renderer.ts
+6
const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;
  ctx.save();

const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;
  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
  ctx.save();
  if (playerChunkEat) {    ctx.translate(player.x, player.y);

Implementing squash/stretch: adding lunge-stretch and hit-squash for fish.
fish.vy = (dy / len) * maxSpeed;
            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;

fish.vy = (dy / len) * maxSpeed;
            const targetHeadR = targetId === 'player' ? getHeadRadius(player.size) : getHeadRadius(others.find((f) => f.id === targetId)?.size ?? fish.size);
            const closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + targetHeadR);
            if (distToTarget <= closeRange) fish.facingRight = dx > 0;
            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;

Adding prey close-range facing snap: set facing from velocity when threatened and within close range. Checking the prey block for a clean insertion point:
fish.vy = (fleeY / mag) * maxSpeed;
            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;

fish.vy = (fleeY / mag) * maxSpeed;
            if (nearestThreatDist < Infinity && nearestThreatDist <= COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + getHeadRadius(fish.size) * 1.5)) {              fish.facingRight = fish.vx > 0;
            }            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;

player.lungeVy = 0;
    } else {
fish.lungeVy = 0;
      } else {
-14
updateChunks(state, nowMs);
    const runState = loadRunState();
    const essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));
    const essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));
    checkChunkCollection(state, player, runState, {      onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),
const runState = loadRunState();
    const essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));
    const essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));
    checkChunkCollection(state, player, runState, {      onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),      onChunkCollected: (ch) => {        player.chunkEatEndTime = performance.now() + COMBAT.CHUNK_EAT_DURATION_MS;
        const dx = ch.x - player.x;
        const dy = ch.y - player.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        player.vx += (dx / d) * COMBAT.CHUNK_LUNGE_STRENGTH;
        player.vy += (dy / d) * COMBAT.CHUNK_LUNGE_STRENGTH;
      },    }, essenceNames, essenceColors);
    updateChunks(state, nowMs);

canvas-state.ts
chunkEatEndTime?: number;
}
chunkEatEndTime?: number;
  lastChunkEatTime?: number;
}
Chunk eating: hold dash + cooldown
Shared sprite cache invalidation + refresh event
carcass.ts
+7
/** * Clear the carcass sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearCarcassSpriteCache(): void {  carcassSpriteCache = null;

essence-chunks.ts
import { removeBackground } from '@/lib/rendering/fish-renderer';
import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
import type { Creature } from './types';

import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
import { removeBackground } from '@/lib/rendering/fish-renderer';
import { clearCarcassSpriteCache, decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
import type { Creature } from './types';

/** * Clear the chunk (meat orb) sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearChunkSpriteCache(): void {  meatOrbSpriteCache = null;

FishEditorCanvas.tsx
import { tickGameState } from '@/lib/game/canvas-game-loop';
import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';

import { tickGameState } from '@/lib/game/canvas-game-loop';
import { invalidateSharedSpriteCaches, preloadCarcassAndChunkSprites } from '@/lib/game/essence-chunks';
import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';

+10
// Listen for Sprite Lab shared sprites (carcass, chunks) refresh so in-game sprites update without reload  useEffect(() => {    const handleRefreshShared = () => {      invalidateSharedSpriteCaches();
      preloadCarcassAndChunkSprites();

Sprite Lab Save buttons for Carcass & Essence Chunks
SpriteGenerationLab.tsx
+24
const saveCarcassSprite = async (key: string) => {    const dataUrl = carcassSprites[key];
    if (!dataUrl || !isIndexedDBAvailable()) return;
    try {      const blob = await dataUrlToBlob(dataUrl);

+17
Summary of what was implemented:
-1
if (gameMode) {
if (gameMode) {    // Body separation: prevent player and fish bodies from overlapping (head colliders stay for combat)    const bodyPlayer = { x: player.x, y: player.y, size: player.size };
    for (const fish of state.fish) {      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed') continue;
      resolveBodyOverlap(bodyPlayer, fish);

canvas-game-loop.ts
+2
const closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fHeadR);
        if (dist <= closeRange && dist < nearestDist) {          nearestDist = dist;

if (dist <= closeRange && dist < nearestDist) {        const closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fHeadR);
        const facingDot = dx * (player.facingRight ? 1 : -1);
        if (dist <= closeRange && dist < nearestDist && facingDot > 0.2 && f.size < player.size) {          nearestDist = dist;

(attacker as { attackFlashEndTime: number }).attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;
        const dx = target.x - attacker.x;

(attacker as { attackFlashEndTime: number }).attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;
        (attacker as { facingRight: boolean }).facingRight = (target.x - attacker.x) > 0;
        const dx = target.x - attacker.x;

attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;
          const dx = target.x - attacker.x;

attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;
          attacker.facingRight = (target.x - attacker.x) > 0;
          const dx = target.x - attacker.x;

1. Body collision (separation)
lib/game/canvas-constants.ts
Added BODY_RADIUS_RATIO: 0.4 under COLLISION.
+1
-10
}          if (player.size > fish.size * 1.2) {            const pdx = fish.x - player.x;
            const pdy = fish.y - player.y;
            const pd = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pd < AI_DETECTION_RANGE) {
if (player.size > fish.size * 1.2) {            const pdx = fish.x - player.x;
            const pdy = fish.y - player.y;
            const pd = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pd < AI_DETECTION_RANGE) {              if (pd < nearestThreatDist) nearestThreatDist = pd;
              if (pd > 0) {                fleeX += pdx / pd;
                fleeY += pdy / pd;
              }          }
combat.ts
+14
-3
/** * Size-ratio damage multiplier when attacking smaller targets. Ramps so ~2x size (target half ours) one-shots. */function sizeRatioDamageMultiplier(sizeRatio: number): number {  if (sizeRatio >= 1.5) {
}          return result;

}          if (target.type === 'prey') {            target.fleeFromId = attacker.id;
            target.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;
          }          return result;

Summary of changes:
1. Prey flee only after being hit
```

### Removed Code

```typescript
</div>                  <button                    onClick={() => generateCarcassSprite(key)}                    disabled={carcassGenerating !== null}                    className="w-full px-3 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-xs font-medium disabled:opacity-50"                  >
<button                    onClick={() => generateCarcassSprite(key)}                    disabled={carcassGenerating !== null}                    className="w-full px-3 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-xs font-medium disabled:opacity-50"                  >                    {carcassGenerating === key ? 'Generating...' : 'Generate'}                  </button>                  </div>
SpriteGenerationLab.tsx
+21
-11
</div>                  <button                    onClick={() => generateEssenceChunkSprite(essence.id)}                    disabled={essenceChunkGenerating !== null}                    className="w-full px-3 py-2 rounded text-xs font-medium disabled:opacity-50"                    style={{
<button                    onClick={() => generateEssenceChunkSprite(essence.id)}                    disabled={essenceChunkGenerating !== null}                    className="w-full px-3 py-2 rounded text-xs font-medium disabled:opacity-50"                    style={{                      backgroundColor: essence.color + '40',                      color: essence.color,                    }}                  >                    {essenceChunkGenerating === essence.id ? 'Generating...' : 'Generate'}                  </button>                  </div>
```

### All Snippets (for reference)

#### Snippet at line 537

```typescript
-2
      const canAttack = player.size > fish.size * ATTACK_SIZE_RATIO;      const playerAttacking = player.isDashing && canAttack;      const fishAttacking = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO;
```

#### Snippet at line 621

```typescript
      onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),
      onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),      onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;        const dx = ch.x - player.x;        const dy = ch.y - player.y;        const d = Math.sqrt(dx * dx + dy * dy) || 1;
Adding chunk-eat scale to the player in the renderer.
canvas-renderer.ts
+6
  const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  ctx.save();
  const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  ctx.save();  if (playerChunkEat) {    ctx.translate(player.x, player.y);
Implementing squash/stretch: adding lunge-stretch and hit-squash for fish.
```

#### Snippet at line 649

```typescript
            fish.vy = (dy / len) * maxSpeed;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
            fish.vy = (dy / len) * maxSpeed;            const targetHeadR = targetId === 'player' ? getHeadRadius(player.size) : getHeadRadius(others.find((f) => f.id === targetId)?.size ?? fish.size);            const closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + targetHeadR);            if (distToTarget <= closeRange) fish.facingRight = dx > 0;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && distToTarget < fish.size * AI.DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
Adding prey close-range facing snap: set facing from velocity when threatened and within close range. Checking the prey block for a clean insertion point:
```

#### Snippet at line 654

```typescript
            fish.vy = (fleeY / mag) * maxSpeed;            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
            fish.vy = (fleeY / mag) * maxSpeed;            if (nearestThreatDist < Infinity && nearestThreatDist <= COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (getHeadRadius(fish.size) + getHeadRadius(fish.size) * 1.5)) {              fish.facingRight = fish.vx > 0;            }            fish.isDashing = !fish.recoveringFromExhausted && canDash(fish) && nearestThreatDist < fish.size * AI.PREY_DASH_DISTANCE_MULTIPLIER && (fish.stamina ?? 0) > AI.DASH_STAMINA_MIN;
Summary of what was implemented:
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

```typescript
-14
    updateChunks(state, nowMs);    const runState = loadRunState();    const essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));    const essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));    checkChunkCollection(state, player, runState, {      onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),
    const runState = loadRunState();    const essenceNames = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.name]));    const essenceColors = Object.fromEntries(Object.entries(ESSENCE_TYPES).map(([id, t]) => [id, t.color]));    checkChunkCollection(state, player, runState, {      onPushChomp: (p) => state.particles.chomp.push({ ...p, punchScale: p.punchScale ?? 1 }),      onChunkCollected: (ch) => {        player.chunkEatEndTime = performance.now() + COMBAT.CHUNK_EAT_DURATION_MS;        const dx = ch.x - player.x;        const dy = ch.y - player.y;        const d = Math.sqrt(dx * dx + dy * dy) || 1;        player.vx += (dx / d) * COMBAT.CHUNK_LUNGE_STRENGTH;        player.vy += (dy / d) * COMBAT.CHUNK_LUNGE_STRENGTH;      },    }, essenceNames, essenceColors);    updateChunks(state, nowMs);
canvas-state.ts
+1
  chunkEatEndTime?: number;}
  chunkEatEndTime?: number;  lastChunkEatTime?: number;}
Chunk eating: hold dash + cooldown
Shared sprite cache invalidation + refresh event
carcass.ts
+7
/** * Clear the carcass sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearCarcassSpriteCache(): void {  carcassSpriteCache = null;
essence-chunks.ts
+1
-1
import { removeBackground } from '@/lib/rendering/fish-renderer';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import { removeBackground } from '@/lib/rendering/fish-renderer';import { clearCarcassSpriteCache, decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
essence-chunks.ts
/** * Clear the chunk (meat orb) sprite cache so the next preload will fetch from storage (e.g. after Sprite Lab save). */export function clearChunkSpriteCache(): void {  meatOrbSpriteCache = null;
FishEditorCanvas.tsx
+1
import { tickGameState } from '@/lib/game/canvas-game-loop';import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';
import { tickGameState } from '@/lib/game/canvas-game-loop';import { invalidateSharedSpriteCaches, preloadCarcassAndChunkSprites } from '@/lib/game/essence-chunks';import { useCanvasSpawnSync, type FishDataLike } from '@/lib/game/canvas-spawn-sync';
FishEditorCanvas.tsx
+10
  // Listen for Sprite Lab shared sprites (carcass, chunks) refresh so in-game sprites update without reload  useEffect(() => {    const handleRefreshShared = () => {      invalidateSharedSpriteCaches();      preloadCarcassAndChunkSprites();
Shared sprite cache invalidation + refresh event
Sprite Lab Save buttons for Carcass & Essence Chunks
SpriteGenerationLab.tsx
+24
  const saveCarcassSprite = async (key: string) => {    const dataUrl = carcassSprites[key];    if (!dataUrl || !isIndexedDBAvailable()) return;    try {      const blob = await dataUrlToBlob(dataUrl);
SpriteGenerationLab.tsx
+17
```

#### Snippet at line 1189

```typescript
-1
```

#### Snippet at line 1194

```typescript
  if (gameMode) {
  if (gameMode) {    // Body separation: prevent player and fish bodies from overlapping (head colliders stay for combat)    const bodyPlayer = { x: player.x, y: player.y, size: player.size };    for (const fish of state.fish) {      if ((fish.opacity ?? 1) < 1 || fish.lifecycleState === 'removed') continue;      resolveBodyOverlap(bodyPlayer, fish);
canvas-game-loop.ts
+2
-1
        const closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fHeadR);        if (dist <= closeRange && dist < nearestDist) {          nearestDist = dist;
        if (dist <= closeRange && dist < nearestDist) {        const closeRange = COMBAT.AUTO_AIM_CLOSE_RANGE_MULT * (playerHeadR + fHeadR);        const facingDot = dx * (player.facingRight ? 1 : -1);        if (dist <= closeRange && dist < nearestDist && facingDot > 0.2 && f.size < player.size) {          nearestDist = dist;
canvas-game-loop.ts
+1
        (attacker as { attackFlashEndTime: number }).attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;        const dx = target.x - attacker.x;
        (attacker as { attackFlashEndTime: number }).attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;        (attacker as { facingRight: boolean }).facingRight = (target.x - attacker.x) > 0;        const dx = target.x - attacker.x;
canvas-game-loop.ts
+1
          attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;          const dx = target.x - attacker.x;
          attacker.attackFlashEndTime = now + COMBAT.ATTACK_FLASH_DURATION_MS;          attacker.facingRight = (target.x - attacker.x) > 0;          const dx = target.x - attacker.x;
Summary of what was implemented:
1. Body collision (separation)
lib/game/canvas-constants.ts
Added BODY_RADIUS_RATIO: 0.4 under COLLISION.
```

#### Snippet at line 1329

```typescript
-10
          }          if (player.size > fish.size * 1.2) {            const pdx = fish.x - player.x;            const pdy = fish.y - player.y;            const pd = Math.sqrt(pdx * pdx + pdy * pdy);            if (pd < AI_DETECTION_RANGE) {
          if (player.size > fish.size * 1.2) {            const pdx = fish.x - player.x;            const pdy = fish.y - player.y;            const pd = Math.sqrt(pdx * pdx + pdy * pdy);            if (pd < AI_DETECTION_RANGE) {              if (pd < nearestThreatDist) nearestThreatDist = pd;              if (pd > 0) {                fleeX += pdx / pd;                fleeY += pdy / pd;              }          }
combat.ts
+14
-3
/** * Size-ratio damage multiplier when attacking smaller targets. Ramps so ~2x size (target half ours) one-shots. */function sizeRatioDamageMultiplier(sizeRatio: number): number {  if (sizeRatio >= 1.5) {
combat.ts
+1
-3
```

#### Snippet at line 1390

```typescript
          }          return result;
          }          if (target.type === 'prey') {            target.fleeFromId = attacker.id;            target.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;          }          return result;
Summary of changes:
1. Prey flee only after being hit
```

---


## canvas-renderer.ts

*Found 11 snippet(s), merged from lines 416 to 820*

### Context (before snippet)

```
Flash FX: blend modes for hit/attack ellipse
Chunk eating: hold dash + cooldown
```

### Added Code

```typescript
setLastPlayerAnimAction: (action: string | null) => void;
}
setLastPlayerAnimAction: (action: string | null) => void;
  carcasses?: CarcassEntity[];
  chunks?: ChunkEntity[];
}
setLastPlayerAnimAction,  } = options;

setLastPlayerAnimAction,    carcasses = [],    chunks = [],  } = options;
  const currentTime =
+6
import { computeEffectiveMaxStamina } from './stamina-hunger';
import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';
import { getRunConfig, getDepthBandRules } from './data/level-loader';
import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';

import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';
import { computeEffectiveMaxStamina } from './stamina-hunger';
import { RENDERING, UI, WORLD_BOUNDS, GAME, COMBAT } from './canvas-constants';
import { getRunConfig, getDepthBandRules } from './data/level-loader';
import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';
import type { CarcassEntity } from './carcass';

Adding hit flash and punch to the fish draw loop:
drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);

drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);
    if (hitFlash) {      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';
      ctx.beginPath();

+4
// Draw player
// Draw carcasses and essence chunks (world layer)  drawCarcasses(ctx, carcasses);
  drawChunks(ctx, chunks, essenceColors);
  // Draw player
+9
const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);

+7
}  if (playerHitFlash) {    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';
    ctx.beginPath();

FishEditorCanvas.tsx
+2
setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action;
 },      });

setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action;
 },        carcasses: gameStateRef.current.carcasses,        chunks: gameStateRef.current.chunks,      });

Aligning canvas-collision with the plan: adding a top-of-file comment and removing size-only removal branches so the game loop remains the single source of truth.
canvas-collision.ts
-2
}
const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;

const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;
    const lungeStretch =      ((fishEntity.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS) > 0 &&      currentTime < (fishEntity.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS;
    const fishSpeedForAngle = Math.sqrt(fishEntity.vx ** 2 + fishEntity.vy ** 2);
    const fishAngle = fishSpeedForAngle > 0.01 ? Math.atan2(fishEntity.vy, fishEntity.vx) : (fishEntity.facingRight ? 0 : Math.PI);

Adding lunge-stretch and hit-squash for the player.
+15
const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;

const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
  const playerLungeStretch =    ((player.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS) > 0 &&    currentTime < (player.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS;
  const playerSpeedForAngle = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  const playerAngle = playerSpeedForAngle > 0.01 ? Math.atan2(player.vy, player.vx) : (player.facingRight ? 0 : Math.PI);

Implementing player auto-aim: finding where we have access to state.fish and getHeadPosition in the player movement section:
Adding player auto-aim after input/friction and before the speed clamp.
+42
}    if (gameMode && player.isDashing) {      const playerHead = getHeadPosition(player);
      const playerHeadR = getHeadRadius(player.size);
      let nearestDist = Infinity;
      let nearestDx = 0;

: 0;
  const essenceColors = Object.fromEntries(
: 0;
  // Combat/animation timers are set with performance.now() in the game loop;
 use same clock so stretch/squash expire correctly  const wallNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const essenceColors = Object.fromEntries(
-1
-4
const clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);
    const hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;
    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;
    const lungeStretch =
const hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;
    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;
    const clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);
    const hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && wallNow < fishEntity.hitPunchScaleEndTime!;
    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && wallNow < fishEntity.hitFlashEndTime!;
    const lungeStretch =
canvas-game-loop.ts
-6
const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);
  const playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;
  const playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;
  const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;
  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;

const playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;
  const playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;
  const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;
  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
  const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);
  const playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && wallNow < player.hitPunchScaleEndTime!;

Setting chunkEatEndTime with performance.now() in the game loop so it matches the renderer.
+1
canvas-renderer.ts
-5
ctx.globalAlpha = fishOpacity;
    if (lungeStretch) {      ctx.translate(fishEntity.x, fishEntity.y);
      ctx.rotate(fishAngle);

if (lungeStretch) {    ctx.globalAlpha = fishOpacity;
    // One transform at a time so we always return to normal: prefer hit squash over lunge stretch    if (hitPunch) {      ctx.translate(fishEntity.x, fishEntity.y);
      ctx.rotate(fishAngle);

+5
ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.save();

ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.55;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.save();

ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.55;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

```

### Removed Code

```typescript
onChunkCollected: (ch) => {        player.chunkEatEndTime = nowMs + COMBAT.CHUNK_EAT_DURATION_MS;
        const dx = ch.x - player.x;

}  if (playerLungeStretch) {    ctx.translate(player.x, player.y);
    ctx.rotate(playerAngle);

if (playerLungeStretch) {  }  // One combat transform at a time so we always return to normal: prefer hit squash over lunge stretch  if (playerHitPunch) {    ctx.translate(player.x, player.y);
    ctx.rotate(playerAngle);

Summary of changes:
1. Time base mismatch (root cause)
Combat timers are set with performance.now() in the game loop, but the renderer was using currentTime (game-relative ms). So currentTime < lungeStartTime + 120 was effectively always true and stretch/squash never turned off.
```

### All Snippets (for reference)

#### Snippet at line 416

```typescript
  setLastPlayerAnimAction: (action: string | null) => void;}
  setLastPlayerAnimAction: (action: string | null) => void;  carcasses?: CarcassEntity[];  chunks?: ChunkEntity[];}
```

#### Snippet at line 420

```typescript
    setLastPlayerAnimAction,  } = options;
    setLastPlayerAnimAction,    carcasses = [],    chunks = [],  } = options;  const currentTime =
canvas-renderer.ts
+6
-1
import { computeEffectiveMaxStamina } from './stamina-hunger';import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';import { getRunConfig, getDepthBandRules } from './data/level-loader';import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';
import { RENDERING, UI, WORLD_BOUNDS, GAME } from './canvas-constants';import { computeEffectiveMaxStamina } from './stamina-hunger';import { RENDERING, UI, WORLD_BOUNDS, GAME, COMBAT } from './canvas-constants';import { getRunConfig, getDepthBandRules } from './data/level-loader';import type { PlayerEntity, FishEntity, ChompParticle, BloodParticle, CameraState } from './canvas-state';import type { CarcassEntity } from './carcass';
Adding hit flash and punch to the fish draw loop:
canvas-renderer.ts
+7
```

#### Snippet at line 434

```typescript
    drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);
    drawStateIcon(ctx, fishEntity, fishEntity.x, fishEntity.y, fishEntity.size, animatedZoom);    if (hitFlash) {      ctx.save();      ctx.globalAlpha = 0.55;      ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';      ctx.beginPath();
canvas-renderer.ts
+4
  // Draw player
  // Draw carcasses and essence chunks (world layer)  drawCarcasses(ctx, carcasses);  drawChunks(ctx, chunks, essenceColors);  // Draw player
canvas-renderer.ts
+9
  const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);
```

#### Snippet at line 446

```typescript
  }
  }  if (playerHitFlash) {    ctx.save();    ctx.globalAlpha = 0.55;    ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';    ctx.beginPath();
FishEditorCanvas.tsx
+2
        setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },      });
        setLastPlayerAnimAction: (action) => { lastPlayerAnimActionRef.current = action; },        carcasses: gameStateRef.current.carcasses,        chunks: gameStateRef.current.chunks,      });
Aligning canvas-collision with the plan: adding a top-of-file comment and removing size-only removal branches so the game loop remains the single source of truth.
canvas-collision.ts
+7
-2
```

#### Snippet at line 631

```typescript
-1
    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;
    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    const lungeStretch =      ((fishEntity.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS) > 0 &&      currentTime < (fishEntity.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS;    const fishSpeedForAngle = Math.sqrt(fishEntity.vx ** 2 + fishEntity.vy ** 2);    const fishAngle = fishSpeedForAngle > 0.01 ? Math.atan2(fishEntity.vy, fishEntity.vx) : (fishEntity.facingRight ? 0 : Math.PI);
Adding lunge-stretch and hit-squash for the player.
canvas-renderer.ts
+15
-1
  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  const playerLungeStretch =    ((player.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS) > 0 &&    currentTime < (player.lungeStartTime ?? 0) + COMBAT.LUNGE_STRETCH_DURATION_MS;  const playerSpeedForAngle = Math.sqrt(player.vx ** 2 + player.vy ** 2);  const playerAngle = playerSpeedForAngle > 0.01 ? Math.atan2(player.vy, player.vx) : (player.facingRight ? 0 : Math.PI);
Implementing player auto-aim: finding where we have access to state.fish and getHeadPosition in the player movement section:
Adding player auto-aim after input/friction and before the speed clamp.
canvas-game-loop.ts
+42
    }
    }    if (gameMode && player.isDashing) {      const playerHead = getHeadPosition(player);      const playerHeadR = getHeadRadius(player.size);      let nearestDist = Infinity;      let nearestDx = 0;
```

#### Snippet at line 679

```typescript
      : 0;  const essenceColors = Object.fromEntries(
      : 0;  // Combat/animation timers are set with performance.now() in the game loop; use same clock so stretch/squash expire correctly  const wallNow = typeof performance !== 'undefined' ? performance.now() : Date.now();  const essenceColors = Object.fromEntries(
```

#### Snippet at line 683

```typescript
-4
    const clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    const lungeStretch =
    const hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && currentTime < fishEntity.hitPunchScaleEndTime!;    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && currentTime < fishEntity.hitFlashEndTime!;    const clipMode = getClipMode(screenSize, fishHasAnimations, renderContext);    const hitPunch = (fishEntity.hitPunchScaleEndTime ?? 0) > 0 && wallNow < fishEntity.hitPunchScaleEndTime!;    const hitFlash = (fishEntity.hitFlashEndTime ?? 0) > 0 && wallNow < fishEntity.hitFlashEndTime!;    const lungeStretch =
canvas-renderer.ts
-1
```

#### Snippet at line 693

```typescript
-6
  const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;
  const playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && currentTime < player.hitPunchScaleEndTime!;  const playerHitFlash = (player.hitFlashEndTime ?? 0) > 0 && currentTime < player.hitFlashEndTime!;  const playerAttackFlash = (player.attackFlashEndTime ?? 0) > 0 && currentTime < player.attackFlashEndTime!;  const playerChunkEat = (player.chunkEatEndTime ?? 0) > 0 && currentTime < player.chunkEatEndTime!;  const playerClipMode = getClipMode(playerScreenSize, playerHasAnimations, renderContext);  const playerHitPunch = (player.hitPunchScaleEndTime ?? 0) > 0 && wallNow < player.hitPunchScaleEndTime!;
Setting chunkEatEndTime with performance.now() in the game loop so it matches the renderer.
canvas-game-loop.ts
+1
```

#### Snippet at line 714

```typescript
-5
    ctx.globalAlpha = fishOpacity;    if (lungeStretch) {      ctx.translate(fishEntity.x, fishEntity.y);      ctx.rotate(fishAngle);
    if (lungeStretch) {    ctx.globalAlpha = fishOpacity;    // One transform at a time so we always return to normal: prefer hit squash over lunge stretch    if (hitPunch) {      ctx.translate(fishEntity.x, fishEntity.y);      ctx.rotate(fishAngle);
canvas-renderer.ts
+5
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

---


## canvas-spawn-sync.ts

*Found 1 snippet(s), merged from lines 1291 to 1291*

### Description

Health (so undefined → 100) and only writes back when 'health' in target, so their health is never updated and they stay at 100 HP. Adding health and maxHealth when creating fish in canvas-spawn-sync.


### Added Code

```typescript
const newFish = {            isDashing: false,
const baseHealth = creatureForSprite?.stats?.health ?? 20;
          const newFish = {            isDashing: false,            health: baseHealth,
Making combat always persist health so targets that lack health get it set on first hit:
```

---


## canvas-state.ts

*Found 4 snippet(s), merged from lines 242 to 1365*

### Description

hen threat within fish.size * this  PREY_FLEE_AFTER_HIT_MS: 5000, // Prey flees from attacker for this long after taking damage (any size)  WANDER_JITTER: 0.05, // Random velocity nudge when no target


### Context (before snippet)

```
Adding flee-from when a prey is hit in fish-fish combat:
```

### Added Code

```typescript
chaseStartTime?: number;

chaseStartTime?: number;
  health?: number;
  maxHealth?: number;
  hitFlashEndTime?: number;
  hitPunchScaleEndTime?: number;
  deathStartTime?: number;

canvas-state.ts
+5
animations?: CreatureAnimations;

isExhausted: false,      health: 100,      maxHealth: 100,    };

-2
this.player.isExhausted = false;
    this.player.health = 100;
    this.player.maxHealth = 100;
  }
chunkEatEndTime?: number;
}
chunkEatEndTime?: number;
  /** When set, prey flees from this entity (id or 'player') until fleeFromUntil. Set when prey takes damage. */  fleeFromId?: string;
  fleeFromUntil?: number;
}
canvas-game-loop.ts
-15
let nearestThreatDist = Infinity;

let nearestThreatDist = Infinity;
          const pdx = fish.x - player.x;
          const pdy = fish.y - player.y;
          const pd = Math.sqrt(pdx * pdx + pdy * pdy);
          const now = performance.now();
          const fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;

Removing the redundant now — the game loop already defines it. Checking its scope:
-1
const pd = Math.sqrt(pdx * pdx + pdy * pdy);
          const now = performance.now();
          const fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;

const now = performance.now();
          const pd = Math.sqrt(pdx * pdx + pdy * pdy);
          const fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;

Implementing both-dashing handling so a fleeing larger prey doesn't counterattack, and setting fleeFrom when prey is hit:
+6
if (bothDashingPf) {        const fishResult = playerCooldownOk ? applyPlayerFishAttack(player, fish, { attackerDamage: playerDamage }) : null;
        const playerResult = fishCooldownOk ? applyPlayerFishAttack(fish, player, {}) : null;

const playerResult = fishCooldownOk ? applyPlayerFishAttack(fish, player, {}) : null;
      if (bothDashingPf) {        const preyLargerFleeing = fish.type === 'prey' && player.size < fish.size;
        const fishResult = playerCooldownOk ? applyPlayerFishAttack(player, fish, { attackerDamage: playerDamage }) : null;
        if (fishResult && fish.type === 'prey') {          fish.fleeFromId = 'player';

+4
}        } else {
}          if (target === fish && fish.type === 'prey') {            fish.fleeFromId = 'player';
            fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;
          }        } else {
```

### All Snippets (for reference)

#### Snippet at line 242

```typescript
  chaseStartTime?: number;
  chaseStartTime?: number;  health?: number;  maxHealth?: number;  hitFlashEndTime?: number;  hitPunchScaleEndTime?: number;  deathStartTime?: number;
canvas-state.ts
+5
  animations?: CreatureAnimations;
```

#### Snippet at line 1244

```typescript
-2
      isExhausted: false,      health: 100,      maxHealth: 100,    };
```

#### Snippet at line 1249

```typescript
-2
    this.player.isExhausted = false;    this.player.health = 100;    this.player.maxHealth = 100;  }
```

#### Snippet at line 1365

```typescript
  chunkEatEndTime?: number;}
  chunkEatEndTime?: number;  /** When set, prey flees from this entity (id or 'player') until fleeFromUntil. Set when prey takes damage. */  fleeFromId?: string;  fleeFromUntil?: number;}
canvas-game-loop.ts
-15
          let nearestThreatDist = Infinity;
          let nearestThreatDist = Infinity;          const pdx = fish.x - player.x;          const pdy = fish.y - player.y;          const pd = Math.sqrt(pdx * pdx + pdy * pdy);          const now = performance.now();          const fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;
Removing the redundant now — the game loop already defines it. Checking its scope:
canvas-game-loop.ts
-1
          const pd = Math.sqrt(pdx * pdx + pdy * pdy);          const now = performance.now();          const fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;
          const now = performance.now();          const pd = Math.sqrt(pdx * pdx + pdy * pdy);          const fleeingFromAttacker = (id: string) => now < (fish.fleeFromUntil ?? 0) && fish.fleeFromId === id;
Implementing both-dashing handling so a fleeing larger prey doesn't counterattack, and setting fleeFrom when prey is hit:
canvas-game-loop.ts
+6
-1
      if (bothDashingPf) {        const fishResult = playerCooldownOk ? applyPlayerFishAttack(player, fish, { attackerDamage: playerDamage }) : null;        const playerResult = fishCooldownOk ? applyPlayerFishAttack(fish, player, {}) : null;
        const playerResult = fishCooldownOk ? applyPlayerFishAttack(fish, player, {}) : null;      if (bothDashingPf) {        const preyLargerFleeing = fish.type === 'prey' && player.size < fish.size;        const fishResult = playerCooldownOk ? applyPlayerFishAttack(player, fish, { attackerDamage: playerDamage }) : null;        if (fishResult && fish.type === 'prey') {          fish.fleeFromId = 'player';
canvas-game-loop.ts
+4
          }        } else {
          }          if (target === fish && fish.type === 'prey') {            fish.fleeFromId = 'player';            fish.fleeFromUntil = now + AI.PREY_FLEE_AFTER_HIT_MS;          }        } else {
```

---


## carcass.ts

*Found 4 snippet(s), merged from lines 251 to 522*

### Context (before snippet)

```
const canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const ctx = canvas.getContext('2d');      if (ctx) {        ctx.drawImage(img, 0, 0);        carcassSpriteCache = canvas;      }    img.onload = () => {
```

### Added Code

```typescript
/** * Carcass system: spawn, update, and draw carcasses left when a fish dies. * Uses Sprite Lab shared sprite 'carcass'. Carcass fades when all chunks collected or decay time elapses. */
+171
/** * Essence chunks: physical drops when a fish dies. Player collects by overlap to gain essence. * Uses Sprite Lab shared sprites (meatOrb or per-essence). Links to carcass for fade-when-done. */
Fixing essence-chunks: use CarcassEntity and setCarcassRemainingChunks.
+1
-6
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';
import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';
import type { Creature } from './types';

import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';
import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
import type { Creature } from './types';

+2
-3
export function spawnChunksFromFish(  state: { chunks: ChunkEntity[];
 carcasses: { carcassId: string;
 remainingChunks: number }[] },  deadFish: { creatureData?: Creature;
 x: number;
 y: number;
 size: number },  }
state: { chunks: ChunkEntity[];
 carcasses: { carcassId: string;
 remainingChunks: number }[] },export function spawnChunksFromFish(  state: CanvasStateWithCarcasses & { chunks: ChunkEntity[] },  deadFish: { creatureData?: Creature;
 x: number;
 y: number;
 size: number },  }
-2
*/export function updateChunks(state: { chunks: ChunkEntity[] }, now: number): void {  for (let i = state.chunks.length - 1;
 i >= 0;
 i--) {      if (ch.carcassId) {
export function updateChunks(state: { chunks: ChunkEntity[] }, now: number): void { */export function updateChunks(state: CanvasStateWithCarcasses & { chunks: ChunkEntity[] }, now: number): void {  for (let i = state.chunks.length - 1;
 i >= 0;
 i--) {      if (ch.carcassId) {
export function checkChunkCollection(  state: CanvasStateWithCarcasses,  player: { x: number;
 y: number;
 size: number },): void {
state: CanvasStateWithCarcasses,export function checkChunkCollection(  state: CanvasStateWithCarcasses & { chunks: ChunkEntity[] },  player: { x: number;
 y: number;
 size: number },): void {
Adding carcasses and chunks to canvas state and initializing player health.
canvas-state.ts
import type { FishLifecycleState } from './combat-states';
export type { FishLifecycleState };

import type { FishLifecycleState } from './combat-states';
import type { CarcassEntity } from './carcass';
import type { ChunkEntity } from './essence-chunks';
export type { FishLifecycleState };

lastSmallPreyRespawnTime: number;

lastSmallPreyRespawnTime: number;
  carcasses: CarcassEntity[];
  chunks: ChunkEntity[];

isExhausted: false,    };

isExhausted: false,      health: 100,      maxHealth: 100,    };

this.lastSmallPreyRespawnTime = 0;
  }
this.lastSmallPreyRespawnTime = 0;
    this.carcasses = [];
    this.chunks = [];
  }
this.dashHoldDurationMs = 0;
  }
this.dashHoldDurationMs = 0;
    this.carcasses = [];
    this.chunks = [];
  }
+8
this.player.isExhausted = false;

this.player.isExhausted = false;
    const runState = typeof loadRunState === 'function' ? (loadRunState as () => { fishState: { health: number } } | null)() : null;
    if (runState?.fishState) {      this.player.health = runState.fishState.health;
      this.player.maxHealth = runState.fishState.health;
    } else {
Checking canvas-state imports and fixing resetPlayer so we don't call loadRunState from canvas-state (avoid circular deps).
Removing the loadRunState call from resetPlayer and setting default health.
const runState = typeof loadRunState === 'function' ? (loadRunState as () => { fishState: { health: number } } | null)() : null;
    if (runState?.fishState) {      this.player.health = runState.fishState.health;
      this.player.maxHealth = runState.fishState.health;
    } else {      this.player.health = 100;
      this.player.maxHealth = 100;
    }    this.player.isExhausted = false;

Initializing fish health in addFishToState and player health from run state in FishEditorCanvas.
canvas-game-loop.ts
+3
const animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;
  const newFish: FishEntity = {    animationSprite: animSprite,
const animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;
  const baseHealth = creature.stats?.health ?? 20;
  const newFish: FishEntity = {    animationSprite: animSprite,    health: baseHealth,
FishEditorCanvas.tsx
+5
-1
// In editor mode, use creature's actual size or base size      const playerSize = gameMode        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);

? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)      // In editor mode, use creature's actual size or base size      const runState = gameMode ? loadRunState() : null;
      const playerSize = gameMode        ? (runState?.fishState.size ?? PLAYER_BASE_SIZE)        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);

Marking todo 1 complete and starting todo 2 (carcass/chunks already implemented). Adding combat.ts with resolveAttack for todo 3.
Adding a combined preload and invoking it when the game starts. Checking where the game loop runs and where to call it:
Adding a combined preload and calling it when the game starts.
/** * Preload carcass and chunk sprites from Sprite Lab (call once at level start). */export function preloadCarcassAndChunkSprites(): void {  import('./carcass').then((m) => m.preloadCarcassSprite()).catch(() => {});

import { getSpawnPositionInBand } from './spawn-position';

import { getSpawnPositionInBand } from './spawn-position';
import { preloadCarcassAndChunkSprites } from './essence-chunks';

: 0;
  }
: 0;
    preloadCarcassAndChunkSprites();
  }
Adding combat constants and creating combat.ts.
canvas-constants.ts
+9
// Combat / hit impact constantsexport const COMBAT = {  HIT_FLASH_DURATION: 200, // ms  HIT_PUNCH_SCALE: 1.15,  HIT_PUNCH_DURATION: 150, // ms
combat.ts
+80
/** * Combat resolution: health damage, knockback, hit flash/punch. * Single source for resolveAttack used by the game loop. */
Reading the full fish–fish and player–fish collision sections to replace combat logic.
Adding combat, carcass, and chunk imports to the game loop:
restoreHunger,  applyAttackToTarget,  applyStaminaCost,} from './stamina-hunger';

applyAttackToTarget,  restoreHunger,  applyStaminaCost,} from './stamina-hunger';
import { resolveAttack } from './combat';

DASH_ATTACK_STAMINA_COST,  SWALLOW_SIZE_RATIO,  ATTACK_SIZE_RATIO,
SWALLOW_SIZE_RATIO,  DASH_ATTACK_STAMINA_COST,  ATTACK_SIZE_RATIO,
import { getHeadPosition, getHeadRadius } from './canvas-collision';
import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME } from './canvas-constants';
import {
import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME } from './canvas-constants';
import { getHeadPosition, getHeadRadius } from './canvas-collision';
import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME, COMBAT } from './canvas-constants';
import {
Replacing the fish-fish collision block with health-based resolution and carcass+chunks.
+60
-32
// Fish-fish collisions (game mode only) - inline head-based logic  if (gameMode) {    const fishList = state.fish;
    const eatenIds = new Set<string>();

// Fish-fish collisions (game mode only) - inline head-based logic    const eatenIds = new Set<string>();
  // Fish-fish collisions (game mode only) - health-based;
 death -> carcass + chunks  if (gameMode) {    const fishList = state.fish;

Replacing the player-fish collision block: handling KO + player dash, then one-sided and both-dashing attacks.
+102
-115
state.gameMode.fishEaten += 1;
        state.eatenIds.add(fish.id);
        state.fish.splice(idx, 1);

state.eatenIds.add(fish.id);
        state.gameMode.fishEaten += 1;
        const carcassId = spawnCarcass(state, { x: fish.x, y: fish.y }, { size: fish.size });
        spawnChunksFromFish(state, fish, { x: fish.x, y: fish.y }, carcassId);
        state.fish.splice(idx, 1);

Checking what follows the replaced block:
Adding updateCarcasses, updateChunks, and checkChunkCollection to the game tick (when gameMode).
if (gameMode) {    const nowMs = Date.now();
    updateCarcasses(state, nowMs);
    updateChunks(state, nowMs);
    const runState = loadRunState();

Adding an optional damage override for the player (from run state). Checking how the renderer is structured:
+6
* Does not drain stamina by default. * @returns true if target died (health <= 0).  now: number,  options: { staminaCost?: number;
 knockback?: number;
 hitFlashMs?: number;
 hitPunchMs?: number } = {}
options: { staminaCost?: number;
 knockback?: number;
 hitFlashMs?: number;
 hitPunchMs?: number } = {} * Does not drain stamina by default. * @param options.attackerDamage - Override damage (e.g. player damage from run state). * @returns true if target died (health <= 0).  now: number,
Passing player damage from run state when the player is the attacker:
+4
if (oneSidedAttack) {
const runStateForCombat = loadRunState();
      const playerDamage = runStateForCombat?.fishState.damage ?? 5;
      if (oneSidedAttack) {
} else if (evenlyMatched && bothDashing) {        const fishDied = resolveAttack(player, fish, now);
        const playerDied = resolveAttack(fish, player, now);

const fishDied = resolveAttack(player, fish, now);
      } else if (evenlyMatched && bothDashing) {        const fishDied = resolveAttack(player, fish, now, { attackerDamage: playerDamage });
        const playerDied = resolveAttack(fish, player, now);

} else if (playerAttacking) {        const fishDied = resolveAttack(player, fish, now);
        if (fishDied) {
const fishDied = resolveAttack(player, fish, now);
      } else if (playerAttacking) {        const fishDied = resolveAttack(player, fish, now, { attackerDamage: playerDamage });
        if (fishDied) {
Applying size-ratio multiplier when using attackerDamage in combat.ts.
+11
-4
const currentHealth = target.health ?? maxHealth;
  const damage =    options.attackerDamage != null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);

const damage =    options.attackerDamage != null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);
  const currentHealth = target.health ?? maxHealth;
  let damage: number;

Adding carcasses and chunks to the renderer and implementing hit flash and punch. Locating where to draw them:
essence-chunks.ts
-12
/** * Draw carcasses to canvas context (camera and zoom applied by caller). */export function drawCarcasses(  ctx: CanvasRenderingContext2D,
* Draw carcasses to canvas context (camera and zoom applied by caller).export function drawCarcasses(  ctx: CanvasRenderingContext2D,  carcasses: CarcassEntity[],  camera: { x: number;
 y: number },  zoom: number): void {/** * Draw carcasses to canvas context (ctx already in world coords with zoom applied by caller). */
/** * Draw chunks to canvas context. */  chunks: ChunkEntity[],
* Draw chunks to canvas context./** * Draw chunks to canvas context (ctx already in world coords). */  chunks: ChunkEntity[],
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';

-8
img.onload = () => {      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
```

### All Snippets (for reference)

#### Snippet at line 251

```typescript
/** * Carcass system: spawn, update, and draw carcasses left when a fish dies. * Uses Sprite Lab shared sprite 'carcass'. Carcass fades when all chunks collected or decay time elapses. */
essence-chunks.ts
+171
/** * Essence chunks: physical drops when a fish dies. Player collects by overlap to gain essence. * Uses Sprite Lab shared sprites (meatOrb or per-essence). Links to carcass for fade-when-done. */
Fixing essence-chunks: use CarcassEntity and setCarcassRemainingChunks.
essence-chunks.ts
+1
-6
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
import { decrementCarcassChunks, type CanvasStateWithCarcasses } from './carcass';import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';import type { Creature } from './types';
essence-chunks.ts
+2
-3
export function spawnChunksFromFish(  state: { chunks: ChunkEntity[]; carcasses: { carcassId: string; remainingChunks: number }[] },  deadFish: { creatureData?: Creature; x: number; y: number; size: number },  }
  state: { chunks: ChunkEntity[]; carcasses: { carcassId: string; remainingChunks: number }[] },export function spawnChunksFromFish(  state: CanvasStateWithCarcasses & { chunks: ChunkEntity[] },  deadFish: { creatureData?: Creature; x: number; y: number; size: number },  }
essence-chunks.ts
+2
-2
 */export function updateChunks(state: { chunks: ChunkEntity[] }, now: number): void {  for (let i = state.chunks.length - 1; i >= 0; i--) {      if (ch.carcassId) {
export function updateChunks(state: { chunks: ChunkEntity[] }, now: number): void { */export function updateChunks(state: CanvasStateWithCarcasses & { chunks: ChunkEntity[] }, now: number): void {  for (let i = state.chunks.length - 1; i >= 0; i--) {      if (ch.carcassId) {
essence-chunks.ts
+2
-2
export function checkChunkCollection(  state: CanvasStateWithCarcasses,  player: { x: number; y: number; size: number },): void {
  state: CanvasStateWithCarcasses,export function checkChunkCollection(  state: CanvasStateWithCarcasses & { chunks: ChunkEntity[] },  player: { x: number; y: number; size: number },): void {
Adding carcasses and chunks to canvas state and initializing player health.
canvas-state.ts
+2
import type { FishLifecycleState } from './combat-states';export type { FishLifecycleState };
import type { FishLifecycleState } from './combat-states';import type { CarcassEntity } from './carcass';import type { ChunkEntity } from './essence-chunks';export type { FishLifecycleState };
canvas-state.ts
+2
  lastSmallPreyRespawnTime: number;
  lastSmallPreyRespawnTime: number;  carcasses: CarcassEntity[];  chunks: ChunkEntity[];
canvas-state.ts
+2
      isExhausted: false,    };
      isExhausted: false,      health: 100,      maxHealth: 100,    };
canvas-state.ts
+2
    this.lastSmallPreyRespawnTime = 0;  }
    this.lastSmallPreyRespawnTime = 0;    this.carcasses = [];    this.chunks = [];  }
canvas-state.ts
+2
    this.dashHoldDurationMs = 0;  }
    this.dashHoldDurationMs = 0;    this.carcasses = [];    this.chunks = [];  }
canvas-state.ts
+8
    this.player.isExhausted = false;
    this.player.isExhausted = false;    const runState = typeof loadRunState === 'function' ? (loadRunState as () => { fishState: { health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {
Checking canvas-state imports and fixing resetPlayer so we don't call loadRunState from canvas-state (avoid circular deps).
Removing the loadRunState call from resetPlayer and setting default health.
canvas-state.ts
+2
-8
    this.player.isExhausted = false;    const runState = typeof loadRunState === 'function' ? (loadRunState as () => { fishState: { health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {
    const runState = typeof loadRunState === 'function' ? (loadRunState as () => { fishState: { health: number } } | null)() : null;    if (runState?.fishState) {      this.player.health = runState.fishState.health;      this.player.maxHealth = runState.fishState.health;    } else {      this.player.health = 100;      this.player.maxHealth = 100;    }    this.player.isExhausted = false;
Initializing fish health in addFishToState and player health from run state in FishEditorCanvas.
canvas-game-loop.ts
+3
  const animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;  const newFish: FishEntity = {    animationSprite: animSprite,
  const animSprite = anims && hasUsableAnimations(anims) ? state.animationSpriteManager.getSprite(newId, anims) : undefined;  const baseHealth = creature.stats?.health ?? 20;  const newFish: FishEntity = {    animationSprite: animSprite,    health: baseHealth,
FishEditorCanvas.tsx
+5
-1
      // In editor mode, use creature's actual size or base size      const playerSize = gameMode        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);
        ? (loadRunState()?.fishState.size ?? PLAYER_BASE_SIZE)      // In editor mode, use creature's actual size or base size      const runState = gameMode ? loadRunState() : null;      const playerSize = gameMode        ? (runState?.fishState.size ?? PLAYER_BASE_SIZE)        : (playerCreature.stats?.size ?? PLAYER_BASE_SIZE);
Marking todo 1 complete and starting todo 2 (carcass/chunks already implemented). Adding combat.ts with resolveAttack for todo 3.
Adding a combined preload and invoking it when the game starts. Checking where the game loop runs and where to call it:
Adding a combined preload and calling it when the game starts.
essence-chunks.ts
+8
/** * Preload carcass and chunk sprites from Sprite Lab (call once at level start). */export function preloadCarcassAndChunkSprites(): void {  import('./carcass').then((m) => m.preloadCarcassSprite()).catch(() => {});
canvas-game-loop.ts
+1
import { getSpawnPositionInBand } from './spawn-position';
import { getSpawnPositionInBand } from './spawn-position';import { preloadCarcassAndChunkSprites } from './essence-chunks';
canvas-game-loop.ts
+1
      : 0;  }
      : 0;    preloadCarcassAndChunkSprites();  }
Adding combat constants and creating combat.ts.
canvas-constants.ts
+9
// Combat / hit impact constantsexport const COMBAT = {  HIT_FLASH_DURATION: 200, // ms  HIT_PUNCH_SCALE: 1.15,  HIT_PUNCH_DURATION: 150, // ms
combat.ts
+80
/** * Combat resolution: health damage, knockback, hit flash/punch. * Single source for resolveAttack used by the game loop. */
Reading the full fish–fish and player–fish collision sections to replace combat logic.
Adding combat, carcass, and chunk imports to the game loop:
canvas-game-loop.ts
+3
-1
  restoreHunger,  applyAttackToTarget,  applyStaminaCost,} from './stamina-hunger';
  applyAttackToTarget,  restoreHunger,  applyStaminaCost,} from './stamina-hunger';import { resolveAttack } from './combat';
canvas-game-loop.ts
-1
  DASH_ATTACK_STAMINA_COST,  SWALLOW_SIZE_RATIO,  ATTACK_SIZE_RATIO,
  SWALLOW_SIZE_RATIO,  DASH_ATTACK_STAMINA_COST,  ATTACK_SIZE_RATIO,
canvas-game-loop.ts
+1
-1
import { getHeadPosition, getHeadRadius } from './canvas-collision';import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME } from './canvas-constants';import {
import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME } from './canvas-constants';import { getHeadPosition, getHeadRadius } from './canvas-collision';import { PHYSICS, AI, SPAWN, STAMINA, COLLISION, ANIMATION, PARTICLES, GAME, COMBAT } from './canvas-constants';import {
Replacing the fish-fish collision block with health-based resolution and carcass+chunks.
canvas-game-loop.ts
+60
-32
  // Fish-fish collisions (game mode only) - inline head-based logic  if (gameMode) {    const fishList = state.fish;    const eatenIds = new Set<string>();
  // Fish-fish collisions (game mode only) - inline head-based logic    const eatenIds = new Set<string>();  // Fish-fish collisions (game mode only) - health-based; death -> carcass + chunks  if (gameMode) {    const fishList = state.fish;
Replacing the player-fish collision block: handling KO + player dash, then one-sided and both-dashing attacks.
canvas-game-loop.ts
+102
-115
        state.gameMode.fishEaten += 1;        state.eatenIds.add(fish.id);        state.fish.splice(idx, 1);
        state.eatenIds.add(fish.id);        state.gameMode.fishEaten += 1;        const carcassId = spawnCarcass(state, { x: fish.x, y: fish.y }, { size: fish.size });        spawnChunksFromFish(state, fish, { x: fish.x, y: fish.y }, carcassId);        state.fish.splice(idx, 1);
Checking what follows the replaced block:
Adding updateCarcasses, updateChunks, and checkChunkCollection to the game tick (when gameMode).
canvas-game-loop.ts
+8
  if (gameMode) {    const nowMs = Date.now();    updateCarcasses(state, nowMs);    updateChunks(state, nowMs);    const runState = loadRunState();
Adding an optional damage override for the player (from run state). Checking how the renderer is structured:
combat.ts
+6
-2
 * Does not drain stamina by default. * @returns true if target died (health <= 0).  now: number,  options: { staminaCost?: number; knockback?: number; hitFlashMs?: number; hitPunchMs?: number } = {}
  options: { staminaCost?: number; knockback?: number; hitFlashMs?: number; hitPunchMs?: number } = {} * Does not drain stamina by default. * @param options.attackerDamage - Override damage (e.g. player damage from run state). * @returns true if target died (health <= 0).  now: number,
Passing player damage from run state when the player is the attacker:
canvas-game-loop.ts
+4
-1
      if (oneSidedAttack) {
      const runStateForCombat = loadRunState();      const playerDamage = runStateForCombat?.fishState.damage ?? 5;      if (oneSidedAttack) {
canvas-game-loop.ts
+1
-1
      } else if (evenlyMatched && bothDashing) {        const fishDied = resolveAttack(player, fish, now);        const playerDied = resolveAttack(fish, player, now);
        const fishDied = resolveAttack(player, fish, now);      } else if (evenlyMatched && bothDashing) {        const fishDied = resolveAttack(player, fish, now, { attackerDamage: playerDamage });        const playerDied = resolveAttack(fish, player, now);
canvas-game-loop.ts
+1
-1
      } else if (playerAttacking) {        const fishDied = resolveAttack(player, fish, now);        if (fishDied) {
        const fishDied = resolveAttack(player, fish, now);      } else if (playerAttacking) {        const fishDied = resolveAttack(player, fish, now, { attackerDamage: playerDamage });        if (fishDied) {
Applying size-ratio multiplier when using attackerDamage in combat.ts.
combat.ts
+11
-4
  const currentHealth = target.health ?? maxHealth;  const damage =    options.attackerDamage != null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);
  const damage =    options.attackerDamage != null      ? Math.max(1, Math.floor(options.attackerDamage * (attacker.size / 40)))      : computeHealthDamage(attacker, target);  const currentHealth = target.health ?? maxHealth;  let damage: number;
Adding carcasses and chunks to the renderer and implementing hit flash and punch. Locating where to draw them:
```

#### Snippet at line 405

```typescript
-12
/** * Draw carcasses to canvas context (camera and zoom applied by caller). */export function drawCarcasses(  ctx: CanvasRenderingContext2D,
 * Draw carcasses to canvas context (camera and zoom applied by caller).export function drawCarcasses(  ctx: CanvasRenderingContext2D,  carcasses: CarcassEntity[],  camera: { x: number; y: number },  zoom: number): void {/** * Draw carcasses to canvas context (ctx already in world coords with zoom applied by caller). */
essence-chunks.ts
-8
/** * Draw chunks to canvas context. */  chunks: ChunkEntity[],
 * Draw chunks to canvas context./** * Draw chunks to canvas context (ctx already in world coords). */  chunks: ChunkEntity[],
```

#### Snippet at line 518

```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';
```

#### Snippet at line 522

```typescript
-8
    img.onload = () => {      const canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const ctx = canvas.getContext('2d');      if (ctx) {
```

---


## combat-states.ts

*Found 1 snippet(s), merged from lines 238 to 238*

### Description

 with health-based resolution Checking where the player is initialized from run state and how resetForRun works: Implementing step 1: adding 'dying' to FishLifecycleState and health/hit/carcass state.


### Added Code

```typescript
* Combat (subset of active): exhausted, knocked_out */  | 'knocked_out'
* Combat (subset of active): exhausted, knocked_out * Death: dying (brief state before remove and spawn carcass + chunks) */  | 'knocked_out'  | 'dying'
```

---


## combat.ts

*Found 1 snippet(s), merged from lines 1296 to 1296*

### Context (before snippet)

```
if ('health' in target && typeof (target as { health: number }).health === 'number') {  // Always persist health so death (newHealth <= 0) is visible next frame; fixes fish created without health (e.g. spawn-sync).  if (typeof target === 'object' && target !== null) {    (target as { health: number }).health = newHealth;
Summary of what was wrong and what was changed:
Cause
Fish from level load had no health
In lib/game/canvas-spawn-sync.ts, fish pushed into state.fish were created without health or maxHealth.
Combat treated them as 100 HP and never updated
In lib/game/combat.ts, currentHealth = target.health ?? maxHealth and maxHealth = target.maxHealth ?? 100, so those fish were always read as 100 HP.
Health was only written when 'health' in target && typeof target.health === 'number', which was false for these fish, so their health was never reduced and they never died (unless a single hit did 100+ damage).
Changes
```

### Added Code

```typescript
-1
if ('health' in target && typeof (target as { health: number }).health === 'number') {    (target as { health: number }).health = newHealth;

```

---


## docs/plans/COMBAT_DEATH_CARCASS_ADDENDUM.md

*Found 1 snippet(s), merged from lines 130 to 130*

### Context (before snippet)

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
Put the canonical plan in the repo, e.g.
```

### Added Code

```typescript
## Module structure: new scripts (avoid bloating existing code)Implement carcass and chunk behaviour in **dedicated modules**;
 keep [canvas-game-loop.ts](lib/game/canvas-game-loop.ts), [canvas-state.ts](lib/game/canvas-state.ts), and [canvas-renderer.ts](lib/game/canvas-renderer.ts) thin by delegating to these modules.### New modules
COMBAT_DEATH_CARCASS_ADDENDUM.md(new)
+2
1. **State**
Implement using the **new scripts** above ([lib/game/carcass.ts](lib/game/carcass.ts) and [lib/game/essence-chunks.ts](lib/game/essence-chunks.ts));
 keep game loop and renderer thin by calling into these modules.1. **State**
-3
3. **Carcass fade**   - Each frame (or in a dedicated update): for each carcass, if (now - spawnTime >= decayTime) **or** (carcass has no remaining chunks), fade out (e.g. opacity over 1–2 s) then remove from `state.carcasses`.4. **Rendering**   - Draw carcasses (position, optional carcass sprite, opacity).
- Each frame (or in a dedicated update): for each carcass, if (now - spawnTime >= decayTime) **or** (carcass has no remaining chunks), fade out (e.g. opacity over 1–2 s) then remove from `state.carcasses`.   - Draw carcasses (position, optional carcass sprite, opacity).   - Draw chunks (position, essence-colored orb or meat chunk sprite).3. **Carcass fade**   - Handled in [lib/game/carcass.ts](lib/game/carcass.ts): `updateCarcasses(state, now)` — for each carcass, if (now - spawnTime >= decayTime) **or** (carcass has no remaining chunks), fade out (e.g. opacity over 1–2 s) then remove from `state.carcasses`.4. **Rendering**
Summary of what was added to the addendum:
Updates to docs/plans/COMBAT_DEATH_CARCASS_ADDENDUM.md
"Module structure: new scripts" section
lib/game/carcass.ts (new): CarcassEntity type;
 spawnCarcass(state, position, options);
 updateCarcasses(state, now) (decay/fade, remove when no chunks or time elapsed);
 drawCarcasses(ctx, state.carcasses, ...) using the generic carcass sprite. No combat or collision logic.
lib/game/essence-chunks.ts (new): ChunkEntity type;
 spawnChunksFromFish(state, deadFish, position, carcassId);
 updateChunks(state, now);
 checkChunkCollection(state, player, runState, callbacks) (overlap → addEssenceToRun, remove chunk, notify carcass);
 drawChunks(ctx, state.chunks, ...) using generic chunk/essence art.
Integration: Game loop only removes the dead fish, then calls spawnCarcass → spawnChunksFromFish;
 each tick calls updateCarcasses, updateChunks, checkChunkCollection;
 renderer calls drawCarcasses and drawChunks. Carcass/chunk logic stays in these two modules.
Art: Sprite Lab shared sprites
Carcass: load via getSharedSprite('carcass') from lib/storage/sprite-lab-db.ts;
 cache image/canvas in the carcass module (or a small loader) so drawing stays sync.
Chunks: use generic meat/chunk art — e.g. getSharedSprite('meatOrb') for one sprite, or per-essence keys if Sprite Lab stores them;
 optional tint from essence types.
Preload at level start or first use (e.g. preloadCarcassAndChunkSprites());
 new modules can expose this and the app/canvas init calls it once.
Implementation outline
States that implementation should follow these new scripts and that rendering is done via drawCarcasses / drawChunks from the new modules;
 the renderer only calls them and does not inline carcass/chunk logic.
Existing files (canvas-game-loop.ts, canvas-state.ts, canvas-renderer.ts) are only extended with: state arrays (state.carcasses, state.chunks), a few one-line calls into the new modules, and renderer calls to drawCarcasses / drawChunks. All carcass and chunk behaviour lives in the new scripts.
ok, looking at the plan doc, it looks incredibly misleading, and still references death/get eaten.  Please wipe that out and create a new updated plan
Finding all plan documents and creating a single, corrected plan that removes "death/eaten" language and uses the carcass+chunks flow.
@c:\Users\lukel\.cursor\plans\health_combat_and_hit_impact_396f7e4c.plan.md talking about this plan... the one you created with the plan tool
Rewriting the plan to remove "death/eaten" language and use the carcass+chunks flow.
Writing the updated plan: replacing the file with a version that uses the carcass+chunks flow and removes all "death/eaten" language.
I’m in Plan mode so I can’t edit the plan file directly. Here’s the full updated plan you can paste into c:\Users\lukel\.cursor\plans\health_combat_and_hit_impact_396f7e4c.plan.md, or you can switch to Agent mode and ask me to apply it.
Summary of changes
Removed all “death/eaten”, “get eaten”, “eatenIds” (for rewards), “eat whole”, and “no swallow branch” wording.
Architecture: Flow is Head overlap → Attack conditions → Resolve attack → Health damage → Health <= 0 → Death → Remove from play → Spawn carcass → Spawn chunks → Collect chunks grants essence → Carcass fades. No “Death / eaten” node.
Core principle: Death = remove from play + spawn carcass + chunks. Essence only from collecting chunks. No instant “eaten” rewards.
Part 1: Health-based combat;
 on death remove fish and call spawnCarcass + spawnChunksFromFish (no “add to eatenIds and grant rewards”).
Part 2: Carcass + chunks in new scripts (lib/game/carcass.ts, lib/game/essence-chunks.ts);
 Sprite Lab shared sprites;
 thin game-loop/renderer integration.
Part 3: Hit impact (flash, punch, knockback, dying state) unchanged but framed as “death animation then spawn carcass + chunks”, not “eaten and rewards”.
Part 4: Collision aligned with health-based resolution and death → carcass + chunks.
File checklist: Includes carcass.ts and essence-chunks.ts;
 no “eaten” or “rewards” in the death description.
Closing: “No ‘eaten’ or ‘get eaten’ — only death and physical drops.”
```

---


## docs/plans/COMBAT_HEALTH_CARCASS_HIT_IMPACT.md

*Found 1 snippet(s), merged from lines 204 to 204*

### Description

ly. You can get one canonical plan file that agents do update, by making the repo the source of truth and using Agent mode for edits. Keep one plan in the repo Put the canonical plan in the repo, e.g.


### Context (before snippet)

```
Creating a single consolidated plan with CreatePlan. We can't delete files in Plan mode — we'll create the new plan and tell you to remove the old plan and addendum (or switch to Agent mode to delete them).
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
Implementing step 1: adding 'dying' to FishLifecycleState and health/hit/carcass state.
```

---


## essence-chunks.ts

*Found 4 snippet(s), merged from lines 527 to 617*

### Context (before snippet)

```
if (ch.carcassId) decrementCarcassChunks(state, ch.carcassId);      callbacks.onChunkCollected?.(ch);      state.chunks.splice(i, 1);
```

### Added Code

```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';
import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';

-8
img.onload = () => {      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
onPushChomp?: (p: ChompParticleLike) => void;
  },
if (ch.carcassId) decrementCarcassChunks(state, ch.carcassId);
      state.chunks.splice(i, 1);

```

### All Snippets (for reference)

#### Snippet at line 527

```typescript
import { getSharedSprite } from '@/lib/storage/sprite-lab-db';import { decrementCarcassChunks, setCarcassRemainingChunks, type CanvasStateWithCarcasses } from './carcass';
```

#### Snippet at line 531

```typescript
-8
    img.onload = () => {      const canvas = document.createElement('canvas');      canvas.width = img.naturalWidth;      canvas.height = img.naturalHeight;      const ctx = canvas.getContext('2d');      if (ctx) {
```

#### Snippet at line 613

```typescript
    onPushChomp?: (p: ChompParticleLike) => void;  },
```

#### Snippet at line 617

```typescript
      if (ch.carcassId) decrementCarcassChunks(state, ch.carcassId);      state.chunks.splice(i, 1);
```

---


## lib/game/canvas-collision.ts

*Found 1 snippet(s), merged from lines 1215 to 1215*

### Context (before snippet)

```
Added getBodyRadius(size), BodyEntity interface, and resolveBodyOverlap(a, b) that pushes overlapping body circles apart (each moves half the overlap).
```

---


## lib/game/canvas-constants.ts

*Found 1 snippet(s), merged from lines 1274 to 1274*

### Description

ures need updating): npx tsx scripts/patch-creature-stats.ts Updated: 3 Skipped (no patch or already equal): 64 Failed: 0 Total: 67 Summary of changes: 1. Player health (1–2 chomps from big predators)


### Context (before snippet)

```
Added PLAYER_BASE_MAX_HEALTH = 30 (tunable in one place).
```

---


## lib/game/canvas-game-loop.ts

*Found 3 snippet(s), merged from lines 1217 to 1227*

### Description

pute facingDot = dx * (player.facingRight ? 1 : -1). Only treat a fish as a homing target when dist <= closeRange && dist < nearestDist && facingDot > 0.2 && f.size < player.size. 3. Bite-time lock-on


### Context (before snippet)

```
In applyPlayerFishAttack: after resolving the attack, set (attacker as { facingRight: boolean }).facingRight = (target.x - attacker.x) > 0.
In fish–fish applyAttack: after resolving the attack, set attacker.facingRight = (target.x - attacker.x) > 0.
Lints are clean. You can tune BODY_RADIUS_RATIO, the 0.2 facing threshold, or drop the f.size < player.size check if you want homing on same-size targets.
Ok i tuned it a little and that feels pretty good.  Can you patch the health as we discussed earlier?

Running the creature-stats patch and lowering the player's max health so big predators can kill in 1–2 chomps.
Adding a player health constant and running the creature-stats patch.
```

### All Snippets (for reference)

#### Snippet at line 1217

#### Snippet at line 1223

#### Snippet at line 1227

---


## lib/game/canvas-spawn-sync.ts

*Found 1 snippet(s), merged from lines 1309 to 1309*

### Description

itten when 'health' in target && typeof target.health === 'number', which was false for these fish, so their health was never reduced and they never died (unless a single hit did 100+ damage). Changes


### Context (before snippet)

```
When creating each fish, set health and maxHealth from creature data, with a default of 20:
baseHealth = creatureForSprite?.stats?.health ?? 20
Add health: baseHealth and maxHealth: baseHealth to the new fish object.
```

---


## lib/game/canvas-state.ts

*Found 1 snippet(s), merged from lines 1276 to 1276*

### Description

Added PLAYER_BASE_MAX_HEALTH = 30 (tunable in one place).


### Context (before snippet)

```
Initial state and resetPlayer() now use PLAYER_BASE_MAX_HEALTH instead of 100 for health and maxHealth.
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
Identifying the cause: fish created in canvas-spawn-sync.ts (level load) don't have health or maxHealth. Combat uses target.health ?? maxHealth (so undefined → 100) and only writes back when 'health' in target, so their health is never updated and they stay at 100 HP. Adding health and maxHealth when creating fish in canvas-spawn-sync.
```

---


## lib/game/carcass.ts

*Found 1 snippet(s), merged from lines 545 to 545*

### Description

 = fish.isDashing && fish.size > player.size * ATTACK_SIZE_RATIO; Summary of changes: 1. Magenta on carcass/chunk sprites Carcass and chunk sprites now use the same background removal as fish sprites:


### Context (before snippet)

```
Import removeBackground from @/lib/rendering/fish-renderer.
In preloadCarcassSprite(), after the image loads, set the cache to removeBackground(img) instead of a raw copy of the image. The carcass sprite is drawn from this processed canvas, so the magenta background is removed.
```

---


## lib/game/combat.ts

*Found 1 snippet(s), merged from lines 1313 to 1313*

### Description

ch fish, set health and maxHealth from creature data, with a default of 20: baseHealth = creatureForSprite?.stats?.health ?? 20 Add health: baseHealth and maxHealth: baseHealth to the new fish object.


### Context (before snippet)

```
Always write the new health back to the target (when it’s a non-null object) so that:
Death is consistent: died: newHealth <= 0 matches the stored health.
Any fish that still gets created without health gets it set on the first hit.
So: death is when health ≤ 0. The bug was that many fish never had health set and combat never updated it. With the spawn-sync fix and the combat write fix, fish now have the correct health (e.g. 20 from your patch) and take damage and die as intended. New games or level loads will see this immediately; already-spawned fish in a running session will only get correct behavior after they’re removed and respawned (or after a reload).
ok lookin better.  Let's address two remaining issues:

1. Prey that are larger than me just sit there and get eaten.  we should have them flee if they get attacked, no matter the size difference.

2. Let's increase the damage bonus on smaller fish to ramp up based on the size difference.  I figure if the fish is half the size, it should go down in one hit



Implementing both changes: locating prey flee logic and the combat damage formula.
Checking the full prey threat loop for context:
Implementing both changes.
```

---


## lib/game/essence-chunks.ts

*Found 1 snippet(s), merged from lines 548 to 548*

### Description

prite(), after the image loads, set the cache to removeBackground(img) instead of a raw copy of the image. The carcass sprite is drawn from this processed canvas, so the magenta background is removed.


### Context (before snippet)

```
Checking key spots to confirm what's implemented and what's left:
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
Implementing chunk-eating: adding the callback in essence-chunks and wiring it in the game loop.
```

---

