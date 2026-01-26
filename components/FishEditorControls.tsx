/**
 * Fish Editor Controls Panel
 * AI generation and asset management for fish editor
 */
'use client';

import { useState, useEffect } from 'react';
import { getFishSpriteService } from '@/lib/ai/fish-sprite-service';

type ModelType = 'bfl/flux-2-pro' | 'google/imagen-4.0-generate-001' | 'google/imagen-4.0-fast-generate-001';
type FishType = 'prey' | 'predator' | 'mutant';

const FISH_PROMPTS: Record<FishType, string> = {
  prey: 'A small, swift fish with greenish scales and streamlined body, isolated on solid bright magenta background (#FF00FF), no other background elements, game sprite, side view right-facing, detailed scales and fins',
  predator: 'A large, aggressive fish with sharp teeth, reddish tones, and menacing appearance, isolated on solid bright magenta background (#FF00FF), no other background elements, game sprite, side view right-facing, detailed scales and fins',
  mutant: 'A bizarre mutant fish with twisted fins, glowing eyes, and surreal features, isolated on solid bright magenta background (#FF00FF), no other background elements, game sprite, side view right-facing, detailed scales and fins',
};

const BG_PROMPTS = {
  underwater:
    'Illustrative underwater scene, wide zoomed-out view, coral reefs and seaweed in soft colors, stylized game art style, not photorealistic, gentle sunlight from above, pale blue-green water',
  deep:
    'Illustrative deep ocean scene, zoomed-out wide shot, dark blue water, subtle bioluminescence, stylized atmospheric game art, not photorealistic',
  tropical:
    'Illustrative tropical reef, zoomed-out panoramic view, vibrant but soft colors, stylized background art for games, not photorealistic, clear water, distant coral',
};

interface FishEditorControlsProps {
  onBackToMenu: () => void;
  onSpawnFish: (sprite: string, type: string) => void;
  onClearFish: () => void;
  onSetBackground: (bg: string | null) => void;
  onSetPlayerFish: (sprite: string | null) => void;
  spawnedFishCount: number;
  chromaTolerance: number;
  onChromaToleranceChange: (tolerance: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  enableWaterDistortion: boolean;
  onWaterDistortionChange: (enabled: boolean) => void;
  deformationIntensity: number;
  onDeformationChange: (intensity: number) => void;
}

export default function FishEditorControls({
  onBackToMenu,
  onSpawnFish,
  onClearFish,
  onSetBackground,
  onSetPlayerFish,
  spawnedFishCount,
  chromaTolerance,
  onChromaToleranceChange,
  zoom,
  onZoomChange,
  enableWaterDistortion,
  onWaterDistortionChange,
  deformationIntensity,
  onDeformationChange,
}: FishEditorControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<ModelType>('google/imagen-4.0-fast-generate-001');
  const [selectedFishType, setSelectedFishType] = useState<FishType>('prey');
  const [fishPrompt, setFishPrompt] = useState(FISH_PROMPTS.prey);
  const [bgPrompt, setBgPrompt] = useState(BG_PROMPTS.underwater);
  const [generatedFish, setGeneratedFish] = useState<string | null>(null);
  const [generatedBg, setGeneratedBg] = useState<string | null>(null);
  const [savedFish, setSavedFish] = useState<Array<{ filename: string; url: string }>>([]);
  const [savedBackgrounds, setSavedBackgrounds] = useState<Array<{ filename: string; url: string }>>([]);
  const [loadedFishFilename, setLoadedFishFilename] = useState<string | null>(null);
  const [loadedBgFilename, setLoadedBgFilename] = useState<string | null>(null);

  const fishSprite = getFishSpriteService();

  // Load saved assets on mount
  useEffect(() => {
    loadSavedAssets();
  }, []);

  const loadSavedAssets = async () => {
    try {
      // Load fish
      const fishResponse = await fetch('/api/list-assets?type=fish');
      const fishData = await fishResponse.json();
      if (fishData.success) {
        setSavedFish(fishData.assets);
      }

      // Load backgrounds
      const bgResponse = await fetch('/api/list-assets?type=background');
      const bgData = await bgResponse.json();
      if (bgData.success) {
        setSavedBackgrounds(bgData.assets);
      }
    } catch (error) {
      console.error('Failed to load saved assets:', error);
    }
  };

  const generateFish = async () => {
    setIsGenerating(true);
    setStatus(`Generating ${selectedFishType} fish with ${selectedModel}...`);

    try {
      const result = await fishSprite.generateFishSprite({
        type: selectedFishType,
        seed: `editor_${selectedFishType}_${Date.now()}`,
        model: selectedModel,
        customPrompt: fishPrompt,
      });

      if (!result || result.error) {
        setStatus(`❌ Generation failed: ${result?.error || 'Unknown error'}`);
        return;
      }

      if (result.imageBase64) {
        const spriteUrl = `data:image/png;base64,${result.imageBase64}`;
        setGeneratedFish(spriteUrl);
        setLoadedFishFilename(null); // Clear loaded filename for newly generated fish
        setStatus(`✅ Fish sprite generated with ${selectedModel}`);
      } else {
        setStatus('❌ No image data returned');
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message || 'Failed to generate fish'}`);
      console.error('Fish generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBackground = async () => {
    setIsGenerating(true);
    setStatus(`Generating background with ${selectedModel}...`);

    try {
      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: bgPrompt,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setStatus(`❌ Background generation failed: ${error.message}`);
        return;
      }

      const data = await response.json();
      if (data.imageBase64) {
        const bgUrl = `data:image/png;base64,${data.imageBase64}`;
        setGeneratedBg(bgUrl);
        setLoadedBgFilename(null); // Clear loaded filename for newly generated background
        setStatus(`✅ Background generated with ${selectedModel}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message || 'Failed to generate background'}`);
      console.error('Background generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveFish = async () => {
    if (!generatedFish) return;

    setIsGenerating(true);
    setStatus('Saving fish to game assets...');

    try {
      const filename = `fish_${selectedFishType}_${Date.now()}.png`;
      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: generatedFish,
          filename,
          type: 'fish',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Fish saved to ${data.localPath}`);
        loadSavedAssets(); // Reload the list
      } else {
        setStatus(`❌ Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error saving: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveBackground = async () => {
    if (!generatedBg) return;

    setIsGenerating(true);
    setStatus('Saving background to game assets...');

    try {
      const filename = `bg_${Date.now()}.png`;
      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: generatedBg,
          filename,
          type: 'background',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Background saved to ${data.localPath}`);
        loadSavedAssets(); // Reload the list
      } else {
        setStatus(`❌ Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error saving: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const flipImage = (imageBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Flip horizontally
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);

        // Convert back to base64
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageBase64;
    });
  };

  const flipFish = async () => {
    if (!generatedFish) return;
    setIsGenerating(true);
    setStatus('Flipping fish...');
    try {
      const flipped = await flipImage(generatedFish);
      setGeneratedFish(flipped);
      setStatus('✅ Fish flipped horizontally');
    } catch (error: any) {
      setStatus(`❌ Error flipping: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const flipBg = async () => {
    if (!generatedBg) return;
    setIsGenerating(true);
    setStatus('Flipping background...');
    try {
      const flipped = await flipImage(generatedBg);
      setGeneratedBg(flipped);
      setStatus('✅ Background flipped horizontally');
    } catch (error: any) {
      setStatus(`❌ Error flipping: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteFish = async () => {
    if (!loadedFishFilename) {
      setStatus('❌ No saved fish loaded to delete');
      return;
    }

    if (!confirm(`Delete ${loadedFishFilename}?`)) return;

    setIsGenerating(true);
    setStatus('Deleting fish...');
    try {
      const response = await fetch(`/api/delete-asset?filename=${encodeURIComponent(loadedFishFilename)}&type=fish`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Deleted ${loadedFishFilename}`);
        setGeneratedFish(null);
        setLoadedFishFilename(null);
        loadSavedAssets(); // Reload the list
      } else {
        setStatus(`❌ Failed to delete: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error deleting: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteBg = async () => {
    if (!loadedBgFilename) {
      setStatus('❌ No saved background loaded to delete');
      return;
    }

    if (!confirm(`Delete ${loadedBgFilename}?`)) return;

    setIsGenerating(true);
    setStatus('Deleting background...');
    try {
      const response = await fetch(`/api/delete-asset?filename=${encodeURIComponent(loadedBgFilename)}&type=background`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Deleted ${loadedBgFilename}`);
        setGeneratedBg(null);
        setLoadedBgFilename(null);
        loadSavedAssets(); // Reload the list
      } else {
        setStatus(`❌ Failed to delete: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error deleting: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Fish Editor</h2>
        <button
          onClick={onBackToMenu}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
        >
          ← Back to Menu
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{status}</p>
        </div>
      )}

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ModelType)}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm"
        >
          <option value="google/imagen-4.0-fast-generate-001">Imagen Fast</option>
          <option value="google/imagen-4.0-generate-001">Imagen Standard</option>
          <option value="bfl/flux-2-pro">Flux 2 Pro</option>
        </select>
      </div>

      {/* Background Removal Tolerance */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Background Removal: {chromaTolerance}
        </label>
        <input
          type="range"
          min="10"
          max="150"
          value={chromaTolerance}
          onChange={(e) => onChromaToleranceChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Precise</span>
          <span>Aggressive</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Detects corner color and removes similar pixels
        </p>
      </div>

      {/* Zoom Control */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Zoom: {(zoom * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="50"
          max="300"
          step="10"
          value={zoom * 100}
          onChange={(e) => onZoomChange(parseInt(e.target.value) / 100)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>50%</span>
          <span>300%</span>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          <button
            onClick={() => onZoomChange(1)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            Reset
          </button>
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            Zoom -
          </button>
          <button
            onClick={() => onZoomChange(Math.min(3, zoom + 0.25))}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            Zoom +
          </button>
        </div>
      </div>

      {/* Water Effects Toggle */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={enableWaterDistortion}
            onChange={(e) => onWaterDistortionChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-bold text-white">Water Shimmer Effect</span>
        </label>
        <p className="text-xs text-gray-400 mt-1">
          Adds animated wave overlay (disable for better performance)
        </p>
      </div>

      {/* Fish Deformation/Animation */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Swimming Animation: {deformationIntensity.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={deformationIntensity}
          onChange={(e) => onDeformationChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Off</span>
          <span>Subtle</span>
          <span>Strong</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Fish body warps/bends while swimming (spine animation)
        </p>
      </div>

      {/* Load Saved Fish */}
      {savedFish.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <label className="block text-sm font-bold text-white mb-2">Load Saved Fish</label>
          <select
            onChange={(e) => {
              const selectedIndex = e.target.selectedIndex - 1; // -1 for the "Select..." option
              if (selectedIndex >= 0) {
                const fish = savedFish[selectedIndex];
                setGeneratedFish(fish.url);
                setLoadedFishFilename(fish.filename);
                setStatus('✅ Loaded saved fish');
              }
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm"
            defaultValue=""
          >
            <option value="">Select a saved fish...</option>
            {savedFish.map((fish) => (
              <option key={fish.url} value={fish.url}>
                {fish.filename}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Load Saved Backgrounds */}
      {savedBackgrounds.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <label className="block text-sm font-bold text-white mb-2">Load Saved Background</label>
          <select
            onChange={(e) => {
              const selectedIndex = e.target.selectedIndex - 1; // -1 for the "Select..." option
              if (selectedIndex >= 0) {
                const bg = savedBackgrounds[selectedIndex];
                setGeneratedBg(bg.url);
                setLoadedBgFilename(bg.filename);
                setStatus('✅ Loaded saved background');
              }
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm"
            defaultValue=""
          >
            <option value="">Select a saved background...</option>
            {savedBackgrounds.map((bg) => (
              <option key={bg.url} value={bg.url}>
                {bg.filename}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fish Generation */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-2">Generate Fish</h3>

        {/* Fish Type */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {(['prey', 'predator', 'mutant'] as FishType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedFishType(type);
                setFishPrompt(FISH_PROMPTS[type]);
              }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedFishType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Fish Prompt */}
        <textarea
          value={fishPrompt}
          onChange={(e) => setFishPrompt(e.target.value)}
          className="w-full bg-gray-800 text-white px-2 py-2 rounded border border-gray-600 text-xs font-mono mb-2"
          rows={3}
        />

        <button
          onClick={generateFish}
          disabled={isGenerating}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors mb-2"
        >
          Generate Fish
        </button>

        {/* Generated Fish Preview */}
        {generatedFish && (
          <div className="bg-gray-800 rounded border border-gray-600 p-2 mb-2">
            <div className="bg-white/10 rounded p-2 mb-2">
              <img src={generatedFish} alt="Generated fish" className="w-full h-auto" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                onClick={() => onSpawnFish(generatedFish, selectedFishType)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Spawn
              </button>
              <button
                onClick={() => onSetPlayerFish(generatedFish)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Set Player
              </button>
              <button
                onClick={saveFish}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Save
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={flipFish}
                disabled={isGenerating}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Flip ↔
              </button>
              {loadedFishFilename && (
                <button
                  onClick={deleteFish}
                  disabled={isGenerating}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Background Generation */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-2">Generate Background</h3>

        {/* BG Presets */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {Object.entries(BG_PROMPTS).map(([key, prompt]) => (
            <button
              key={key}
              onClick={() => setBgPrompt(prompt)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        {/* BG Prompt */}
        <textarea
          value={bgPrompt}
          onChange={(e) => setBgPrompt(e.target.value)}
          className="w-full bg-gray-800 text-white px-2 py-2 rounded border border-gray-600 text-xs font-mono mb-2"
          rows={2}
        />

        <button
          onClick={generateBackground}
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors mb-2"
        >
          Generate Background
        </button>

        {/* Generated BG Preview */}
        {generatedBg && (
          <div className="bg-gray-800 rounded border border-gray-600 p-2 mb-2">
            <div className="rounded mb-2 overflow-hidden">
              <img src={generatedBg} alt="Generated background" className="w-full h-auto" />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => onSetBackground(generatedBg)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Set BG
              </button>
              <button
                onClick={saveBackground}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Save
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={flipBg}
                disabled={isGenerating}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Flip ↔
              </button>
              {loadedBgFilename && (
                <button
                  onClick={deleteBg}
                  disabled={isGenerating}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scene Controls */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-2">Scene Controls</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-300">Spawned Fish:</span>
            <span className="text-xs text-white font-bold">{spawnedFishCount}</span>
          </div>
          <button
            onClick={onClearFish}
            className="w-full bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Clear All Fish
          </button>
          <button
            onClick={() => onSetBackground(null)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Reset Background
          </button>
          <button
            onClick={() => onSetPlayerFish(null)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Reset Player Fish
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {isGenerating && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <p className="text-gray-400 text-xs mt-2">Processing...</p>
        </div>
      )}
    </div>
  );
}
