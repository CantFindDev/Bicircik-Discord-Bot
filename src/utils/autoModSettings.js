const autoModSchema = require('../schemas/autoModSchema');

const settingsByGuild = new Map();

/** Lowercases with Turkish rules, so "İ" and "I" match their lowercase forms. */
const normalize = (text) => text.toLocaleLowerCase('tr');

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds one pattern that matches any banned word as a whole word, or null when the list is empty. */
const buildBannedWordPattern = (bannedWords) => {
    if (!bannedWords.length) return null;

    const alternatives = bannedWords.map((word) => escapeRegExp(normalize(word))).join('|');
    return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'u');
};

const loadSettings = async (guildID) => {
    const record = await autoModSchema.findOne({ guildID }).lean();
    if (!record) return null;

    return {
        inviteFilter: record.inviteFilter,
        spamFilter: record.spamFilter,
        mentionLimit: record.mentionLimit,
        bannedWordPattern: buildBannedWordPattern(record.bannedWords),
        exemptChannels: new Set(record.exemptChannels),
    };
};

/**
 * Returns the guild's compiled automod settings, or null when automod was never configured.
 * Cached in memory because it is read on every message. Call invalidateAutoModSettings after a change.
 */
const getAutoModSettings = (guildID) => {
    let settings = settingsByGuild.get(guildID);

    if (!settings) {
        settings = loadSettings(guildID).catch((error) => {
            settingsByGuild.delete(guildID);
            throw error;
        });
        settingsByGuild.set(guildID, settings);
    }

    return settings;
};

/** Drops the cached settings so the next message reads them from the database again. */
const invalidateAutoModSettings = (guildID) => settingsByGuild.delete(guildID);

module.exports = { getAutoModSettings, invalidateAutoModSettings, normalize };
