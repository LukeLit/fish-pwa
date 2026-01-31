/**
 * Fish Edit Overlay - Edit mode UI for fish properties
 */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { composeFishPrompt } from '@/lib/ai/prompt-builder';
import type { CreatureClips, ClipAction } from '@/lib/game/types';
import { generateCreatureClip, type ClipGenerationProgress } from '@/lib/video/clip-generator';
import { Z_LAYERS } from '@/lib/ui/z-layers';

/**
 * Minimum time between clip generation requests (ms)
 * Prevents accidental double-clicks from firing multiple expensive API calls
 */
const CLIP_GENERATION_DEBOUNCE_MS = 3000;

export interface EssenceData {
  primary: {
    type: string;
    baseYield: number;
    visualChunks?: string[];
  };
  secondary?: Array<{
    type: string;
    baseYield: number;
    visualChunks?: string[];
  }>;
}

export interface MutationMetadata {
  sourceCreatureId: string;
  mutationType: string;
  mutationLevel: number;
  mutationTrigger?: string;
}

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
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  playable?: boolean;
  biomeId?: string;

  // NEW: Modular Prompt System
  descriptionChunks?: string[];
  visualMotif?: string;

  // NEW: Enhanced Essence System
  essence?: EssenceData;

  // Legacy essence (maintained for backward compatibility)
  essenceTypes?: Array<{
    type: string;
    baseYield: number;
  }>;

  // NEW: Fusion/Mutation Metadata
  fusionParentIds?: string[];
  fusionType?: 'balanced' | 'dominant_first' | 'dominant_second';
  fusionGeneration?: number;
  mutationSource?: MutationMetadata;

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
  // Video animation clips
  clips?: CreatureClips;
}

// Type alias for updateField values to improve readability
// Includes undefined to allow clearing optional fields like fusion metadata
type FishFieldValue =
  | string
  | number
  | boolean
  | string[]
  | Array<{ type: string; baseYield: number }>
  | EssenceData
  | MutationMetadata
  | { canAppearIn: string[]; spawnWeight: number; minDepth?: number; maxDepth?: number }
  | { biomeUnlocked: string[]; essenceSpent?: Record<string, number> }
  | undefined;

interface FishEditOverlayProps {
  fish: FishData | null;
  onSave: (fish: FishData) => void;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onOpenArtSelector?: (callback: (url: string, filename: string) => void) => void;
  /** When true, removes absolute positioning for embedding in another container */
  embedded?: boolean;
}

export default function FishEditOverlay({
  fish,
  onSave,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onOpenArtSelector,
  embedded = false,
}: FishEditOverlayProps) {
  const [editedFish, setEditedFish] = useState<FishData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<'google/imagen-4.0-fast-generate-001' | 'google/imagen-4.0-generate-001' | 'bfl/flux-2-pro'>('google/imagen-4.0-fast-generate-001');
  const [showFusionSection, setShowFusionSection] = useState(false);
  const [showMutationSection, setShowMutationSection] = useState(false);
  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const [isGeneratingClip, setIsGeneratingClip] = useState(false);
  const [clipGenerationStatus, setClipGenerationStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'animation'>('details');
  const [useDirectMode, setUseDirectMode] = useState(false);
  const [previewClip, setPreviewClip] = useState<{ action: ClipAction; mode: 'video' | 'frames' } | null>(null);

  // Debounce ref to prevent rapid-fire clip generation requests
  const lastClipGenerationTime = useRef<number>(0);

  // Helper to generate fallback description chunks when missing
  // This ensures the "Regenerate Sprite" produces quality similar to batch generation
  const getFallbackDescriptionChunks = (fish: FishData): string[] => {
    // If we already have description chunks, use them
    if (fish.descriptionChunks && fish.descriptionChunks.length > 0) {
      return fish.descriptionChunks;
    }
    // Generate fallback from description field or name/type
    const chunks: string[] = [];
    if (fish.description && fish.description.trim()) {
      // Split description into chunk-like phrases
      chunks.push(...fish.description.split(/[,;.]/).map(s => s.trim()).filter(s => s.length > 3));
    }
    // Add type-based fallbacks
    if (fish.type === 'prey') {
      chunks.push('small fish', 'vibrant coloring', 'schooling behavior');
    } else if (fish.type === 'predator') {
      chunks.push('fierce predatory fish', 'sharp teeth', 'powerful body');
    } else if (fish.type === 'mutant') {
      chunks.push('mutated fish', 'strange features', 'glowing elements');
    }
    // Add name-based hint
    if (fish.name) {
      chunks.push(`${fish.name.toLowerCase()} fish`);
    }
    return chunks;
  };

  const getFallbackVisualMotif = (fish: FishData): string => {
    if (fish.visualMotif && fish.visualMotif.trim()) {
      return fish.visualMotif;
    }
    // Generate based on type and biome
    const typeMotifs: Record<string, string> = {
      prey: 'swift schooling fish',
      predator: 'fearsome aquatic hunter',
      mutant: 'bizarre mutated creature',
    };
    const biomeHint = fish.biomeId ? ` of the ${fish.biomeId.replace(/_/g, ' ')}` : '';
    return `${typeMotifs[fish.type] || 'unique fish'}${biomeHint}`;
  };

  // Compute composed prompt at top level (Rules of Hooks)
  const composedPrompt = useMemo(() => {
    if (!editedFish) return '';
    try {
      const { prompt } = composeFishPrompt({
        id: editedFish.id,
        name: editedFish.name,
        biomeId: editedFish.biomeId,
        rarity: editedFish.rarity,
        essence: editedFish.essence?.primary ? {
          [editedFish.essence.primary.type]: editedFish.essence.primary.baseYield,
          ...(editedFish.essence.secondary?.reduce((acc, sec) => {
            acc[sec.type] = sec.baseYield;
            return acc;
          }, {} as Record<string, number>) || {}),
        } : undefined,
        descriptionChunks: getFallbackDescriptionChunks(editedFish),
        visualMotif: getFallbackVisualMotif(editedFish),
        grantedAbilities: editedFish.grantedAbilities,
      });
      return prompt;
    } catch (err) {
      console.error('Error composing prompt:', err);
      return '';
    }
  }, [
    editedFish?.id,
    editedFish?.name,
    editedFish?.biomeId,
    editedFish?.rarity,
    editedFish?.essence,
    editedFish?.descriptionChunks,
    editedFish?.visualMotif,
    editedFish?.grantedAbilities,
  ]);

  useEffect(() => {
    if (fish) {
      // Only initialize editedFish if it's null or if the fish ID changed
      // This prevents overwriting local edits when parent re-renders
      // IMPORTANT: Don't reset if we're currently saving (isSaving) to prevent race conditions
      if ((!editedFish || editedFish.id !== fish.id) && !isSaving) {
        console.log('[FishEditOverlay] Initializing editedFish from fish prop:', {
          id: fish.id,
          name: fish.name,
          hasDescriptionChunks: !!fish.descriptionChunks?.length,
          descriptionChunks: fish.descriptionChunks,
          hasVisualMotif: !!fish.visualMotif,
          visualMotif: fish.visualMotif,
        });
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
    }
  }, [fish?.id, isSaving]); // Only depend on fish.id and isSaving

  useEffect(() => {
    // Set default prompt based on fish type
    if (editedFish) {
      const typePrompts: Record<string, string> = {
        prey: `A small, swift fish with greenish scales and streamlined body, isolated on solid bright magenta background (#FF00FF), no other background elements, game sprite, side view right-facing, detailed scales and fins`,
        predator: `A large, aggressive fish with sharp teeth, reddish tones, and menacing appearance, isolated on solid bright magenta background (#FF00FF), no other background elements, game sprite, side view right-facing, detailed scales and fins`,
        mutant: `A bizarre mutant fish with twisted fins, glowing eyes, and surreal features, isolated on solid bright magenta background (#FF00FF), no other background elements, game sprite, side view right-facing, detailed scales and fins`,
      };
      setGenerationPrompt(typePrompts[editedFish.type] || typePrompts.prey);
    }
  }, [editedFish?.type]);

  // Listen for action bar events from PauseMenu (when embedded)
  useEffect(() => {
    if (!embedded) return;

    const handleActionEvent = (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      const action = event.detail?.action;

      switch (action) {
        case 'upload':
          // Trigger file upload
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (ev) => {
            const file = (ev.target as HTMLInputElement).files?.[0];
            if (file && editedFish) {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const spriteUrl = readerEvent.target?.result as string;
                const updatedFish = { ...editedFish, sprite: spriteUrl };
                setEditedFish(updatedFish);
                onSave(updatedFish);
                setSaveMessage('✓ Image uploaded. Click Save to persist.');
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
          break;

        case 'regenerate':
          // Trigger regeneration - dispatch another event that we handle below
          handleRegenerateSprite();
          break;

        case 'flip':
          handleFlipSprite();
          break;

        case 'save':
          handleSaveToGame();
          break;

        case 'delete':
          handleDeleteCreature();
          break;
      }
    };

    window.addEventListener('fishEditAction', handleActionEvent);
    return () => window.removeEventListener('fishEditAction', handleActionEvent);
  }, [embedded, editedFish]);

  if (!fish || !editedFish) return null;

  const handleSaveToGame = async () => {
    if (!editedFish) return;

    setIsSaving(true);
    setSaveMessage('');

    // Track if sprite was regenerated (data URL) - we'll need to refresh cache
    const spriteWasRegenerated = editedFish.sprite?.startsWith('data:') || false;

    try {
      // Always convert sprite to blob for upload (whether data URL or blob URL)
      let spriteBlob: Blob | null = null;

      if (!editedFish.sprite) {
        throw new Error('No sprite to save');
      }

      if (editedFish.sprite.startsWith('data:')) {
        // Data URL - convert to blob
        const response = await fetch(editedFish.sprite);
        if (!response.ok) {
          throw new Error('Failed to convert data URL to blob');
        }
        spriteBlob = await response.blob();
      } else {
        // Blob URL - fetch it to get the blob (remove cache buster if present)
        const cleanUrl = editedFish.sprite.split('?')[0];
        try {
          const response = await fetch(cleanUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch sprite: ${response.statusText}`);
          }
          spriteBlob = await response.blob();
        } catch (err: any) {
          throw new Error(`Failed to fetch sprite blob: ${err.message}`);
        }
      }

      if (!spriteBlob) {
        throw new Error('Failed to get sprite blob');
      }

      // Prepare metadata - sprite will be set by server after upload
      // Strip any cache busters from the sprite URL before saving
      const cleanSpriteUrl = editedFish.sprite ? editedFish.sprite.split('?')[0] : '';
      const metadata = {
        ...editedFish,
        sprite: '', // Server will fill this in with the uploaded blob URL
      };

      // Create FormData
      const formData = new FormData();
      formData.append('creatureId', editedFish.id);
      formData.append('metadata', JSON.stringify(metadata));
      formData.append('sprite', spriteBlob, `${editedFish.id}.png`);

      const response = await fetch('/api/save-creature', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Save failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Verify we got a sprite URL back
        if (!result.spriteUrl) {
          console.error('[FishEditOverlay] WARNING: Save succeeded but no spriteUrl returned!');
          console.error('[FishEditOverlay] Result:', JSON.stringify(result, null, 2));
          setSaveMessage('⚠️ Saved but no sprite URL returned. Check console.');
        }

        // Get the sprite URL from result (blob storage URL)
        const spriteUrl = result.spriteUrl;
        if (!spriteUrl) {
          throw new Error('Server did not return sprite URL');
        }

        // Store the clean blob URL (no cache buster) in state
        // Cache busters should only be added when rendering/displaying, not when storing
        const cleanSpriteUrl = spriteUrl.split('?')[0];

        // Update local state with the clean blob URL
        const savedFish: FishData = {
          ...editedFish,
          sprite: cleanSpriteUrl,
        };

        setEditedFish(savedFish);

        // Update parent state so preview refreshes with new blob URL
        onSave(savedFish);

        // Dispatch event to update canvas preview immediately if this is the player fish
        const isPlayerFish = editedFish.id === 'player';
        if (isPlayerFish && savedFish.sprite) {
          const event = new CustomEvent('setPlayerFish', { detail: { fish: savedFish } });
          window.dispatchEvent(event);
        }

        // Only refresh textures if sprite was actually regenerated (was a data URL)
        // This avoids unnecessary cache clearing for metadata-only saves
        if (spriteWasRegenerated) {
          setSaveMessage(`✓ Saved successfully! Refreshing textures...`);

          // Dispatch refresh event to reload sprites from server with new blob URLs
          // Small delay to ensure blob storage has propagated
          setTimeout(() => {
            console.log('[FishEditOverlay] Sprite was regenerated - refreshing cache');
            window.dispatchEvent(new CustomEvent('refreshFishSprites'));
            setSaveMessage(`✓ Saved and refreshed!`);
          }, 500);
        } else {
          setSaveMessage(`✓ Saved successfully!`);
          console.log('[FishEditOverlay] Metadata-only save - no cache refresh needed');
        }

        // Verify the save by fetching the creature back
        setTimeout(async () => {
          try {
            const verifyResponse = await fetch(`/api/test-creature-save?id=${editedFish.id}`);
            const verifyResult = await verifyResponse.json();
            if (verifyResult.metadataSprite !== spriteUrl) {
              console.error('[FishEditOverlay] MISMATCH! Metadata sprite:', verifyResult.metadataSprite, 'Expected:', spriteUrl);
              setSaveMessage(`⚠️ Saved but verification failed. Check console.`);
            }
          } catch (err) {
            console.error('[FishEditOverlay] Verification error:', err);
          }
        }, 1500);
      } else {
        setSaveMessage(`❌ Save failed: ${result.error || 'Unknown error'}`);
        console.error('[FishEditOverlay] Save failed:', result);
      }
    } catch (error: any) {
      console.error('[FishEditor] Save error:', error);
      setSaveMessage(`❌ Error: ${error.message || 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for regenerating sprite via action bar
  const handleRegenerateSprite = async () => {
    if (!editedFish) return;
    setIsGenerating(true);
    setSaveMessage('🎨 Regenerating sprite...');
    try {
      const usedDescriptionChunks = getFallbackDescriptionChunks(editedFish);
      const usedVisualMotif = getFallbackVisualMotif(editedFish);

      const { prompt } = composeFishPrompt({
        id: editedFish.id,
        name: editedFish.name,
        biomeId: editedFish.biomeId,
        rarity: editedFish.rarity,
        essence: editedFish.essence?.primary ? {
          [editedFish.essence.primary.type]: editedFish.essence.primary.baseYield,
          ...(editedFish.essence.secondary?.reduce((acc, sec) => {
            acc[sec.type] = sec.baseYield;
            return acc;
          }, {} as Record<string, number>) || {}),
        } : undefined,
        descriptionChunks: usedDescriptionChunks,
        visualMotif: usedVisualMotif,
        grantedAbilities: editedFish.grantedAbilities,
      });

      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel }),
      });

      const result = await response.json();
      if (result.success && result.imageBase64) {
        const dataUrl = `data:image/png;base64,${result.imageBase64}`;
        const updatedFish: FishData = { ...editedFish, sprite: dataUrl };
        setEditedFish(updatedFish);
        onSave(updatedFish);
        setSaveMessage('✓ Sprite regenerated! Click Save to persist.');
      } else {
        setSaveMessage(`❌ Generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setSaveMessage(`❌ Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler for flipping sprite via action bar
  const handleFlipSprite = async () => {
    if (!editedFish?.sprite) return;
    setIsSaving(true);
    setSaveMessage('Flipping sprite...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        const cleanUrl = editedFish.sprite!.split('?')[0];
        img.src = editedFish.sprite!.startsWith('data:') ? editedFish.sprite! : `${cleanUrl}?flip=${Date.now()}`;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);

      const flippedDataUrl = canvas.toDataURL('image/png');
      const updatedFish = { ...editedFish, sprite: flippedDataUrl };
      setEditedFish(updatedFish);
      onSave(updatedFish);
      setSaveMessage('✓ Sprite flipped! Click Save to persist.');
    } catch (err: any) {
      setSaveMessage(`❌ Error: ${err.message || 'Failed to flip sprite'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for deleting creature via action bar
  const handleDeleteCreature = async () => {
    if (!editedFish) return;
    if (!window.confirm(`Delete ${editedFish.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/delete-creature?id=${encodeURIComponent(editedFish.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('✓ Creature deleted.');
        onBack();
      } else {
        setSaveMessage('❌ Delete failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setSaveMessage('❌ Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

  const handleGenerateFish = async () => {
    if (!generationPrompt.trim()) {
      setSaveMessage('❌ Please enter a generation prompt');
      return;
    }

    setIsGenerating(true);
    setSaveMessage('🎨 Generating fish sprite...');

    try {
      const response = await fetch('/api/generate-fish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generationPrompt,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setSaveMessage(`❌ Generation failed: ${error.message || 'Unknown error'}`);
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      if (data.success && data.imageBase64) {
        const spriteUrl = `data:image/png;base64,${data.imageBase64}`;
        console.log('[FishEditOverlay] Generated sprite, updating state');

        // Update local state
        const updatedFish: FishData = {
          ...editedFish,
          sprite: spriteUrl,
        };
        setEditedFish(updatedFish);

        // Immediately update parent state so preview updates
        onSave(updatedFish);

        setSaveMessage(`✅ Fish sprite generated! Click "Save Creature" to persist.`);
      } else {
        setSaveMessage('❌ No image data returned from API');
      }
    } catch (error: any) {
      setSaveMessage(`❌ Error: ${error.message || 'Failed to generate'}`);
      console.error('[FishEditor] Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler for generating animation clips
  const handleGenerateClip = async (action: ClipAction) => {
    if (!editedFish || !editedFish.sprite) {
      setSaveMessage('❌ No sprite available. Generate or upload a sprite first.');
      return;
    }

    // Debounce: prevent rapid-fire requests (protects against accidental double-clicks)
    const now = Date.now();
    const timeSinceLastRequest = now - lastClipGenerationTime.current;
    if (timeSinceLastRequest < CLIP_GENERATION_DEBOUNCE_MS) {
      const waitTime = Math.ceil((CLIP_GENERATION_DEBOUNCE_MS - timeSinceLastRequest) / 1000);
      setSaveMessage(`⏳ Please wait ${waitTime}s before generating another clip...`);
      return;
    }
    lastClipGenerationTime.current = now;

    setIsGeneratingClip(true);
    setClipGenerationStatus(`Starting ${action} clip generation...`);

    try {
      if (useDirectMode) {
        // Direct mode: synchronous API call without job system
        setClipGenerationStatus(`Calling Gemini API directly for ${action}...`);

        const response = await fetch('/api/generate-creature-clip-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatureId: editedFish.id,
            action,
            spriteUrl: editedFish.sprite,
            description: editedFish.description || editedFish.name,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Direct generation failed');
        }

        if (data.success && data.clip) {
          const updatedClips: CreatureClips = {
            ...(editedFish.clips || {}),
            [action]: data.clip,
          };

          const updatedFish = {
            ...editedFish,
            clips: updatedClips,
          };

          setEditedFish(updatedFish);
          onSave(updatedFish);

          setSaveMessage(`✓ ${action} clip generated (direct mode)!`);
          setClipGenerationStatus('');
        } else {
          throw new Error(data.error || 'Direct generation failed');
        }
      } else {
        // Job-based mode: use the full clip generation flow
        const result = await generateCreatureClip(
          editedFish.id,
          action,
          editedFish.sprite,
          editedFish.description || editedFish.name,
          (progress: ClipGenerationProgress) => {
            // Update UI with progress
            setClipGenerationStatus(progress.message);
            if (progress.stage === 'error') {
              setSaveMessage(`❌ ${progress.message}`);
            }
          }
        );

        if (result.success && result.clip) {
          // Update local fish state with new clip
          const updatedClips: CreatureClips = {
            ...(editedFish.clips || {}),
            [action]: result.clip,
          };

          const updatedFish = {
            ...editedFish,
            clips: updatedClips,
          };

          setEditedFish(updatedFish);
          onSave(updatedFish);

          setSaveMessage(`✓ ${action} clip generated and saved!`);
          setClipGenerationStatus('');
        } else {
          setSaveMessage(`❌ ${result.error || 'Clip generation failed'}`);
          setClipGenerationStatus('');
        }
      }
    } catch (error: any) {
      console.error('[FishEditOverlay] Clip generation error:', error);
      setSaveMessage(`❌ Clip generation failed: ${error.message}`);
      setClipGenerationStatus('');
    } finally {
      setIsGeneratingClip(false);
    }
  };

  const updateField = (field: string, value: FishFieldValue) => {
    setEditedFish((prev) => {
      if (!prev) return null;
      const updated = field.includes('.')
        ? (() => {
          const [parent, child] = field.split('.');
          const parentValue = prev[parent as keyof FishData];
          const parentObj = typeof parentValue === 'object' && parentValue !== null ? parentValue : {};
          return {
            ...prev,
            [parent]: {
              ...parentObj,
              [child]: value,
            },
          };
        })()
        : { ...prev, [field]: value };

      // Debug log for sprite updates
      if (field === 'sprite') {
        console.log('[FishEditOverlay] Updating sprite:', value);
      }

      return updated;
    });
  };

  // Helper to update description chunks
  const updateDescriptionChunk = (index: number, value: string) => {
    const chunks = editedFish?.descriptionChunks || [];
    const newChunks = [...chunks];
    newChunks[index] = value;
    updateField('descriptionChunks', newChunks);
  };

  const addDescriptionChunk = () => {
    const chunks = editedFish?.descriptionChunks || [];
    updateField('descriptionChunks', [...chunks, '']);
  };

  const removeDescriptionChunk = (index: number) => {
    const chunks = editedFish?.descriptionChunks || [];
    updateField('descriptionChunks', chunks.filter((_, i) => i !== index));
  };

  const moveDescriptionChunk = (index: number, direction: 'up' | 'down') => {
    const chunks = editedFish?.descriptionChunks || [];
    if (direction === 'up' && index > 0) {
      const newChunks = [...chunks];
      [newChunks[index - 1], newChunks[index]] = [newChunks[index], newChunks[index - 1]];
      updateField('descriptionChunks', newChunks);
    } else if (direction === 'down' && index < chunks.length - 1) {
      const newChunks = [...chunks];
      [newChunks[index], newChunks[index + 1]] = [newChunks[index + 1], newChunks[index]];
      updateField('descriptionChunks', newChunks);
    }
  };

  // Helper to update essence visual chunks
  const updateEssenceVisualChunk = (isPrimary: boolean, secondaryIndex: number | null, chunkIndex: number, value: string) => {
    const essence = editedFish?.essence || { primary: { type: 'shallow', baseYield: 10 } };
    if (isPrimary) {
      const visualChunks = essence.primary.visualChunks || [];
      const newChunks = [...visualChunks];
      newChunks[chunkIndex] = value;
      updateField('essence', {
        ...essence,
        primary: { ...essence.primary, visualChunks: newChunks }
      });
    } else if (secondaryIndex !== null) {
      const secondary = essence.secondary || [];
      const visualChunks = secondary[secondaryIndex]?.visualChunks || [];
      const newChunks = [...visualChunks];
      newChunks[chunkIndex] = value;
      const newSecondary = [...secondary];
      newSecondary[secondaryIndex] = { ...newSecondary[secondaryIndex], visualChunks: newChunks };
      updateField('essence', { ...essence, secondary: newSecondary });
    }
  };

  return (
    <div
      className={`${embedded ? 'relative h-full' : 'absolute bottom-0 left-0 right-0'} bg-gray-900/95 backdrop-blur-md z-50 flex flex-col border-t border-gray-700`}
      style={embedded ? {} : { height: '50%', maxHeight: '600px' }}
    >
      {/* Header - Minimal when embedded, full controls when standalone */}
      {embedded ? (
        /* Embedded: Just show feedback messages */
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
        /* Standalone: Full header with all buttons */
        <div className="flex items-center justify-between p-3 bg-gray-800/90 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Edit Fish</h2>
            {/* Delete and Save Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveToGame}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                type="button"
              >
                {isSaving ? 'Saving...' : 'Save Creature'}
              </button>
              <button
                title="Delete Creature"
                onClick={async () => {
                  if (!editedFish) return;
                  if (!window.confirm(`Delete ${editedFish.name}? This cannot be undone.`)) return;
                  try {
                    const res = await fetch(`/api/delete-creature?id=${encodeURIComponent(editedFish.id)}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                      setSaveMessage('✓ Creature deleted.');
                      onBack();
                    } else {
                      setSaveMessage('❌ Delete failed: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err) {
                    setSaveMessage('❌ Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  }
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                type="button"
              >
                Delete
              </button>
            </div>
            {/* Set Player and Spawn Buttons */}
            <div className="flex gap-2">
              <button
                title="Set as Player Fish"
                onClick={() => {
                  if (editedFish && editedFish.sprite) {
                    // Dispatch full fish data for player
                    const event = new CustomEvent('setPlayerFish', { detail: { fish: editedFish } });
                    window.dispatchEvent(event);
                    setSaveMessage('✓ Set as player fish for testing.');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                type="button"
              >
                Set Player
              </button>
              <button
                title="Spawn as AI"
                onClick={() => {
                  if (editedFish && editedFish.sprite) {
                    // Dispatch full fish data for AI spawn
                    const event = new CustomEvent('spawnAIFish', { detail: { fish: editedFish } });
                    window.dispatchEvent(event);
                    setSaveMessage('✓ Spawned as AI for testing.');
                  }
                }}
                className="bg-blue-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                type="button"
              >
                Spawn
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <div className={`text-xs px-2 py-1 rounded ${saveMessage.startsWith('✓') || saveMessage.startsWith('✅')
                ? 'bg-green-600/20 text-green-400'
                : 'bg-red-600/20 text-red-400'
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
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-700 px-4 pt-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'details'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('animation')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'animation'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Animation {editedFish.clips && Object.keys(editedFish.clips).length > 0 ? `(${Object.keys(editedFish.clips).length})` : ''}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              {/* Description Chunks Editor */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-white">
                    Description Chunks ({editedFish.descriptionChunks?.length || 0})
                  </label>
                  <button
                    onClick={addDescriptionChunk}
                    className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  >
                    + Add Chunk
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">Modular prompt segments that compose the creature's visual description</p>
                <div className="space-y-2 bg-gray-900/50 p-3 rounded border border-gray-700">
                  {editedFish.descriptionChunks && editedFish.descriptionChunks.length > 0 ? (
                    editedFish.descriptionChunks.map((chunk, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                        <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                        <input
                          type="text"
                          value={chunk}
                          onChange={(e) => updateDescriptionChunk(index, e.target.value)}
                          className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                          placeholder="e.g., sleek silver scales"
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
                            disabled={index === (editedFish.descriptionChunks?.length ?? 0) - 1}
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
                    <p className="text-xs text-gray-500 text-center py-2">No chunks yet. Click "Add Chunk" to get started.</p>
                  )}
                </div>
              </div>

              {/* Visual Motif */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Visual Motif</label>
                <input
                  type="text"
                  value={editedFish.visualMotif || ''}
                  onChange={(e) => updateField('visualMotif', e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., bioluminescent deep-sea hunter"
                />
                <p className="text-xs text-gray-400 mt-1">
                  High-level visual theme • {editedFish.visualMotif?.length || 0} characters
                </p>
              </div>

              {/* Composed Prompt Display */}
              {editedFish && (
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-white">Composed AI Prompt</label>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono text-gray-300">
                    {composedPrompt || 'No prompt available'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This prompt is automatically composed from the fish's description chunks, visual motif, essence, biome, and abilities.
                  </p>
                </div>
              )}

              {/* AI Generation Section - Collapsible */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Advanced Sprite Options</label>
                <div className="space-y-3">
                  <div className="border-t border-gray-700 pt-3 mt-2">
                    <button
                      onClick={() => {
                        setShowFusionSection(false);
                        setShowMutationSection(false);
                        setShowAIGeneration(!showAIGeneration);
                      }}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <p className="text-xs font-bold text-white">Or Generate with AI</p>
                      <span className="text-white text-xs">{showAIGeneration ? '−' : '+'}</span>
                    </button>

                    {showAIGeneration && (
                      <div className="mt-2 space-y-2">
                        {/* Model Selection */}
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value as any)}
                          className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 text-xs mb-2"
                        >
                          <option value="google/imagen-4.0-fast-generate-001">Imagen Fast</option>
                          <option value="google/imagen-4.0-generate-001">Imagen Standard</option>
                          <option value="bfl/flux-2-pro">Flux 2 Pro</option>
                        </select>

                        {/* Generation Prompt */}
                        <textarea
                          value={generationPrompt}
                          onChange={(e) => setGenerationPrompt(e.target.value)}
                          className="w-full bg-gray-800 text-white px-2 py-2 rounded border border-gray-600 text-xs font-mono mb-2"
                          rows={3}
                          placeholder="Enter generation prompt..."
                        />

                        {/* Generate Button */}
                        <button
                          onClick={handleGenerateFish}
                          disabled={isGenerating || !generationPrompt.trim()}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          {isGenerating ? 'Generating...' : 'Generate Fish Sprite'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Animation Tab */}
          {activeTab === 'animation' && (
            <>
              {/* Clip Generation Status */}
              {clipGenerationStatus && (
                <div className="bg-blue-600/20 text-blue-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
                  {clipGenerationStatus}
                </div>
              )}

              {/* Existing Clips */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Generated Clips</h3>
                {editedFish.clips && Object.keys(editedFish.clips).length > 0 ? (
                  <div className="space-y-2">
                    {(Object.keys(editedFish.clips) as ClipAction[]).map((action) => {
                      const clip = editedFish.clips![action];
                      return (
                        <div key={action} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {clip?.thumbnailUrl && (
                                <img
                                  src={clip.thumbnailUrl}
                                  alt={action}
                                  className="w-12 h-12 object-cover rounded bg-gray-700"
                                />
                              )}
                              <div>
                                <span className="text-sm text-white font-medium capitalize">
                                  {action.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <p className="text-xs text-gray-400">
                                  {clip?.frames?.length || 0} frames • {clip?.duration ? `${(clip.duration / 1000).toFixed(1)}s` : ''} • {clip?.loop ? 'Loop' : 'One-shot'}
                                </p>
                              </div>
                            </div>
                            <span className="text-green-400 text-sm">✓</span>
                          </div>
                          {/* Action buttons row */}
                          <div className="flex gap-2 mt-2">
                            {clip?.videoUrl && (
                              <>
                                <button
                                  onClick={() => setPreviewClip({ action, mode: 'video' })}
                                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                  title="Preview Video"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                  </svg>
                                  Video
                                </button>
                                <a
                                  href={clip.videoUrl}
                                  download={`${editedFish.id}_${action}.mp4`}
                                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                  title="Download Video"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                  </svg>
                                  Download
                                </a>
                              </>
                            )}
                            {clip?.frames && clip.frames.length > 0 && (
                              <button
                                onClick={() => setPreviewClip({ action, mode: 'frames' })}
                                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                title="Preview Frame-by-Frame"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V6.375m0 12.75c0-.621.504-1.125 1.125-1.125m16.125 0h1.5c.621 0 1.125.504 1.125 1.125v.75m-18.75-12.75h17.25m-17.25 0V6.375m17.25 0v12.75m0-12.75a1.125 1.125 0 01-1.125 1.125H4.5m0 0V5.25m0 1.125c0 .621.504 1.125 1.125 1.125m15.75 0a1.125 1.125 0 010 2.25m0-2.25H5.625m15.75 0V5.25" />
                                </svg>
                                Frames
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No clips generated yet. Generate clips below to add video animations.
                  </p>
                )}
              </div>

              {/* Generate New Clips */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-white mb-2">Generate New Clips</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Uses Veo 3.1 to generate video clips from your sprite. Each clip takes 1-2 minutes.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['swimIdle', 'swimFast', 'bite', 'takeDamage', 'dash', 'death'] as ClipAction[]).map((action) => {
                    const hasClip = editedFish.clips?.[action];
                    const actionLabels: Record<string, string> = {
                      swimIdle: 'Swim (Idle)',
                      swimFast: 'Swim (Fast)',
                      bite: 'Bite/Attack',
                      takeDamage: 'Take Damage',
                      dash: 'Dash',
                      death: 'Death',
                    };
                    return (
                      <button
                        key={action}
                        onClick={() => handleGenerateClip(action)}
                        disabled={isGeneratingClip || !editedFish.sprite}
                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${hasClip
                          ? 'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {hasClip ? '✓' : '+'} {actionLabels[action] || action}
                      </button>
                    );
                  })}
                </div>

                {/* Direct Mode Toggle */}
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDirectMode}
                      onChange={(e) => setUseDirectMode(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-gray-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-yellow-400">Direct Mode (Testing)</span>
                      <p className="text-xs text-yellow-600 mt-1">
                        Bypasses job system for faster iteration. Calls Gemini API synchronously -
                        page will wait 1-2 min. Best for debugging video generation issues.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Info */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-white mb-2">How It Works</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Your sprite is used as a reference image for Veo 3.1</li>
                  <li>• Video is generated with a magenta background for chroma keying</li>
                  <li>• Frames are extracted and processed for transparency</li>
                  <li>• Clips play automatically when zoomed in close (120px+ on screen)</li>
                </ul>
              </div>
            </>
          )}

          {/* Type - Back in Details tab context, but we closed the fragment */}
          {activeTab === 'details' && (
            <>
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

              {/* Enhanced Essence System */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-white mb-3">Essence System</h3>

                {/* Primary Essence */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-300 mb-2">Primary Essence</label>
                  <div className="bg-gray-900/50 p-3 rounded border border-gray-700 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Type</label>
                        <select
                          value={editedFish.essence?.primary?.type || 'shallow'}
                          onChange={(e) => {
                            const essence = editedFish.essence || { primary: { type: 'shallow', baseYield: 10 } };
                            updateField('essence', {
                              ...essence,
                              primary: { ...essence.primary, type: e.target.value }
                            });
                          }}
                          className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                        >
                          <option value="shallow">Shallow</option>
                          <option value="deep_sea">Deep Sea</option>
                          <option value="tropical">Tropical</option>
                          <option value="polluted">Polluted</option>
                          <option value="cosmic">Cosmic</option>
                          <option value="demonic">Demonic</option>
                          <option value="robotic">Robotic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Base Yield</label>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={editedFish.essence?.primary?.baseYield || 10}
                          onChange={(e) => {
                            const essence = editedFish.essence || { primary: { type: 'shallow', baseYield: 10 } };
                            updateField('essence', {
                              ...essence,
                              primary: { ...essence.primary, baseYield: parseInt(e.target.value) || 0 }
                            });
                          }}
                          className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                        />
                      </div>
                    </div>

                    {/* Primary Visual Chunks */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-400">Visual Chunks</label>
                        <button
                          onClick={() => {
                            const essence = editedFish.essence || { primary: { type: 'shallow', baseYield: 10 } };
                            const chunks = essence.primary.visualChunks || [];
                            updateField('essence', {
                              ...essence,
                              primary: { ...essence.primary, visualChunks: [...chunks, ''] }
                            });
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-xs"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-1">
                        {editedFish.essence?.primary?.visualChunks?.map((chunk, index) => (
                          <div key={index} className="flex gap-1">
                            <input
                              type="text"
                              value={chunk}
                              onChange={(e) => updateEssenceVisualChunk(true, null, index, e.target.value)}
                              className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                              placeholder="e.g., deep blue coloration"
                            />
                            <button
                              onClick={() => {
                                const essence = editedFish.essence ?? { primary: { type: 'shallow', baseYield: 10 } };
                                const chunks = essence.primary.visualChunks || [];
                                updateField('essence', {
                                  ...essence,
                                  primary: { ...essence.primary, visualChunks: chunks.filter((_, i) => i !== index) }
                                });
                              }}
                              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Essences */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-300">Secondary Essences</label>
                    <button
                      onClick={() => {
                        const essence = editedFish.essence || { primary: { type: 'shallow', baseYield: 10 } };
                        const secondary = essence.secondary || [];
                        updateField('essence', {
                          ...essence,
                          secondary: [...secondary, { type: 'shallow', baseYield: 5, visualChunks: [] }]
                        });
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium"
                    >
                      + Add Secondary
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editedFish.essence?.secondary?.map((sec, secIndex) => (
                      <div key={secIndex} className="bg-gray-900/50 p-3 rounded border border-gray-700 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select
                              value={sec.type}
                              onChange={(e) => {
                                const essence = editedFish.essence ?? { primary: { type: 'shallow', baseYield: 10 } };
                                const secondary = essence.secondary || [];
                                const newSecondary = [...secondary];
                                newSecondary[secIndex] = { ...newSecondary[secIndex], type: e.target.value };
                                updateField('essence', { ...essence, secondary: newSecondary });
                              }}
                              className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                            >
                              <option value="shallow">Shallow</option>
                              <option value="deep_sea">Deep Sea</option>
                              <option value="tropical">Tropical</option>
                              <option value="polluted">Polluted</option>
                              <option value="cosmic">Cosmic</option>
                              <option value="demonic">Demonic</option>
                              <option value="robotic">Robotic</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Base Yield</label>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={sec.baseYield}
                              onChange={(e) => {
                                const essence = editedFish.essence ?? { primary: { type: 'shallow', baseYield: 10 } };
                                const secondary = essence.secondary || [];
                                const newSecondary = [...secondary];
                                newSecondary[secIndex] = { ...newSecondary[secIndex], baseYield: parseInt(e.target.value) || 0 };
                                updateField('essence', { ...essence, secondary: newSecondary });
                              }}
                              className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                            />
                          </div>
                        </div>

                        {/* Secondary Visual Chunks */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-gray-400">Visual Chunks</label>
                            <button
                              onClick={() => {
                                const essence = editedFish.essence ?? { primary: { type: 'shallow', baseYield: 10 } };
                                const secondary = essence.secondary || [];
                                const chunks = secondary[secIndex].visualChunks || [];
                                const newSecondary = [...secondary];
                                newSecondary[secIndex] = { ...newSecondary[secIndex], visualChunks: [...chunks, ''] };
                                updateField('essence', { ...essence, secondary: newSecondary });
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-xs"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-1">
                            {sec.visualChunks?.map((chunk, chunkIndex) => (
                              <div key={chunkIndex} className="flex gap-1">
                                <input
                                  type="text"
                                  value={chunk}
                                  onChange={(e) => updateEssenceVisualChunk(false, secIndex, chunkIndex, e.target.value)}
                                  className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                                  placeholder="e.g., toxic green highlights"
                                />
                                <button
                                  onClick={() => {
                                    const essence = editedFish.essence ?? { primary: { type: 'shallow', baseYield: 10 } };
                                    const secondary = essence.secondary || [];
                                    const chunks = secondary[secIndex].visualChunks || [];
                                    const newSecondary = [...secondary];
                                    newSecondary[secIndex] = {
                                      ...newSecondary[secIndex],
                                      visualChunks: chunks.filter((_, i) => i !== chunkIndex)
                                    };
                                    updateField('essence', { ...essence, secondary: newSecondary });
                                  }}
                                  className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Remove Secondary */}
                        <button
                          onClick={() => {
                            const essence = editedFish.essence ?? { primary: { type: 'shallow', baseYield: 10 } };
                            const secondary = essence.secondary || [];
                            updateField('essence', {
                              ...essence,
                              secondary: secondary.filter((_, i) => i !== secIndex)
                            });
                          }}
                          className="w-full bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                        >
                          Remove Secondary Essence
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legacy Essence Types (Backward Compatibility) */}
                <div className="mt-3 p-2 bg-gray-800/50 rounded border border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">
                    <strong>Legacy Compatibility:</strong> essenceTypes field is auto-synced with essence object
                  </p>
                  <button
                    onClick={() => {
                      // Sync essence object to essenceTypes array
                      if (editedFish.essence) {
                        const types = [
                          { type: editedFish.essence.primary.type, baseYield: editedFish.essence.primary.baseYield },
                          ...(editedFish.essence.secondary || []).map(s => ({ type: s.type, baseYield: s.baseYield }))
                        ];
                        updateField('essenceTypes', types);
                        setSaveMessage('✓ Synced to legacy essenceTypes field');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Sync to Legacy Field
                  </button>
                </div>
              </div>

              {/* Fusion Metadata Section */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setShowFusionSection(!showFusionSection)}
                  className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded border border-gray-600 transition-colors"
                >
                  <span className="text-sm font-bold text-white">
                    Fusion Metadata {editedFish.fusionParentIds ? '✓' : ''}
                  </span>
                  <span className="text-white">{showFusionSection ? '▼' : '▶'}</span>
                </button>

                {showFusionSection && (
                  <div className="mt-2 bg-gray-900/50 p-3 rounded border border-gray-700 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Parent IDs (comma-separated)</label>
                      <input
                        type="text"
                        value={(editedFish.fusionParentIds || []).join(', ')}
                        onChange={(e) => {
                          const ids = e.target.value.split(',').map(id => id.trim()).filter(id => id);
                          // Always store an array (possibly empty) to satisfy FishFieldValue
                          updateField('fusionParentIds', ids);
                        }}
                        className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                        placeholder="e.g., anglerfish, jellyfish"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Fusion Type</label>
                      <select
                        value={editedFish.fusionType || 'balanced'}
                        onChange={(e) => updateField('fusionType', e.target.value)}
                        className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                      >
                        <option value="balanced">Balanced</option>
                        <option value="dominant_first">Dominant First Parent</option>
                        <option value="dominant_second">Dominant Second Parent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Fusion Generation</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editedFish.fusionGeneration || 1}
                        onChange={(e) => updateField('fusionGeneration', parseInt(e.target.value) || 1)}
                        className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">How many fusion generations deep (1 = direct fusion)</p>
                    </div>

                    <button
                      onClick={() => {
                        updateField('fusionParentIds', undefined);
                        updateField('fusionType', undefined);
                        updateField('fusionGeneration', undefined);
                        setShowFusionSection(false);
                      }}
                      className="w-full bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Clear Fusion Metadata
                    </button>
                  </div>
                )}
              </div>

              {/* Mutation Metadata Section */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setShowMutationSection(!showMutationSection)}
                  className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded border border-gray-600 transition-colors"
                >
                  <span className="text-sm font-bold text-white">
                    Mutation Metadata {editedFish.mutationSource ? '✓' : ''}
                  </span>
                  <span className="text-white">{showMutationSection ? '▼' : '▶'}</span>
                </button>

                {showMutationSection && (
                  <div className="mt-2 bg-gray-900/50 p-3 rounded border border-gray-700 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Source Creature ID</label>
                      <input
                        type="text"
                        value={editedFish.mutationSource?.sourceCreatureId || ''}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          if (!value) {
                            // Remove mutation source if empty
                            updateField('mutationSource', undefined);
                          } else {
                            const current = editedFish.mutationSource || {
                              sourceCreatureId: '',
                              mutationType: 'polluted',
                              mutationLevel: 1
                            };
                            updateField('mutationSource', { ...current, sourceCreatureId: value });
                          }
                        }}
                        className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                        placeholder="e.g., goldfish"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Mutation Type</label>
                      <input
                        type="text"
                        value={editedFish.mutationSource?.mutationType || ''}
                        onChange={(e) => {
                          const current = editedFish.mutationSource || {
                            sourceCreatureId: '',
                            mutationType: '',
                            mutationLevel: 1
                          };
                          updateField('mutationSource', { ...current, mutationType: e.target.value });
                        }}
                        className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                        placeholder="e.g., polluted, cosmic, radioactive"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Mutation Level: {editedFish.mutationSource?.mutationLevel || 1}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={editedFish.mutationSource?.mutationLevel || 1}
                        onChange={(e) => {
                          const current = editedFish.mutationSource || {
                            sourceCreatureId: '',
                            mutationType: 'polluted',
                            mutationLevel: 1
                          };
                          updateField('mutationSource', { ...current, mutationLevel: parseInt(e.target.value) });
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-400 mt-1">1 = Minor, 5 = Extreme</p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Mutation Trigger (Optional)</label>
                      <input
                        type="text"
                        value={editedFish.mutationSource?.mutationTrigger || ''}
                        onChange={(e) => {
                          const current = editedFish.mutationSource || {
                            sourceCreatureId: '',
                            mutationType: 'polluted',
                            mutationLevel: 1
                          };
                          updateField('mutationSource', { ...current, mutationTrigger: e.target.value || undefined });
                        }}
                        className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                        placeholder="e.g., radiation exposure, cosmic event"
                      />
                    </div>

                    <button
                      onClick={() => {
                        updateField('mutationSource', undefined);
                        setShowMutationSection(false);
                      }}
                      className="w-full bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Clear Mutation Metadata
                    </button>
                  </div>
                )}
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
                      min="60"
                      max="200"
                      value={Math.max(60, editedFish.stats.size)}
                      onChange={(e) => {
                        const newSize = Math.max(60, parseInt(e.target.value));
                        updateField('stats.size', newSize);
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Minimum size is 60 to ensure fish are visible and renderable
                    </p>
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

              {/* Unlock Button */}
              {editedFish.playable && (
                <div className="space-y-2">
                  <button
                    onClick={handleUnlockForPlayer}
                    disabled={isSaving}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Unlocking...' : 'Unlock for Player'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Clip Preview Modal */}
      {previewClip && editedFish.clips?.[previewClip.action] && (
        <ClipPreviewModal
          clip={editedFish.clips[previewClip.action]!}
          action={previewClip.action}
          mode={previewClip.mode}
          onClose={() => setPreviewClip(null)}
        />
      )}
    </div>
  );
}

/**
 * Clip Preview Modal - Shows video or frame-by-frame animation
 */
function ClipPreviewModal({
  clip,
  action,
  mode,
  onClose,
}: {
  clip: { videoUrl: string; frames?: string[]; thumbnailUrl?: string; duration: number; loop?: boolean; frameRate?: number };
  action: string;
  mode: 'video' | 'frames';
  onClose: () => void;
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Frame-by-frame animation
  useEffect(() => {
    if (mode !== 'frames' || !isPlaying || !clip.frames?.length) return;

    const frameRate = clip.frameRate || 24;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= (clip.frames?.length || 0)) {
          return clip.loop ? 0 : prev;
        }
        return next;
      });
    }, 1000 / frameRate);

    return () => clearInterval(interval);
  }, [mode, isPlaying, clip.frames, clip.loop, clip.frameRate]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: Z_LAYERS.MODAL_BACKDROP }}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white capitalize">
              {action.replace(/([A-Z])/g, ' $1').trim()} - {mode === 'video' ? 'Video' : 'Frames'}
            </h3>
            <p className="text-xs text-gray-400">
              {mode === 'video'
                ? `${(clip.duration / 1000).toFixed(1)}s • ${clip.loop ? 'Looping' : 'One-shot'}`
                : `Frame ${currentFrame + 1} of ${clip.frames?.length || 0} • ${clip.frameRate || 24} fps`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-4 bg-[#FF00FF] flex items-center justify-center min-h-[300px]">
          {mode === 'video' ? (
            <video
              src={clip.videoUrl}
              autoPlay
              loop={clip.loop}
              muted
              playsInline
              className="max-w-full max-h-[400px] object-contain"
              style={{ background: '#FF00FF' }}
            />
          ) : (
            <img
              src={clip.frames?.[currentFrame] || clip.thumbnailUrl || ''}
              alt={`Frame ${currentFrame + 1}`}
              className="max-w-full max-h-[400px] object-contain"
              style={{ background: '#FF00FF' }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-700">
          {mode === 'frames' && (
            <div className="space-y-3">
              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentFrame((prev) => Math.max(0, prev - 1))}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                  title="Previous Frame"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setCurrentFrame((prev) => Math.min((clip.frames?.length || 1) - 1, prev + 1))}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                  title="Next Frame"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              {/* Frame Scrubber */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-8">{currentFrame + 1}</span>
                <input
                  type="range"
                  min={0}
                  max={(clip.frames?.length || 1) - 1}
                  value={currentFrame}
                  onChange={(e) => {
                    setCurrentFrame(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-xs text-gray-400 w-8">{clip.frames?.length || 0}</span>
              </div>
            </div>
          )}

          {mode === 'video' && (
            <div className="flex justify-center gap-3">
              <a
                href={clip.videoUrl}
                download={`clip_${action}.mp4`}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Video
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
