# Dash Mechanic Design Document

## Overview

**Dash** is a core mechanic that transforms fish combat from passive collisions to active, intentional engagement. It serves as both an offensive and defensive tool, gating all aggressive interactions behind player/AI input.

### Design Goals

- Make combat feel intentional rather than accidental
- Create clear distinction between "eating" (swallowing whole) and "attacking" (dealing damage)
- Add strategic depth through stamina management
- Enable scavenging gameplay via knocked-out fish and carcasses

---

## 1. Core Dash Mechanics

### 1.1 Dash States

| Input State | Behavior | Animation |
|------------|----------|-----------|
| **Dash + Moving** | Speed boost (1.5x-2x normal speed) | `dash` animation |
| **Dash + Stationary** | Initiates attack stance / bite | `bite` animation |
| **No Dash** | Normal movement, passive | `idle` / `swim` |

### 1.2 Dash Resource (Stamina Integration)

The existing stamina system (0-100, regenerates at 0.1/ms) governs dash:

- **Dash while moving**: Drains stamina continuously (e.g., 5-10/sec)
- **Attack/Bite action**: Costs stamina per action (e.g., 15-20 per bite)
- **Stamina depleted**: Cannot dash, forced to normal movement

### 1.3 Controls

| Platform | Dash Input |
|----------|------------|
| Desktop | Hold `Shift` or `Space` |
| Mobile | Hold dedicated dash button (bottom-right) |

---

## 2. Interaction System Rework

### 2.1 Core Principle: Dash Gates All Aggression

**Without dash held, fish pass through each other peacefully.** This is the fundamental change from the current system.

### 2.2 Collision Outcomes

| Attacker State | Target State | Outcome |
|---------------|--------------|---------|
| **Not Dashing** | Any | **Pass peacefully** - no interaction |
| **Dashing** | Not Dashing | **Attack lands** - damage dealt |
| **Dashing** | Dashing | **Clash** - both take reduced damage or bounce back |

### 2.3 Eating vs Attacking (Size-Based Resolution)

| Size Relationship | Dashing Action | Result |
|------------------|----------------|--------|
| Predator ≥ 2x prey size | Bite | **Swallow whole** - instant eat |
| Predator 1.2x-2x prey size | Bite | **Attack** - deal damage, cannot swallow |
| Similar size (within 20%) | Bite | **Combat** - stamina battle |
| Smaller than target | Bite | **Glancing blow** - minimal damage, risky |

### 2.4 Key Definitions

```
EATING    = Size allows swallowing whole (≥2x size difference)
ATTACKING = Damage dealt via dash-bite (any size, requires dash)
PASSIVE   = No dash held, fish pass through each other peacefully
```

---

## 3. Defeated State System ("Knocked Out")

### 3.1 State Machine

```
[Alive] ───(stamina depleted)───> [Knocked Out]
   ^                                    │
   │                                    v
   └───(stamina regenerates)───   [Recoverable]
                                        │
                              (bitten while KO)
                                        v
                                  [Carcass]
                                        │
                              (all chunks consumed)
                                        v
                                    [Removed]
```

### 3.2 Knocked Out State Properties

| Property | Behavior |
|----------|----------|
| **Movement** | Drifts/floats, no active movement |
| **Vulnerability** | Can be bitten by any dashing fish |
| **Recovery** | Stamina regenerates at 50% normal rate |
| **Wake Threshold** | Wakes up at 30-50% stamina |
| **Visual** | Stunned animation, belly-up or spiraling |

### 3.3 Interaction with Knocked Out Fish

| Interactor Action | Result |
|------------------|--------|
| **Dash + Approach** | Initiates **Bite** (chunks off meat) |
| **No Dash** | Pass peacefully (can't interact) |
| **Swallow-capable (≥2x size)** | Option to swallow whole OR bite chunks |

### 3.4 Player Knocked Out

When the player is knocked out:
- Camera stays on player (drifting)
- Stamina bar prominently displayed with "Recovering..." text
- If bitten before recovery → Game Over
- If stamina reaches threshold → Player wakes up, vulnerable but alive

---

## 4. Meat Chunk / Carcass System

### 4.1 Chunk Economy

```
Chunks available = Current essence value of fish
```

Each bite on a knocked-out/carcass fish:
1. Removes 1 chunk from the carcass
2. Drops a collectible **Meat Orb** near the bite location
3. Biter can collect the orb for hunger restore + essence

### 4.2 Carcass Properties

| Property | Value |
|----------|-------|
| **Initial Chunks** | `essenceValue` (based on size, rarity, biome) |
| **Chunk Value** | `totalEssence / chunkCount` per chunk |
| **Decay Timer** | 30-60 seconds before despawn |
| **Physics** | Sinks slowly, becomes environmental object |
| **Visual** | Desaturated/grayed sprite, "X" eyes or similar |

### 4.3 Meat Orb Properties

| Property | Value |
|----------|-------|
| **Hunger Restore** | Portion of original fish's hunger value |
| **Essence Grant** | `totalEssence / chunkCount` |
| **Lifetime** | 15-20 seconds before despawn |
| **Collection** | Touch to collect (no dash required) |

### 4.4 Competitive Feeding

Multiple fish can bite a carcass simultaneously:
- Creates risk/reward for approaching carcasses
- First to collect dropped meat orb gets the value
- Strategic choice: fight off competitors or grab chunks quickly

---

## 5. AI Behavior Adaptations

### 5.1 Predator AI

```javascript
if (target.isKnockedOut || target.isCarcass) {
  // Scavenger behavior - approach and bite chunks
  dashToward(target)
  bite() // Get chunks
} else if (canSwallow(target)) {
  // Pursuit behavior - chase and swallow
  dashToward(target)
} else if (canDamage(target)) {
  // Hit-and-run attacks
  dashAttack(target)
  retreatBriefly()
} else {
  // Target too dangerous
  avoid(target)
}
```

### 5.2 Prey AI

```javascript
if (threat.isDashing) {
  // Urgent flee - use dash to escape
  dashAwayFrom(threat)
  // Costs stamina but necessary for survival
} else {
  // Casual avoidance - save stamina
  swimAwayFrom(threat)
}
```

### 5.3 Opportunist AI (New Behavior Type)

```javascript
// Seeks out knocked-out fish and carcasses
if (nearbyKnockedOutFish || nearbyCarcass) {
  approachAndBite(target)
} else {
  wanderAndScan()
}
```

---

## 6. Implementation Phases

### Phase 1: Dash Movement ⏱️ Priority: High
- [ ] Add dash input detection (hold Shift/Space on desktop)
- [ ] Implement speed boost while dashing + moving (1.5x-2x)
- [ ] Connect to existing `dash` animation state in `clip-state.ts`
- [ ] Stamina drain while dash-moving (configurable rate)
- [ ] Visual feedback: speed lines, particle trail

### Phase 2: Passive Collision Rework ⏱️ Priority: High
- [ ] Modify `checkCollisions()` in `engine.ts`
- [ ] Add `isDashing` property to Player and Entity classes
- [ ] Non-dashing collisions = pass through peacefully
- [ ] Visual/audio feedback for attacks vs peaceful passing

### Phase 3: Attack vs Eat Split ⏱️ Priority: High
- [ ] New size threshold constant: `SWALLOW_SIZE_RATIO = 2.0`
- [ ] Implement damage system separate from stamina
- [ ] Add `health` property to entities (or repurpose existing)
- [ ] Damage calculation based on attacker size and dash momentum

### Phase 4: Knocked Out State ⏱️ Priority: Medium
- [ ] Add `EntityState` enum: `ALIVE`, `KNOCKED_OUT`, `CARCASS`
- [ ] Implement KO trigger (stamina depleted)
- [ ] KO behavior: drift physics, vulnerability flag
- [ ] Recovery mechanic: slower stamina regen → wake up
- [ ] Player KO handling: recovery chance vs game over

### Phase 5: Carcass & Chunks ⏱️ Priority: Medium
- [ ] Create `Carcass` entity type or state transition
- [ ] Add `remainingChunks` property based on essence value
- [ ] Bite-chunk mechanic: dash + interact removes chunk
- [ ] Meat orb entity: spawning, physics, collection
- [ ] Decay timer and removal

### Phase 6: AI Updates ⏱️ Priority: Low
- [ ] Predator AI: Use dash for hunting, target KO fish
- [ ] Prey AI: React urgently to dashing threats
- [ ] Opportunist AI: Scavenger behavior for carcasses
- [ ] Stamina management: AI conserves stamina strategically

### Phase 7: Mobile Controls ⏱️ Priority: Medium
- [ ] Add dash button to mobile UI
- [ ] Touch-and-hold for continuous dash
- [ ] Visual feedback on button (stamina indicator?)

---

## 7. Constants & Configuration

```typescript
// Dash mechanics
const DASH_SPEED_MULTIPLIER = 1.75;
const DASH_STAMINA_DRAIN_RATE = 8; // per second
const DASH_ATTACK_STAMINA_COST = 15;

// Size thresholds
const SWALLOW_SIZE_RATIO = 2.0;  // Can swallow if ≥2x target size
const ATTACK_SIZE_RATIO = 1.2;   // Can damage if ≥1.2x target size
const BATTLE_SIZE_THRESHOLD = 0.2; // Within 20% = stamina battle

// Knocked out state
const KO_STAMINA_REGEN_MULTIPLIER = 0.5; // 50% normal regen
const KO_WAKE_THRESHOLD = 0.4; // Wake at 40% stamina
const KO_DRIFT_SPEED = 0.5; // Slow drift while KO

// Carcass system
const CARCASS_DECAY_TIME = 45000; // 45 seconds
const MEAT_ORB_LIFETIME = 20000; // 20 seconds
const CHUNKS_PER_ESSENCE = 1; // 1 chunk per essence point
```

---

## 8. Affected Files

| System | Files to Modify |
|--------|----------------|
| **Dash Input** | `lib/game/player.ts`, `lib/game/engine.ts` |
| **Collision Logic** | `lib/game/engine.ts` (`checkCollisions`) |
| **Entity States** | `lib/game/entities.ts` (add KO/Carcass states) |
| **Animation** | `lib/game/clip-state.ts` (already has `dash`, `bite`) |
| **AI Behavior** | `lib/game/entities.ts` (predator/prey logic) |
| **Types** | `lib/game/types.ts` (add EntityState enum) |
| **Mobile UI** | `components/` (add dash button) |

---

## 9. Open Questions

1. **Clash Mechanics**: When two dashing fish collide, what happens exactly? Both take damage? Knockback?

2. **Stamina vs Health**: Should we have separate health and stamina, or combine them?
   - Separate: More strategic depth, more UI complexity
   - Combined: Simpler, stamina = health = combat resource

3. **Player Recovery Time**: How long should player KO recovery take? Too short = no tension, too long = frustrating.

4. **Swallow Choice**: If player CAN swallow (≥2x size), should they have the option to bite chunks instead? (Strategic: get essence without filling hunger)

5. **Carcass Competition**: How do we handle multiple fish biting the same carcass? Queue system? Simultaneous?

---

## 10. Success Metrics

- Combat feels intentional and skill-based
- Players learn to manage stamina strategically
- Knocked-out state creates tension and comeback potential
- Carcass system enables interesting multi-fish dynamics
- AI uses dash believably and creates challenge

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-02 | 1.0 | Initial design document |
