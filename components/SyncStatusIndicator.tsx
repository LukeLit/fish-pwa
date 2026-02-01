/**
 * Sync Status Indicator - Visual feedback for editor sync operations
 * 
 * Shows:
 * - Idle: Green dot + "Last synced: X ago"
 * - Syncing: Yellow pulse + current operation
 * - Error: Red dot + error message + retry option
 * - Refreshing: Blue spinner
 */
'use client';

import { useSyncStatus } from '@/lib/editor/sync-context';

/**
 * Format a timestamp as a relative time string (e.g., "2 min ago")
 */
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface SyncStatusIndicatorProps {
  /** Optional callback when retry is clicked after an error */
  onRetry?: () => void;
  /** Whether to show the compact version (just dot + minimal text) */
  compact?: boolean;
}

export default function SyncStatusIndicator({ onRetry, compact = false }: SyncStatusIndicatorProps) {
  const { 
    isSyncing, 
    isRefreshing, 
    currentOp, 
    hasError, 
    error, 
    lastSyncedAt 
  } = useSyncStatus();

  // Determine status for styling
  const status = hasError ? 'error' : (isSyncing || isRefreshing) ? 'syncing' : 'idle';

  // Status colors
  const dotColors = {
    idle: 'bg-green-500',
    syncing: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500',
  };

  const textColors = {
    idle: 'text-green-400',
    syncing: 'text-yellow-400',
    error: 'text-red-400',
  };

  // Spinner for refreshing state
  const Spinner = () => (
    <svg 
      className="animate-spin h-3 w-3 text-cyan-400" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {isRefreshing ? (
          <Spinner />
        ) : (
          <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
        )}
        <span className={`text-xs ${textColors[status]}`}>
          {hasError ? 'Error' : isSyncing ? '...' : formatRelativeTime(lastSyncedAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-700">
      {/* Status dot / spinner */}
      {isRefreshing ? (
        <Spinner />
      ) : (
        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[status]}`} />
      )}

      {/* Status text */}
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${textColors[status]}`}>
          {hasError 
            ? 'Sync Error' 
            : isRefreshing 
              ? 'Refreshing...'
              : isSyncing 
                ? (currentOp || 'Syncing...') 
                : 'Synced'}
        </span>
        
        {/* Secondary info */}
        {!hasError && !isSyncing && !isRefreshing && (
          <span className="text-[10px] text-gray-500">
            {formatRelativeTime(lastSyncedAt)}
          </span>
        )}
        
        {/* Error message */}
        {hasError && error && (
          <span className="text-[10px] text-red-300 max-w-[150px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>

      {/* Retry button for errors */}
      {hasError && onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 text-xs text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Minimal sync indicator - just a pulsing dot when syncing
 * Good for inline use in buttons or small spaces
 */
export function SyncDot() {
  const { isSyncing, isRefreshing, hasError } = useSyncStatus();
  
  if (!isSyncing && !isRefreshing && !hasError) return null;
  
  const color = hasError 
    ? 'bg-red-500' 
    : (isSyncing || isRefreshing) 
      ? 'bg-yellow-500 animate-pulse' 
      : 'bg-green-500';
  
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}
