/**
 * Background Edit Overlay - Edit mode UI for background properties
 * Mirrors FishEditOverlay pattern for consistent UX
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { composeBackgroundPrompt, previewBackgroundPrompt } from '@/lib/ai/background-prompt-builder';
import type { BackgroundAsset } from '@/lib/game/types';

interface BackgroundEditOverlayProps {
  background: BackgroundAsset | null;
  onSave: (background: BackgroundAsset) => void;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  /** When true, removes absolute positioning for embedding in another container */
  embedded?: boolean;
}

// Biome options matching the fish editor
const BIOME_OPTIONS = [
  { id: 'shallow', name: 'Shallow', depth: 'shallow' },
  { id: 'shallow_tropical', name: 'Shallow Tropical', depth: 'shallow' },
  { id: 'tropical', name: 'Tropical', depth: 'shallow' },
  { id: 'medium', name: 'Medium', depth: 'medium' },
  { id: 'medium_polluted', name: 'Medium Polluted', depth: 'medium' },
  { id: 'deep', name: 'Deep', depth: 'deep' },
  { id: 'deep_sea', name: 'Deep Sea', depth: 'deep' },
  { id: 'polluted', name: 'Polluted', depth: 'medium' },
  { id: 'abyssal', name: 'Abyssal', depth: 'abyssal' },
];

export default function BackgroundEditOverlay({
  background,
  onSave,
  onBack,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  embedded = false,
}: BackgroundEditOverlayProps) {
  const [editedBackground, setEditedBackground] = useState<BackgroundAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'google/imagen-4.0-fast-generate-001' | 'google/imagen-4.0-generate-001' | 'bfl/flux-2-pro'>('google/imagen-4.0-fast-generate-001');

  // Sync with prop
  useEffect(() => {
    if (background) {
      setEditedBackground({ ...background });
      setSaveMessage('');
    }
  }, [background]);

  // Compose prompt for preview
  const composedPrompt = useMemo(() => {
    if (!editedBackground) return '';
    return previewBackgroundPrompt({
      id: editedBackground.id,
      name: editedBackground.name,
      biomeId: editedBackground.biomeId,
      descriptionChunks: editedBackground.descriptionChunks,
      visualMotif: editedBackground.visualMotif,
    });
  }, [editedBackground]);

  // Update field helper
  const updateField = <K extends keyof BackgroundAsset>(
    field: K,
    value: BackgroundAsset[K]
  ) => {
    if (!editedBackground) return;
    setEditedBackground({ ...editedBackground, [field]: value });
  };

  // Description chunk helpers
  const addDescriptionChunk = () => {
    if (!editedBackground) return;
    const chunks = editedBackground.descriptionChunks || [];
    setEditedBackground({
      ...editedBackground,
      descriptionChunks: [...chunks, ''],
    });
  };

  const updateDescriptionChunk = (index: number, value: string) => {
    if (!editedBackground) return;
    const chunks = [...(editedBackground.descriptionChunks || [])];
    chunks[index] = value;
    setEditedBackground({ ...editedBackground, descriptionChunks: chunks });
  };

  const removeDescriptionChunk = (index: number) => {
    if (!editedBackground) return;
    const chunks = [...(editedBackground.descriptionChunks || [])];
    chunks.splice(index, 1);
    setEditedBackground({ ...editedBackground, descriptionChunks: chunks });
  };

  const moveDescriptionChunk = (index: number, direction: 'up' | 'down') => {
    if (!editedBackground) return;
    const chunks = [...(editedBackground.descriptionChunks || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= chunks.length) return;
    [chunks[index], chunks[newIndex]] = [chunks[newIndex], chunks[index]];
    setEditedBackground({ ...editedBackground, descriptionChunks: chunks });
  };

  // Handle regenerate action from action bar
  const handleRegenerateImage = async () => {
    if (!editedBackground) return;
    setIsGenerating(true);
    setSaveMessage('🎨 Generating background...');

    try {
      const { prompt } = composeBackgroundPrompt({
        id: editedBackground.id,
        name: editedBackground.name,
        biomeId: editedBackground.biomeId,
        descriptionChunks: editedBackground.descriptionChunks,
        visualMotif: editedBackground.visualMotif,
      });

      console.log('[BackgroundEdit] Using prompt:', prompt.substring(0, 200) + '...');

      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          aspectRatio: '16:9', // Backgrounds use widescreen aspect ratio
        }),
      });

      const result = await response.json();
      if (result.success && result.imageBase64) {
        const dataUrl = `data:image/png;base64,${result.imageBase64}`;
        const updatedBackground: BackgroundAsset = {
          ...editedBackground,
          url: dataUrl,
          generatedWith: selectedModel,
        };
        setEditedBackground(updatedBackground);
        onSave(updatedBackground);
        setSaveMessage('✓ Background generated! Click "Save" to persist.');
      } else {
        setSaveMessage(`❌ Generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSaveMessage(`❌ Error: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle save to storage
  const handleSaveToStorage = async () => {
    if (!editedBackground) return;
    setIsSaving(true);
    setSaveMessage('Saving...');

    try {
      // Check if URL is a data URL (needs upload)
      const isDataUrl = editedBackground.url.startsWith('data:');

      // Prepare metadata (without the actual image data if it's a data URL)
      const metadata: BackgroundAsset = {
        ...editedBackground,
        createdAt: editedBackground.createdAt || new Date().toISOString(),
      };

      const formData = new FormData();
      formData.append('backgroundId', editedBackground.id);
      formData.append('metadata', JSON.stringify(metadata));

      // If it's a data URL, convert to blob and attach
      if (isDataUrl) {
        const base64Match = editedBackground.url.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const contentType = base64Match[1];
          const base64Data = base64Match[2];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: contentType });
          formData.append('image', blob, `${editedBackground.id}.png`);
        }
      }

      const response = await fetch('/api/save-background', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        // Update local state with new URL
        const savedBackground: BackgroundAsset = {
          ...editedBackground,
          url: result.imageUrl || editedBackground.url,
        };
        setEditedBackground(savedBackground);
        onSave(savedBackground);
        setSaveMessage('✓ Saved successfully!');

        // Dispatch refresh event
        window.dispatchEvent(new CustomEvent('refreshBackgrounds'));
      } else {
        setSaveMessage(`❌ Save failed: ${result.error || result.message}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSaveMessage(`❌ Error: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!editedBackground) return;
    if (!window.confirm(`Delete "${editedBackground.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(
        `/api/delete-asset?url=${encodeURIComponent(editedBackground.url)}&type=background`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (result.success) {
        setSaveMessage('✓ Deleted');
        window.dispatchEvent(new CustomEvent('refreshBackgrounds'));
        onBack();
      } else {
        setSaveMessage(`❌ Delete failed: ${result.error}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSaveMessage(`❌ Delete error: ${message}`);
    }
  };

  // Listen for action bar events from PauseMenu (when embedded)
  useEffect(() => {
    if (!embedded) return;

    const handleActionEvent = (e: Event) => {
      const action = (e as CustomEvent<{ action: string }>).detail?.action;
      switch (action) {
        case 'upload':
          // Trigger file input
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (ev) => {
            const file = (ev.target as HTMLInputElement).files?.[0];
            if (file && editedBackground) {
              const reader = new FileReader();
              reader.onload = (loadEv) => {
                const url = loadEv.target?.result as string;
                const updated = { ...editedBackground, url };
                setEditedBackground(updated);
                onSave(updated);
                setSaveMessage('✓ Image uploaded. Click "Save" to persist.');
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
          break;
        case 'regenerate':
          handleRegenerateImage();
          break;
        case 'save':
          handleSaveToStorage();
          break;
        case 'delete':
          handleDelete();
          break;
      }
    };

    window.addEventListener('backgroundEditAction', handleActionEvent);
    return () => window.removeEventListener('backgroundEditAction', handleActionEvent);
  }, [embedded, editedBackground]);

  if (!editedBackground) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">No background selected</div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? 'relative h-full' : 'absolute bottom-0 left-0 right-0'} bg-gray-900/95 backdrop-blur-md z-50 flex flex-col border-t border-gray-700`}
      style={embedded ? {} : { height: '50%', maxHeight: '600px' }}
    >
      {/* Header - Minimal when embedded */}
      {embedded ? (
        saveMessage && (
          <div className="px-4 py-2 bg-gray-800/90 border-b border-gray-700">
            <div className={`text-xs px-2 py-1 rounded inline-block ${saveMessage.startsWith('✓') || saveMessage.startsWith('✅')
              ? 'bg-green-600/20 text-green-400'
              : saveMessage.startsWith('🎨')
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-red-600/20 text-red-400'
              }`}>
              {saveMessage}
            </div>
          </div>
        )
      ) : (
        /* Standalone: Full header */
        <div className="flex items-center justify-between p-3 bg-gray-800/90 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Edit Background</h2>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <div className={`text-xs px-2 py-1 rounded ${saveMessage.startsWith('✓') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                }`}>
                {saveMessage}
              </div>
            )}
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Background Preview - Full 16:9 preview of the generated/uploaded background */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Preview</label>
          <div className="relative w-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {editedBackground.url ? (
              editedBackground.type === 'video' ? (
                <video
                  src={editedBackground.url}
                  className="w-full h-full object-cover"
                  muted
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={editedBackground.url}
                  alt={editedBackground.name}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-2 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm">No image yet</p>
                  <p className="text-xs">Click "Generate" or "Upload"</p>
                </div>
              </div>
            )}
            {/* Loading overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm font-medium">Generating...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Biome Selector */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Biome</label>
          <select
            value={editedBackground.biomeId}
            onChange={(e) => updateField('biomeId', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {BIOME_OPTIONS.map((biome) => (
              <option key={biome.id} value={biome.id}>
                {biome.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description Chunks Editor */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-white">
              Description Chunks ({editedBackground.descriptionChunks?.length || 0})
            </label>
            <button
              onClick={addDescriptionChunk}
              className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              + Add Chunk
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            Modular prompt segments that compose the background's visual description
          </p>
          <div className="space-y-2 bg-gray-900/50 p-3 rounded border border-gray-700 max-h-48 overflow-y-auto">
            {editedBackground.descriptionChunks && editedBackground.descriptionChunks.length > 0 ? (
              editedBackground.descriptionChunks.map((chunk, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                  <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={chunk}
                    onChange={(e) => updateDescriptionChunk(index, e.target.value)}
                    className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="e.g., coral reef formations"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveDescriptionChunk(index, 'up')}
                      disabled={index === 0}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDescriptionChunk(index, 'down')}
                      disabled={index === (editedBackground.descriptionChunks?.length ?? 0) - 1}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeDescriptionChunk(index)}
                      className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                No chunks yet. Click "Add Chunk" to get started.
              </p>
            )}
          </div>
        </div>

        {/* Visual Motif */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Visual Motif</label>
          <input
            type="text"
            value={editedBackground.visualMotif || ''}
            onChange={(e) => updateField('visualMotif', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., tropical paradise with vibrant corals"
          />
          <p className="text-xs text-gray-400 mt-1">
            High-level visual theme • {editedBackground.visualMotif?.length || 0} characters
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Generation Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as typeof selectedModel)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-sm"
          >
            <option value="google/imagen-4.0-fast-generate-001">Imagen Fast</option>
            <option value="google/imagen-4.0-generate-001">Imagen Standard</option>
            <option value="bfl/flux-2-pro">Flux 2 Pro</option>
          </select>
        </div>

        {/* Composed Prompt Display */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-white">Composed AI Prompt</label>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono text-gray-300 max-h-32 overflow-y-auto">
            {composedPrompt || 'No prompt available'}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            This prompt is automatically composed from the background's biome, description chunks, and visual motif.
          </p>
        </div>

        {/* Resolution Info */}
        {editedBackground.resolution && (
          <div className="border-t border-gray-700 pt-4">
            <label className="block text-sm font-bold text-white mb-2">Resolution</label>
            <p className="text-sm text-gray-300">
              {editedBackground.resolution.width} x {editedBackground.resolution.height}
            </p>
          </div>
        )}

        {/* Generated With */}
        {editedBackground.generatedWith && (
          <div className="text-xs text-gray-500">
            Generated with: {editedBackground.generatedWith}
          </div>
        )}
      </div>
    </div>
  );
}
