const { developers } = require('../../config.json');

const envDeveloperIds = (process.env.DEVELOPER ?? '').split(',').map((id) => id.trim()).filter(Boolean);

/** Developers are the DEVELOPER env IDs plus the config developers. */
module.exports = (userId) => envDeveloperIds.includes(userId) || developers.includes(userId);
