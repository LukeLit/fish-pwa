/**
 * Storage abstraction for game data
 * Uses Vercel Blob Storage for all data persistence
 */

const STORAGE_PREFIX = 'fish_odyssey_';

export interface StorageData {
  essence: number;
  upgrades: Record<string, number>;
  runHistory: RunHistoryEntry[];
  settings: GameSettings;
  highScore: number;
}

export interface RunHistoryEntry {
  timestamp: number;
  score: number;
  essenceEarned: number;
  phase: string;
  size: number;
  duration: number;
}

export interface GameSettings {
  volume: number;
  muted: boolean;
  graphics: 'low' | 'medium' | 'high';
  controls: 'keyboard' | 'touch';
}

const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.7,
  muted: false,
  graphics: 'medium',
  controls: 'keyboard',
};

export class GameStorage {
  private static instance: GameStorage;
  private data: StorageData | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private loadingPromise: Promise<void> | null = null;
  private loaded: boolean = false;

  private constructor() {
    // Initialize with default data, actual loading happens on first use
    this.data = {
      essence: 0,
      upgrades: {},
      runHistory: [],
      settings: DEFAULT_SETTINGS,
      highScore: 0,
    };
  }

  static getInstance(): GameStorage {
    if (!GameStorage.instance) {
      GameStorage.instance = new GameStorage();
    }
    return GameStorage.instance;
  }

  private getKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      // Already loaded
      return;
    }

    if (this.loadingPromise) {
      // Already loading, wait for it
      await this.loadingPromise;
      return;
    }

    // Start loading
    this.loadingPromise = this.load();
    await this.loadingPromise;
    this.loadingPromise = null;
  }

  async load(): Promise<void> {
    try {
      // Load all game data from Vercel Blob Storage via API
      const [essence, upgrades, runHistory, settings, highScore] = await Promise.all([
        this.getNumber('essence', 0),
        this.getObject<Record<string, number>>('upgrades', {}),
        this.getObject<RunHistoryEntry[]>('runHistory', []),
        this.getObject<GameSettings>('settings', DEFAULT_SETTINGS),
        this.getNumber('highScore', 0),
      ]);

      this.data = {
        essence,
        upgrades,
        runHistory,
        settings,
        highScore,
      };
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load game data:', error);
      this.data = {
        essence: 0,
        upgrades: {},
        runHistory: [],
        settings: DEFAULT_SETTINGS,
        highScore: 0,
      };
      this.loaded = true; // Mark as loaded even on error to avoid infinite retries
    }
  }

  private async saveAsync(): Promise<void> {
    if (!this.data) return;

    try {
      // Save all data to Vercel Blob Storage via API
      await Promise.all([
        this.setNumber('essence', this.data.essence),
        this.setObject('upgrades', this.data.upgrades),
        this.setObject('runHistory', this.data.runHistory),
        this.setObject('settings', this.data.settings),
        this.setNumber('highScore', this.data.highScore),
      ]);
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  }

  save(): void {
    // Debounce saves to avoid too many API calls
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveAsync();
    }, 1000);
  }

  async getEssence(): Promise<number> {
    await this.ensureLoaded();
    return this.data?.essence ?? 0;
  }

  async setEssence(amount: number): Promise<void> {
    await this.ensureLoaded();
    if (this.data) {
      this.data.essence = Math.max(0, amount);
      this.save();
    }
  }

  async addEssence(amount: number): Promise<void> {
    const current = await this.getEssence();
    await this.setEssence(current + amount);
  }

  async getUpgrades(): Promise<Record<string, number>> {
    await this.ensureLoaded();
    return this.data?.upgrades ?? {};
  }

  async setUpgrade(id: string, level: number): Promise<void> {
    await this.ensureLoaded();
    if (this.data) {
      this.data.upgrades[id] = level;
      this.save();
    }
  }

  async getUpgradeLevel(id: string): Promise<number> {
    await this.ensureLoaded();
    return this.data?.upgrades[id] ?? 0;
  }

  async getRunHistory(): Promise<RunHistoryEntry[]> {
    await this.ensureLoaded();
    return this.data?.runHistory ?? [];
  }

  async addRunHistory(entry: RunHistoryEntry): Promise<void> {
    await this.ensureLoaded();
    if (this.data) {
      this.data.runHistory.push(entry);
      // Keep only last 50 runs
      if (this.data.runHistory.length > 50) {
        this.data.runHistory = this.data.runHistory.slice(-50);
      }
      this.save();
    }
  }

  async getSettings(): Promise<GameSettings> {
    await this.ensureLoaded();
    const stored = (this.data?.settings ?? {}) as Partial<GameSettings>;
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async updateSettings(settings: Partial<GameSettings>): Promise<void> {
    await this.ensureLoaded();
    if (this.data) {
      this.data.settings = { ...this.data.settings, ...settings };
      this.save();
    }
  }

  async getHighScore(): Promise<number> {
    await this.ensureLoaded();
    return this.data?.highScore ?? 0;
  }

  async setHighScore(score: number): Promise<void> {
    await this.ensureLoaded();
    if (this.data && score > this.data.highScore) {
      this.data.highScore = score;
      this.save();
    }
  }

  private async getNumber(key: string, defaultValue: number): Promise<number> {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const response = await fetch(`/api/load-game-data?key=${this.getKey(key)}&default=${defaultValue}`);
      if (!response.ok) return defaultValue;

      const result = await response.json();
      if (!result.success || result.data === null) return defaultValue;

      const num = typeof result.data === 'number' ? result.data : parseFloat(result.data);
      return isNaN(num) ? defaultValue : num;
    } catch (error) {
      console.warn(`Failed to load ${key}, using default:`, error);
      return defaultValue;
    }
  }

  private async setNumber(key: string, value: number): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/save-game-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: this.getKey(key), data: value }),
      });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  private async getObject<T>(key: string, defaultValue: T): Promise<T> {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const response = await fetch(`/api/load-game-data?key=${this.getKey(key)}&default=${encodeURIComponent(JSON.stringify(defaultValue))}`);
      if (!response.ok) return defaultValue;

      const result = await response.json();
      if (!result.success || result.data === null) return defaultValue;

      return result.data as T;
    } catch (error) {
      console.warn(`Failed to load ${key}, using default:`, error);
      return defaultValue;
    }
  }

  private async setObject(key: string, value: unknown): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/save-game-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: this.getKey(key), data: value }),
      });
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    this.data = {
      essence: 0,
      upgrades: {},
      runHistory: [],
      settings: DEFAULT_SETTINGS,
      highScore: 0,
    };
    await this.saveAsync();
  }
}
