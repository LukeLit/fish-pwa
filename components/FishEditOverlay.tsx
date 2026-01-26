/**
 * Fish Edit Overlay - Edit mode UI for fish properties
 */
'use client';

import { useState, useEffect } from 'react';

export interface FishData {
  id: string;
  name: string;
  description: string;
  type: 'prey' | 'predator' | 'mutant';
  stats: {
    size: number;
    speed: number;
    health: number;
    damage: number;
  };
  sprite: string;
  // Extended fields for Creature compatibility
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  playable?: boolean;
  biomeId?: string;
  essenceTypes?: Array<{
    type: string;
    baseYield: number;
  }>;
  spawnRules?: {
    canAppearIn: string[];
    spawnWeight: number;
    minDepth?: number;
    maxDepth?: number;
  };
  grantedAbilities?: string[];
  unlockRequirement?: {
    biomeUnlocked: string[];
    essenceSpent?: Record<string, number>;
  };
}

interface FishEditOverlayProps {
  fish: FishData | null;
  onSave: (fish: FishData) => void;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export default function FishEditOverlay({
  fish,
  onSave,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: FishEditOverlayProps) {
  const [editedFish, setEditedFish] = useState<FishData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    if (fish) {
      // Set default values for new fields if they don't exist
      setEditedFish({
        ...fish,
        rarity: fish.rarity || 'common',
        playable: fish.playable ?? false,
        biomeId: fish.biomeId || 'shallow',
        essenceTypes: fish.essenceTypes || [{ type: 'shallow', baseYield: 10 }],
        spawnRules: fish.spawnRules || {
          canAppearIn: [fish.biomeId || 'shallow'],
          spawnWeight: 50,
        },
      });
    }
  }, [fish]);

  if (!fish || !editedFish) return null;

  const handleSave = () => {
    onSave(editedFish);
    setSaveMessage('');
  };

  const handleSaveToGame = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Convert sprite to blob if it's a data URL
      let spriteBlob: Blob | null = null;
      if (editedFish.sprite.startsWith('data:')) {
        const response = await fetch(editedFish.sprite);
        spriteBlob = await response.blob();
      }

      // Prepare metadata (without sprite data URL)
      const metadata = {
        ...editedFish,
        sprite: '', // Will be set by the API
      };

      // Create FormData
      const formData = new FormData();
      formData.append('creatureId', editedFish.id);
      formData.append('metadata', JSON.stringify(metadata));
      if (spriteBlob) {
        formData.append('sprite', spriteBlob, `${editedFish.id}.png`);
      }

      // Save to API
      const response = await fetch('/api/save-creature', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage('✓ Saved to game successfully!');
        // Update the fish with the new sprite URL if it was uploaded
        if (result.spriteUrl) {
          setEditedFish(prev => prev ? { ...prev, sprite: result.spriteUrl } : null);
        }
      } else {
        setSaveMessage('✗ Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage('✗ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedFish((prev) => {
      if (!prev) return null;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentValue = prev[parent as keyof FishData];
        // Ensure parentValue is an object before spreading
        const parentObj = typeof parentValue === 'object' && parentValue !== null ? parentValue : {};
        return {
          ...prev,
          [parent]: {
            ...parentObj,
            [child]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md z-50 flex flex-col border-t border-gray-700" style={{ height: '50%', maxHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800/90 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white">Edit Fish</h2>
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Name</label>
          <input
            type="text"
            value={editedFish.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Enter fish name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Description</label>
          <textarea
            value={editedFish.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            rows={4}
            placeholder="Enter fish description"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Type</label>
          <select
            value={editedFish.type}
            onChange={(e) => updateField('type', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="prey">Prey</option>
            <option value="predator">Predator</option>
            <option value="mutant">Mutant</option>
          </select>
        </div>

        {/* Rarity */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Rarity</label>
          <select
            value={editedFish.rarity || 'common'}
            onChange={(e) => updateField('rarity', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>

        {/* Playable */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editedFish.playable || false}
              onChange={(e) => updateField('playable', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-white">Playable (Can be selected as player fish)</span>
          </label>
        </div>

        {/* Biome */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Biome</label>
          <select
            value={editedFish.biomeId || 'shallow'}
            onChange={(e) => updateField('biomeId', e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="shallow">Shallow</option>
            <option value="medium">Medium</option>
            <option value="deep">Deep</option>
            <option value="abyssal">Abyssal</option>
            <option value="shallow_tropical">Shallow Tropical</option>
            <option value="deep_polluted">Deep Polluted</option>
          </select>
        </div>

        {/* Essence Types */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Essence Types (comma-separated: type:yield)</label>
          <input
            type="text"
            value={
              editedFish.essenceTypes
                ? editedFish.essenceTypes.map(e => `${e.type}:${e.baseYield}`).join(', ')
                : ''
            }
            onChange={(e) => {
              const value = e.target.value.trim();
              if (!value) {
                updateField('essenceTypes', []);
                return;
              }
              const essenceTypes = value.split(',').map(part => {
                const [type, yieldStr] = part.trim().split(':');
                return {
                  type: type || 'shallow',
                  baseYield: parseInt(yieldStr) || 10
                };
              });
              updateField('essenceTypes', essenceTypes);
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., shallow:10, deep_sea:15"
          />
          <p className="text-xs text-gray-400 mt-1">Example: shallow:10, deep_sea:15, polluted:5</p>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-bold text-white mb-3">Stats</h3>
          <div className="space-y-3">
            {/* Size */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Size: {editedFish.stats.size}
              </label>
              <input
                type="range"
                min="20"
                max="200"
                value={editedFish.stats.size}
                onChange={(e) => updateField('stats.size', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Speed */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Speed: {editedFish.stats.speed}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={editedFish.stats.speed}
                onChange={(e) => updateField('stats.speed', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Health */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Health: {editedFish.stats.health}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={editedFish.stats.health}
                onChange={(e) => updateField('stats.health', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Damage */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Damage: {editedFish.stats.damage}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={editedFish.stats.damage}
                onChange={(e) => updateField('stats.damage', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Save Changes (Local)
          </button>
          
          <button
            onClick={handleSaveToGame}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving to Game...' : 'Save to Game (Persistent)'}
          </button>
          
          {saveMessage && (
            <div className={`text-sm text-center p-2 rounded ${
              saveMessage.startsWith('✓') 
                ? 'bg-green-600/20 text-green-400' 
                : 'bg-red-600/20 text-red-400'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Arrows - Bottom Left and Right */}
      <div className="absolute bottom-3 left-3">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${
            hasPrevious
              ? 'bg-blue-600 hover:bg-blue-500'
              : 'bg-gray-700 opacity-50 cursor-not-allowed'
          }`}
        >
          ← Previous
        </button>
      </div>
      <div className="absolute bottom-3 right-3">
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${
            hasNext
              ? 'bg-blue-600 hover:bg-blue-500'
              : 'bg-gray-700 opacity-50 cursor-not-allowed'
          }`}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
