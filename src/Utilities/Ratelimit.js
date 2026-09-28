const CacheMaid = require('./CacheMaid');

const LIMIT_CONFIG = {
    WINDOW: 60_000,        // 1 minute reset
    MAX_USERS: 1000        // safety cap
};

// Create the CacheMaid map
const rateCache = CacheMaid.new('rate-handler');

/**
 * Increments the user's command count for the current minute
 */
function AddRate(userId) {
    const currentCount = rateCache.map.get(userId) || 0;
    
    // Safety check for map size
    if (rateCache.map.size < LIMIT_CONFIG.MAX_USERS) {
        rateCache.map.set(userId, currentCount + 1);
    }

    return rateCache.map.get(userId) || 0;
}

/**
 * Gets the current count for the user
 */
function GetRate(userId) {
    return rateCache.map.get(userId) || 0;
}

setInterval(() => {
    // Completely wipe the rate-handler map
    rateCache.map.clear();
    
    if (process.env.DEBUG_MODE === 'true') {
        console.log(`[RateHandler] Global rate limit window reset.`);
    }
}, LIMIT_CONFIG.WINDOW);

module.exports = {
    AddRate,
    GetRate
};