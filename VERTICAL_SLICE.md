# Vertical Slice Documentation

This document defines the complete vertical slice of gameplay for the roguelite fish game, focusing on the core loop from main menu through the first few levels of the Shallow biome.

## Table of Contents

1. [Core Loop Overview](#core-loop-overview)
2. [Step-by-Step Flow](#step-by-step-flow)
3. [UI/UX Specifications](#uiux-specifications)
4. [Gameplay Mechanics](#gameplay-mechanics)
5. [Progression Systems](#progression-systems)
6. [Technical Requirements](#technical-requirements)
7. [Art & Asset Requirements](#art--asset-requirements)
8. [Success Criteria](#success-criteria)

---

## Core Loop Overview

The vertical slice demonstrates the complete gameplay loop:
1. **Main Menu** → 2. **New Run** → 3. **Fish Selection** → 4. **Level 1-1 Gameplay** → 5. **Survival/Death** → 6. **Digestion** → 7. **Upgrade Selection** → 8. **Evolution** → 9. **Next Level** (repeat)

**Target Experience**: A new player can complete 1-2 levels, understand the core mechanics, experience progression, and feel motivated to continue playing.

---

## Step-by-Step Flow

### Step 1: Main Menu

**Screen**: Main menu with game title and navigation options

**UI Elements**:
- **Game Title**: Prominent, stylized title (inspired by DICE VADERS aesthetic)
- **Start Game** button (primary action, red/prominent)
- **Continue** button (grayed out, disabled for new players)
- **Options** button (secondary action, purple)
- **Fish Editor** button (secondary action, purple)

**Layout**: 
- Vertically stacked buttons, centered or slightly off-center
- Dark, cosmic/underwater background
- Glowing, sci-fi aesthetic with chunky borders
- Similar to DICE VADERS main menu style

**Functionality**:
- "Start Game" → Navigate to Step 2 (New Run)
- "Continue" → Disabled (no saved run exists)
- "Options" → Settings menu (sound, graphics, etc.)
- "Fish Editor" → Navigate to fish editor (existing feature)

**State Management**:
- Check for existing run save
- Enable "Continue" if run exists
- Track first-time player status

---

### Step 2: New Run Selection

**Screen**: Run configuration or direct transition

**Options**:
- **Option A**: Direct transition from "Start Game" to Fish Selection (simpler)
- **Option B**: Intermediate screen for run configuration (future expansion)

**For Vertical Slice**: Use Option A - direct transition to Fish Selection

**Functionality**:
- Initialize new run state
- Reset run-specific variables
- Clear previous run data (if any)

---

### Step 3: Fish Selection Menu

**Screen**: Character/fish selection screen (inspired by DICE VADERS character select)

**UI Layout**:
- **Central Display**: Large fish art card showing selected fish
  - Fish name (e.g., "GOLDFISH")
  - Level/Stats display (e.g., "LV 1")
  - Large fish sprite/art
  - Fish description
  - Current stats (Size, Speed, Health, Damage)
  - Primary essence type indicator

- **Bottom Carousel**: Horizontal row of available fish
  - Only one fish unlocked for new players: **"Shallows Goldfish"**
  - Other fish slots show "LOCKED" or are hidden
  - Selected fish highlighted with glowing border
  - Navigation arrows (left/right) if multiple fish available

- **Left Panel** (optional): 
  - Current biome info: "SHALLOWS 1-1"
  - Mission/objective: "Survive and grow!"

- **Bottom Buttons**:
  - **"BACK"** button (left) - Return to main menu
  - **"DIVE"** button (right, red/prominent) - Start level 1-1

**Fish Data** (Shallows Goldfish - Starter):
```typescript
{
  id: "goldfish_starter",
  name: "Goldfish",
  description: "A small, hardy fish perfect for beginners. Fast and agile.",
  type: "prey",
  rarity: "common",
  biomeId: "shallow",
  stats: {
    size: 20, // Very small - smaller than most fish
    speed: 7, // Fast for survival
    health: 15, // Low health - must be careful
    damage: 3 // Low damage - can only eat very small fish
  },
  essenceTypes: [
    { type: "shallow", baseYield: 3 }
  ],
  grantedAbilities: [] // No abilities for starter
}
```

**Functionality**:
- Display fish art and stats
- Highlight selected fish
- "DIVE" button starts level 1-1
- "BACK" returns to main menu

**Visual Style**:
- Similar to DICE VADERS character select
- Teal/purple borders, dark background
- Glowing effects on selected fish
- Clear, readable text

---

### Step 4: Level 1-1 Gameplay

**Screen**: Main gameplay area - underwater Shallow biome

**Initial State**:
- Player spawns as **Goldfish** (size 20)
- Much smaller than most fish in the level
- Starting position: Safe area or random spawn
- Hunger meter: 100% (full)
- Health: 15/15

**Level Environment**:
- **Biome**: Shallow (0-50m)
- **Background**: Bright, colorful coral reef
- **Lighting**: Bright, tropical waters
- **Stage Elements**: Coral, rocks, plants

**Gameplay Elements**:

1. **Essence Orbs**:
   - Scattered throughout the level
   - Glowing orbs that can be collected
   - Help kickstart growth
   - Attracted to player when close (if ability unlocked)
   - Visual: Glowing, pulsing orbs (color matches essence type)

2. **Other Fish** (AI-controlled):
   - **Smaller Fish** (size 10-15): Can be eaten, provide growth + essence
   - **Similar Size Fish** (size 18-22): Neutral, avoid or compete
   - **Larger Fish** (size 30+): Predators, must avoid
   - Spawn rates balanced for challenge

3. **Hunger Meter**:
   - Visible UI element (top of screen)
   - Decreases over time
   - Refilled by eating fish
   - **Death Condition**: Reaches 0% → Player dies

4. **Growth System**:
   - Eating smaller fish increases size
   - Size affects what can be eaten
   - Visual feedback: Fish grows larger
   - Collision detection updates with size

5. **Survival Conditions** (Win Level):
   - **Time Limit**: Survive for X seconds (e.g., 60-90 seconds)
   - **Hunger**: Keep hunger meter above 0%
   - **Eat All Fish**: Optional - eat all smaller fish in level
   - **Size Goal**: Reach target size (e.g., size 40)

**Controls**:
- Analog joystick (existing) or WASD/Arrow keys
- Movement: Swim in all directions
- Auto-eat: When touching smaller fish (size check)

**Difficulty Balance**:
- **Without Meta Upgrades**: Challenging but doable with careful play
- **With Meta Upgrades**: Easier, but still engaging
- Risk/reward: Aggressive play = faster growth but more danger

**Visual Feedback**:
- Size increase animation
- Essence collection particles
- Hunger meter visual warning (red when low)
- Damage indicators (screen shake, red flash)
- Growth burst effects

---

### Step 5: Survival/Death

#### 5a. Player Survives 1-1

**Conditions Met**:
- Time limit reached OR
- Hunger maintained above 0% OR
- All smaller fish eaten OR
- Target size reached

**Transition**:
- Victory screen/brief celebration
- Display stats: Size reached, fish eaten, essence collected
- Transition to **Step 6: Digestion**

#### 5b. Player Dies

**Death Conditions**:
- **Hunger**: Hunger meter reaches 0%
- **Eaten**: Larger predator fish catches player

**Death Screen**:
- "YOU WERE EATEN" or "YOU STARVED" message ✅ **IMPLEMENTED**
- Final stats display: ✅ **IMPLEMENTED**
  - Size reached
  - Fish eaten
  - Essence collected
  - Time survived
  - Score calculation

**Score Calculation**: ✅ **IMPLEMENTED**
```
Score = (Size × 10) + (Fish Eaten × 5) + (Time Survived × 2) + (Essence Collected × 3)
```

**Evo Points Conversion**: ✅ **IMPLEMENTED**
```
Evo Points = Score / 10 (rounded down)
Minimum: 1 evo point (even for very short runs)
```

**Meta Progression Screen**: ✅ **IMPLEMENTED**
- Display earned Evo Points
- Show total Evo Points
- "Return to Main Menu" button
- ⚠️ TODO: Meta upgrade spending UI (not yet implemented)

**Functionality**: ✅ **IMPLEMENTED**
- Save Evo Points to player data
- Update high score
- Return to **Step 1: Main Menu**

---

### Step 6: Digestion Sequence

**Screen**: Digestion mini-game/sequence

**Purpose**: Convert collected essence into level-ups for each essence type

**Mechanics**:
- **Fun, gamified math system** for essence conversion
- Each essence type processed separately
- Visual feedback: Essence orbs "digested" into level-up points

**UI Elements**:
- **Essence Display**: Show collected essence for each type
  - Shallow: 45 essence collected
  - Deep Sea: 0 essence
  - Tropical: 0 essence
  - Polluted: 0 essence

- **Digestion Animation**:
  - Essence orbs float into "digestion" area
  - Math calculation happens (gamified)
  - Level-up points appear

- **Level-Up Display**:
  - "Shallow Essence Level Up! +1"
  - "Shallow Essence Level Up! +1" (if enough for multiple)
  - Each can be collected separately (click/tap to collect)

**Digestion Formula** (Example):
```
Level-Up Threshold: 30 essence per level
Collected: 45 Shallow Essence
Result: 1 level-up (45 / 30 = 1.5 → 1 level)
Remaining: 15 essence (carries over to next level-up)
```

**Visual Style**:
- Animated, satisfying feedback
- Particle effects
- Sound effects for collection
- Clear progression indication

**Functionality**:
- Calculate level-ups for each essence type
- Allow player to collect each level-up separately
- Store remaining essence for next digestion
- Transition to **Step 7: Upgrade Selection**

---

### Step 7: Upgrade Selection

**Screen**: Upgrade selection screen (after essence level-up)

**Trigger**: Player collected essence level-up(s) in Step 6

**UI Layout**:
- **Header**: "Choose an Upgrade" or "Shallow Essence Level Up!"
- **Three Upgrade Cards**: Display 3 random upgrades from the level-up's essence category
  - Each card shows:
    - Upgrade name
    - Upgrade description
    - Visual icon/art
    - Effect preview

- **Reroll Button**: 
  - Limited rerolls for the run (e.g., 2-3 rerolls total)
  - Display remaining rerolls: "Reroll (2 remaining)"
  - Cost: Free (limited by count, not essence)

- **Selection**: Click/tap upgrade card to select

**Upgrade Pool** (Shallow Essence - Example):
```typescript
[
  {
    id: "coral_speed_1",
    name: "Coral Speed",
    description: "+1 Speed",
    category: "shallow",
    effect: { type: "stat", target: "speed", value: 1 }
  },
  {
    id: "reef_agility_1",
    name: "Reef Agility",
    description: "+10% Evasion",
    category: "shallow",
    effect: { type: "stat", target: "evasion", value: 0.1 }
  },
  {
    id: "swift_current_1",
    name: "Swift Current",
    description: "Periodic speed bursts",
    category: "shallow",
    effect: { type: "ability", target: "swift_current", unlock: true }
  }
]
```

**Randomization**:
- Select 3 random upgrades from essence category's upgrade pool
- Weighted by rarity (common upgrades more likely)
- No duplicates in the 3 options

**Reroll Mechanics**:
- Click "Reroll" → New 3 random upgrades
- Decrement reroll count
- Can reroll multiple times (until count reaches 0)

**Selection**:
- Click upgrade card → Apply upgrade
- Visual feedback: Upgrade "equipped"
- Transition to **Step 8: Evolution**

**Multiple Level-Ups**:
- If multiple essence types leveled up, show selection for each
- Process one at a time, or allow selection from all categories

---

### Step 8: Evolution Sequence

**Screen**: Evolution/transformation sequence

**Purpose**: Update fish art based on selected upgrades

**Mechanics**:

1. **Art Generation**:
   - Use existing fish art as base
   - Generate new image using AI (existing fish generation system)
   - Prompt includes:
     - Base fish: "Goldfish"
     - Upgrades selected: "Coral Speed", "Reef Agility"
     - Essence type: "Shallow"
     - Evolution level: 1

2. **Evolution Animation**:
   - Current fish art → Transformation effect → New fish art
   - Particle effects, glow, morphing animation
   - Duration: 2-3 seconds

3. **Art Caching**:
   - If art already exists for this upgrade combination, use cached version
   - If not, generate and cache for future use

4. **Essence Discard**:
   - Remaining unspent essence is "discarded" (not carried over)
   - Visual: Essence orbs fade away
   - Message: "Unspent essence discarded"

**Visual Style**:
- Dramatic transformation
- Glowing, particle effects
- Clear before/after comparison

**Functionality**:
- Update fish sprite/art
- Save evolved fish state
- Transition to **Step 9: Next Level**

---

### Step 9: Continue to Next Level

**Screen**: Level transition or direct gameplay

**Progression**:
- **1-1 Complete** → **1-2** (Next round in Shallow biome)
- Same biome, slightly increased difficulty
- More/larger fish
- Longer time limit or higher size goal

**Repeat Loop**:
- **Step 4**: Level 1-2 gameplay (same as 1-1, adjusted difficulty)
- **Step 5**: Survival/Death
- **Step 6**: Digestion (if survived)
- **Step 7**: Upgrade Selection (if essence leveled up)
- **Step 8**: Evolution (if upgrades selected)
- **Step 9**: Continue to 1-3, etc.

**Death Path**:
- If player dies → **Step 5b**: Death screen → Evo Points → Meta upgrades → **Step 1**: Main Menu

**Run End**:
- After completing multiple levels (e.g., 1-5) or death
- Return to main menu
- "Continue" button now enabled (if run saved)

---

## UI/UX Specifications

### Main Menu

**Layout**: Vertical stack of buttons, centered
- Title at top (large, glowing)
- Buttons: Start Game, Continue, Options, Fish Editor
- Dark background with subtle effects

**Style**: Inspired by DICE VADERS
- Chunky borders (teal/purple)
- Glowing effects
- Sci-fi aesthetic
- Clear, readable text

### Fish Selection

**Layout**: Character select style
- Central large fish card
- Bottom carousel (horizontal)
- Left panel (biome info)
- Bottom buttons (Back, DIVE)

**Style**: Similar to DICE VADERS character select
- Teal borders, dark background
- Glowing selected fish
- Clear stat display

### Gameplay HUD

**Elements**:
- **Hunger Meter**: Top center, visible, color-coded (green → yellow → red)
- **Health Bar**: Top left (if damage system implemented)
- **Size Indicator**: Top right (current size)
- **Essence Counter**: Bottom left (collected essence types)
- **Time Remaining**: Top center (if time limit)

**Style**: Minimal, non-intrusive
- Semi-transparent backgrounds
- Clear icons and numbers
- Color-coded warnings

### Digestion Screen

**Layout**: Central focus on essence processing
- Essence display (collected amounts)
- Digestion animation area
- Level-up notifications (collectible)

**Style**: Satisfying, gamified
- Particle effects
- Clear math visualization
- Interactive collection

### Upgrade Selection

**Layout**: Three upgrade cards, horizontal
- Large, clear cards
- Reroll button prominent
- Selection feedback

**Style**: Card-based, clear
- Distinct borders
- Icon/art for each upgrade
- Hover/selection states

### Evolution Screen

**Layout**: Central fish transformation
- Before/after comparison
- Transformation animation
- Essence discard visualization

**Style**: Dramatic, satisfying
- Particle effects
- Glow effects
- Clear transformation

---

## Gameplay Mechanics

### Movement

- **Analog Joystick**: Existing system
- **Keyboard**: WASD or Arrow keys (optional)
- **Smooth swimming**: Physics-based movement
- **Speed**: Affected by upgrades

### Eating/Growth

- **Auto-eat**: When touching smaller fish (size check)
- **Size Check**: Can only eat fish 20% smaller
- **Growth**: Size increases by eating
- **Visual Feedback**: Size increase animation

### Hunger System

- **Hunger Meter**: Decreases over time
- **Refill**: Eating fish restores hunger
- **Death**: Hunger reaches 0% → Death
- **Warning**: Visual/audio warning at 25%

### Essence Collection

- **Essence Orbs**: Scattered in level
- **Collection**: Touch to collect
- **Types**: Shallow (primary for starter)
- **Visual**: Glowing orbs, particle effects

### Survival Conditions

- **Time Limit**: Survive X seconds
- **Hunger**: Keep above 0%
- **Size Goal**: Reach target size
- **Eat All**: Optional - eat all smaller fish

---

## Progression Systems

### Run Progression

- **Levels**: 1-1, 1-2, 1-3, etc.
- **Difficulty Scaling**: More/larger fish, longer time, higher goals
- **Essence Collection**: More essence in later levels
- **Upgrade Stacking**: Upgrades persist across levels in run

### Meta Progression

- **Evo Points**: Earned on death
- **Meta Upgrades**: Permanent upgrades purchased with Evo Points
- **Examples**:
  - Starting Size +5
  - Starting Speed +1
  - Essence Multiplier +10%
  - Unlock New Fish

### Essence Level-Ups

- **Threshold**: 30 essence per level (example)
- **Level-Up**: Gain upgrade selection opportunity
- **Remaining Essence**: Carries over to next level-up
- **Multiple Types**: Each essence type levels independently

### Upgrade System

- **Random Selection**: 3 random upgrades from category
- **Rerolls**: Limited per run (2-3)
- **Persistence**: Upgrades last for entire run
- **Stacking**: Multiple upgrades can combine

---

## Technical Requirements

### State Management

- **Run State**: Current level, fish state, upgrades, essence
- **Player State**: Evo Points, meta upgrades, unlocked fish
- **Save System**: Save run progress, player data

### AI/Generation

- **Fish Art Generation**: Use existing system
- **Evolution Art**: Generate based on upgrades
- **Caching**: Cache generated art for performance

### Physics/Collision

- **Size-Based Collision**: Can only eat smaller fish
- **Movement**: Smooth, physics-based
- **Essence Collection**: Touch-based

### Performance

- **Frame Rate**: 60 FPS target
- **Fish Count**: Optimize for 20-30 fish on screen
- **Particle Effects**: Efficient rendering
- **Art Loading**: Async loading, caching

---

## Art & Asset Requirements

### UI Assets

- **Main Menu**: Background, buttons, title
- **Fish Selection**: Card frames, carousel, buttons
- **HUD Elements**: Hunger meter, health bar, icons
- **Digestion Screen**: Animation assets, particles
- **Upgrade Cards**: Card frames, icons
- **Evolution Screen**: Transformation effects

### Gameplay Assets

- **Backgrounds**: Shallow biome background
- **Stage Elements**: Coral, rocks, plants
- **Fish Sprites**: Goldfish (starter), other fish
- **Essence Orbs**: Glowing orb sprites
- **Particles**: Collection, growth, transformation

### Audio Assets

- **Music**: Main menu, gameplay, digestion
- **SFX**: Button clicks, essence collection, eating, growth, death, evolution

---

## Success Criteria

### Functional Requirements

- ✅ Complete core loop from main menu to level 1-2
- ✅ Fish selection with DIVE button
- ✅ Gameplay with essence collection and eating
- ✅ Survival/death conditions working
- ✅ Digestion sequence functional
- ✅ Upgrade selection with rerolls
- ✅ Evolution sequence with art generation
- ✅ Level progression (1-1 → 1-2)

### Player Experience

- ✅ New player can understand core mechanics
- ✅ Challenging but doable without meta upgrades
- ✅ Satisfying progression (growth, upgrades, evolution)
- ✅ Clear visual feedback
- ✅ Engaging loop (want to continue playing)

### Technical

- ✅ Stable 60 FPS gameplay
- ✅ Smooth transitions between screens
- ✅ Art generation working (evolution)
- ✅ Save/load system functional
- ✅ No major bugs or crashes

### Polish

- ✅ UI matches reference aesthetic (DICE VADERS style)
- ✅ Smooth animations
- ✅ Clear visual hierarchy
- ✅ Satisfying feedback (particles, sounds)
- ✅ Professional presentation

---

## Implementation Priority

### Phase 1: Core Loop (MVP)
1. Main menu (Step 1)
2. Fish selection (Step 3)
3. Basic gameplay (Step 4)
4. Survival/death (Step 5)
5. Return to menu (Step 5b)

### Phase 2: Progression
6. Digestion sequence (Step 6)
7. Upgrade selection (Step 7)
8. Evolution sequence (Step 8)
9. Level progression (Step 9)

### Phase 3: Polish
10. UI/UX refinement
11. Art generation optimization
12. Audio integration
13. Performance optimization
14. Bug fixes and balancing

---

## Next Steps

1. **Review and approve** this vertical slice document
2. **Create implementation plan** with specific tasks
3. **Set up project structure** for new features
4. **Begin Phase 1** implementation
5. **Iterate** based on playtesting feedback

This vertical slice will serve as the foundation for the full game, ensuring the core loop is solid before expanding to additional biomes, fish, and features.

---

## Implementation Notes

### Death Screen System (Implemented)

**Components**:
- `components/DeathScreen.tsx` - Main death screen component with DICE VADERS aesthetic
- `components/FishEditorCanvas.tsx` - Updated to track death cause and stats
- `components/GameCanvas.tsx` - Updated to handle death stats
- `app/game/page.tsx` - Updated to show death screen

**Features**:
- ✅ Death cause tracking ('starved' | 'eaten')
- ✅ Stats tracking (size, fish eaten, essence collected, time survived)
- ✅ Score calculation with formula breakdown
- ✅ Evo Points calculation and awarding
- ✅ Player state integration (saves Evo Points and high score)
- ✅ DICE VADERS aesthetic (chunky borders, glowing effects, dark cosmic background)
- ✅ Responsive design
- ✅ "Return to Main Menu" button

**Death Causes**:
1. **Starvation** (`cause: 'starved'`): Hunger reaches 0%
2. **Eaten** (`cause: 'eaten'`): Larger fish catches player (size > 1.2x player size)

**Stats Tracked**:
- `size`: Final size reached
- `fishEaten`: Number of fish consumed
- `essenceCollected`: Total essence collected (currently placeholder, needs essence system integration)
- `timeSurvived`: Seconds survived in the level

**Score Formula** (implemented in DeathScreen):
```typescript
score = (size * 10) + (fishEaten * 5) + (timeSurvived * 2) + (essenceCollected * 3)
```

**Evo Points Formula**:
```typescript
evoPoints = Math.max(1, Math.floor(score / 10))
```

**Visual Design**:
- Death message color-coded by cause (red for eaten, yellow for starved)
- Stats grid with cyan borders
- Score breakdown with purple accents
- Evo Points display with yellow/gold gradient
- Glowing shadow effects for emphasis
- Gradient background (blue → indigo → purple)

**Next Steps**:
- Integrate actual essence collection (currently using placeholder 0)
- Add meta upgrade spending UI
- Add sound effects for death and Evo Points awarded
- Add particle effects on death
- Consider adding "Play Again" button directly on death screen
