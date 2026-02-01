/**
 * Sync Context - Centralized state management for tracking editor sync operations
 * 
 * Provides visual feedback about pending operations, errors, and sync status
 * to help developers understand what's happening with blob storage.
 */
'use client';

import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

export interface SyncState {
  pendingOps: number;
  lastSyncedAt: number | null;
  currentOp: string | null;
  error: string | null;
  isRefreshing: boolean;
}

interface SyncContextValue extends SyncState {
  /** Start a sync operation with a label (e.g., "Saving creature...") */
  startSync: (label: string) => void;
  /** End a sync operation (decrements pending count) */
  endSync: () => void;
  /** Report a sync error */
  syncError: (message: string) => void;
  /** Clear any error */
  clearError: () => void;
  /** Set refreshing state */
  setRefreshing: (isRefreshing: boolean) => void;
  /** Mark a successful sync (updates lastSyncedAt) */
  markSynced: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>({
    pendingOps: 0,
    lastSyncedAt: null,
    currentOp: null,
    error: null,
    isRefreshing: false,
  });

  // Track operation labels for debugging
  const opsStack = useRef<string[]>([]);

  const startSync = useCallback((label: string) => {
    opsStack.current.push(label);
    setState(prev => ({
      ...prev,
      pendingOps: prev.pendingOps + 1,
      currentOp: label,
      error: null, // Clear any previous error when starting new op
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Sync] START: ${label} (pending: ${opsStack.current.length})`);
    }
  }, []);

  const endSync = useCallback(() => {
    const completedOp = opsStack.current.pop();
    const newPendingCount = Math.max(0, opsStack.current.length);
    const newCurrentOp = opsStack.current.length > 0 
      ? opsStack.current[opsStack.current.length - 1] 
      : null;

    setState(prev => ({
      ...prev,
      pendingOps: newPendingCount,
      currentOp: newCurrentOp,
      lastSyncedAt: Date.now(),
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Sync] END: ${completedOp} (pending: ${newPendingCount})`);
    }
  }, []);

  const syncError = useCallback((message: string) => {
    // Clear the ops stack on error
    const failedOp = opsStack.current.pop();
    
    setState(prev => ({
      ...prev,
      pendingOps: Math.max(0, prev.pendingOps - 1),
      currentOp: opsStack.current.length > 0 ? opsStack.current[opsStack.current.length - 1] : null,
      error: message,
    }));

    if (process.env.NODE_ENV === 'development') {
      console.error(`[Sync] ERROR during "${failedOp}": ${message}`);
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setRefreshing = useCallback((isRefreshing: boolean) => {
    setState(prev => ({ ...prev, isRefreshing }));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Sync] Refresh: ${isRefreshing ? 'started' : 'completed'}`);
    }
  }, []);

  const markSynced = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastSyncedAt: Date.now(),
    }));
  }, []);

  const value: SyncContextValue = {
    ...state,
    startSync,
    endSync,
    syncError,
    clearError,
    setRefreshing,
    markSynced,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

/**
 * Hook to access sync state and actions
 * Must be used within a SyncProvider
 */
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

/**
 * Hook to check if any sync operations are pending
 */
export function useSyncStatus() {
  const { pendingOps, lastSyncedAt, currentOp, error, isRefreshing } = useSync();
  
  return {
    isSyncing: pendingOps > 0,
    isRefreshing,
    pendingCount: pendingOps,
    lastSyncedAt,
    currentOp,
    hasError: !!error,
    error,
  };
}
