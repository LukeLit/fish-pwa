/**
 * SpriteLab Modal - Full-screen sprite generation workspace
 * 
 * Generates growth stage sprites (juvenile, adult, elder) using the same
 * high-quality prompts as the batch generation script. Saves work locally
 * using IndexedDB until explicitly uploaded to blob storage.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { composeFishPrompt } from '@/lib/ai/prompt-builder';
import { Z_LAYERS } from '@/lib/ui/z-layers';
import {
  saveEntry,
  getEntry,
  deleteEntry,
  dataUrlToBlob,
  blobToDataUrl,
  isIndexedDBAvailable,
  type SpriteLabEntry,
} from '@/lib/storage/sprite-lab-db';
import type { FishData } from './FishEditOverlay';
import type { GrowthStage, GrowthSprites, SpriteResolutions } from '@/lib/game/types';

interface SpriteGenerationLabProps {
  fish: FishData;
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (updatedFish: FishData) => void;
}

type ModelOption = 'google/imagen-4.0-fast-generate-001' | 'google/imagen-4.0-generate-001' | 'bfl/flux-2-pro';

const MODEL_OPTIONS: { value: ModelOption; label: string; description: string }[] = [
  { value: 'google/imagen-4.0-fast-generate-001', label: 'Imagen Fast', description: 'Fast iteration (~5s)' },
  { value: 'google/imagen-4.0-generate-001', label: 'Imagen Standard', description: 'Higher quality (~15s)' },
  { value: 'bfl/flux-2-pro', label: 'Flux 2 Pro', description: 'Alternative style (~10s)' },
];

const STAGE_LABELS: Record<GrowthStage, string> = {
  juvenile: 'Juvenile',
  adult: 'Adult',
  elder: 'Elder',
};

const STAGE_DESCRIPTIONS: Record<GrowthStage, string> = {
  juvenile: 'Young, smaller, rounder proportions, cuter features',
  adult: 'Standard mature appearance',
  elder: 'Large, weathered, battle-scarred, ancient',
};

const STAGE_MODIFIERS: Record<GrowthStage, string> = {
  juvenile: 'young juvenile version, smaller, rounder proportions, cuter features, bigger eyes relative to body',
  adult: '', // No modifier for adult
  elder: 'mature elder version, larger, more weathered, battle-scarred, ancient experienced appearance',
};

// Default size ranges for growth stages
const DEFAULT_SIZE_RANGES: Record<GrowthStage, { min: number; max: number }> = {
  juvenile: { min: 0, max: 30 },
  adult: { min: 30, max: 70 },
  elder: { min: 70, max: 150 },
};

export default function SpriteGenerationLab({
  fish,
  isOpen,
  onClose,
  onUploadComplete,
}: SpriteGenerationLabProps) {
  // Sprite state - data URLs for display
  const [sprites, setSprites] = useState<Record<GrowthStage, string | undefined>>({
    juvenile: undefined,
    adult: undefined,
    elder: undefined,
  });
  
  // Track sprite sources for visual indicator
  const [spriteSources, setSpriteSources] = useState<Record<GrowthStage, 'local' | 'blob' | null>>({
    juvenile: null,
    adult: null,
    elder: null,
  });
  
  // UI state
  const [selectedModel, setSelectedModel] = useState<ModelOption>('google/imagen-4.0-fast-generate-001');
  const [generatingStage, setGeneratingStage] = useState<GrowthStage | 'all' | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [promptPreview, setPromptPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  
  // Editable prompt data
  const [descriptionChunks, setDescriptionChunks] = useState<string[]>(fish.descriptionChunks || []);
  const [visualMotif, setVisualMotif] = useState<string>(fish.visualMotif || '');
  const [newChunk, setNewChunk] = useState('');
  
  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Build essence record from FishData
  const getEssenceRecord = useCallback((): Record<string, number> => {
    const essenceRecord: Record<string, number> = {};
    if (fish.essence?.primary) {
      essenceRecord[fish.essence.primary.type] = fish.essence.primary.baseYield;
    }
    fish.essence?.secondary?.forEach(sec => {
      essenceRecord[sec.type] = sec.baseYield;
    });
    // Fallback to legacy essenceTypes
    if (Object.keys(essenceRecord).length === 0 && fish.essenceTypes) {
      fish.essenceTypes.forEach(et => {
        essenceRecord[et.type] = et.baseYield;
      });
    }
    return essenceRecord;
  }, [fish.essence, fish.essenceTypes]);
  
  // Derive sizeTier - prefer explicit value, fall back to type-based derivation
  const derivedSizeTier = fish.sizeTier || (fish.type === 'predator' ? 'predator' : fish.type === 'prey' ? 'prey' : 'mid');
  
  // Build prompt for a specific stage
  const buildPromptForStage = useCallback((stage: GrowthStage): string => {
    const { prompt: basePrompt } = composeFishPrompt({
      id: fish.id,
      name: fish.name,
      biomeId: fish.biomeId,
      rarity: fish.rarity,
      sizeTier: derivedSizeTier,
      essence: getEssenceRecord(),
      descriptionChunks: descriptionChunks.length > 0 ? descriptionChunks : fish.descriptionChunks,
      visualMotif: visualMotif || fish.visualMotif,
      grantedAbilities: fish.grantedAbilities || [],
    });
    
    // Add stage modifier if not adult
    if (stage === 'adult') {
      return basePrompt;
    }
    
    return `${STAGE_MODIFIERS[stage]}, ${basePrompt}`;
  }, [fish, descriptionChunks, visualMotif, getEssenceRecord]);
  
  // Update prompt preview when inputs change
  useEffect(() => {
    setPromptPreview(buildPromptForStage('adult'));
  }, [buildPromptForStage]);
  
  // Load existing sprites on mount (local + blob fallback)
  useEffect(() => {
    if (!isOpen) return;
    
    const loadSprites = async () => {
      setIsLoadingExisting(true);
      
      const loadedSprites: Record<GrowthStage, string | undefined> = {
        juvenile: undefined,
        adult: undefined,
        elder: undefined,
      };
      const loadedSources: Record<GrowthStage, 'local' | 'blob' | null> = {
        juvenile: null,
        adult: null,
        elder: null,
      };
      
      try {
        // 1. First, try to load from IndexedDB (local work-in-progress has priority)
        if (isIndexedDBAvailable()) {
          const entry = await getEntry(fish.id);
          if (entry) {
            for (const stage of ['juvenile', 'adult', 'elder'] as GrowthStage[]) {
              const blob = entry.sprites[stage];
              if (blob) {
                loadedSprites[stage] = await blobToDataUrl(blob);
                loadedSources[stage] = 'local';
              }
            }
            
            setLastSaved(entry.updatedAt);
            
            // Restore prompt data if available
            if (entry.promptData.descriptionChunks.length > 0) {
              setDescriptionChunks(entry.promptData.descriptionChunks);
            }
            if (entry.promptData.visualMotif) {
              setVisualMotif(entry.promptData.visualMotif);
            }
            
            console.log('[SpriteLab] Loaded local sprites for', fish.id);
          }
        }
        
        // 2. Fill in missing stages from existing blob storage URLs
        if (fish.growthSprites) {
          for (const stage of ['juvenile', 'adult', 'elder'] as GrowthStage[]) {
            // Only load from blob if we don't already have a local sprite
            if (!loadedSprites[stage] && fish.growthSprites[stage]?.sprite) {
              try {
                const response = await fetch(fish.growthSprites[stage]!.sprite);
                if (response.ok) {
                  const blob = await response.blob();
                  loadedSprites[stage] = await blobToDataUrl(blob);
                  loadedSources[stage] = 'blob';
                  console.log(`[SpriteLab] Loaded ${stage} from blob storage`);
                }
              } catch (err) {
                console.error(`[SpriteLab] Failed to load ${stage} from blob:`, err);
              }
            }
          }
        }
        
        setSprites(loadedSprites);
        setSpriteSources(loadedSources);
      } catch (err) {
        console.error('[SpriteLab] Failed to load sprites:', err);
      } finally {
        setIsLoadingExisting(false);
      }
    };
    
    loadSprites();
  }, [isOpen, fish.id, fish.growthSprites]);
  
  // Auto-save to IndexedDB (debounced)
  useEffect(() => {
    if (!isIndexedDBAvailable()) return;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Only save if we have at least one sprite
    const hasSprites = sprites.juvenile || sprites.adult || sprites.elder;
    if (!hasSprites) return;
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const blobSprites: Record<string, Blob | undefined> = {};
        
        for (const [stage, dataUrl] of Object.entries(sprites)) {
          if (dataUrl) {
            blobSprites[stage] = await dataUrlToBlob(dataUrl);
          }
        }
        
        await saveEntry({
          id: fish.id,
          name: fish.name,
          updatedAt: Date.now(),
          sprites: blobSprites as SpriteLabEntry['sprites'],
          promptData: {
            descriptionChunks: descriptionChunks,
            visualMotif: visualMotif,
            biomeId: fish.biomeId || 'shallow',
            rarity: fish.rarity || 'common',
            sizeTier: derivedSizeTier,
            essence: getEssenceRecord(),
            grantedAbilities: fish.grantedAbilities || [],
          },
        });
        
        setLastSaved(Date.now());
      } catch (err) {
        console.error('[SpriteLab] Auto-save failed:', err);
      }
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sprites, fish.id, fish.name, fish.biomeId, fish.rarity, fish.type, fish.grantedAbilities, descriptionChunks, visualMotif, getEssenceRecord]);
  
  // Generate sprite for a single stage
  const generateSprite = async (stage: GrowthStage) => {
    setGeneratingStage(stage);
    setGenerationStatus(`Generating ${STAGE_LABELS[stage]} sprite...`);
    setError('');
    
    try {
      const prompt = buildPromptForStage(stage);
      
      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          aspectRatio: '1:1',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed');
      }
      
      const data = await response.json();
      
      if (!data.imageBase64) {
        throw new Error('No image in response');
      }
      
      const dataUrl = `data:image/png;base64,${data.imageBase64}`;
      
      setSprites(prev => ({
        ...prev,
        [stage]: dataUrl,
      }));
      setSpriteSources(prev => ({
        ...prev,
        [stage]: 'local',
      }));
      
      setGenerationStatus(`${STAGE_LABELS[stage]} sprite generated!`);
    } catch (err: any) {
      console.error('[SpriteLab] Generation failed:', err);
      setError(err.message || 'Generation failed');
      setGenerationStatus('');
    } finally {
      setGeneratingStage(null);
    }
  };
  
  // Generate all sprites sequentially
  const generateAllSprites = async () => {
    setGeneratingStage('all');
    
    for (const stage of ['juvenile', 'adult', 'elder'] as GrowthStage[]) {
      setGenerationStatus(`Generating ${STAGE_LABELS[stage]} sprite (${['juvenile', 'adult', 'elder'].indexOf(stage) + 1}/3)...`);
      
      try {
        const prompt = buildPromptForStage(stage);
        
        const response = await fetch('/api/generate-fish-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: selectedModel,
            aspectRatio: '1:1',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to generate ${stage}`);
        }
        
        const data = await response.json();
        
        if (data.imageBase64) {
          const dataUrl = `data:image/png;base64,${data.imageBase64}`;
          setSprites(prev => ({
            ...prev,
            [stage]: dataUrl,
          }));
          setSpriteSources(prev => ({
            ...prev,
            [stage]: 'local',
          }));
        }
      } catch (err: any) {
        console.error(`[SpriteLab] Failed to generate ${stage}:`, err);
        setError(`Failed to generate ${stage}: ${err.message}`);
        break;
      }
    }
    
    setGeneratingStage(null);
    setGenerationStatus('All sprites generated!');
  };
  
  // Upload all sprites to blob storage
  const handleUploadToLibrary = async () => {
    setUploading(true);
    setUploadStatus('Uploading sprites...');
    setError('');
    
    try {
      const growthSprites: GrowthSprites = {};
      const stages = ['juvenile', 'adult', 'elder'] as const;
      let uploadedCount = 0;
      
      for (const stage of stages) {
        const dataUrl = sprites[stage];
        if (!dataUrl) continue;
        
        setUploadStatus(`Uploading ${STAGE_LABELS[stage]} (${uploadedCount + 1}/3)...`);
        
        // Convert data URL to blob
        const blob = await dataUrlToBlob(dataUrl);
        
        // Create form data
        const formData = new FormData();
        formData.append('creatureId', fish.id);
        formData.append('stage', stage);
        formData.append('sprite', blob, `${fish.id}_${stage}.png`);
        
        const response = await fetch('/api/upload-growth-sprite', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to upload ${stage}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.spriteUrl) {
          growthSprites[stage] = {
            sprite: result.spriteUrl,
            spriteResolutions: result.spriteResolutions as SpriteResolutions,
            sizeRange: DEFAULT_SIZE_RANGES[stage],
          };
          uploadedCount++;
        }
      }
      
      if (uploadedCount === 0) {
        throw new Error('No sprites to upload');
      }
      
      // Clear local storage after successful upload
      await deleteEntry(fish.id);
      setLastSaved(null);
      
      setUploadStatus(`Upload complete! ${uploadedCount} sprites uploaded.`);
      
      // Notify parent with updated fish data
      if (onUploadComplete) {
        onUploadComplete({
          ...fish,
          growthSprites,
        });
      }
    } catch (err: any) {
      console.error('[SpriteLab] Upload failed:', err);
      setError(err.message || 'Upload failed');
      setUploadStatus('');
    } finally {
      setUploading(false);
    }
  };
  
  // Add a description chunk
  const addChunk = () => {
    if (newChunk.trim()) {
      setDescriptionChunks(prev => [...prev, newChunk.trim()]);
      setNewChunk('');
    }
  };
  
  // Remove a description chunk
  const removeChunk = (index: number) => {
    setDescriptionChunks(prev => prev.filter((_, i) => i !== index));
  };
  
  // Clear local data
  const clearLocalData = async () => {
    try {
      await deleteEntry(fish.id);
      setSprites({ juvenile: undefined, adult: undefined, elder: undefined });
      setSpriteSources({ juvenile: null, adult: null, elder: null });
      setLastSaved(null);
      setGenerationStatus('Local data cleared');
    } catch (err) {
      console.error('[SpriteLab] Failed to clear local data:', err);
    }
  };
  
  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };
  
  if (!isOpen) return null;
  
  const hasAnySprite = sprites.juvenile || sprites.adult || sprites.elder;
  const isGenerating = generatingStage !== null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center"
      style={{ zIndex: Z_LAYERS.MODAL }}
    >
      <div className="w-full h-full max-w-6xl max-h-[95vh] bg-gray-900 rounded-xl overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SpriteLab: {fish.name}</h2>
              <p className="text-sm text-gray-400">Generate growth stage sprites with high-quality prompts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error display */}
          {error && (
            <div className="bg-red-600/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Loading existing sprites */}
          {isLoadingExisting && (
            <div className="text-center text-gray-400 text-sm py-4 flex items-center justify-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
              Loading existing sprites...
            </div>
          )}
          
          {/* Growth Stage Sprites - 3 column layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['juvenile', 'adult', 'elder'] as GrowthStage[]).map((stage) => (
              <div key={stage} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="text-center mb-3">
                  <h3 className="text-base font-bold text-white">{STAGE_LABELS[stage]}</h3>
                  <p className="text-xs text-gray-400">{STAGE_DESCRIPTIONS[stage]}</p>
                </div>
                
                {/* Sprite Preview */}
                <div className="aspect-square bg-[#FF00FF] rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                  {sprites[stage] ? (
                    <>
                      <img
                        src={sprites[stage]}
                        alt={`${fish.name} ${stage}`}
                        className="w-full h-full object-contain"
                      />
                      {/* Source badge */}
                      {spriteSources[stage] && (
                        <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          spriteSources[stage] === 'local' 
                            ? 'bg-yellow-600/90 text-yellow-100' 
                            : 'bg-green-600/90 text-green-100'
                        }`}>
                          {spriteSources[stage] === 'local' ? 'Local' : 'Uploaded'}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-800/50 text-sm">No sprite</div>
                  )}
                </div>
                
                {/* Generate Button */}
                <button
                  onClick={() => generateSprite(stage)}
                  disabled={isGenerating}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    generatingStage === stage
                      ? 'bg-blue-600/50 text-blue-300 cursor-wait'
                      : sprites[stage]
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {generatingStage === stage ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : sprites[stage] ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Regenerate
                    </>
                  ) : (
                    <>+ Generate</>
                  )}
                </button>
              </div>
            ))}
          </div>
          
          {/* Generate All Button */}
          <div className="flex justify-center">
            <button
              onClick={generateAllSprites}
              disabled={isGenerating}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingStage === 'all' ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  {generationStatus}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                  Generate All Stages
                </>
              )}
            </button>
          </div>
          
          {/* Status messages */}
          {generationStatus && !generatingStage && (
            <div className="text-center text-sm text-green-400">{generationStatus}</div>
          )}
          
          {/* Prompt Preview */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-white mb-2">Prompt Preview (Adult)</h3>
            <div className="bg-gray-900 rounded p-3 text-xs text-gray-300 font-mono max-h-32 overflow-y-auto">
              {promptPreview || 'Loading...'}
            </div>
          </div>
          
          {/* Editable Prompt Data */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
            <h3 className="text-sm font-bold text-white">Customize Prompt Data</h3>
            
            {/* Description Chunks */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Description Chunks</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {descriptionChunks.map((chunk, i) => (
                  <span
                    key={i}
                    className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs flex items-center gap-1"
                  >
                    {chunk}
                    <button
                      onClick={() => removeChunk(i)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChunk}
                  onChange={(e) => setNewChunk(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChunk()}
                  placeholder="Add a description chunk..."
                  className="flex-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-600 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={addChunk}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>
            
            {/* Visual Motif */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Visual Motif</label>
              <input
                type="text"
                value={visualMotif}
                onChange={(e) => setVisualMotif(e.target.value)}
                placeholder="e.g., fierce predatory fish with glowing features"
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-600 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          
          {/* Model Selection */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-sm font-bold text-white mb-2">Generation Model</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedModel(option.value)}
                  className={`px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedModel === option.value
                      ? 'bg-blue-600/20 border-2 border-blue-500 text-white'
                      : 'bg-gray-700 border-2 border-transparent text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            {/* Status */}
            <div className="text-sm text-gray-400">
              {lastSaved ? (
                <>Saved locally {formatTimeAgo(lastSaved)}</>
              ) : (
                <>No local data</>
              )}
              {hasAnySprite && (
                <button
                  onClick={clearLocalData}
                  className="ml-3 text-red-400 hover:text-red-300 text-xs underline"
                >
                  Clear local
                </button>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              {uploadStatus && (
                <span className="text-sm text-blue-400">{uploadStatus}</span>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleUploadToLibrary}
                disabled={!hasAnySprite || uploading || isGenerating}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Upload to Library
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
