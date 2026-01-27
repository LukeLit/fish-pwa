/**
 * Art Selector Panel - Browse and select existing fish/background art
 */
'use client';

import { useState, useEffect } from 'react';

interface Asset {
  filename: string;
  url: string;
  timestamp: string;
}

interface ArtSelectorPanelProps {
  type: 'fish' | 'background';
  onSelect: (url: string, filename: string) => void;
  onCancel: () => void;
}

export default function ArtSelectorPanel({ type, onSelect, onCancel }: ArtSelectorPanelProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, [type]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/list-assets?type=${type}`);
      const result = await response.json();
      
      if (result.success) {
        setAssets(result.assets || []);
      } else {
        setError(result.error || 'Failed to load assets');
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedUrl) {
      const asset = assets.find(a => a.url === selectedUrl);
      if (asset) {
        onSelect(selectedUrl, asset.filename);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
        <div className="bg-gray-900 rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="text-gray-400">Loading {type === 'fish' ? 'fish sprites' : 'backgrounds'}...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
        <div className="bg-gray-900 rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="text-red-400 mb-4">{error}</div>
          <div className="flex gap-2">
            <button
              onClick={loadAssets}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              Retry
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Select {type === 'fish' ? 'Fish Sprite' : 'Background'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {assets.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No {type === 'fish' ? 'fish sprites' : 'backgrounds'} found.
              Generate or upload some first.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {assets.map((asset) => {
                const isSelected = selectedUrl === asset.url;
                const isVideo = asset.filename.toLowerCase().endsWith('.mp4');
                
                return (
                  <button
                    key={asset.url}
                    onClick={() => setSelectedUrl(asset.url)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/50' 
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-800 flex items-center justify-center">
                      {isVideo ? (
                        <video
                          src={asset.url}
                          className="w-full h-full object-contain"
                          muted
                        />
                      ) : (
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    
                    {/* Filename */}
                    <div className="p-2 bg-gray-800/90">
                      <p className="text-xs text-gray-300 truncate">{asset.filename}</p>
                    </div>
                    
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Video Badge */}
                    {isVideo && (
                      <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded">
                        Video
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedUrl}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
