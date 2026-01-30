/**
 * Jobs API
 * 
 * List and manage background jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobList, getJob, deleteJob } from '@/lib/jobs/job-store';
import type { JobStatus } from '@/lib/jobs/types';

/**
 * GET /api/jobs - List jobs or get a specific job
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    const status = searchParams.get('status') as JobStatus | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get specific job
    if (jobId) {
      const job = await getJob(jobId);
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, job });
    }

    // List jobs
    const result = await getJobList(page, limit, status || undefined);
    return NextResponse.json({
      success: true,
      ...result,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get jobs', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs?id=xxx - Delete a job
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteJob(jobId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Jobs API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job', message: error.message },
      { status: 500 }
    );
  }
}
