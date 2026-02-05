/**
 * Background Editor - Manage backgrounds (images/videos) and biome associations
 */
'use client';

import { useState, useRef } from 'react';

interface BackgroundEditorProps {
  currentBackground: string | null;
  onBackgroundChange: (url: string, type: 'image' | 'video') => void;
  onOpenArtSelector?: (callback: (url: string, filename: string) => void) => void;
}

interface BiomeBackground {
  backgroundImage?: string;
  backgroundVideo?: string;
}

export default function BackgroundEditor({ currentBackground, onBackgroundChange, onOpenArtSelector }: BackgroundEditorProps) {
  const [selectedBiome, setSelectedBiome] = useState<string>('shallow');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [backgroundType, setBackgroundType] = useState<'image' | 'video'>('image');
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [operationName, setOperationName] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'google/imagen-4.0-fast-generate-001' | 'google/imagen-4.0-generate-001' | 'bfl/flux-2-pro'>('google/imagen-4.0-fast-generate-001');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const biomes = [
    { id: 'shallow', name: 'Shallow' },
    { id: 'medium', name: 'Medium' },
    { id: 'deep', name: 'Deep' },
    { id: 'abyssal', name: 'Abyssal' },
    { id: 'shallow_tropical', name: 'Shallow Tropical' },
    { id: 'deep_polluted', name: 'Deep Polluted' },
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onBackgroundChange(result, 'image');
      setBackgroundType('image');
      setMessage('✅ Image loaded. Click "Save to Biome" to associate with a biome.');
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      setMessage('Uploading video...');

      // Upload video to blob storage
      const formData = new FormData();
      formData.append('video', file);
      formData.append('filename', `background_${Date.now()}.mp4`);

      const response = await fetch('/api/save-sprite', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onBackgroundChange(result.localPath, 'video');
        setBackgroundType('video');
        setMessage('✅ Video uploaded. Click "Save to Biome" to associate with a biome.');
      } else {
        setMessage(`❌ Failed to upload video: ${result.error}`);
      }
    } catch (error) {
      // Handle video upload error silently
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      setMessage('❌ Please enter an image prompt');
      return;
    }

    setIsGenerating(true);
    setMessage('🎨 Generating background image...');

    try {
      // Compose prompt for underwater background
      const fullPrompt = `Underwater ocean background scene, ${imagePrompt}, game background art, horizontal panoramic view, no fish in frame, atmospheric underwater lighting, seamless tileable edges preferred, high quality digital art`;

      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          model: selectedModel,
        }),
      });

      const result = await response.json();

      if (result.success && result.imageBase64) {
        const dataUrl = `data:image/png;base64,${result.imageBase64}`;
        onBackgroundChange(dataUrl, 'image');
        setBackgroundType('image');
        setMessage('✅ Background generated! Click "Save to Biome" to persist.');
      } else {
        setMessage(`❌ Generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      // Handle image generation error silently
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      setMessage('❌ Please enter a video prompt');
      return;
    }

    setIsGenerating(true);
    setMessage('Generating video... This may take several minutes.');

    try {
      // Start video generation
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          model: 'veo-3.1-generate-preview',
          aspectRatio: '16:9',
          resolution: '720p',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOperationName(result.operation);
        setMessage('🔄 Video generation started. Polling for completion...');
        // Start polling
        pollVideoGeneration(result.operation);
      } else {
        setMessage(`❌ Failed to start generation: ${result.error || result.message}`);
        setIsGenerating(false);
      }
    } catch (error) {
      // Handle video generation error silently
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const pollVideoGeneration = async (opName: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/generate-video?operation=${encodeURIComponent(opName)}`);
        const result = await response.json();

        if (result.status === 'completed' && result.video) {
          clearInterval(pollInterval);
          setIsGenerating(false);

          // Download the video from the URI
          const downloadResponse = await fetch('/api/download-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uri: result.video.uri }),
          });

          const downloadResult = await downloadResponse.json();

          if (downloadResult.success) {
            onBackgroundChange(downloadResult.url, 'video');
            setBackgroundType('video');
            setMessage('✅ Video generated successfully! Click "Save to Biome" to associate with a biome.');
            setOperationName(null);
          } else {
            setMessage(`❌ Failed to download video: ${downloadResult.error}`);
          }
        } else if (result.status === 'processing') {
          // Still processing, continue polling
          setMessage(`🔄 Video generation in progress... (${result.operation})`);
        } else {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setMessage(`❌ Generation failed or returned unexpected status`);
        }
      } catch (error) {
        clearInterval(pollInterval);
        setIsGenerating(false);
        // Handle polling error silently
        setMessage(`❌ Error polling status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleSaveToBiome = async () => {
    if (!currentBackground) {
      setMessage('❌ No background loaded to save');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      let backgroundUrl = currentBackground;

      // If it's a data URL (base64 image), upload it first
      if (currentBackground.startsWith('data:image')) {
        const filename = `biome_${selectedBiome}_bg_${Date.now()}.png`;
        const saveResponse = await fetch('/api/save-sprite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: currentBackground,
            filename,
            type: 'background',
          }),
        });

        const saveData = await saveResponse.json();

        if (!saveData.success) {
          setMessage(`❌ Failed to save: ${saveData.error}`);
          setIsSaving(false);
          return;
        }

        backgroundUrl = saveData.localPath;
      }

      // Load existing biome metadata (if any)
      let existingBiome: any = {};
      try {
        const loadResponse = await fetch(`/api/load-game-data?key=biomes/${selectedBiome}`);
        const loadData = await loadResponse.json();
        if (loadData.success && loadData.data) {
          existingBiome = loadData.data;
        }
      } catch (error) {
        // No existing data, that's fine
      }

      // Update biome metadata
      const biomeMetadata = {
        ...existingBiome,
        id: selectedBiome,
        backgroundAssets: {
          ...(existingBiome.backgroundAssets || {}),
          [backgroundType === 'video' ? 'backgroundVideo' : 'backgroundImage']: backgroundUrl,
        },
      };

      // Save biome metadata
      const metadataResponse = await fetch('/api/save-game-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `biomes/${selectedBiome}`,
          data: biomeMetadata,
        }),
      });

      const metadataData = await metadataResponse.json();

      if (metadataData.success) {
        const biomeName = biomes.find(b => b.id === selectedBiome)?.name;
        setMessage(`✅ ${backgroundType === 'video' ? 'Video' : 'Image'} saved for ${biomeName} biome`);
      } else {
        setMessage(`⚠️ ${backgroundType === 'video' ? 'Video' : 'Image'} uploaded but metadata save failed: ${metadataData.error}`);
      }
    } catch (error) {
      // Handle save biome background error silently
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h2 className="text-lg font-bold text-white">Background Management</h2>

      {/* Type Selector */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">Background Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => setBackgroundType('image')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${backgroundType === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Image
          </button>
          <button
            onClick={() => setBackgroundType('video')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${backgroundType === 'video'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Video
          </button>
        </div>
      </div>

      {/* Image Upload/Generation */}
      {backgroundType === 'image' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-white mb-2">Upload Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
            >
              Choose Image File
            </button>
          </div>

          <div>
            <button
              onClick={() => {
                if (onOpenArtSelector) {
                  onOpenArtSelector((url, filename) => {
                    onBackgroundChange(url, 'image');
                    setBackgroundType('image');
                    setMessage('✅ Background selected. Click "Save to Biome" to associate with a biome.');
                  });
                }
              }}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors"
            >
              Select Existing Background
            </button>
          </div>

          {/* AI Image Generation */}
          <div className="border-t border-gray-700 pt-3">
            <label className="block text-sm font-bold text-white mb-2">
              AI Image Generation
              <span className="text-xs font-normal text-gray-400 ml-2">(Imagen / Flux)</span>
            </label>

            {/* Model Selection */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as typeof selectedModel)}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-xs mb-2"
            >
              <option value="google/imagen-4.0-fast-generate-001">Imagen Fast</option>
              <option value="google/imagen-4.0-generate-001">Imagen Standard</option>
              <option value="bfl/flux-2-pro">Flux 2 Pro</option>
            </select>

            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none text-sm"
              rows={3}
              placeholder="Describe the underwater background (e.g., 'coral reef with sunlight rays', 'dark abyssal zone with bioluminescent particles')"
            />
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating || !imagePrompt.trim()}
              className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate Background
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Video Upload/Generation */}
      {backgroundType === 'video' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-white mb-2">Upload Video</label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={isSaving}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Uploading...' : 'Choose Video File'}
            </button>
          </div>

          <div className="border-t border-gray-700 pt-3">
            <label className="block text-sm font-bold text-white mb-2">
              AI Video Generation
              <span className="text-xs font-normal text-gray-400 ml-2">(Google Veo 3.1)</span>
            </label>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none text-sm"
              rows={3}
              placeholder="Describe the underwater background video (e.g., 'Gentle underwater scene with coral reefs and tropical fish swimming')"
            />
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || !videoPrompt.trim()}
              className="w-full mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? '🔄 Generating...' : 'Generate Video with AI'}
            </button>
          </div>
        </div>
      )}

      {/* Biome Association */}
      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-bold text-white mb-2">
          Associate with Biome
        </label>
        <div className="space-y-2">
          <select
            value={selectedBiome}
            onChange={(e) => setSelectedBiome(e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            {biomes.map((biome) => (
              <option key={biome.id} value={biome.id}>
                {biome.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveToBiome}
            disabled={isSaving || isGenerating || !currentBackground}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save to Biome'}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`text-sm p-2 rounded ${message.startsWith('✅')
          ? 'bg-green-600/20 text-green-400'
          : message.startsWith('🔄')
            ? 'bg-blue-600/20 text-blue-400'
            : 'bg-red-600/20 text-red-400'
          }`}>
          {message}
        </div>
      )}
    </div>
  );
}
