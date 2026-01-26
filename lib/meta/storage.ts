/**
 * Storage abstraction for game data
 * Uses localStorage for simple data, IndexedDB for larger datasets
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

  load(): void {
    try {
      const essence = this.getNumber('essence', 0);
      const upgrades = this.getObject<Record<string, number>>('upgrades', {});
      const runHistory = this.getObject<RunHistoryEntry[]>('runHistory', []);
      const settings = this.getObject<GameSettings>('settings', DEFAULT_SETTINGS);
      const highScore = this.getNumber('highScore', 0);

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

  save(): void {
    if (!this.data) return;

    try {
      this.setNumber('essence', this.data.essence);
      this.setObject('upgrades', this.data.upgrades);
      this.setObject('runHistory', this.data.runHistory);
      this.setObject('settings', this.data.settings);
      this.setNumber('highScore', this.data.highScore);
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
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

  private getNumber(key: string, defaultValue: number): number {
    if (typeof window === 'undefined') return defaultValue;
    const value = localStorage.getItem(this.getKey(key));
    if (value === null) return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  private setNumber(key: string, value: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getKey(key), value.toString());
  }

  private getObject<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const value = localStorage.getItem(this.getKey(key));
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  private setObject(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getKey(key), JSON.stringify(value));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    this.data = {
      essence: 0,
      upgrades: {},
      runHistory: [],
      settings: DEFAULT_SETTINGS,
      highScore: 0,
    };
  }
}
