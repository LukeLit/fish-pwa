# Game Mechanics Research

This document contains research findings from three reference games: **Dave the Diver**, **Hungry Shark Evolution**, and **fisheatfish.io (Fisch)**. These mechanics will inform our roguelite fish-eat-fish game design.

## Table of Contents

1. [Dave the Diver](#dave-the-diver)
2. [Hungry Shark Evolution](#hungry-shark-evolution)
3. [fisheatfish.io (Fisch)](#fisheatfishio-fisch)
4. [Comparative Analysis](#comparative-analysis)
5. [Key Takeaways for Our Game](#key-takeaways-for-our-game)

---

## Dave the Diver

### Core Mechanics

#### Fish Quality System
- **3-Star Rating System**: Quality is determined by how fish are caught, affecting meat yield
  - **Small Fish**:
    - ★ (1 star): Dead fish - fewest portions
    - ★★ (2 stars): Caught alive with harpoon - medium portions
    - ★★★ (3 stars): Caught alive without harpoon - most portions
  - **Large Fish**:
    - ★★: Dead fish cut underwater (10 portions) or picked up by drone (15 portions)
    - ★★★: Alive fish picked up by drone (27 portions)
- **Quality Achievement**: Requires tranquilizing weapons or nets for large fish; not all fish are susceptible

#### Biome & Depth System
- **Blue Hole Shallows**: 0-50m depth (48 fish species)
- **Blue Hole Medium Depth**: 50-130m (35 fish species)
- **Blue Hole Depths**: 130-250m (23 fish species)
- **Glacier Passage**: ~450m (6 fish species)
- **Glacier Zone**: ~540m (18 fish species)
- **Hydrothermal Vents**: ~570m (15 fish species)
- **Progression**: Requires suit upgrades to access deeper zones

#### Fish Attributes
- **Weight**: Measured in kg
- **Length**: Measured in cm
- **Active Time**: Day/night cycles affect fish availability
- **Usable Menus**: Different fish can be used in different sushi recipes
- **Behavior**: Some fish flee when threatened, others are aggressive

#### Marinca (Marine Cards) Collection System
- Virtual card collection app unlocked in Chapter 1
- Cards created from marine creatures caught or photographed
- Organized by biome and depth zones
- **Star Rating System**:
  - 1 star (bronze): Basic catch
  - 2 stars (silver): Better quality catch
  - 3 stars (gold): Highest quality (often requires special equipment)
- 3-star cards require catching fish alive (Steel Net Gun or drone for medium/large fish)

#### Fish Farm System
- Unlocks after completing "A Noisy Customer" sub mission in Chapter 2
- **Breeding Mechanics**:
  - Fish breed when you have two of the same species in a tank
  - Collecting 2-3 star fish provides ~50% chance of receiving Fish Eggs or Roe
  - Eggs/Roe automatically populate the farm
- **Tank Upgrades**:
  - Basic tanks free for Shallows and Medium Depth
  - Other biomes cost 800-1,000 currency to unlock initially
  - Level upgrades cost 300-1,100 depending on biome
- **Strategy**: Keep pairs of rare/expensive fish for breeding, sell low-grade fish, send quality specimens to sushi bar

#### Progression Mechanics
- **Depth Progression**: Unlock deeper zones through suit upgrades
- **Collection Progression**: Complete Marinca cards for each fish at all quality levels
- **Economic Progression**: Earn currency from selling fish, upgrade equipment and farm
- **Recipe Progression**: Unlock new sushi recipes by discovering new fish types

---

## Hungry Shark Evolution

### Core Mechanics

#### Stat Upgrade System
Three primary upgradeable stats, each with 6 levels (minimal, level 1-5):
- **Bite**: Measures consumption speed
  - Upgrading increases bite power by 20% per level
  - Priority upgrade for beginners (survival and earning)
- **Speed**: Determines swimming speed
  - Essential for chasing prey and escaping threats
- **Boost**: Represents boost capacity
  - Critical for reaching hidden areas and surviving longer
- **Strategy**: Balance all three stats rather than maxing one

#### Shark Progression Tiers
Progression through increasingly powerful shark tiers:
1. **Reef Shark** - Starter, limited to tiny fish and small prey
2. **Mako Shark** - First upgrade with improved speed
3. **Hammerhead Shark** - Balanced speed, bite power, and durability
4. **Tiger Shark** - Major progression step, increased strength, faster resource earnings
5. **Great White Shark** - Iconic predator, access to most ocean prey
6. **Premium Sharks** - Megalodon, Kraken, Big Daddy, Sharkjira, Abyssaurus Rex

#### Currency System
Two main currencies:
- **Coins (Gold)**: Primary currency
  - Earned through regular gameplay
  - Used for unlocking basic sharks and purchasing accessories
  - Sources: eating golden creatures during gold rushes, eating schools of fish, completing missions, watching ads (100 coins per 15-30s), daily bonuses
- **Gems**: Premium currency
  - Rarer and more valuable
  - Unlocks legendary sharks, powerful accessories, special skins, instant revives, new maps
  - Sources: finding and eating gemfish (random spawns), discovering sunken objects, daily reward chests

#### Roguelite Loop
1. **Earn Currency**: Play runs, complete missions, find special items
2. **Upgrade Stats**: Improve Bite, Speed, Boost on current shark
3. **Unlock Next Tier**: Reach 100% growth or pay gems for instant unlock
4. **Equip Accessories**: Jetpack, Laser Beam, Treasure Detector, etc.
5. **Explore New Areas**: Unlock maps and hidden areas
6. **Repeat**: Each tier provides access to larger prey and new challenges

#### Accessories & Abilities
- **Jetpack**: Enhanced mobility
- **Laser Beam**: Offensive ability
- **Treasure Detector**: Utility for finding valuable items
- **Hypno Hats**: Special abilities
- Accessories provide game-changing abilities that enhance survival and progression

#### Progression Strategy
- **Early Game**: Prioritize Bite upgrades for survival and earning
- **Mid Game**: Balance Speed and Boost upgrades for collecting food quickly
- **Late Game**: Unlock premium sharks with gems, equip powerful accessories
- **Missions**: Complete missions for massive currency rewards

---

## fisheatfish.io (Fisch)

### Core Mechanics

#### Rod Progression System
- **178+ fishing rods** available in the game
- **5 core stats** for each rod:
  - **Lure Speed**: How fast the lure moves
  - **Luck**: Chance of catching rare fish
  - **Control**: Ease of use and stability
  - **Resilience**: Durability and break resistance
  - **Max Kg**: Maximum fish weight capacity

#### Stage Progression
- **12+ stages** of rod progression
- Progression structured through increasingly expensive rod purchases
- **Early Game (Moosewood)**:
  - Free Flimsy Rod (starter)
  - Carbon Rod ($2,000): 15% lure speed, 25% luck (first real purchase)
- **Mid Game (Roslit Bay)**:
  - Steady Rod ($7,000): Larger shake UI, -60% lure speed (mobile-friendly)
  - Rapid Rod ($14,000): 89% lure speed, 49% luck, zero control (skill-based)
- **Late Game**:
  - King's Rod ($100,000): 30% size boost, 85% luck
  - Carrot Rod ($75,000): 125% luck, mutations
  - Volcanic Rod ($400,000): Volcano access
  - Great Dreamer Rod ($500,000): 147% luck

#### Enchanting System
- **Enchant Relics**: Rare, single-use items that apply random enchantments
- **Mechanics**:
  - Rods enchanted at the Keepers Altar
  - Each rod can only contain one enchantment at a time
  - Applying a new relic replaces the previous enchantment
- **Obtaining Relics**:
  - 1 in 350 chance when fishing (1 in 100 in The Depths)
  - Purchased from Merlin at Sunstone Island for 11,000C$ (Level 30+)
  - 10% chance from treasure chests
- **34 enchantments** available with various stat boosts, XP multipliers, and mutation chances
- **Affected Stats**: Lure Speed, Luck, Control, Resilience, Max Kg

#### Passive Abilities
Rod-specific passive abilities unlocked through various means:
- **Steady Rod**: Larger Shake UI
- **King's Rod**: All caught fish are 15% larger
- **Magnet Rod**: 95% chance to get crates
- **Midas Rod**: 60% chance for caught fish to be Golden
- **Mythical Rod**: 30% chance for caught fish to be Mythical
- **Aurora Rod**: 15% chance for Aurora mutations
- **Trident Rod**: 30% chance for Atlantean catches (requires Desolate Deep Bestiary completion)
- **No-Life Rod**: Stuns fish, never lose catch streaks (requires Level 500)

#### Progression Strategy
- **Early**: Upgrade from Flimsy to Carbon Rod immediately
- **Mid**: Choose between Steady (mobile) or Rapid (skill) philosophy
- **Late**: Invest in high-tier rods for specific passive abilities
- **Endgame**: Combine powerful rods with enchantments for optimal builds

---

## Comparative Analysis

### Currency Systems

| Game | Primary Currency | Secondary Currency | Purpose |
|------|-----------------|-------------------|---------|
| **Dave the Diver** | Coins (from selling fish) | N/A | Equipment upgrades, farm expansions |
| **Hungry Shark** | Coins | Gems (premium) | Stat upgrades, shark unlocks, accessories |
| **Fisch** | Cash ($) | Enchant Relics (rare) | Rod purchases, enchantments |

**Key Insight**: Multiple currency types create different progression paths and decision-making complexity.

### Progression Gates

| Game | Gate Type | Unlock Method |
|------|-----------|---------------|
| **Dave the Diver** | Depth zones | Suit upgrades (equipment progression) |
| **Hungry Shark** | Shark tiers | 100% growth OR gem payment |
| **Fisch** | Rod stages | Cash purchases, area unlocks |

**Key Insight**: Progression gates can be skill-based (growth), resource-based (currency), or equipment-based (upgrades).

### Quality/Rarity Systems

| Game | System | Impact |
|------|--------|-------|
| **Dave the Diver** | 3-star quality (catch method) | Meat yield, Marinca card quality |
| **Hungry Shark** | Shark tiers (power levels) | Access to larger prey, new areas |
| **Fisch** | Rod tiers + Enchantments | Stat bonuses, passive abilities |

**Key Insight**: Quality systems reward skill/strategy and create collection/completion goals.

### Ability/Upgrade Systems

| Game | System Type | Examples |
|------|-------------|----------|
| **Dave the Diver** | Equipment-based | Suit upgrades, net guns, drones |
| **Hungry Shark** | Stat upgrades + Accessories | Bite/Speed/Boost, Jetpack, Laser |
| **Fisch** | Rod stats + Passives + Enchants | Lure Speed, King's Rod size boost |

**Key Insight**: Abilities can be permanent (upgrades), temporary (run-time), or equipment-based (rods/accessories).

### Collection Systems

| Game | Collection Type | Rewards |
|------|----------------|---------|
| **Dave the Diver** | Marinca cards (fish at all quality levels) | Completion, organization by biome |
| **Hungry Shark** | Shark unlocks | Progression, variety |
| **Fisch** | Rod collection | Build variety, passive abilities |

**Key Insight**: Collection systems provide long-term goals and showcase player achievements.

---

## Key Takeaways for Our Game

### 1. Essence-Based Currency System
- **Multiple essence types** (like Hungry Shark's Coins + Gems) create strategic depth
- **Primary + Secondary essence** (like Fisch's rod stats) allows for hybrid builds
- **Quality multipliers** (like Dave the Diver's 3-star system) reward skill

### 2. Biome Progression
- **Depth-based zones** (like Dave the Diver) create natural progression gates
- **Biome-specific creatures** (like Fisch's area unlocks) provide variety
- **Unlock requirements** (like Hungry Shark's tier system) create goals

### 3. Upgrade Trees
- **Essence-type-specific trees** (like Fisch's rod categories) create build diversity
- **Hybrid upgrades** (like Fisch's enchantments) reward exploration
- **Meta upgrades** (like Hungry Shark's stat multipliers) provide long-term progression

### 4. Ability System
- **Active abilities** (like Hungry Shark's accessories) provide run-time gameplay variety
- **Passive abilities** (like Fisch's rod passives) create build identity
- **Ability granting** (like consuming fish in our game) creates strategic choices

### 5. Quality/Rarity System
- **Catch quality affects essence yield** (like Dave the Diver's meat yield)
- **Rarity tiers** (common/rare/epic/legendary) create excitement and goals
- **Collection system** (like Marinca cards) provides long-term engagement

### 6. Roguelite Loop
- **Earn essence** → **Upgrade stats/abilities** → **Unlock new biomes/creatures** → **Repeat**
- **Permanent progression** (upgrades) + **Run-time variety** (abilities) = engaging loop
- **Multiple progression paths** (essence types) = replayability

### 7. Progression Balance
- **Early game**: Fast progression, clear goals (like Carbon Rod in Fisch)
- **Mid game**: Meaningful choices, multiple paths (like Steady vs Rapid Rod)
- **Late game**: Powerful upgrades, game-changing abilities (like premium sharks)

### 8. Design Principles
- **Skill rewards**: Quality systems that reward player skill
- **Strategic depth**: Multiple currency types and upgrade paths
- **Collection goals**: Long-term completion objectives
- **Build variety**: Different essence types enable different playstyles
- **Fast-paced**: Quick runs with meaningful progression (like Hungry Shark)
- **Discovery**: Unlocking new creatures and biomes (like Dave the Diver)

---

## Mechanics That Fit Fish-Eat-Fish Genre

### From Dave the Diver
- ✅ **Biome-based creature distribution**: Different fish at different depths
- ✅ **Quality-based rewards**: Better catches = more resources
- ✅ **Collection system**: Completing creature catalogs
- ✅ **Breeding/farming**: Could inspire creature spawning mechanics

### From Hungry Shark
- ✅ **Stat upgrades**: Bite, Speed, Boost translate well to fish-eat-fish
- ✅ **Tier progression**: Unlock more powerful creatures
- ✅ **Accessories/abilities**: Active abilities during runs
- ✅ **Fast-paced roguelite loop**: Quick runs, permanent progression

### From Fisch
- ✅ **Progression through equipment**: Rods → Essence types in our game
- ✅ **Passive abilities**: Build-defining bonuses
- ✅ **Enchanting system**: Could inspire hybrid essence upgrades
- ✅ **Stage-based unlocks**: Biome progression

---

## Next Steps

This research will inform:
1. **Essence System Design**: Multiple types, primary/secondary, yield formulas
2. **Biome System Design**: Depth zones, unlock requirements, creature distribution
3. **Upgrade Tree Design**: Essence-type-specific, hybrid, meta upgrades
4. **Ability System Design**: Active abilities, passive abilities, balancing
5. **Progression Curve Design**: Early/mid/late game balance, unlock pacing

See `ROGUELITE_DESIGN.md` for the complete game design based on this research.
