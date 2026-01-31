/**
 * Video Recovery API
 * 
 * Allows manual recovery of videos using an operation ID.
 * Use this if video generation succeeded but download/save failed.
 * 
 * Usage: POST /api/recover-video
 * Body: { operationId: "operations/...", creatureId: "...", action: "swimIdle" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import type { CreatureClip, ClipAction } from '@/lib/game/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, creatureId, action, spriteUrl } = body;

    if (!operationId) {
      return NextResponse.json(
        { error: 'operationId is required' },
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

    console.log(`[RecoverVideo] Attempting to recover operation: ${operationId}`);

    // Check operation status
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`;
    console.log(`[RecoverVideo] Polling: ${pollUrl.replace(apiKey, 'API_KEY')}`);

    const pollResponse = await fetch(pollUrl);

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error(`[RecoverVideo] Poll failed: ${pollResponse.status} - ${errorText}`);
      return NextResponse.json({
        error: `Failed to check operation status: ${pollResponse.status}`,
        details: errorText,
      }, { status: pollResponse.status });
    }

    const pollData = await pollResponse.json();
    console.log(`[RecoverVideo] Operation status:`, JSON.stringify(pollData, null, 2));

    if (!pollData.done) {
      return NextResponse.json({
        success: false,
        status: 'still_processing',
        message: 'Video is still being generated. Try again later.',
        operationData: pollData,
      });
    }

    if (pollData.error) {
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: pollData.error.message,
        operationData: pollData,
      });
    }

    // Try to extract video URI from various possible response structures
    const videoUri =
      pollData.response?.generatedVideos?.[0]?.video?.uri ||
      pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
      pollData.result?.videos?.[0]?.uri ||
      pollData.response?.videos?.[0]?.uri;

    if (!videoUri) {
      return NextResponse.json({
        success: false,
        status: 'no_video_uri',
        message: 'Operation completed but no video URI found in response',
        operationData: pollData,
      });
    }

    console.log(`[RecoverVideo] Found video URI: ${videoUri.substring(0, 100)}...`);

    // Download video with API key authentication
    let downloadUrl = videoUri;
    if (videoUri.includes('googleapis.com')) {
      const separator = videoUri.includes('?') ? '&' : '?';
      downloadUrl = `${videoUri}${separator}key=${apiKey}`;
    }

    console.log(`[RecoverVideo] Downloading video...`);
    const videoResponse = await fetch(downloadUrl);

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text().catch(() => '');
      console.error(`[RecoverVideo] Download failed: ${videoResponse.status} - ${errorText.substring(0, 500)}`);
      return NextResponse.json({
        success: false,
        status: 'download_failed',
        error: `Failed to download video: ${videoResponse.status}`,
        videoUri,
        hint: 'The video URL may have expired. Google video URLs typically expire after a few hours.',
      }, { status: 500 });
    }

    const videoBlob = await videoResponse.blob();
    console.log(`[RecoverVideo] Downloaded: ${videoBlob.size} bytes`);

    // Save to blob storage
    const timestamp = Date.now();
    const safeCreatureId = creatureId || 'unknown';
    const safeAction = action || 'unknown';
    const blobPath = `assets/clips/${safeCreatureId}/${safeAction}_${timestamp}.mp4`;

    console.log(`[RecoverVideo] Saving to: ${blobPath}`);
    const blobResult = await put(blobPath, videoBlob, {
      access: 'public',
      contentType: 'video/mp4',
      allowOverwrite: true,
    });

    console.log(`[RecoverVideo] Saved to: ${blobResult.url}`);

    // Determine if this action should loop
    const loopingActions = ['swimIdle', 'swimFast'];
    const shouldLoop = loopingActions.includes(safeAction);

    const clip: CreatureClip = {
      videoUrl: blobResult.url,
      thumbnailUrl: spriteUrl,
      duration: 5000,
      loop: shouldLoop,
    };

    return NextResponse.json({
      success: true,
      status: 'recovered',
      clip,
      blobUrl: blobResult.url,
      message: 'Video recovered and saved successfully!',
    });

  } catch (error: any) {
    console.error('[RecoverVideo] Error:', error);
    return NextResponse.json({
      error: error.message || 'Recovery failed',
    }, { status: 500 });
  }
}

/**
 * GET - Check operation status without downloading
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operationId = searchParams.get('operationId');

  if (!operationId) {
    return NextResponse.json(
      { error: 'operationId query param is required' },
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

  try {
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`;
    const pollResponse = await fetch(pollUrl);

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      return NextResponse.json({
        error: `Failed to check operation: ${pollResponse.status}`,
        details: errorText,
      }, { status: pollResponse.status });
    }

    const pollData = await pollResponse.json();

    return NextResponse.json({
      operationId,
      done: pollData.done,
      hasError: !!pollData.error,
      error: pollData.error?.message,
      hasVideoUri: !!(
        pollData.response?.generatedVideos?.[0]?.video?.uri ||
        pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
      ),
      rawResponse: pollData,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
