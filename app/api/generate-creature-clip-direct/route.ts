/**
 * Direct (synchronous) clip generation API
 * Bypasses the job system for faster iteration and debugging.
 * Warning: This endpoint can take 1-2 minutes to respond.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';
import type { ClipAction, CreatureClip } from '@/lib/game/types';

// Action-specific prompts
const ACTION_PROMPTS: Record<ClipAction, { prompt: string }> = {
  swimIdle: {
    prompt: 'gentle swimming motion, subtle fin movements, relaxed body undulation, idle animation loop',
  },
  swimFast: {
    prompt: 'fast swimming motion, rapid tail movement, streamlined body position, speed burst animation',
  },
  bite: {
    prompt: 'aggressive bite attack, mouth opening wide, lunging forward motion, snapping jaws',
  },
  takeDamage: {
    prompt: 'hit reaction, recoiling backwards, brief flash or shake, pain response animation',
  },
  dash: {
    prompt: 'quick dash movement, burst of speed, blur effect, rapid forward motion',
  },
  death: {
    prompt: 'death animation, going limp, floating sideways, fading out slowly',
  },
  special: {
    prompt: 'special ability activation, glowing effect, magical energy burst, power animation',
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[DirectClip] Starting direct clip generation...');
  
  try {
    const body = await request.json();
    const { creatureId, action, spriteUrl, description } = body;

    // Validate required fields
    if (!creatureId || !action || !spriteUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: creatureId, action, spriteUrl' },
        { status: 400 }
      );
    }

    if (!ACTION_PROMPTS[action as ClipAction]) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build prompt
    const actionConfig = ACTION_PROMPTS[action as ClipAction];
    let prompt = actionConfig.prompt;
    if (description) {
      prompt = `${description}, ${prompt}`;
    }
    prompt += ', solid bright magenta background (#FF00FF), isolated on magenta, no other background elements, game sprite animation, clean edges';

    console.log(`[DirectClip] Creature: ${creatureId}, Action: ${action}`);
    console.log(`[DirectClip] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[DirectClip] Sprite URL: ${spriteUrl.substring(0, 80)}...`);

    // Validate sprite URL
    try {
      const spriteCheck = await fetch(spriteUrl, { method: 'HEAD' });
      if (!spriteCheck.ok) {
        return NextResponse.json(
          { error: `Sprite URL not accessible: ${spriteCheck.status}` },
          { status: 400 }
        );
      }
      console.log('[DirectClip] Sprite URL validated');
    } catch (spriteError: any) {
      return NextResponse.json(
        { error: `Sprite validation failed: ${spriteError.message}` },
        { status: 400 }
      );
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    // Start video generation
    console.log('[DirectClip] Starting Gemini video generation...');
    const requestConfig: any = {
      model: 'veo-3.1-generate-preview',
      prompt,
      referenceImages: [spriteUrl],
    };
    
    const operation = await ai.models.generateVideos(requestConfig);
    console.log(`[DirectClip] Operation started: ${operation?.name}`);

    if (!operation?.name) {
      return NextResponse.json(
        { error: 'Gemini API did not return an operation name' },
        { status: 500 }
      );
    }

    // Poll for completion
    const operationId = operation.name;
    const maxPollAttempts = 60; // 5 minutes max (5s intervals)
    let pollAttempt = 0;

    console.log('[DirectClip] Polling for completion...');
    
    while (pollAttempt < maxPollAttempts) {
      await sleep(5000); // Wait 5 seconds between polls
      pollAttempt++;

      // Direct REST API call to check operation status
      const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`;
      const pollResponse = await fetch(pollUrl);
      
      if (!pollResponse.ok) {
        console.error(`[DirectClip] Poll failed: ${pollResponse.status}`);
        continue;
      }

      const pollData = await pollResponse.json();
      console.log(`[DirectClip] Poll ${pollAttempt}: done=${pollData.done}`);

      if (pollData.done) {
        // Operation complete
        if (pollData.error) {
          return NextResponse.json(
            { error: `Video generation failed: ${pollData.error.message}` },
            { status: 500 }
          );
        }

        // Extract video URL
        const videoUri = 
          pollData.response?.generatedVideos?.[0]?.video?.uri ||
          pollData.result?.videos?.[0]?.uri ||
          pollData.response?.videos?.[0]?.uri;

        if (!videoUri) {
          console.error('[DirectClip] No video URI in response:', JSON.stringify(pollData, null, 2));
          return NextResponse.json(
            { error: 'No video URI in completed response' },
            { status: 500 }
          );
        }

        console.log(`[DirectClip] Video ready: ${videoUri.substring(0, 80)}...`);

        // Download video
        console.log('[DirectClip] Downloading video...');
        const videoResponse = await fetch(videoUri);
        if (!videoResponse.ok) {
          return NextResponse.json(
            { error: `Failed to download video: ${videoResponse.status}` },
            { status: 500 }
          );
        }

        const videoBlob = await videoResponse.blob();
        console.log(`[DirectClip] Video downloaded: ${videoBlob.size} bytes`);

        // Upload to Vercel Blob
        console.log('[DirectClip] Uploading to Vercel Blob...');
        const timestamp = Date.now();
        const blobPath = `assets/clips/${creatureId}/${action}_${timestamp}.mp4`;
        
        const blobResult = await put(blobPath, videoBlob, {
          access: 'public',
          contentType: 'video/mp4',
          allowOverwrite: true,
        });

        console.log(`[DirectClip] Uploaded to: ${blobResult.url}`);

        // Create clip object
        // Determine if this action should loop
        const loopingActions = ['swimIdle', 'swimFast'];
        const shouldLoop = loopingActions.includes(action);
        
        const clip: CreatureClip = {
          videoUrl: blobResult.url,
          frames: [], // Frames can be extracted later
          thumbnailUrl: spriteUrl, // Use sprite as thumbnail for now
          duration: 5000, // 5 seconds in milliseconds
          loop: shouldLoop,
        };

        const elapsed = Date.now() - startTime;
        console.log(`[DirectClip] Complete! Total time: ${elapsed}ms`);

        return NextResponse.json({
          success: true,
          clip,
          elapsed,
        });
      }
    }

    // Timeout
    return NextResponse.json(
      { error: 'Video generation timed out after 5 minutes' },
      { status: 504 }
    );
  } catch (error: any) {
    console.error('[DirectClip] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Direct clip generation failed' },
      { status: 500 }
    );
  }
}
