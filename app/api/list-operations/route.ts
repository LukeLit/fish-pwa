/**
 * List Operations API
 * 
 * Lists all backed-up video generation operation IDs.
 * Use this to find operations that can be recovered.
 */

import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    // List all operation backup files
    const { blobs } = await list({
      prefix: 'operations/',
    });

    // Fetch details for each operation
    const operations = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (response.ok) {
            const data = await response.json();
            return {
              ...data,
              blobUrl: blob.url,
              size: blob.size,
              uploadedAt: blob.uploadedAt,
            };
          }
          return {
            url: blob.url,
            error: 'Failed to fetch details',
          };
        } catch {
          return {
            url: blob.url,
            error: 'Failed to parse',
          };
        }
      })
    );

    // Sort by timestamp, newest first
    operations.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      count: operations.length,
      operations,
      hint: 'Use POST /api/recover-video with operationId to attempt recovery',
    });

  } catch (error: any) {
    console.error('[ListOperations] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to list operations',
    }, { status: 500 });
  }
}
