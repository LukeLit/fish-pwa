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

  private constructor() {
    this.load();
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
    } catch (error) {
      console.error('Failed to load game data:', error);
      this.data = {
        essence: 0,
        upgrades: {},
        runHistory: [],
        settings: DEFAULT_SETTINGS,
        highScore: 0,
      };
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

  getEssence(): number {
    return this.data?.essence ?? 0;
  }

  setEssence(amount: number): void {
    if (!this.data) this.load();
    if (this.data) {
      this.data.essence = Math.max(0, amount);
      this.save();
    }
  }

  addEssence(amount: number): void {
    this.setEssence(this.getEssence() + amount);
  }

  getUpgrades(): Record<string, number> {
    return this.data?.upgrades ?? {};
  }

  setUpgrade(id: string, level: number): void {
    if (!this.data) this.load();
    if (this.data) {
      this.data.upgrades[id] = level;
      this.save();
    }
  }

  getUpgradeLevel(id: string): number {
    return this.data?.upgrades[id] ?? 0;
  }

  getRunHistory(): RunHistoryEntry[] {
    return this.data?.runHistory ?? [];
  }

  addRunHistory(entry: RunHistoryEntry): void {
    if (!this.data) this.load();
    if (this.data) {
      this.data.runHistory.push(entry);
      // Keep only last 50 runs
      if (this.data.runHistory.length > 50) {
        this.data.runHistory = this.data.runHistory.slice(-50);
      }
      this.save();
    }
  }

  getSettings(): GameSettings {
    return this.data?.settings ?? DEFAULT_SETTINGS;
  }

  updateSettings(settings: Partial<GameSettings>): void {
    if (!this.data) this.load();
    if (this.data) {
      this.data.settings = { ...this.data.settings, ...settings };
      this.save();
    }
  }

  getHighScore(): number {
    return this.data?.highScore ?? 0;
  }

  setHighScore(score: number): void {
    if (!this.data) this.load();
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
