/**
 * Fish Edit Overlay - Edit mode UI for fish properties
 */
'use client';

import { useState, useEffect } from 'react';
import { saveCreatureToLocal } from '@/lib/storage/local-fish-storage';

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

// Type alias for updateField values to improve readability
type FishFieldValue = 
  | string 
  | number 
  | boolean 
  | Array<{ type: string; baseYield: number }> 
  | { canAppearIn: string[]; spawnWeight: number; minDepth?: number; maxDepth?: number };

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
    if (!editedFish) return; // Null check
    
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
        // If blob storage fails, save to localStorage as fallback
        if (result.requiresToken) {
          console.log('[FishEditor] Blob storage not available, using localStorage fallback');
          const creatureData = {
            ...editedFish,
            rarity: editedFish.rarity || 'common',
            playable: editedFish.playable ?? false,
            biomeId: editedFish.biomeId || 'shallow',
            essenceTypes: editedFish.essenceTypes || [{ type: 'shallow', baseYield: 10 }],
            grantedAbilities: [],
            spawnRules: editedFish.spawnRules || {
              canAppearIn: [editedFish.biomeId || 'shallow'],
              spawnWeight: 10,
            },
          };
          saveCreatureToLocal(creatureData);
          setSaveMessage('✓ Saved to local storage (blob storage not configured). Fish will be available in fish selection.');
        } else {
          const errorMsg = result.message || result.error || 'Unknown error';
          setSaveMessage('✗ Failed to save: ' + errorMsg);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      // On any error, try localStorage fallback
      try {
        const creatureData = {
          ...editedFish,
          rarity: editedFish.rarity || 'common',
          playable: editedFish.playable ?? false,
          biomeId: editedFish.biomeId || 'shallow',
          essenceTypes: editedFish.essenceTypes || [{ type: 'shallow', baseYield: 10 }],
          grantedAbilities: [],
          spawnRules: editedFish.spawnRules || {
            canAppearIn: [editedFish.biomeId || 'shallow'],
            spawnWeight: 10,
          },
        };
        saveCreatureToLocal(creatureData);
        setSaveMessage('✓ Saved to local storage. Fish will be available in fish selection.');
      } catch (localError) {
        setSaveMessage('✗ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockForPlayer = async () => {
    if (!editedFish) return; // Null check
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/player/unlock-fish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fishId: editedFish.id }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage('✓ Fish unlocked for player!');
      } else {
        setSaveMessage('✗ Failed to unlock: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Unlock error:', error);
      setSaveMessage('✗ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: FishFieldValue) => {
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
          <label className="block text-sm font-bold text-white mb-2">Essence Types</label>
          <div className="space-y-2 bg-gray-900/50 p-3 rounded border border-gray-700">
            {['shallow', 'deep_sea', 'tropical', 'polluted', 'cosmic', 'demonic', 'robotic'].map((essenceType) => {
              const currentEssence = editedFish.essenceTypes?.find(e => e.type === essenceType);
              const currentValue = currentEssence?.baseYield || 0;
              
              return (
                <div key={essenceType} className="flex items-center gap-2">
                  <label className="text-xs text-gray-300 w-24 capitalize">
                    {essenceType.replace('_', ' ')}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={currentValue}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 0;
                      const currentTypes = editedFish.essenceTypes || [];
                      
                      if (newValue === 0) {
                        // Remove this essence type
                        const filtered = currentTypes.filter(et => et.type !== essenceType);
                        updateField('essenceTypes', filtered);
                      } else {
                        // Update or add this essence type
                        const existing = currentTypes.find(et => et.type === essenceType);
                        if (existing) {
                          const updated = currentTypes.map(et =>
                            et.type === essenceType ? { ...et, baseYield: newValue } : et
                          );
                          updateField('essenceTypes', updated);
                        } else {
                          updateField('essenceTypes', [...currentTypes, { type: essenceType, baseYield: newValue }]);
                        }
                      }
                    }}
                    className="flex-1 bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">Set to 0 to remove an essence type</p>
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
          
          {editedFish.playable && (
            <button
              onClick={handleUnlockForPlayer}
              disabled={isSaving}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Unlocking...' : 'Unlock for Player'}
            </button>
          )}
          
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
