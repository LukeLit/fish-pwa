/**
 * Audio system using Howler.js
 */
import { Howl, Howler } from 'howler';
import { GameStorage } from '../meta/storage';

export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private music: Howl | null = null;
  private volume: number = 0.7;
  private muted: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Initialize asynchronously
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (typeof window !== 'undefined') {
      const storage = GameStorage.getInstance();
      const settings = await storage.getSettings();
      this.volume = settings.volume ?? 0.7;
      this.muted = settings.muted ?? false;
      Howler.volume(this.muted ? 0 : this.volume);
      this.initialized = true;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Load a sound effect
   */
  loadSound(name: string, src: string | string[]): void {
    const sound = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: this.volume,
    });
    this.sounds.set(name, sound);
  }

  /**
   * Play a sound effect
   */
  playSound(name: string, volume?: number): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.volume(volume ?? this.volume);
      sound.play();
    }
  }

  /**
   * Load and play background music
   */
  loadMusic(src: string | string[], loop: boolean = true): void {
    if (this.music) {
      this.music.stop();
    }

    this.music = new Howl({
      src: Array.isArray(src) ? src : [src],
      loop,
      volume: this.volume * 0.5, // Music is quieter
    });

    if (!this.muted) {
      this.music.play();
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.muted ? 0 : this.volume);
    if (this.music) {
      this.music.volume(this.volume * 0.5);
    }
    this.saveSettings();
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.muted = !this.muted;
    Howler.volume(this.muted ? 0 : this.volume);
    if (this.music) {
      if (this.muted) {
        this.music.pause();
      } else {
        this.music.play();
      }
    }
    this.saveSettings();
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Save settings
   */
  private saveSettings(): void {
    if (typeof window !== 'undefined') {
      const settings = localStorage.getItem('fish_odyssey_settings');
      let parsed: any = {};
      if (settings) {
        try {
          parsed = JSON.parse(settings);
        } catch (e) {
          // Ignore
        }
      }
      parsed.volume = this.volume;
      parsed.muted = this.muted;
      localStorage.setItem('fish_odyssey_settings', JSON.stringify(parsed));
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.sounds.forEach(sound => sound.unload());
    this.sounds.clear();
    if (this.music) {
      this.music.unload();
      this.music = null;
    }
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}
