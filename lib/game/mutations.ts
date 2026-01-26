/**
 * Mutation/evolution system
 */
import type { Player } from './player';

export interface Mutation {
  id: string;
  name: string;
  description: string;
  effect: (player: Player) => void;
  visualEffect?: string;
  duration?: number; // undefined = permanent for run
}

export class MutationSystem {
  private availableMutations: Mutation[] = [];
  private activeMutations: Map<string, { mutation: Mutation; expiresAt?: number }> = new Map();

  constructor() {
    this.initializeMutations();
  }

  private initializeMutations(): void {
    this.availableMutations = [
      {
        id: 'speed_boost',
        name: 'Speed Boost',
        description: 'Increases movement speed by 50%',
        effect: (player) => {
          player.stats.speed *= 1.5;
        },
        duration: 30000, // 30 seconds
      },
      {
        id: 'growth_multiplier',
        name: 'Growth Multiplier',
        description: 'Doubles growth rate',
        effect: (player) => {
          player.stats.growthMultiplier *= 2;
        },
        duration: 20000, // 20 seconds
      },
      {
        id: 'spine_evolution',
        name: 'Spine Evolution',
        description: 'Grows defensive spines, increases size by 20%',
        effect: (player) => {
          player.stats.size *= 1.2;
          player.size = player.stats.size;
        },
        visualEffect: 'spines',
      },
      {
        id: 'magnetic_mouth',
        name: 'Magnetic Mouth',
        description: 'Attracts nearby food automatically',
        effect: (player) => {
          // Effect handled in game loop
        },
        duration: 15000,
      },
      {
        id: 'regeneration',
        name: 'Regeneration',
        description: 'Slowly grows over time',
        effect: (player) => {
          // Effect handled in game loop
        },
        duration: 25000,
      },
    ];
  }

  /**
   * Apply a random mutation to the player
   */
  applyRandomMutation(player: Player): Mutation | null {
    const available = this.availableMutations.filter(
      m => !this.activeMutations.has(m.id)
    );
    
    if (available.length === 0) return null;

    const mutation = available[Math.floor(Math.random() * available.length)];
    this.applyMutation(player, mutation);
    return mutation;
  }

  /**
   * Apply a specific mutation
   */
  applyMutation(player: Player, mutation: Mutation): void {
    mutation.effect(player);
    player.addMutation(mutation.id);

    const expiresAt = mutation.duration
      ? Date.now() + mutation.duration
      : undefined;

    this.activeMutations.set(mutation.id, { mutation, expiresAt });
  }

  /**
   * Update mutations (check for expirations)
   */
  update(player: Player, deltaTime: number): void {
    const now = Date.now();
    const expired: string[] = [];

    this.activeMutations.forEach((data, id) => {
      if (data.expiresAt && now >= data.expiresAt) {
        this.removeMutation(player, id);
        expired.push(id);
      }
    });

    expired.forEach(id => this.activeMutations.delete(id));
  }

  /**
   * Remove a mutation (reverse effects if needed)
   */
  removeMutation(player: Player, mutationId: string): void {
    const data = this.activeMutations.get(mutationId);
    if (!data) return;

    // Reverse effects for temporary mutations
    const mutation = data.mutation;
    if (mutation.id === 'speed_boost') {
      player.stats.speed /= 1.5;
    } else if (mutation.id === 'growth_multiplier') {
      player.stats.growthMultiplier /= 2;
    }

    player.mutations = player.mutations.filter((id: string) => id !== mutationId);
  }

  /**
   * Get active mutations
   */
  getActiveMutations(): Mutation[] {
    return Array.from(this.activeMutations.values()).map(d => d.mutation);
  }

  /**
   * Check if player has a specific mutation
   */
  hasMutation(mutationId: string): boolean {
    return this.activeMutations.has(mutationId);
  }

  /**
   * Clear all mutations (on death)
   */
  clear(): void {
    this.activeMutations.clear();
  }
}
