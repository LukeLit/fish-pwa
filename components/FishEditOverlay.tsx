/**
 * Fish Edit Overlay - Edit mode UI for fish properties
 */
'use client';

import { useState, useEffect } from 'react';
import { saveCreatureToLocal } from '@/lib/storage/local-fish-storage';
import ArtSelectorPanel from './ArtSelectorPanel';

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
  | string[]
  | Array<{ type: string; baseYield: number }> 
  | { canAppearIn: string[]; spawnWeight: number; minDepth?: number; maxDepth?: number }
  | { biomeUnlocked: string[]; essenceSpent?: Record<string, number> };

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
  const [showArtSelector, setShowArtSelector] = useState(false);

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

        {/* Sprite Selection */}
        <div>
          <label className="block text-sm font-bold text-white mb-2">Sprite</label>
          <div className="flex gap-2">
            {editedFish.sprite && (
              <div className="w-20 h-20 bg-gray-800 rounded border border-gray-600 flex items-center justify-center overflow-hidden">
                <img 
                  src={editedFish.sprite} 
                  alt="Current sprite"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 flex flex-col gap-2">
              <button
                onClick={() => setShowArtSelector(true)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                {editedFish.sprite ? 'Change Art' : 'Select Existing Art'}
              </button>
              <p className="text-xs text-gray-400">
                {editedFish.sprite ? 'Art selected' : 'No art selected - choose existing or generate new'}
              </p>
            </div>
          </div>
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
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            Starting Stats
            <span className="text-xs font-normal text-gray-400" title="These are the initial stats. They can scale during gameplay based on upgrades and progression.">
              ℹ️
            </span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">Base values that may scale with upgrades and progression</p>
          <div className="space-y-3">
            {/* Size */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Starting Size: {editedFish.stats.size}
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
                Starting Speed: {editedFish.stats.speed}
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
                Starting Health: {editedFish.stats.health}
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
                Starting Damage: {editedFish.stats.damage}
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

        {/* Spawn Rules */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-bold text-white mb-3">Spawn Rules</h3>
          <div className="space-y-3">
            {/* Spawn Weight */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Spawn Weight: {editedFish.spawnRules?.spawnWeight || 50}
                <span className="text-gray-500 ml-1" title="Higher values mean more frequent spawning (1-100)">ℹ️</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={editedFish.spawnRules?.spawnWeight || 50}
                onChange={(e) => {
                  const current = editedFish.spawnRules || { canAppearIn: [editedFish.biomeId || 'shallow'], spawnWeight: 50 };
                  updateField('spawnRules', { ...current, spawnWeight: parseInt(e.target.value) });
                }}
                className="w-full"
              />
            </div>

            {/* Min/Max Depth */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Min Depth (m)</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={editedFish.spawnRules?.minDepth || 0}
                  onChange={(e) => {
                    const current = editedFish.spawnRules || { canAppearIn: [editedFish.biomeId || 'shallow'], spawnWeight: 50 };
                    const value = parseInt(e.target.value) || undefined;
                    updateField('spawnRules', { ...current, minDepth: value });
                  }}
                  className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Max Depth (m)</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={editedFish.spawnRules?.maxDepth || 0}
                  onChange={(e) => {
                    const current = editedFish.spawnRules || { canAppearIn: [editedFish.biomeId || 'shallow'], spawnWeight: 50 };
                    const value = parseInt(e.target.value) || undefined;
                    updateField('spawnRules', { ...current, maxDepth: value });
                  }}
                  className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Can Appear In Biomes */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">Can Appear In Biomes</label>
              <div className="space-y-1">
                {['shallow', 'medium', 'deep', 'abyssal', 'shallow_tropical', 'deep_polluted'].map((biome) => {
                  const current = editedFish.spawnRules || { canAppearIn: [editedFish.biomeId || 'shallow'], spawnWeight: 50 };
                  const isChecked = current.canAppearIn.includes(biome);
                  
                  return (
                    <label key={biome} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const currentBiomes = current.canAppearIn;
                          const newBiomes = e.target.checked
                            ? [...currentBiomes, biome]
                            : currentBiomes.filter(b => b !== biome);
                          updateField('spawnRules', { ...current, canAppearIn: newBiomes });
                        }}
                        className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-300 capitalize">{biome.replace('_', ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Granted Abilities */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            Granted Abilities
            <span className="text-xs font-normal text-gray-400" title="Abilities the player gains when consuming this creature">
              ℹ️
            </span>
          </h3>
          <p className="text-xs text-gray-400 mb-2">Comma-separated ability IDs</p>
          <input
            type="text"
            value={(editedFish.grantedAbilities || []).join(', ')}
            onChange={(e) => {
              const abilities = e.target.value.split(',').map(a => a.trim()).filter(a => a);
              updateField('grantedAbilities', abilities);
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            placeholder="e.g., bioluminescence, shield"
          />
        </div>

        {/* Unlock Requirements */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            Unlock Requirements
            <span className="text-xs font-normal text-gray-400" title="What the player needs to unlock this creature">
              ℹ️
            </span>
          </h3>
          <p className="text-xs text-gray-400 mb-2">Biomes that must be unlocked (comma-separated)</p>
          <input
            type="text"
            value={(editedFish.unlockRequirement?.biomeUnlocked || []).join(', ')}
            onChange={(e) => {
              const biomes = e.target.value.split(',').map(b => b.trim()).filter(b => b);
              const current = editedFish.unlockRequirement || { biomeUnlocked: [] };
              updateField('unlockRequirement', { ...current, biomeUnlocked: biomes });
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            placeholder="e.g., deep, deep_polluted"
          />
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

      {/* Art Selector Modal */}
      {showArtSelector && (
        <ArtSelectorPanel
          type="fish"
          onSelect={(url, filename) => {
            updateField('sprite', url);
            setShowArtSelector(false);
            setSaveMessage('✓ Art selected. Remember to save changes.');
          }}
          onCancel={() => setShowArtSelector(false)}
        />
      )}
    </div>
  );
}
