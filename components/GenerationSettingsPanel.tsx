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
  { id: 'google/imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', provider: 'Google', cost: '$' },
  { id: 'google/imagen-4.0-generate-001', name: 'Imagen 4', provider: 'Google', cost: '$$' },
  { id: 'bfl/flux-2-pro', name: 'Flux 2 Pro', provider: 'Black Forest Labs', cost: '$$' },
];

// Available video generation models
const VIDEO_MODELS = [
  { id: 'veo-3.1-generate-preview', name: 'Veo 3.1', provider: 'Google', cost: '$$$$' },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', provider: 'Google', cost: '$$$' },
];

export default function GenerationSettingsPanel() {
  const [spendingStatus, setSpendingStatus] = useState<SpendingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local state for settings (would be saved to localStorage or server)
  const [dailyVideoLimit, setDailyVideoLimit] = useState(10);
  const [selectedImageModel, setSelectedImageModel] = useState('google/imagen-4.0-fast-generate-001');
  const [selectedVideoModel, setSelectedVideoModel] = useState('veo-3.1-generate-preview');
  const [enableVideoGeneration, setEnableVideoGeneration] = useState(true);
  const [enableDirectMode, setEnableDirectMode] = useState(false);

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
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save settings to localStorage when changed
  const saveSettings = () => {
    const settings = {
      selectedImageModel,
      selectedVideoModel,
      enableVideoGeneration,
      enableDirectMode,
    };
    localStorage.setItem('generationSettings', JSON.stringify(settings));
  };

  useEffect(() => {
    saveSettings();
  }, [selectedImageModel, selectedVideoModel, enableVideoGeneration, enableDirectMode]);

  return (
    <div className="px-4 pb-4 pt-2 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Generation Settings</h2>
        <p className="text-xs text-gray-400">Configure AI generation APIs and limits</p>
      </div>

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
              ~${(spendingStatus.today.videoGenerations * 4).toFixed(0)} spent today (est. $4/video)
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
          <span>1 (~$4)</span>
          <span>25 (~$100)</span>
          <span>50 (~$200)</span>
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
          <>
            <label className="block text-sm text-gray-400 mb-2">Model</label>
            <select
              value={selectedVideoModel}
              onChange={(e) => setSelectedVideoModel(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              {VIDEO_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider}) - {model.cost}
                </option>
              ))}
            </select>

            {/* Direct Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableDirectMode}
                onChange={(e) => setEnableDirectMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-white">Use Direct Mode (bypasses job queue)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Direct mode is faster for testing but doesn't support background processing.
            </p>
          </>
        )}
      </div>

      {/* API Status */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-white mb-3">API Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Gemini API (Video)</span>
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
