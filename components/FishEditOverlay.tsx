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

  useEffect(() => {
    if (fish) {
      setEditedFish({ ...fish });
    }
  }, [fish]);

  if (!fish || !editedFish) return null;

  const handleSave = () => {
    onSave(editedFish);
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

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Save Changes
        </button>
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
