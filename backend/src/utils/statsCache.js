// backend/src/utils/statsCache.js
// In-process TTL cache for expensive stats queries.
// Prevents repeated round-trips to Supabase for dashboard data that changes rarely.

const STATS_CACHE_TTL_MS = 30 * 1000; // 30 seconds

const _statsCache = new Map(); // Map<string, { data, expiresAt }>

/**
 * Get cached stats entry by key.
 * Returns null on miss or if entry has expired.
 * @param {string} key - Cache key (e.g. `user-stats:${userId}`)
 * @returns {any|null}
 */
function getStats(key) {
  const entry = _statsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _statsCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Store a stats result in the cache.
 * @param {string} key
 * @param {any} data
 */
function setStats(key, data) {
  _statsCache.set(key, { data, expiresAt: Date.now() + STATS_CACHE_TTL_MS });
}

/**
 * Evict all cached stats for a specific user.
 * Must be called whenever a meeting is created, deleted, or transitions to COMPLETED/FAILED.
 * @param {string} userId
 */
function invalidateUserStats(userId) {
  _statsCache.delete(`user-stats:${userId}`);
  _statsCache.delete(`meeting-stats:${userId}`);
}

// Evict stale entries every minute to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _statsCache.entries()) {
    if (now > entry.expiresAt) _statsCache.delete(key);
  }
}, 60 * 1000);

module.exports = { getStats, setStats, invalidateUserStats };
