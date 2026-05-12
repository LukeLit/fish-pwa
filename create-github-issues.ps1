# Script to create GitHub issues for vertical slice epic
$repo = "LukeLit/fish-pwa"
$token = (Get-Content .env.local | Select-String "GITHUB_PAT" | ForEach-Object { $_.Line.Split('=')[1] }).Trim()
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

# Function to create an issue
function Create-Issue {
    param(
        [string]$Title,
        [string]$Body,
        [array]$Labels,
        [int]$Milestone = $null
    )
    
    $issueBody = @{
        title = $Title
        body = $Body
        labels = $Labels
    }
    
    if ($Milestone) {
        $issueBody.milestone = $Milestone
    }
    
    $json = $issueBody | ConvertTo-Json -Compress -Depth 10
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/issues" -Method Post -Headers $headers -Body $json -ContentType "application/json"
    return $response.number
}

# Create Epic Issue
Write-Host "Creating Epic Issue..."
$epicBody = @"
Implement the complete vertical slice of the roguelite fish game, covering the core gameplay loop from main menu through level progression, digestion, upgrades, and evolution.

**Goal**: Create a playable vertical slice that demonstrates the complete core loop and provides a foundation for the full game.

## Documentation References

- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md) - Complete vertical slice specification
- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md) - Full game design document
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Technical specifications
- [RESEARCH_GAME_MECHANICS.md](./RESEARCH_GAME_MECHANICS.md) - Research and inspiration

## Success Criteria

- ✅ Complete core loop from main menu to level 1-2
- ✅ All 9 steps of the gameplay flow working
- ✅ New player can understand and complete 1-2 levels
- ✅ Challenging but doable without meta upgrades
- ✅ Satisfying progression and visual feedback
- ✅ Stable 60 FPS gameplay
- ✅ Professional presentation matching DICE VADERS aesthetic

## Implementation Phases

1. **Phase 1: Core Loop (MVP)** - Main menu, fish selection, basic gameplay, survival/death
2. **Phase 2: Progression** - Digestion, upgrade selection, evolution, level progression
3. **Phase 3: Polish** - UI/UX refinement, art generation optimization, audio, performance
"@

$epicNumber = Create-Issue -Title "[EPIC] Roguelite Fish Game Vertical Slice Implementation" -Body $epicBody -Labels @("epic", "vertical-slice", "roguelite")
Write-Host "Epic created: #$epicNumber"

# Store issue numbers for linking
$issueNumbers = @{}
$issueNumbers["epic"] = $epicNumber

# Function to format issue body
function Format-IssueBody {
    param(
        [string]$Description,
        [string]$Requirements,
        [string]$AcceptanceCriteria,
        [string]$Documentation,
        [int]$DependsOn = 0,
        [int]$EpicNumber = 0
    )
    
    $body = $Description
    $body += "`n`n## Requirements`n`n" + $Requirements
    $body += "`n`n## Acceptance Criteria`n`n" + $AcceptanceCriteria
    $body += "`n`n## Documentation`n`n" + $Documentation
    
    if ($DependsOn -gt 0) {
        $body += "`n`n**Depends on**: #$DependsOn"
    }
    
    if ($EpicNumber -gt 0) {
        $body += "`n`n**Epic**: #$EpicNumber"
    }
    
    return $body
}

# Issue 1: Main Menu
Write-Host "Creating Issue 1: Main Menu..."
$issue1Body = Format-IssueBody `
    -Description "Create the main menu screen with navigation to Start Game, Continue (grayed out for new players), Options, and Fish Editor." `
    -Requirements "- Main menu UI matching DICE VADERS aesthetic (chunky borders, glowing effects, sci-fi style)`n- Vertically stacked buttons: Start Game, Continue, Options, Fish Editor`n- Dark cosmic/underwater background`n- `"Continue`" button state management (enabled if run exists, grayed out otherwise)`n- Navigation to appropriate screens" `
    -AcceptanceCriteria "- [ ] Main menu displays with correct layout and styling`n- [ ] All buttons are clickable and navigate correctly`n- [ ] `"Continue`" button is grayed out for new players`n- [ ] `"Continue`" button is enabled when a run exists`n- [ ] Visual style matches reference aesthetic" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-1-main-menu)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#gameplay-loop)" `
    -EpicNumber $epicNumber

$issueNumbers[1] = Create-Issue -Title "Main Menu Implementation" -Body $issue1Body -Labels @("phase-1", "ui", "main-menu")
Write-Host "Issue 1 created: #$($issueNumbers[1])"

# Issue 2: Fish Selection
Write-Host "Creating Issue 2: Fish Selection..."
$issue2Body = Format-IssueBody `
    -Description "Create the fish selection screen where players choose their starting fish before a run. Only `"Goldfish`" is unlocked for new players." `
    -Requirements "- Character select style layout (inspired by DICE VADERS)`n- Central large fish card displaying: Fish name (`"GOLDFISH`"), Level/Stats (LV 1), Large fish sprite/art, Fish description, Current stats (Size, Speed, Health, Damage), Primary essence type indicator`n- Bottom carousel with available fish (only Goldfish for new players)`n- Left panel showing biome info (`"SHALLOWS 1-1`") and mission objective`n- Bottom buttons: `"BACK`" (return to main menu) and `"DIVE`" (start level 1-1)`n- Goldfish starter data loaded from creature definitions" `
    -AcceptanceCriteria "- [ ] Fish selection screen displays with correct layout`n- [ ] Goldfish is the only available fish for new players`n- [ ] Fish stats and description display correctly`n- [ ] `"DIVE`" button starts level 1-1`n- [ ] `"BACK`" button returns to main menu`n- [ ] Visual style matches reference aesthetic" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-3-fish-selection-menu)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#starter-creature-vertical-slice)`n- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#creature-enhanced-fishdata-structure)" `
    -DependsOn $issueNumbers[1] `
    -EpicNumber $epicNumber

$issueNumbers[2] = Create-Issue -Title "Fish Selection Screen" -Body $issue2Body -Labels @("phase-1", "ui", "fish-selection")
Write-Host "Issue 2 created: #$($issueNumbers[2])"

# Issue 3: Run State Management
Write-Host "Creating Issue 3: Run State Management..."
$issue3Body = Format-IssueBody `
    -Description "Implement run state management system to track current run progress, fish state, collected essence, selected upgrades, and run statistics." `
    -Requirements "- Create `RunState` interface (see DATA_STRUCTURE.md)`n- Implement run state storage (local storage or API)`n- Run state includes: Current level (e.g., `"1-1`"), Selected fish ID, Fish state (size, speed, health, damage, sprite), Collected essence (by type), Selected upgrades, Rerolls remaining, Evolution level, Hunger (0-100), Stats (fish eaten, time survived, max size)`n- Save/load run state functionality`n- Initialize new run state on `"Start Game`"" `
    -AcceptanceCriteria "- [ ] RunState interface matches DATA_STRUCTURE.md specification`n- [ ] Run state can be saved and loaded`n- [ ] New run state initializes correctly`n- [ ] Run state persists across page refreshes`n- [ ] `"Continue`" button works based on run state existence" `
    -Documentation "- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#run-state)`n- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-2-new-run-selection)" `
    -DependsOn $issueNumbers[2] `
    -EpicNumber $epicNumber

$issueNumbers[3] = Create-Issue -Title "Run State Management System" -Body $issue3Body -Labels @("phase-1", "backend", "state-management")
Write-Host "Issue 3 created: #$($issueNumbers[3])"

# Continue with remaining issues...
Write-Host "`nCreating remaining issues..."

# Issue 4: Level 1-1 Gameplay
$issue4Body = Format-IssueBody `
    -Description "Implement the core gameplay for level 1-1: player spawns as small Goldfish, can move, collect essence orbs, eat smaller fish, and avoid larger predators." `
    -Requirements "- Player spawns as Goldfish (size 20, much smaller than most fish)`n- Shallow biome environment (bright, colorful coral reef background)`n- Movement system (analog joystick or keyboard)`n- Essence orb spawning and collection`n- Fish spawning (smaller, similar size, larger predators)`n- Size-based collision detection (can only eat fish 20% smaller)`n- Auto-eat when touching smaller fish`n- Growth system (size increases when eating)`n- Visual feedback for growth, essence collection" `
    -AcceptanceCriteria "- [ ] Player spawns correctly as small Goldfish`n- [ ] Movement works smoothly`n- [ ] Essence orbs spawn and can be collected`n- [ ] Fish spawn with appropriate sizes`n- [ ] Can eat smaller fish (size check works)`n- [ ] Cannot eat similar/larger fish`n- [ ] Size increases when eating`n- [ ] Visual feedback for all actions" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-4-level-1-1-gameplay)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#gameplay-loop)" `
    -DependsOn $issueNumbers[3] `
    -EpicNumber $epicNumber

$issueNumbers[4] = Create-Issue -Title "Level 1-1 Gameplay Core" -Body $issue4Body -Labels @("phase-1", "gameplay", "core-mechanics")
Write-Host "Issue 4 created: #$($issueNumbers[4])"

# Issue 5: Hunger System
$issue5Body = Format-IssueBody `
    -Description "Implement the hunger system that adds time pressure to each level. Hunger decreases over time and must be maintained above 0% to survive." `
    -Requirements "- Hunger meter UI element (top center of HUD)`n- Hunger starts at 100%`n- Hunger decreases over time (~1-2% per second, adjustable)`n- Eating fish restores hunger (amount based on fish size)`n- Death condition: Hunger reaches 0% → Player dies (starvation)`n- Visual warning at 25% hunger (screen tint, pulsing, audio cue)`n- Color-coded hunger meter (green → yellow → red)`n- Hunger refill feedback (particles when eating)" `
    -AcceptanceCriteria "- [ ] Hunger meter displays and updates correctly`n- [ ] Hunger decreases over time`n- [ ] Eating fish restores hunger`n- [ ] Death occurs when hunger reaches 0%`n- [ ] Visual warning appears at 25% hunger`n- [ ] Hunger meter color-coding works" `
    -Documentation "- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#hunger-system)`n- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#gameplay-mechanics)" `
    -DependsOn $issueNumbers[4] `
    -EpicNumber $epicNumber

$issueNumbers[5] = Create-Issue -Title "Hunger System" -Body $issue5Body -Labels @("phase-1", "gameplay", "hunger")
Write-Host "Issue 5 created: #$($issueNumbers[5])"

# Issue 6: Survival/Death
$issue6Body = Format-IssueBody `
    -Description "Implement survival conditions for completing a level and death conditions with score calculation and Evo Points conversion." `
    -Requirements "- Survival conditions (win level): Time limit (e.g., 60-90 seconds), Keep hunger above 0%, Optional: Eat all smaller fish, Optional: Reach target size (e.g., size 40)`n- Death conditions: Hunger reaches 0% (starvation), Eaten by larger predator`n- Death screen with: Death message (`"YOU WERE EATEN`" or `"YOU STARVED`"), Final stats display, Score calculation: `(Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)`, Evo Points conversion: `Score / 10` (rounded down, minimum 1)`n- Meta progression screen (on death): Display earned Evo Points, Show available meta upgrades, Allow spending on permanent upgrades, `"Return to Main Menu`" button" `
    -AcceptanceCriteria "- [ ] Level completes when survival conditions are met`n- [ ] Death occurs when death conditions are met`n- [ ] Death screen displays correctly with all stats`n- [ ] Score calculation is correct`n- [ ] Evo Points conversion is correct`n- [ ] Meta progression screen displays and functions`n- [ ] Evo Points are saved to player data" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-5-survivaldeath)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#evo-points-system)" `
    -DependsOn $issueNumbers[5] `
    -EpicNumber $epicNumber

$issueNumbers[6] = Create-Issue -Title "Survival Conditions and Death System" -Body $issue6Body -Labels @("phase-1", "gameplay", "survival")
Write-Host "Issue 6 created: #$($issueNumbers[6])"

# Issue 7: Digestion
$issue7Body = Format-IssueBody `
    -Description "Implement the digestion sequence that converts collected essence into level-ups for each essence type after completing a level." `
    -Requirements "- Digestion screen UI with: Essence display (collected amounts by type), Digestion animation area, Level-up notifications (collectible)`n- Digestion formula: Level-up threshold: 30 essence per level (example), Level-ups: `floor(collected / threshold)`, Remaining essence: `collected % threshold` (carries over)`n- Gamified elements: Essence orbs float into `"digestion`" area, Math calculation visualization, Click/tap to collect each level-up separately, Particle effects on collection, Sound effects`n- Process each essence type independently`n- Store remaining essence for next digestion" `
    -AcceptanceCriteria "- [ ] Digestion screen displays correctly`n- [ ] Essence is converted to level-ups using correct formula`n- [ ] Each level-up can be collected separately`n- [ ] Remaining essence carries over correctly`n- [ ] Visual feedback is satisfying`n- [ ] Multiple essence types process independently" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-6-digestion-sequence)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#digestion-system)" `
    -DependsOn $issueNumbers[6] `
    -EpicNumber $epicNumber

$issueNumbers[7] = Create-Issue -Title "Digestion Sequence" -Body $issue7Body -Labels @("phase-2", "progression", "digestion")
Write-Host "Issue 7 created: #$($issueNumbers[7])"

# Issue 8: Upgrade Selection
$issue8Body = Format-IssueBody `
    -Description "Implement the upgrade selection screen where players choose from 3 random upgrades after essence level-up, with limited rerolls." `
    -Requirements "- Upgrade selection screen UI: Header showing essence type that leveled up, Three upgrade cards (name, description, icon, effect preview), Reroll button with remaining count display`n- Randomization: Select 3 random upgrades from essence category's upgrade pool, Weighted by rarity (common more likely), No duplicates`n- Reroll system: Starting rerolls: 2-3 per run, Free (limited by count, not essence), Display remaining rerolls`n- Selection: Click/tap upgrade card → Apply upgrade, Visual feedback: Upgrade `"equipped`", Upgrade persists for entire run`n- Handle multiple level-ups (process one at a time)" `
    -AcceptanceCriteria "- [ ] Upgrade selection screen displays correctly`n- [ ] 3 random upgrades shown from correct category`n- [ ] Reroll system works (limited rerolls)`n- [ ] Upgrades can be selected and applied`n- [ ] Selected upgrades persist for run`n- [ ] Multiple level-ups process correctly" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-7-upgrade-selection)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#upgrade-selection-system)`n- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#upgradenode)" `
    -DependsOn $issueNumbers[7] `
    -EpicNumber $epicNumber

$issueNumbers[8] = Create-Issue -Title "Upgrade Selection System" -Body $issue8Body -Labels @("phase-2", "progression", "upgrades")
Write-Host "Issue 8 created: #$($issueNumbers[8])"

# Issue 9: Evolution
$issue9Body = Format-IssueBody `
    -Description "Implement the evolution sequence that updates fish art based on selected upgrades using AI generation." `
    -Requirements "- Evolution screen with transformation animation`n- Art generation: Use existing fish art as base, Generate new image using AI (existing fish generation system), Prompt includes: base fish, upgrades selected, essence type, evolution level`n- Art caching: Check if art exists for upgrade combination, Use cached version if exists, Generate and cache if not, Cache key: `{fishId}_{upgradeIds}_ev{level}`n- Evolution animation: Current art → Transformation → New art, Duration: 2-3 seconds, Particle effects, glow, morphing`n- Essence discard: Remaining unspent essence is `"discarded`", Visual: Essence orbs fade away, Message: `"Unspent essence discarded`"`n- Update fish sprite/art in run state" `
    -AcceptanceCriteria "- [ ] Evolution screen displays correctly`n- [ ] Art generation works (or uses cached art)`n- [ ] Art is cached for performance`n- [ ] Evolution animation is smooth and satisfying`n- [ ] Essence discard is visualized`n- [ ] Fish sprite updates in run state" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-8-evolution-sequence)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#evolution-system)" `
    -DependsOn $issueNumbers[8] `
    -EpicNumber $epicNumber

$issueNumbers[9] = Create-Issue -Title "Evolution Sequence" -Body $issue9Body -Labels @("phase-2", "progression", "evolution", "ai-generation")
Write-Host "Issue 9 created: #$($issueNumbers[9])"

# Issue 10: Level Progression
$issue10Body = Format-IssueBody `
    -Description "Implement level progression system allowing players to continue from 1-1 to 1-2, 1-3, etc., with increasing difficulty." `
    -Requirements "- Level structure: `{Biome}-{LevelNumber}` (e.g., `"1-1`", `"1-2`", `"1-3`")`n- Difficulty scaling per level: More fish spawn, Larger average predator size, Longer time limit (or higher size goal), More essence orb spawns`n- Level transition: After completing level → Show stats → Digestion → Upgrade → Evolution → Next level, After death → Death screen → Evo Points → Main menu`n- Run state updates: Current level increments, Fish state persists (size, upgrades, etc.), Collected essence resets (after digestion)`n- Example scaling (Shallow): 1-1: 10-15 fish, 60s time limit, size goal 40; 1-2: 15-20 fish, 75s time limit, size goal 50; 1-3: 20-25 fish, 90s time limit, size goal 60" `
    -AcceptanceCriteria "- [ ] Level progression works (1-1 → 1-2 → 1-3)`n- [ ] Difficulty scales correctly per level`n- [ ] Run state updates correctly`n- [ ] Level transitions are smooth`n- [ ] Death path returns to main menu correctly" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#step-9-continue-to-next-level)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#level-progression-system)" `
    -DependsOn $issueNumbers[9] `
    -EpicNumber $epicNumber

$issueNumbers[10] = Create-Issue -Title "Level Progression System" -Body $issue10Body -Labels @("phase-2", "progression", "levels")
Write-Host "Issue 10 created: #$($issueNumbers[10])"

# Issue 11: Player State
$issue11Body = Format-IssueBody `
    -Description "Implement player state management and meta progression system for Evo Points and permanent upgrades." `
    -Requirements "- Create `PlayerState` interface (see DATA_STRUCTURE.md)`n- Player state includes: Evo Points, Permanent essence totals, Meta upgrade levels, Unlocked fish, Unlocked biomes, Bestiary (discovered creatures), High score, Total runs`n- API endpoints: `GET/POST /api/player/evo-points`, `POST /api/player/purchase-meta-upgrade`, `GET/POST /api/player/run-state`, `POST /api/player/calculate-score`n- Meta upgrades (examples): Starting Size +5 (cost: 50 Evo Points), Starting Speed +1 (cost: 40 Evo Points), Essence Multiplier +10% (cost: 100 Evo Points), Hunger Drain -10% (cost: 60 Evo Points)`n- Save/load player state (hybrid: local + cloud sync)" `
    -AcceptanceCriteria "- [ ] PlayerState interface matches specification`n- [ ] Evo Points are saved and loaded correctly`n- [ ] Meta upgrades can be purchased`n- [ ] Meta upgrades affect gameplay (starting stats, etc.)`n- [ ] Player state persists across sessions`n- [ ] API endpoints work correctly" `
    -Documentation "- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#player-state)`n- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#evo-points-system)" `
    -DependsOn $issueNumbers[6] `
    -EpicNumber $epicNumber

$issueNumbers[11] = Create-Issue -Title "Player State and Meta Progression" -Body $issue11Body -Labels @("phase-2", "backend", "meta-progression")
Write-Host "Issue 11 created: #$($issueNumbers[11])"

# Issue 12: Essence System
$issue12Body = Format-IssueBody `
    -Description "Implement the essence system with multiple essence types, collection during runs, and storage." `
    -Requirements "- Essence types: Shallow, Deep Sea, Tropical, Polluted (core types)`n- Essence collection: Essence orbs spawn in levels, Creatures drop essence orbs when consumed, All essence types from creature are collected (no chance-based)`n- Essence storage: Collected essence stored in run state, Permanent essence stored in player state, Display essence totals in UI`n- Essence yield formula: Base yield = Creature Size × Biome Multiplier, Quality multiplier (Standard: 1.0x, Perfect: 1.5x, Combo: 2.0x), Rarity multiplier (Common: 1.0x, Rare: 1.5x, Epic: 2.0x, Legendary: 3.0x)`n- Essence orb spawning: Spawn rate based on biome, Visual: Glowing orbs (color matches essence type), Collection feedback (particles, sound)" `
    -AcceptanceCriteria "- [ ] Essence types are defined correctly`n- [ ] Essence collection works (orbs and creatures)`n- [ ] Essence yield formula is correct`n- [ ] Essence is stored correctly (run state and player state)`n- [ ] Essence orbs spawn and can be collected`n- [ ] Visual feedback is clear" `
    -Documentation "- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#essence-system)`n- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#essencetype)" `
    -DependsOn $issueNumbers[4] `
    -EpicNumber $epicNumber

$issueNumbers[12] = Create-Issue -Title "Essence System Implementation" -Body $issue12Body -Labels @("phase-2", "backend", "essence")
Write-Host "Issue 12 created: #$($issueNumbers[12])"

# Issue 13: Biome System
$issue13Body = Format-IssueBody `
    -Description "Implement the biome system with base depths and modifiers, including background assets and stage elements." `
    -Requirements "- Biome structure: Base depth + Modifiers`n- Core biomes: Shallow (starting biome), Shallow + Tropical, Medium, Medium + Polluted, Deep`n- Biome data includes: Background image URL, Stage element asset URLs, Lighting configuration, Essence orb spawn rate, Creature spawn rules`n- Load and display: Background images, Stage elements (coral, rocks, plants), Lighting effects`n- Biome definitions loaded from blob storage or local files" `
    -AcceptanceCriteria "- [ ] Biome system structure matches specification`n- [ ] Shallow biome displays correctly with background`n- [ ] Stage elements render correctly`n- [ ] Lighting effects work`n- [ ] Biome data can be loaded from storage`n- [ ] Essence orb spawn rate works per biome" `
    -Documentation "- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#biome-system)`n- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#biome)" `
    -DependsOn $issueNumbers[4] `
    -EpicNumber $epicNumber

$issueNumbers[13] = Create-Issue -Title "Biome System and Background Assets" -Body $issue13Body -Labels @("phase-2", "assets", "biomes")
Write-Host "Issue 13 created: #$($issueNumbers[13])"

# Issue 14: Creature System
$issue14Body = Format-IssueBody `
    -Description "Implement the creature system with proper spawning, essence yields, and size-based interactions." `
    -Requirements "- Creature data structure matches DATA_STRUCTURE.md`n- Creature spawning: Spawn rules (canAppearIn, spawnWeight, minDepth, maxDepth), Size distribution (smaller, similar, larger), Spawn rates balanced for challenge`n- Essence yields: Each creature provides all essence types it contains, Base yield calculation, Quality and rarity multipliers`n- Creature AI: Movement patterns, Predator behavior (chase smaller fish), Prey behavior (flee from predators)`n- Size-based interactions: Can only eat fish 20% smaller, Can be eaten by fish 20% larger, Collision detection updates with size" `
    -AcceptanceCriteria "- [ ] Creature data structure is correct`n- [ ] Creatures spawn according to rules`n- [ ] Size distribution is balanced`n- [ ] Essence yields are correct`n- [ ] Creature AI behaves appropriately`n- [ ] Size-based interactions work correctly" `
    -Documentation "- [ROGUELITE_DESIGN.md](./ROGUELITE_DESIGN.md#creature-system)`n- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md#creature-enhanced-fishdata-structure)" `
    -DependsOn $issueNumbers[4] `
    -EpicNumber $epicNumber

$issueNumbers[14] = Create-Issue -Title "Creature System and Spawning" -Body $issue14Body -Labels @("phase-2", "gameplay", "creatures")
Write-Host "Issue 14 created: #$($issueNumbers[14])"

# Issue 15: UI/UX Polish
$issue15Body = Format-IssueBody `
    -Description "Polish all UI/UX elements to match the DICE VADERS aesthetic and ensure professional presentation." `
    -Requirements "- Main menu: Chunky borders, glowing effects, sci-fi style`n- Fish selection: Teal/purple borders, dark background, glowing selected fish`n- Gameplay HUD: Minimal, non-intrusive, clear icons`n- Digestion screen: Satisfying animations, clear math visualization`n- Upgrade selection: Card-based, clear borders, hover/selection states`n- Evolution screen: Dramatic transformation, particle effects`n- All screens: Consistent visual style, clear hierarchy, readable text`n- Transitions: Smooth between all screens`n- Responsive design: Works on mobile and desktop" `
    -AcceptanceCriteria "- [ ] All UI elements match DICE VADERS aesthetic`n- [ ] Visual hierarchy is clear`n- [ ] Text is readable`n- [ ] Transitions are smooth`n- [ ] Responsive design works`n- [ ] Professional presentation" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#uiux-specifications)" `
    -EpicNumber $epicNumber

$issueNumbers[15] = Create-Issue -Title "UI/UX Polish and DICE VADERS Aesthetic" -Body $issue15Body -Labels @("phase-3", "polish", "ui")
Write-Host "Issue 15 created: #$($issueNumbers[15])"

# Issue 16: Audio
$issue16Body = Format-IssueBody `
    -Description "Integrate audio assets (music and SFX) throughout the game." `
    -Requirements "- Music: Main menu theme, Gameplay theme, Digestion sequence theme`n- SFX: Button clicks, Essence collection, Eating fish, Growth/size increase, Death, Evolution transformation, Hunger warning, Level complete`n- Audio system: Volume controls, Music/SFX toggle, Smooth transitions, Performance optimization" `
    -AcceptanceCriteria "- [ ] Music plays in appropriate screens`n- [ ] SFX play for all actions`n- [ ] Volume controls work`n- [ ] Audio doesn't impact performance`n- [ ] Transitions are smooth" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#art--asset-requirements)" `
    -EpicNumber $epicNumber

$issueNumbers[16] = Create-Issue -Title "Audio Integration" -Body $issue16Body -Labels @("phase-3", "polish", "audio")
Write-Host "Issue 16 created: #$($issueNumbers[16])"

# Issue 17: Performance
$issue17Body = Format-IssueBody `
    -Description "Optimize game performance to achieve stable 60 FPS and smooth gameplay." `
    -Requirements "- Frame rate: Target 60 FPS`n- Fish count: Optimize for 20-30 fish on screen`n- Particle effects: Efficient rendering`n- Art loading: Async loading, caching`n- State management: Efficient updates`n- Memory management: Prevent leaks`n- Profiling: Identify and fix bottlenecks" `
    -AcceptanceCriteria "- [ ] Stable 60 FPS during gameplay`n- [ ] No frame drops with 20-30 fish`n- [ ] Particle effects don't impact performance`n- [ ] Art loads efficiently`n- [ ] No memory leaks`n- [ ] Smooth gameplay on target devices" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#technical-requirements)" `
    -EpicNumber $epicNumber

$issueNumbers[17] = Create-Issue -Title "Performance Optimization" -Body $issue17Body -Labels @("phase-3", "polish", "performance")
Write-Host "Issue 17 created: #$($issueNumbers[17])"

# Issue 18: Testing
$issue18Body = Format-IssueBody `
    -Description "Comprehensive testing of the vertical slice and fixing all bugs." `
    -Requirements "- Test all 9 steps of the core loop`n- Test edge cases: Very short runs, Very long runs, Multiple level-ups, Multiple rerolls, Death at various points`n- Test state persistence: Run state saves/loads correctly, Player state persists, Continue button works`n- Test performance: Frame rate, Memory usage, Loading times`n- Fix all bugs found`n- Balance testing: Difficulty without meta upgrades, Progression feels good, Essence yields are balanced" `
    -AcceptanceCriteria "- [ ] All core loop steps work correctly`n- [ ] Edge cases are handled`n- [ ] State persistence works`n- [ ] Performance is acceptable`n- [ ] No critical bugs`n- [ ] Game is balanced" `
    -Documentation "- [VERTICAL_SLICE.md](./VERTICAL_SLICE.md#success-criteria)" `
    -EpicNumber $epicNumber

$issueNumbers[18] = Create-Issue -Title "Testing and Bug Fixes" -Body $issue18Body -Labels @("phase-3", "testing", "bug-fixes")
Write-Host "Issue 18 created: #$($issueNumbers[18])"

Write-Host "`n✅ All issues created successfully!"
Write-Host "Epic Issue: #$epicNumber"
Write-Host "Sub-issues: #$($issueNumbers[1]) through #$($issueNumbers[18])"
Write-Host "`nIssue Numbers:"
$issueNumbers.GetEnumerator() | Sort-Object Key | ForEach-Object { Write-Host "  Issue $($_.Key): #$($_.Value)" }
