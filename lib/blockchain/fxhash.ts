/**
 * fxhash Tezos integration for minting unique mutant fish
 */
export interface MintedFish {
  tokenId: string;
  fishData: {
    seed: string;
    mutations: string[];
    maxSize: number;
    phase: string;
    timestamp: number;
  };
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string | number }>;
  };
}

export class FxhashIntegration {
  private isFxhash: boolean = false;

  constructor() {
    // Check if running on fxhash
    if (typeof window !== 'undefined') {
      this.isFxhash = !!(window as any).fxhash || !!(window as any).fxpreview;
    }
  }

  /**
   * Check if running on fxhash platform
   */
  isAvailable(): boolean {
    return this.isFxhash;
  }

  /**
   * Get fxhash seed
   */
  getSeed(): string {
    if (typeof window !== 'undefined' && (window as any).fxhash) {
      return (window as any).fxhash;
    }
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get fxrand (fxhash random function)
   */
  fxrand(): number {
    if (typeof window !== 'undefined' && (window as any).fxrand) {
      return (window as any).fxrand();
    }
    return Math.random();
  }

  /**
   * Prepare fish data for minting
   */
  prepareMintData(fishData: {
    seed: string;
    mutations: string[];
    maxSize: number;
    phase: string;
    timestamp: number;
  }): MintedFish {
    const attributes = [
      { trait_type: 'Phase', value: fishData.phase },
      { trait_type: 'Max Size', value: Math.floor(fishData.maxSize) },
      { trait_type: 'Mutations', value: fishData.mutations.length },
      { trait_type: 'Timestamp', value: new Date(fishData.timestamp).toISOString() },
    ];

    fishData.mutations.forEach((mutation, index) => {
      attributes.push({ trait_type: `Mutation ${index + 1}`, value: mutation });
    });

    return {
      tokenId: fishData.seed,
      fishData,
      metadata: {
        name: `Mutant Fish #${fishData.seed.substring(0, 8)}`,
        description: `A unique mutant fish from Fish Odyssey. Reached ${fishData.phase} phase with ${fishData.mutations.length} mutations.`,
        image: `data:image/svg+xml;base64,${this.generateFishSVG(fishData)}`,
        attributes,
      },
    };
  }

  /**
   * Generate SVG representation of fish (for NFT image)
   */
  private generateFishSVG(fishData: {
    maxSize: number;
    mutations: string[];
    phase: string;
  }): string {
    const size = Math.min(fishData.maxSize, 100);
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#0ea5e9"/>
        <ellipse cx="200" cy="200" rx="${size * 2}" ry="${size * 1.5}" fill="#3b82f6"/>
        <text x="200" y="350" text-anchor="middle" fill="white" font-size="20">
          ${fishData.phase} Phase - ${fishData.mutations.length} Mutations
        </text>
      </svg>
    `;
    return btoa(svg);
  }

  /**
   * Mint fish as NFT (fxhash integration)
   */
  async mintFish(fishData: {
    seed: string;
    mutations: string[];
    maxSize: number;
    phase: string;
    timestamp: number;
  }): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('fxhash not available, cannot mint');
      return false;
    }

    try {
      const mintData = this.prepareMintData(fishData);

      // fxhash minting API
      if (typeof window !== 'undefined' && (window as any).$fx) {
        // Set features (attributes)
        (window as any).$fx.features(mintData.metadata.attributes);

        // Trigger mint
        // Note: Actual minting requires fxhash platform integration
        console.log('Minting fish:', mintData);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to mint fish:', error);
      return false;
    }
  }

  /**
   * Check if preview mode (fxhash preview)
   */
  isPreview(): boolean {
    if (typeof window !== 'undefined') {
      return !!(window as any).fxpreview;
    }
    return false;
  }
}

// Singleton instance
let fxhashInstance: FxhashIntegration | null = null;

export function getFxhash(): FxhashIntegration {
  if (!fxhashInstance) {
    fxhashInstance = new FxhashIntegration();
  }
  return fxhashInstance;
}
