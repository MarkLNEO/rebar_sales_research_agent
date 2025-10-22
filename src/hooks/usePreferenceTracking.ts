/**
 * React Hook for Implicit Preference Tracking
 * 
 * Automatically tracks user interactions and learns preferences
 */

import { useEffect, useCallback } from 'react';
import { preferenceTracker, type UserInteraction } from '../../lib/preferences/tracker';

export function usePreferenceTracking(userId: string | undefined) {
  // Initialize tracker with userId
  useEffect(() => {
    if (userId) {
      preferenceTracker.setUserId(userId);
    }
  }, [userId]);

  // Flush pending preferences when component unmounts
  useEffect(() => {
    return () => {
      preferenceTracker.flush();
    };
  }, []);

  // Track interaction
  const track = useCallback((interaction: UserInteraction) => {
    preferenceTracker.track(interaction);
  }, []);

  // Manual flush
  const flush = useCallback(() => {
    return preferenceTracker.flush();
  }, []);

  // Get state for debugging
  const getState = useCallback(() => {
    return preferenceTracker.getState();
  }, []);

  return { track, flush, getState };
}
