/**
 * API Route: Submit Feedback
 * Creates a GitHub issue with the "feedback" label
 */

import { NextRequest, NextResponse } from 'next/server';

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

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('GITHUB_TOKEN is not configured');
      return NextResponse.json(
        { error: 'Feedback service is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    // Get repository info from environment or use default
    const repo = process.env.GITHUB_REPO || 'LukeLit/fish-pwa';
    const [owner, repoName] = repo.split('/');

    if (!owner || !repoName) {
      console.error('Invalid GITHUB_REPO format:', repo);
      return NextResponse.json(
        { error: 'Repository configuration is invalid' },
        { status: 500 }
      );
    }

    // Create GitHub issue
    const issueTitle = `User Feedback: ${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}`;
    const issueBody = `## User Feedback\n\n${feedback}\n\n---\n*Submitted via in-game feedback form*\n*Timestamp: ${new Date().toISOString()}*`;

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

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json();
      console.error('GitHub API error:', errorData);
      
      return NextResponse.json(
        { error: 'Failed to create feedback issue. Please try again later.' },
        { status: githubResponse.status }
      );
    }

    const issue = await githubResponse.json();

    return NextResponse.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
