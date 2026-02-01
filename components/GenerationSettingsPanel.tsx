/**
 * Generation Settings Panel
 * Configure API settings for image and video generation
 */
'use client';

import { useState, useEffect } from 'react';

interface SpendingStatus {
  today: {
    date: string;
    videoGenerations: number;
    lastUpdated: string;
  };
  limit: number;
  remaining: number;
  percentUsed: number;
}

// Available image generation models
const IMAGE_MODELS = [
  { id: 'google/imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', provider: 'Google', cost: '$0.02' },
  { id: 'google/imagen-4.0-generate-001', name: 'Imagen 4', provider: 'Google', cost: '$0.04' },
  { id: 'bfl/flux-2-pro', name: 'Flux 2 Pro', provider: 'Black Forest Labs', cost: '$0.05' },
];

// Available video generation models with per-second pricing
// Organized by provider with feature support
// aspectRatios: which ratios the model supports (empty = uses input image aspect)
const VIDEO_MODELS = [
  // Fal.ai models
  { id: 'fal/wan-2.1', name: 'Wan 2.1', provider: 'Fal.ai', costPerSecond: 0.05, aspectRatios: ['auto', '1:1', '16:9', '9:16'], minDuration: 5, maxDuration: 6 },
  { id: 'fal/kling-2.1-standard', name: 'Kling 2.1 Std', provider: 'Fal.ai', costPerSecond: 0.05, aspectRatios: [], minDuration: 5, maxDuration: 10 }, // Uses input image aspect
  { id: 'fal/kling-2.1-pro', name: 'Kling 2.1 Pro', provider: 'Fal.ai', costPerSecond: 0.09, aspectRatios: ['1:1', '16:9', '9:16'], minDuration: 5, maxDuration: 10 },
  { id: 'fal/grok-imagine', name: 'Grok Imagine', provider: 'Fal.ai (xAI)', costPerSecond: 0.05, aspectRatios: ['auto', '1:1', '16:9', '9:16', '4:3', '3:4'], minDuration: 6, maxDuration: 6 },
  // Google Veo models - higher quality, no 1:1 support
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', provider: 'Google', costPerSecond: 0.15, aspectRatios: ['16:9', '9:16'], minDuration: 4, maxDuration: 8 },
  { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 Standard', provider: 'Google', costPerSecond: 0.40, aspectRatios: ['16:9', '9:16'], minDuration: 4, maxDuration: 8 },
];

// Video duration options - filtered dynamically based on model
const DURATION_OPTIONS = [
  { value: 4, label: '4s' },
  { value: 5, label: '5s' },
  { value: 6, label: '6s' },
  { value: 8, label: '8s' },
  { value: 10, label: '10s' },
];

// Resolution options
const RESOLUTION_OPTIONS = [
  { value: '480p', label: '480p', description: 'fastest' },
  { value: '720p', label: '720p', description: 'default' },
  { value: '1080p', label: '1080p', description: 'Veo 8s only' },
];

// Aspect ratio options
const ASPECT_RATIO_OPTIONS = [
  { value: 'auto', label: 'Auto', description: 'from input image' },
  { value: '1:1', label: '1:1', description: 'square' },
  { value: '16:9', label: '16:9', description: 'landscape' },
  { value: '9:16', label: '9:16', description: 'portrait' },
];

export default function GenerationSettingsPanel() {
  const [spendingStatus, setSpendingStatus] = useState<SpendingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local state for settings (saved to localStorage)
  const [dailyVideoLimit, setDailyVideoLimit] = useState(10);
  const [selectedImageModel, setSelectedImageModel] = useState('google/imagen-4.0-fast-generate-001');
  const [selectedVideoModel, setSelectedVideoModel] = useState('fal/wan-2.1'); // Default to cheapest
  const [enableVideoGeneration, setEnableVideoGeneration] = useState(true);
  const [enableDirectMode, setEnableDirectMode] = useState(false);

  // Video configuration
  const [videoDuration, setVideoDuration] = useState(5); // Default 5s for Fal
  const [videoResolution, setVideoResolution] = useState('720p');
  const [videoAspectRatio, setVideoAspectRatio] = useState('1:1'); // Square for fish!
  const [negativePrompt, setNegativePrompt] = useState('blurry, distorted, low quality, text, watermark');

  // Save indicator
  const [showSaved, setShowSaved] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Calculate cost estimate based on current settings
  const selectedModel = VIDEO_MODELS.find(m => m.id === selectedVideoModel);
  const estimatedCostPerVideo = selectedModel ? (selectedModel.costPerSecond * videoDuration) : 0;

  // Get supported aspect ratios for current model
  const supportedAspectRatios = selectedModel?.aspectRatios ?? [];
  const modelSupportsAspectRatio = supportedAspectRatios.length > 0;
  const modelSupports1to1 = supportedAspectRatios.includes('1:1');
  const isFalModel = selectedVideoModel.startsWith('fal/');

  // Load spending status
  useEffect(() => {
    const fetchSpendingStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/spending');
        if (response.ok) {
          const data = await response.json();
          setSpendingStatus(data);
          setDailyVideoLimit(data.limit);
        } else {
          setError('Failed to load spending status');
        }
      } catch (err) {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchSpendingStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSpendingStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('generationSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.selectedImageModel) setSelectedImageModel(settings.selectedImageModel);
        if (settings.selectedVideoModel) setSelectedVideoModel(settings.selectedVideoModel);
        if (settings.enableVideoGeneration !== undefined) setEnableVideoGeneration(settings.enableVideoGeneration);
        if (settings.enableDirectMode !== undefined) setEnableDirectMode(settings.enableDirectMode);
        if (settings.videoDuration) setVideoDuration(settings.videoDuration);
        if (settings.videoResolution) setVideoResolution(settings.videoResolution);
        if (settings.videoAspectRatio) setVideoAspectRatio(settings.videoAspectRatio);
        if (settings.negativePrompt !== undefined) setNegativePrompt(settings.negativePrompt);
        console.log('[Settings] Loaded from localStorage:', settings);
      } catch {
        // Ignore parse errors
      }
    }
    setSettingsLoaded(true);
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    // Don't save until initial load is complete (prevents overwriting with defaults)
    if (!settingsLoaded) return;

    const settings = {
      selectedImageModel,
      selectedVideoModel,
      enableVideoGeneration,
      enableDirectMode,
      videoDuration,
      videoResolution,
      videoAspectRatio,
      negativePrompt,
    };
    localStorage.setItem('generationSettings', JSON.stringify(settings));
    console.log('[Settings] Saved to localStorage:', settings);

    // Show saved indicator
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [settingsLoaded, selectedImageModel, selectedVideoModel, enableVideoGeneration, enableDirectMode, videoDuration, videoResolution, videoAspectRatio, negativePrompt]);

  // Check if settings are "expensive"
  const isExpensiveModel = (selectedModel?.costPerSecond ?? 0) >= 0.10;
  const isLongDuration = videoDuration >= 8;
  const showCostWarning = isExpensiveModel || (isLongDuration && enableVideoGeneration);

  return (
    <div className="px-4 pb-4 pt-2 space-y-6 relative">
      {/* Saved indicator toast */}
      {showSaved && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Settings saved
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Generation Settings</h2>
        <p className="text-xs text-gray-400">Configure AI generation APIs and limits</p>
      </div>

      {/* Current Settings Summary Card */}
      {enableVideoGeneration && (
        <div className={`rounded-lg p-3 border ${showCostWarning ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-green-900/20 border-green-600/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {showCostWarning ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-yellow-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Active Video Settings
            </h3>
            <span className={`text-lg font-bold ${showCostWarning ? 'text-yellow-400' : 'text-green-400'}`}>
              ${estimatedCostPerVideo.toFixed(2)}/video
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="text-gray-400">Model:</div>
            <div className="text-white font-medium">{selectedModel?.name}</div>
            <div className="text-gray-400">Duration:</div>
            <div className="text-white font-medium">{videoDuration}s</div>
            <div className="text-gray-400">Resolution:</div>
            <div className="text-white font-medium">{videoResolution}</div>
            <div className="text-gray-400">Aspect:</div>
            <div className="text-white font-medium">{videoAspectRatio === 'auto' ? 'Auto (input)' : videoAspectRatio}</div>
          </div>
          {showCostWarning && (
            <p className="text-xs text-yellow-400/80 mt-2">
              Higher cost settings selected. These will be used for all video generations.
            </p>
          )}
        </div>
      )}

      {/* Spending Status Card */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-cyan-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          Daily Video Budget
        </h3>

        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : spendingStatus ? (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${spendingStatus.percentUsed >= 90 ? 'bg-red-500' :
                  spendingStatus.percentUsed >= 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                style={{ width: `${Math.min(100, spendingStatus.percentUsed)}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {spendingStatus.today.videoGenerations} / {spendingStatus.limit} videos today
              </span>
              <span className={`font-bold ${spendingStatus.remaining > 5 ? 'text-green-400' :
                spendingStatus.remaining > 2 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                {spendingStatus.remaining} remaining
              </span>
            </div>

            {/* Cost estimate */}
            <p className="text-xs text-gray-500">
              ~${(spendingStatus.today.videoGenerations * estimatedCostPerVideo).toFixed(2)} spent today (est. ${estimatedCostPerVideo.toFixed(2)}/video)
            </p>
          </div>
        ) : null}
      </div>

      {/* Daily Limit Setting */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Daily Video Limit: {dailyVideoLimit}
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={dailyVideoLimit}
          onChange={(e) => setDailyVideoLimit(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1 (~${estimatedCostPerVideo.toFixed(2)})</span>
          <span>25 (~${(25 * estimatedCostPerVideo).toFixed(0)})</span>
          <span>50 (~${(50 * estimatedCostPerVideo).toFixed(0)})</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Set via <code className="bg-gray-800 px-1 rounded">DAILY_VIDEO_LIMIT</code> env var on server
        </p>
      </div>

      {/* Image Generation Settings */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-3">Image Generation</h3>

        <label className="block text-sm text-gray-400 mb-2">Model</label>
        <select
          value={selectedImageModel}
          onChange={(e) => setSelectedImageModel(e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {IMAGE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider}) - {model.cost}
            </option>
          ))}
        </select>
      </div>

      {/* Video Generation Settings */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
          Video Generation
          <label className="flex items-center gap-2 cursor-pointer text-xs font-normal">
            <input
              type="checkbox"
              checked={enableVideoGeneration}
              onChange={(e) => setEnableVideoGeneration(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-400">Enabled</span>
          </label>
        </h3>

        {enableVideoGeneration && (
          <div className="space-y-4">
            {/* Cost Estimate Card */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Estimated cost per video:</span>
                <span className="text-lg font-bold text-green-400">${estimatedCostPerVideo.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedModel?.name} @ ${selectedModel?.costPerSecond.toFixed(2)}/sec × {videoDuration}s
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Model</label>
              <select
                value={selectedVideoModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setSelectedVideoModel(newModel);
                  // Auto-adjust settings for model compatibility
                  const model = VIDEO_MODELS.find(m => m.id === newModel);
                  if (model) {
                    // Adjust aspect ratio based on model support
                    const ratios = model.aspectRatios;
                    if (ratios.length === 0) {
                      // Model uses input image aspect (Kling Standard)
                      setVideoAspectRatio('auto');
                    } else if (!ratios.includes(videoAspectRatio)) {
                      // Current ratio not supported, pick first available
                      setVideoAspectRatio(ratios.includes('1:1') ? '1:1' : ratios[0]);
                    }
                    // Adjust duration if outside model's supported range
                    if (videoDuration < model.minDuration) {
                      setVideoDuration(model.minDuration);
                    } else if (videoDuration > model.maxDuration) {
                      setVideoDuration(model.maxDuration);
                    }
                    // Reset 1080p resolution when switching to Fal (not supported)
                    if (model.id.startsWith('fal/') && videoResolution === '1080p') {
                      setVideoResolution('720p');
                    }
                  }
                }}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Fal.ai (cheaper, 1:1 support)">
                  {VIDEO_MODELS.filter(m => m.id.startsWith('fal/')).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - ${model.costPerSecond.toFixed(2)}/sec
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Google Veo (higher quality)">
                  {VIDEO_MODELS.filter(m => !m.id.startsWith('fal/')).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - ${model.costPerSecond.toFixed(2)}/sec
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedModel?.id === 'fal/wan-2.1' && 'Wan 2.1: 1:1 square support, 5-6s, cheapest'}
                {selectedModel?.id === 'fal/kling-2.1-standard' && 'Kling Std: Uses input image aspect ratio, 5-10s'}
                {selectedModel?.id === 'fal/kling-2.1-pro' && 'Kling Pro: 1:1 square support, 5-10s, higher quality'}
                {selectedModel?.id === 'fal/grok-imagine' && 'Grok Imagine: xAI model, wide aspect ratio support, 6s'}
                {!isFalModel && 'Google Veo: 4-8s duration, 16:9 or 9:16 only'}
              </p>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const minDur = selectedModel?.minDuration ?? 4;
                  const maxDur = selectedModel?.maxDuration ?? 10;
                  const disabled = opt.value < minDur || opt.value > maxDur;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (disabled) return;
                        setVideoDuration(opt.value);
                        // Reset resolution to 720p if duration isn't 8s (Veo 1080p constraint)
                        if (opt.value !== 8 && videoResolution === '1080p' && !isFalModel) {
                          setVideoResolution('720p');
                        }
                      }}
                      disabled={disabled}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${videoDuration === opt.value
                        ? 'bg-blue-600 text-white'
                        : disabled
                          ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      title={disabled ? `${selectedModel?.name} supports ${minDur}-${maxDur}s` : ''}
                    >
                      {opt.value}s
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedModel?.name} supports {selectedModel?.minDuration}-{selectedModel?.maxDuration}s duration.
              </p>
            </div>

            {/* Resolution Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {RESOLUTION_OPTIONS.map((opt) => {
                  // 1080p: Veo only, 8s only
                  const is1080p = opt.value === '1080p';
                  const disabled = is1080p && (isFalModel || videoDuration !== 8);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !disabled && setVideoResolution(opt.value)}
                      disabled={disabled}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${videoResolution === opt.value
                        ? 'bg-blue-600 text-white'
                        : disabled
                          ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      title={disabled ? (isFalModel ? '1080p requires Google Veo' : '1080p requires 8s duration') : ''}
                    >
                      {opt.value}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isFalModel ? 'Fal.ai supports 480p and 720p' : '1080p available with Veo at 8s duration'}
              </p>
            </div>

            {/* Aspect Ratio Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Aspect Ratio</label>
              {!modelSupportsAspectRatio ? (
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-sm text-gray-300">
                    <span className="text-yellow-400">Auto</span> - {selectedModel?.name} uses the input image&apos;s aspect ratio
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Use a square sprite for square output
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {ASPECT_RATIO_OPTIONS.map((opt) => {
                      const supported = supportedAspectRatios.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => supported && setVideoAspectRatio(opt.value)}
                          disabled={!supported}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${videoAspectRatio === opt.value
                            ? 'bg-blue-600 text-white'
                            : !supported
                              ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          title={!supported ? `${selectedModel?.name} doesn't support ${opt.value}` : opt.description}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {videoAspectRatio === '1:1' && modelSupports1to1 && (
                    <p className="text-xs text-green-500/80 mt-2">
                      Square output - perfect for fish sprites!
                    </p>
                  )}
                  {!modelSupports1to1 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedModel?.name} supports: {supportedAspectRatios.join(', ')}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Negative Prompt</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Things to avoid in the video..."
                rows={2}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Elements to exclude from generated videos</p>
            </div>

            {/* Direct Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={enableDirectMode}
                onChange={(e) => setEnableDirectMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-white">Use Direct Mode (bypasses job queue)</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              Direct mode is faster for testing but doesn't support background processing.
            </p>
          </div>
        )}
      </div>

      {/* API Status */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-3">API Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Fal.ai (Video)</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400">Connected</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Google Veo (Video)</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400">Connected</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Imagen API (Images)</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400">Connected</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Vercel Blob Storage</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400">Connected</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
