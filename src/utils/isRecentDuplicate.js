const DUPLICATE_WINDOW_MS = 10_000;

const lastSeenAt = new Map();

/**
 * Reports whether the same key was already seen inside the duplicate window, and records this sighting.
 * Synchronous on purpose, so two handlers started by the same gateway event cannot both pass.
 * @param {string} key
 * @returns {boolean}
 */
module.exports = (key) => {
    const now = Date.now();

    for (const [seenKey, seenAt] of lastSeenAt) {
        if (now - seenAt >= DUPLICATE_WINDOW_MS) lastSeenAt.delete(seenKey);
    }

    if (lastSeenAt.has(key)) return true;

    lastSeenAt.set(key, now);
    return false;
};
