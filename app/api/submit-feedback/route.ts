/**
 * API Route: Submit Feedback
 * Stores feedback in Vercel Blob Storage with optional GitHub issue creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedback } = body;

    // Validate feedback
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      );
    }

    if (feedback.length > 2000) {
      return NextResponse.json(
        { error: 'Feedback must be less than 2000 characters' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create feedback object
    const feedbackData = {
      id: feedbackId,
      feedback: feedback.trim(),
      timestamp,
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Store feedback in Vercel Blob Storage (primary storage)
    try {
      await put(`feedback/${feedbackId}.json`, JSON.stringify(feedbackData, null, 2), {
        access: 'public',
        addRandomSuffix: false,
      });
    } catch (blobError) {
      console.error('Failed to store feedback in blob storage:', blobError);
      return NextResponse.json(
        { error: 'Failed to save feedback. Please try again later.' },
        { status: 500 }
      );
    }

    // Try to create GitHub issue as a secondary option (optional)
    let issueCreated = false;
    let issueNumber: number | undefined;
    let issueUrl: string | undefined;

    const githubToken = process.env.GITHUB_TOKEN;
    
    if (githubToken) {
      try {
        const repo = process.env.GITHUB_REPO || 'LukeLit/fish-pwa';
        const [owner, repoName] = repo.split('/');

        if (owner && repoName) {
          const issueTitle = `User Feedback: ${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}`;
          const issueBody = `## User Feedback\n\n${feedback}\n\n---\n*Submitted via in-game feedback form*\n*Timestamp: ${timestamp}*\n*Feedback ID: ${feedbackId}*`;

          const githubResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/issues`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
                labels: ['feedback'],
              }),
            }
          );

          if (githubResponse.ok) {
            const issue = await githubResponse.json();
            issueCreated = true;
            issueNumber = issue.number;
            issueUrl = issue.html_url;
          } else {
            const errorData = await githubResponse.json();
            console.warn('GitHub API error (non-critical):', errorData);
          }
        }
      } catch (githubError) {
        console.warn('Failed to create GitHub issue (non-critical):', githubError);
      }
    }

    return NextResponse.json({
      success: true,
      feedbackId,
      issueCreated,
      ...(issueNumber && { issueNumber }),
      ...(issueUrl && { issueUrl }),
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
