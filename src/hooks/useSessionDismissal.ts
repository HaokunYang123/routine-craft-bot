/**
 * Hook for session-scoped dismissal with cross-tab synchronization
 *
 * Used for "Yesterday's Completed" section dismissal:
 * - Persists for the browser session (sessionStorage)
 * - Syncs dismissal state across tabs in the same browser (BroadcastChannel)
 *
 * Per CONTEXT.md:
 * - Dismissal only via X button (not general interaction)
 * - Once dismissed, gone for browser session (shared across tabs)
 */
import { useState, useEffect, useCallback } from 'react';

/** Key for storing dismissal state in sessionStorage */
const YESTERDAY_DISMISSED_KEY = 'yesterday-tasks-dismissed';

/** Channel name for cross-tab synchronization */
const BROADCAST_CHANNEL_NAME = 'task-rollover-sync';

/** Message types for broadcast channel */
type BroadcastMessage =
  | { type: 'YESTERDAY_DISMISSED' }
  | { type: 'YESTERDAY_RESET' };

interface UseSessionDismissalResult {
  /** Whether the yesterday section has been dismissed */
  isDismissed: boolean;
  /** Dismiss the yesterday section (persist + broadcast) */
  dismiss: () => void;
  /** Reset dismissal state (e.g., on day change) */
  reset: () => void;
}

/**
 * Manages session-scoped dismissal state with cross-tab sync
 *
 * @returns Object with isDismissed state and dismiss/reset functions
 *
 * @example
 * const { isDismissed, dismiss, reset } = useSessionDismissal();
 *
 * // When user clicks X button
 * <button onClick={dismiss}>X</button>
 *
 * // To reset at day boundary
 * useEffect(() => { reset(); }, [currentDateString]);
 */
export function useSessionDismissal(): UseSessionDismissalResult {
  // Initialize from sessionStorage (SSR-safe)
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(YESTERDAY_DISMISSED_KEY) === 'true';
    } catch {
      // SSR or sessionStorage unavailable
      return false;
    }
  });

  // Set up cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    // BroadcastChannel may not be available in SSR or old browsers
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
      if (event.data.type === 'YESTERDAY_DISMISSED') {
        setIsDismissed(true);
        try {
          sessionStorage.setItem(YESTERDAY_DISMISSED_KEY, 'true');
        } catch {
          // Ignore storage errors
        }
      } else if (event.data.type === 'YESTERDAY_RESET') {
        setIsDismissed(false);
        try {
          sessionStorage.removeItem(YESTERDAY_DISMISSED_KEY);
        } catch {
          // Ignore storage errors
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  /**
   * Dismiss the yesterday section
   * - Updates local state
   * - Persists to sessionStorage
   * - Broadcasts to other tabs
   */
  const dismiss = useCallback(() => {
    setIsDismissed(true);

    // Persist to sessionStorage
    try {
      sessionStorage.setItem(YESTERDAY_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }

    // Broadcast to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: 'YESTERDAY_DISMISSED' } as BroadcastMessage);
      channel.close();
    }
  }, []);

  /**
   * Reset dismissal state (e.g., when day changes)
   * - Updates local state
   * - Removes from sessionStorage
   * - Broadcasts to other tabs
   */
  const reset = useCallback(() => {
    setIsDismissed(false);

    // Remove from sessionStorage
    try {
      sessionStorage.removeItem(YESTERDAY_DISMISSED_KEY);
    } catch {
      // Ignore storage errors
    }

    // Broadcast to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: 'YESTERDAY_RESET' } as BroadcastMessage);
      channel.close();
    }
  }, []);

  return {
    isDismissed,
    dismiss,
    reset,
  };
}
