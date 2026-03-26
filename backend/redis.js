// ======================================================================
// REDIS CACHE MANAGEMENT
// ======================================================================

const axios = require('axios');

const REDIS_CACHE_TTL_SPEC = 30 * 24 * 60 * 60;  // 30 days for cookie specs
const REDIS_CACHE_TTL_SUMMARY = 7 * 24 * 60 * 60;  // 7 days for AI summaries

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// Fallback in-memory cache for when Redis isn't configured
let inMemorySpecCache = new Map();
console.log(`🚀 Cache initialized (fallback: in-memory, primary: ${UPSTASH_REDIS_REST_URL ? 'Upstash Redis' : 'disabled'})`);

async function redisGet(key) {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        console.log(`[DEBUG] Redis not configured, using in-memory cache`);
        return inMemorySpecCache.get(key) || null;
    }
    
    try {
        console.log(`[DEBUG] Fetching from Redis: ${key}`);
        const response = await axios.post(
            `${UPSTASH_REDIS_REST_URL}`,
            ["GET", key],
            {
                headers: {
                    'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`[DEBUG] Redis response:`, response.status, response.data);
        
        // Fix: Upstash returns data in .result field, not as array
        if (response.data && response.data.result) {
            const parsed = JSON.parse(response.data.result);
            console.log(`[DEBUG] ✅ Parsed successfully:`, Array.isArray(parsed) ? `Array with ${parsed.length} items` : typeof parsed);
            return parsed;
        }
        console.log(`[DEBUG] Redis returned empty:`, response.data);
        return null;
    } catch (error) {
        console.log(`[DEBUG] Redis GET error:`, error.message, error.response?.status);
        return inMemorySpecCache.get(key) || null;
    }
}

async function redisSet(key, value, ttlSeconds = REDIS_CACHE_TTL_SPEC) {
    // Always save to in-memory as fallback
    inMemorySpecCache.set(key, value);
    console.log(`[DEBUG] Saved to in-memory cache: ${key} (${Array.isArray(value) ? value.length + ' items' : 'object'})`);
    
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        console.log(`[DEBUG] Redis not configured, skipping`);
        return true;  // Fallback successful
    }
    
    try {
        console.log(`[DEBUG] Publishing to Redis: ${key} with TTL ${ttlSeconds}s`);
        const payload = ["SET", key, JSON.stringify(value), "EX", ttlSeconds];
        console.log(`[DEBUG] Payload:`, JSON.stringify(payload).substring(0, 100));
        
        const response = await axios.post(
            `${UPSTASH_REDIS_REST_URL}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`[DEBUG] Redis SET response:`, response.status, response.data);
        return true;
    } catch (error) {
        console.log(`[DEBUG] Redis SET error:`, error.message, error.response?.status, error.response?.data);
        return true;  // Still count as success since in-memory cache was updated
    }
}

async function redisFlushAll() {
    // Clear in-memory cache
    inMemorySpecCache.clear();
    
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return true;
    }
    
    try {
        await axios.post(
            `${UPSTASH_REDIS_REST_URL}/flushall`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return true;
    } catch (error) {
        console.warn('⚠️ Redis FLUSHALL error:', error.message);
        return true;
    }
}

function getDomainCacheKey(domain) {
    return `cookies:${domain}`;
}

async function getCachedDomainCookies(domain) {
    const cacheKey = getDomainCacheKey(domain);
    console.log(`[DEBUG] Looking for cache key: ${cacheKey}`);
    const cached = await redisGet(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`✅ REDIS HIT: Retrieved ${cached.length} cookies for ${domain} from Redis cache`);
        return cached;
    } else {
        console.log(`❌ REDIS MISS: No cached data for ${domain} in Redis (key: ${cacheKey})`);
        return null;
    }
}

async function cacheDomainCookies(domain, cookies) {
    const cacheKey = getDomainCacheKey(domain);
    const CACHE_TTL_COOKIES = 30 * 24 * 60 * 60;  // 30 days
    await redisSet(cacheKey, cookies, CACHE_TTL_COOKIES);
}

module.exports = {
    redisGet,
    redisSet,
    redisFlushAll,
    getDomainCacheKey,
    getCachedDomainCookies,
    cacheDomainCookies,
    inMemorySpecCache,
    REDIS_CACHE_TTL_SPEC,
    REDIS_CACHE_TTL_SUMMARY
};
