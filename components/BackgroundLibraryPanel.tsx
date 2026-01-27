/**
 * Background Library Panel - Shows all saved backgrounds in a scrollable list
 */
'use client';

import { useState, useEffect } from 'react';

interface Background {
  filename: string;
  url: string;
  timestamp: string;
}

interface BackgroundLibraryPanelProps {
  onSelectBackground: (background: Background) => void;
  onAddNew: () => void;
}

export default function BackgroundLibraryPanel({ onSelectBackground, onAddNew }: BackgroundLibraryPanelProps) {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBackgrounds();
  }, []);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/list-assets?type=background');
      const result = await response.json();
      
      if (result.success) {
        setBackgrounds(result.assets || []);
      } else {
        setError(result.error || 'Failed to load backgrounds');
      }
    } catch (err) {
      console.error('Failed to load backgrounds:', err);
      setError('Failed to load backgrounds');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading backgrounds...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-red-400">{error}</div>
        <button
          onClick={loadBackgrounds}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="space-y-2">
        {/* Add New Background Button */}
        <button
          onClick={onAddNew}
          className="w-full bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg p-4 transition-colors text-left flex items-center gap-3"
        >
          <div className="w-16 h-16 bg-blue-700 rounded flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Add Background</h3>
            <p className="text-sm text-blue-200">Upload image/video or generate with AI</p>
          </div>
        </button>

        {/* Background List */}
        {backgrounds.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No backgrounds saved yet. Click "Add Background" to get started.
          </div>
        ) : (
          backgrounds.map((background) => {
            const isVideo = background.filename.toLowerCase().endsWith('.mp4');
            
            return (
              <button
                key={background.url}
                onClick={() => onSelectBackground(background)}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition-colors text-left"
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 bg-gray-900 rounded flex-shrink-0 overflow-hidden">
                    {isVideo ? (
                      <video
                        src={background.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={background.url}
                        alt={background.filename}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate">{background.filename}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isVideo ? 'bg-purple-600/20 text-purple-400' : 'bg-green-600/20 text-green-400'
                      }`}>
                        {isVideo ? 'Video' : 'Image'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(parseInt(background.timestamp)).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
