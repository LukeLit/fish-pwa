/**
 * Developer Tools Menu
 * For testing AI fish sprite generation via Vercel AI Gateway
 * Supports Flux 2 Pro and Google Imagen models
 */
'use client';

import { useState, useRef } from 'react';
import { getFishSpriteService } from '@/lib/ai/fish-sprite-service';
import { getAssetManager } from '@/lib/ai/asset-manager';

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

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Model and type selection
  const [selectedModel, setSelectedModel] = useState<ModelType>('google/imagen-4.0-fast-generate-001');
  const [selectedFishType, setSelectedFishType] = useState<FishType>('prey');

  // Prompts
  const [fishPrompt, setFishPrompt] = useState(FISH_PROMPTS.prey);
  const [bgPrompt, setBgPrompt] = useState(BG_PROMPTS.underwater);

  // Generated assets
  const [fishImage, setFishImage] = useState<string>('');
  const [bgImage, setBgImage] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishSprite = getFishSpriteService();
  const assetManager = getAssetManager();

  const generateFish = async () => {
    setIsGenerating(true);
    setStatus(`Generating ${selectedFishType} fish with ${selectedModel}...`);

    try {
      const result = await fishSprite.generateFishSprite({
        type: selectedFishType,
        seed: `dev_${selectedFishType}_${Date.now()}`,
        model: selectedModel,
        customPrompt: fishPrompt,
      });

      if (!result || result.error) {
        setStatus(`❌ Generation failed: ${result?.error || 'Unknown error'}`);
        return;
      }

      if (result.imageBase64) {
        const spriteUrl = `data:image/png;base64,${result.imageBase64}`;
        setFishImage(spriteUrl);
        setStatus(`✅ Fish sprite generated with ${selectedModel}`);

        // Composite if we have a background
        if (bgImage) {
          compositeImages(bgImage, spriteUrl);
        }
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
        setBgImage(bgUrl);
        setStatus(`✅ Background generated with ${selectedModel}`);

        // Composite if we have a fish
        if (fishImage) {
          compositeImages(bgUrl, fishImage);
        }
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message || 'Failed to generate background'}`);
      console.error('Background generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const compositeImages = (bgUrl: string, fishUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = new Image();
    const fish = new Image();

    bg.onload = () => {
      canvas.width = bg.width;
      canvas.height = bg.height;
      ctx.drawImage(bg, 0, 0);

      fish.onload = () => {
        // Scale fish to fit nicely in scene (40% of canvas width)
        const scale = (canvas.width * 0.4) / fish.width;
        const fishWidth = fish.width * scale;
        const fishHeight = fish.height * scale;

        // Center fish in canvas
        const x = (canvas.width - fishWidth) / 2;
        const y = (canvas.height - fishHeight) / 2;

        ctx.drawImage(fish, x, y, fishWidth, fishHeight);
      };
      fish.src = fishUrl;
    };
    bg.src = bgUrl;
  };

  const saveFish = async () => {
    if (!fishImage) return;

    setIsGenerating(true);
    setStatus('Saving fish to game assets...');

    try {
      const filename = `fish_${selectedFishType}_${Date.now()}.png`;
      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: fishImage,
          filename,
          type: 'fish',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Fish saved to ${data.localPath}\nReady to use in game!`);
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
    if (!bgImage) return;

    setIsGenerating(true);
    setStatus('Saving background to game assets...');

    try {
      const filename = `bg_${Date.now()}.png`;
      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: bgImage,
          filename,
          type: 'background',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Background saved to ${data.localPath}\nReady to use in game!`);
      } else {
        setStatus(`❌ Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error saving: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveComposite = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    setStatus('Saving composite to game assets...');

    try {
      const filename = `composite_${Date.now()}.png`;
      const compositeBase64 = canvas.toDataURL('image/png');

      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compositeBase64,
          filename,
          type: 'background',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`✅ Composite saved to ${data.localPath}\nReady to use in game!`);
      } else {
        setStatus(`❌ Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error saving: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearCache = () => {
    assetManager.clearCache();
    fishSprite.clearCache();
    setFishImage('');
    setBgImage('');
    setStatus('✅ Cache cleared');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 border border-gray-600"
      >
        Dev Tools
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 max-w-7xl w-full max-h-[95vh] overflow-y-auto border-2 border-gray-600 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">AI Asset Generator</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <div className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelType)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm"
              >
                <option value="google/imagen-4.0-fast-generate-001">Google Imagen 4.0 Fast (Recommended)</option>
                <option value="google/imagen-4.0-generate-001">Google Imagen 4.0</option>
                <option value="bfl/flux-2-pro">Black Forest Labs Flux 2 Pro</option>
              </select>
            </div>

            {/* Fish Type Selection */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Fish Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['prey', 'predator', 'mutant'] as FishType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedFishType(type);
                      setFishPrompt(FISH_PROMPTS[type]);
                    }}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      selectedFishType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fish Prompt */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Fish Prompt</label>
              <textarea
                value={fishPrompt}
                onChange={(e) => setFishPrompt(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm font-mono"
                rows={4}
              />
              <button
                onClick={generateFish}
                disabled={isGenerating}
                className="w-full mt-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Generate Fish
              </button>
            </div>

            {/* Background Prompt */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Background Prompt</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {Object.entries(BG_PROMPTS).map(([key, prompt]) => (
                  <button
                    key={key}
                    onClick={() => setBgPrompt(prompt)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
              <textarea
                value={bgPrompt}
                onChange={(e) => setBgPrompt(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm font-mono"
                rows={3}
              />
              <button
                onClick={generateBackground}
                disabled={isGenerating}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Generate Background
              </button>
            </div>

            {/* Status */}
            {status && (
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{status}</p>
              </div>
            )}

            {/* Utilities */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Save to Game Assets</h3>
              <p className="text-xs text-gray-400 mb-2">Files saved here are ready to use in the game</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={saveFish}
                  disabled={!fishImage || isGenerating}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  💾 Save Fish
                </button>
                <button
                  onClick={saveBackground}
                  disabled={!bgImage || isGenerating}
                  className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  💾 Save BG
                </button>
                <button
                  onClick={saveComposite}
                  disabled={!fishImage || !bgImage || isGenerating}
                  className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  💾 Save Composite
                </button>
                <button
                  onClick={clearCache}
                  disabled={isGenerating}
                  className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  🗑️ Clear Cache
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Preview</h3>

              {/* Composite Preview */}
              {(bgImage || fishImage) && (
                <div className="bg-gray-800 rounded border border-gray-600 p-4 mb-4">
                  <h4 className="text-xs font-bold text-gray-400 mb-2">Composite</h4>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto rounded border border-gray-700"
                  />
                </div>
              )}

              {/* Individual Previews */}
              <div className="grid grid-cols-2 gap-4">
                {/* Fish Preview */}
                <div className="bg-gray-800 rounded border border-gray-600 p-3">
                  <h4 className="text-xs font-bold text-gray-400 mb-2">Fish Sprite</h4>
                  {fishImage ? (
                    <div className="bg-white rounded p-2">
                      <img
                        src={fishImage}
                        alt="Generated fish"
                        className="w-full h-auto"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-500 text-xs">No fish yet</span>
                    </div>
                  )}
                </div>

                {/* Background Preview */}
                <div className="bg-gray-800 rounded border border-gray-600 p-3">
                  <h4 className="text-xs font-bold text-gray-400 mb-2">Background</h4>
                  {bgImage ? (
                    <img
                      src={bgImage}
                      alt="Generated background"
                      className="w-full h-auto rounded"
                    />
                  ) : (
                    <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-500 text-xs">No background yet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isGenerating && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <p className="text-gray-400 text-sm mt-2">Generating...</p>
          </div>
        )}
      </div>
    </div>
  );
}
