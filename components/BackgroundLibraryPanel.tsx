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
  /** Callback to set a background as active (optional, for editor mode) */
  onSetAsActive?: (background: Background) => void;
}

export default function BackgroundLibraryPanel({ onSelectBackground, onAddNew, onSetAsActive }: BackgroundLibraryPanelProps) {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (background: Background, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm(`Delete background "${background.filename}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(background.url);
    try {
      const response = await fetch(`/api/delete-asset?url=${encodeURIComponent(background.url)}&type=background`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setBackgrounds(prev => prev.filter(b => b.url !== background.url));
      } else {
        alert('Failed to delete: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetActive = (background: Background, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSetAsActive) {
      onSetAsActive(background);
    }
  };

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
            const isDeleting = deletingId === background.url;

            return (
              <div
                key={background.url}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition-colors"
              >
                <div className="flex gap-3">
                  {/* Thumbnail - clickable to edit */}
                  <button
                    onClick={() => onSelectBackground(background)}
                    className="w-24 h-16 bg-gray-900 rounded flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                    title="Edit background"
                  >
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
                  </button>

                  {/* Info + Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate text-sm">{background.filename}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${isVideo ? 'bg-purple-600/20 text-purple-400' : 'bg-green-600/20 text-green-400'
                          }`}>
                          {isVideo ? 'Video' : 'Image'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(parseInt(background.timestamp)).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-2">
                      {onSetAsActive && (
                        <button
                          onClick={(e) => handleSetActive(background, e)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                          title="Set as current background"
                        >
                          Set BG
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(background, e)}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        title="Delete background"
                      >
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
