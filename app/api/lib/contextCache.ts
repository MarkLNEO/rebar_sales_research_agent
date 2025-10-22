/**
 * In-memory cache for user context to eliminate database queries on every request
 *
 * This cache stores complete user profiles including:
 * - User profile data
 * - Custom criteria
 * - Buying signals
 * - Preferences
 * - Learned preferences
 * - Memory blocks
 *
 * Cache entries have a 5-minute TTL to balance performance with freshness.
 */

interface CachedUserContext {
  userId: string;
  profile: any;
  customCriteria: any[];
  signals: any[];
  disqualifiers: any[];
  promptConfig: any;
  reportPreferences: any[];
  preferences: any[];
  openQuestions: any[];
  learnedPreferences: any;
  memoryBlock: string;
  timestamp: number;
}

// In-memory cache with automatic cleanup
const contextCache = new Map<string, CachedUserContext>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean up every minute

// Automatic garbage collection
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of contextCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      contextCache.delete(userId);
      console.log(`[contextCache] Evicted stale entry for user ${userId}`);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Get cached user context or return null if not cached/expired
 */
export function getCachedContext(userId: string): CachedUserContext | null {
  const cached = contextCache.get(userId);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    contextCache.delete(userId);
    console.log(`[contextCache] Cache miss (expired) for user ${userId}`);
    return null;
  }

  console.log(`[contextCache] Cache hit for user ${userId}, age: ${Math.round((now - cached.timestamp) / 1000)}s`);
  return cached;
}

/**
 * Store user context in cache
 */
export function setCachedContext(context: Omit<CachedUserContext, 'timestamp'>): void {
  contextCache.set(context.userId, {
    ...context,
    timestamp: Date.now(),
  });
  console.log(`[contextCache] Cached context for user ${context.userId}`);
}

/**
 * Invalidate cache for a specific user (call when profile is updated)
 */
export function invalidateUserCache(userId: string): void {
  const deleted = contextCache.delete(userId);
  if (deleted) {
    console.log(`[contextCache] Invalidated cache for user ${userId}`);
  }
}

/**
 * Clear entire cache (use sparingly, mainly for testing)
 */
export function clearCache(): void {
  const size = contextCache.size;
  contextCache.clear();
  console.log(`[contextCache] Cleared entire cache (${size} entries)`);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    size: contextCache.size,
    entries: Array.from(contextCache.entries()).map(([userId, entry]) => ({
      userId,
      ageMs: Date.now() - entry.timestamp,
    })),
  };
}
