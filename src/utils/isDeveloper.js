const developerIds = (process.env.DEVELOPER ?? '').split(',').map((id) => id.trim()).filter(Boolean);

/** Developers are the comma-separated user IDs in the DEVELOPER env variable. */
module.exports = (userId) => developerIds.includes(userId);
