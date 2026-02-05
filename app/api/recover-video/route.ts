/**
 * Video Recovery API
 * 
 * Allows manual recovery of videos using an operation ID.
 * Use this if video generation succeeded but download/save failed.
 * 
 * Primarily used for background video recovery.
 * 
 * Usage: POST /api/recover-video
 * Body: { operationId: "operations/...", identifier: "...", label: "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, identifier, label, thumbnailUrl } = body;

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


    // Check operation status
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`;

    const pollResponse = await fetch(pollUrl);

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      return NextResponse.json({
        error: `Failed to check operation status: ${pollResponse.status}`,
        details: errorText,
      }, { status: pollResponse.status });
    }

    const pollData = await pollResponse.json();

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


    // Download video with API key authentication
    let downloadUrl = videoUri;
    if (videoUri.includes('googleapis.com')) {
      const separator = videoUri.includes('?') ? '&' : '?';
      downloadUrl = `${videoUri}${separator}key=${apiKey}`;
    }

    const videoResponse = await fetch(downloadUrl);

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        status: 'download_failed',
        error: `Failed to download video: ${videoResponse.status}`,
        videoUri,
        hint: 'The video URL may have expired. Google video URLs typically expire after a few hours.',
      }, { status: 500 });
    }

    const videoBlob = await videoResponse.blob();

    // Save to blob storage
    const timestamp = Date.now();
    const safeId = identifier || 'unknown';
    const safeLabel = label || 'recovered';
    const blobPath = `assets/videos/${safeId}/${safeLabel}_${timestamp}.mp4`;

    const blobResult = await put(blobPath, videoBlob, {
      access: 'public',
      contentType: 'video/mp4',
      allowOverwrite: true,
    });


    return NextResponse.json({
      success: true,
      status: 'recovered',
      videoUrl: blobResult.url,
      thumbnailUrl,
      message: 'Video recovered and saved successfully!',
    });

  } catch (error: any) {
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
