/**
 * Biome Background Manager - Save backgrounds associated with biomes
 */
'use client';

import { useState } from 'react';

interface BiomeBackgroundManagerProps {
  currentBackground: string | null;
}

export default function BiomeBackgroundManager({ currentBackground }: BiomeBackgroundManagerProps) {
  const [selectedBiome, setSelectedBiome] = useState<string>('shallow');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  const biomes = [
    { id: 'shallow', name: 'Shallow' },
    { id: 'medium', name: 'Medium' },
    { id: 'deep', name: 'Deep' },
    { id: 'abyssal', name: 'Abyssal' },
    { id: 'shallow_tropical', name: 'Shallow Tropical' },
    { id: 'deep_polluted', name: 'Deep Polluted' },
  ];

  const handleSaveBiomeBackground = async () => {
    if (!currentBackground) {
      setMessage('❌ No background loaded to save');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      // Save the background image
      const filename = `biome_${selectedBiome}_bg.png`;
      const saveResponse = await fetch('/api/save-sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentBackground,
          filename,
          type: 'background',
        }),
      });

      const saveData = await saveResponse.json();
      
      if (!saveData.success) {
        setMessage(`❌ Failed to save: ${saveData.error}`);
        setIsSaving(false);
        return;
      }

      // Create or update biome metadata
      const biomeMetadata = {
        id: selectedBiome,
        backgroundAssets: {
          backgroundImage: saveData.localPath,
        },
      };

      // Save biome metadata
      const metadataResponse = await fetch('/api/save-game-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `biomes/${selectedBiome}`,
          data: biomeMetadata,
        }),
      });

      const metadataData = await metadataResponse.json();

      if (metadataData.success) {
        setMessage(`✅ Background saved for ${biomes.find(b => b.id === selectedBiome)?.name} biome`);
      } else {
        setMessage(`⚠️ Image saved but metadata failed: ${metadataData.error}`);
      }
    } catch (error) {
      console.error('Save biome background error:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Save Current Background to Biome
        </label>
        <div className="flex gap-2">
          <select
            value={selectedBiome}
            onChange={(e) => setSelectedBiome(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            {biomes.map((biome) => (
              <option key={biome.id} value={biome.id}>
                {biome.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveBiomeBackground}
            disabled={isSaving || !currentBackground}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save to Biome'}
          </button>
        </div>
        {message && (
          <div className={`mt-2 text-sm p-2 rounded ${
            message.startsWith('✅') 
              ? 'bg-green-600/20 text-green-400' 
              : 'bg-red-600/20 text-red-400'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
