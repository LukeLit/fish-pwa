/**
 * Jobs Panel
 * View and manage background generation jobs
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  progressMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  input?: {
    creatureId?: string;
    action?: string;
    spriteUrl?: string;
  };
  result?: {
    videoUrl?: string;
  };
}

interface JobsResponse {
  success: boolean;
  jobs: Job[];
  total: number;
}

export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setRefreshing(true);
      const url = filter === 'all'
        ? '/api/jobs?limit=50'
        : `/api/jobs?status=${filter}&limit=50`;

      const response = await fetch(url);
      if (response.ok) {
        const data: JobsResponse = await response.json();
        setJobs(data.jobs);
        setError(null);
      } else {
        setError('Failed to load jobs');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  // Initial load and refresh
  useEffect(() => {
    fetchJobs();

    // Auto-refresh every 10 seconds if there are processing jobs
    const interval = setInterval(() => {
      if (jobs.some(j => j.status === 'processing')) {
        fetchJobs();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Refetch when filter changes
  useEffect(() => {
    fetchJobs();
  }, [filter, fetchJobs]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Delete this job?')) return;

    try {
      const response = await fetch(`/api/jobs?id=${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      } else {
        alert('Failed to delete job');
      }
    } catch {
      alert('Failed to delete job');
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm('Delete all completed jobs?')) return;

    const completedJobs = jobs.filter(j => j.status === 'completed');

    for (const job of completedJobs) {
      try {
        await fetch(`/api/jobs?id=${encodeURIComponent(job.id)}`, {
          method: 'DELETE',
        });
      } catch {
        // Continue with other jobs
      }
    }

    fetchJobs();
  };

  const handleClearFailed = async () => {
    if (!confirm('Delete all failed jobs?')) return;

    const failedJobs = jobs.filter(j => j.status === 'failed');

    for (const job of failedJobs) {
      try {
        await fetch(`/api/jobs?id=${encodeURIComponent(job.id)}`, {
          method: 'DELETE',
        });
      } catch {
        // Continue with other jobs
      }
    }

    fetchJobs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'processing': return 'text-blue-400 bg-blue-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        );
      case 'processing':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 animate-spin">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      case 'failed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;

  return (
    <div className="px-4 pb-4 pt-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Generation Jobs</h2>
          <p className="text-xs text-gray-400">Track background video and image generation</p>
        </div>
        <button
          onClick={() => fetchJobs()}
          disabled={refreshing}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-center">
          <div className="text-lg font-bold text-blue-400">{processingCount}</div>
          <div className="text-xs text-blue-400/70">Processing</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-center">
          <div className="text-lg font-bold text-green-400">{completedCount}</div>
          <div className="text-xs text-green-400/70">Completed</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-center">
          <div className="text-lg font-bold text-red-400">{failedCount}</div>
          <div className="text-xs text-red-400/70">Failed</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
        {(['all', 'processing', 'completed', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${filter === f
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      {(completedCount > 0 || failedCount > 0) && (
        <div className="flex gap-2">
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="text-xs px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-colors"
            >
              Clear Completed ({completedCount})
            </button>
          )}
          {failedCount > 0 && (
            <button
              onClick={handleClearFailed}
              className="text-xs px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors"
            >
              Clear Failed ({failedCount})
            </button>
          )}
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-gray-400 text-sm text-center py-8">Loading jobs...</div>
        ) : error ? (
          <div className="text-red-400 text-sm text-center py-8">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">
            No {filter === 'all' ? '' : filter} jobs found
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="bg-gray-800 rounded-lg p-3 border border-gray-700"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Status and info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                    <span className="text-xs text-gray-500">{job.type}</span>
                  </div>

                  {/* Job details */}
                  {job.input && (
                    <div className="text-sm text-white truncate">
                      {job.input.creatureId} / {job.input.action}
                    </div>
                  )}

                  {/* Progress message */}
                  {job.progressMessage && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {job.progressMessage}
                    </div>
                  )}

                  {/* Progress bar for processing jobs */}
                  {job.status === 'processing' && job.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{job.progress}%</div>
                    </div>
                  )}

                  {/* Error message */}
                  {job.error && (
                    <div className="text-xs text-red-400 mt-1 truncate" title={job.error}>
                      {job.error.substring(0, 100)}...
                    </div>
                  )}

                  {/* Result link for completed jobs */}
                  {job.status === 'completed' && job.result?.videoUrl && (
                    <a
                      href={job.result.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      View Video
                    </a>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTime(job.createdAt)}
                  </div>
                </div>

                {/* Right: Delete button */}
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title="Delete job"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
