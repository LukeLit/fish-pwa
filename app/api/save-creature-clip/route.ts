/**
 * Save Creature Clip API
 * 
 * Saves a generated video clip and its extracted frames to blob storage.
 * Updates creature metadata with clip URLs.
 * 
 * Flow:
 * 1. Client generates video via /api/generate-creature-clip
 * 2. Client extracts frames via lib/video/frame-extractor
 * 3. Client calls this endpoint with video + frames data
 * 4. This endpoint uploads all assets and updates creature metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, downloadGameData, uploadGameData } from '@/lib/storage/blob-storage';
import type { Creature, CreatureClip, ClipAction } from '@/lib/game/types';

interface SaveClipRequest {
  creatureId: string;
  action: ClipAction;
  videoDataUrl: string;        // Base64 data URL of the video
  frames: Array<{
    index: number;
    dataUrl: string;           // Base64 data URL of each frame
  }>;
  thumbnailDataUrl?: string;   // Optional separate thumbnail (defaults to first frame)
  duration: number;            // Duration in milliseconds
  loop: boolean;
  frameRate?: number;
}

/**
 * Convert data URL to Buffer for upload
 */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveClipRequest = await request.json();
    const {
      creatureId,
      action,
      videoDataUrl,
      frames,
      thumbnailDataUrl,
      duration,
      loop,
      frameRate = 24,
    } = body;

    // Validate required fields
    if (!creatureId || !action || !videoDataUrl || !frames || frames.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: creatureId, action, videoDataUrl, frames' },
        { status: 400 }
      );
    }

    console.log(`[SaveClip] Saving ${action} clip for creature ${creatureId}`);
    console.log(`[SaveClip] Video size: ${Math.round(videoDataUrl.length / 1024)}KB`);
    console.log(`[SaveClip] Frames: ${frames.length}`);

    // Upload video
    const videoPath = `creatures/${creatureId}/clips/${action}.mp4`;
    const { buffer: videoBuffer, mimeType: videoMime } = dataUrlToBuffer(videoDataUrl);
    const videoResult = await uploadAsset(videoPath, videoBuffer, videoMime);
    console.log(`[SaveClip] Video uploaded: ${videoResult.url}`);

    // Upload frames
    const frameUrls: string[] = [];
    for (const frame of frames) {
      const framePath = `creatures/${creatureId}/clips/${action}_frames/frame_${String(frame.index).padStart(4, '0')}.png`;
      const { buffer: frameBuffer, mimeType: frameMime } = dataUrlToBuffer(frame.dataUrl);
      const frameResult = await uploadAsset(framePath, frameBuffer, frameMime);
      frameUrls.push(frameResult.url);
    }
    console.log(`[SaveClip] Uploaded ${frameUrls.length} frames`);

    // Upload thumbnail (use first frame if not provided separately)
    const thumbnailPath = `creatures/${creatureId}/clips/${action}_thumb.png`;
    const thumbnailSource = thumbnailDataUrl || frames[0].dataUrl;
    const { buffer: thumbBuffer, mimeType: thumbMime } = dataUrlToBuffer(thumbnailSource);
    const thumbnailResult = await uploadAsset(thumbnailPath, thumbBuffer, thumbMime);
    console.log(`[SaveClip] Thumbnail uploaded: ${thumbnailResult.url}`);

    // Build clip data structure
    const clipData: CreatureClip = {
      videoUrl: videoResult.url,
      frames: frameUrls,
      thumbnailUrl: thumbnailResult.url,
      duration,
      loop,
      frameRate,
    };

    // Update creature metadata with clip
    try {
      // Load existing creature data
      const creatures = await downloadGameData<Record<string, Creature>>('creatures', {});

      if (creatures[creatureId]) {
        // Update creature with new clip
        if (!creatures[creatureId].clips) {
          creatures[creatureId].clips = {};
        }
        creatures[creatureId].clips![action] = clipData;

        // Save updated creature data
        await uploadGameData('creatures', creatures);
        console.log(`[SaveClip] Updated creature ${creatureId} metadata with ${action} clip`);
      } else {
        console.warn(`[SaveClip] Creature ${creatureId} not found in database, clip saved but metadata not updated`);
      }
    } catch (metadataError) {
      console.error('[SaveClip] Failed to update creature metadata:', metadataError);
      // Don't fail the whole request - clip is saved, just metadata update failed
    }

    return NextResponse.json({
      success: true,
      clip: clipData,
      message: `Successfully saved ${action} clip for creature ${creatureId}`,
    });
  } catch (error: any) {
    console.error('[SaveClip] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to save creature clip',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve clip data for a creature
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatureId = searchParams.get('creatureId');
    const action = searchParams.get('action') as ClipAction | null;

    if (!creatureId) {
      return NextResponse.json(
        { error: 'creatureId is required' },
        { status: 400 }
      );
    }

    // Load creature data
    const creatures = await downloadGameData<Record<string, Creature>>('creatures', {});
    const creature = creatures[creatureId];

    if (!creature) {
      return NextResponse.json(
        { error: 'Creature not found' },
        { status: 404 }
      );
    }

    if (!creature.clips) {
      return NextResponse.json({
        success: true,
        creatureId,
        clips: null,
        message: 'Creature has no clips',
      });
    }

    // Return specific action or all clips
    if (action) {
      return NextResponse.json({
        success: true,
        creatureId,
        action,
        clip: creature.clips[action] || null,
      });
    }

    return NextResponse.json({
      success: true,
      creatureId,
      clips: creature.clips,
    });
  } catch (error: any) {
    console.error('[SaveClip] GET error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve clip data',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
