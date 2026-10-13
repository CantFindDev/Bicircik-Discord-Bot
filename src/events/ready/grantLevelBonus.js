const levelSchema = require('../../schemas/levelSchema');
const migrationSchema = require('../../schemas/migrationSchema');
const { averageRewards, claimLevelRewards } = require('../../utils/levelRewards');

const MIGRATION_PREFIX = 'economy-level-bonus:';
const HIGHEST_TRUSTED_LEVEL = 1000;

/**
 * Pays every member of one guild the level rewards they have not been paid yet and returns how many were paid.
 * A level above HIGHEST_TRUSTED_LEVEL is treated as corrupt data and capped.
 */
const payGuild = async (guildID) => {
    const guildData = await levelSchema.findOne({ guildID }, { userLevels: 1 }).lean();

    const levelByUser = new Map();
    for (const { userID, level } of guildData?.userLevels ?? []) {
        if (!userID || !Number.isInteger(level) || level <= 0) continue;
        levelByUser.set(userID, Math.max(levelByUser.get(userID) ?? 0, Math.min(level, HIGHEST_TRUSTED_LEVEL)));
    }

    let paidCount = 0;
    for (const [userID, level] of levelByUser) {
        if (await claimLevelRewards(guildID, userID, level, averageRewards) > 0) paidCount += 1;
    }

    return paidCount;
};

/** Runs the catch-up for each guild the bot is in that has not finished it yet. */
const payUnfinishedGuilds = async (client) => {
    for (const guildID of client.guilds.cache.keys()) {
        const name = MIGRATION_PREFIX + guildID;

        try {
            if (await migrationSchema.exists({ name })) continue;

            const paidCount = await payGuild(guildID);
            await migrationSchema.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });

            console.log(`Level bonus: paid ${paidCount} members in guild ${guildID}.`);
        } catch (error) {
            console.error(`Level bonus stopped midway in guild ${guildID}, it continues on the next start:`, error);
        }
    }
};

/**
 * Catch-up payment for members who earned levels before level rewards existed. Each guild is handled
 * separately and only by a bot that is in it, so a test bot never pays the members of another server.
 * A guild is marked finished only after every member is paid. Stopping midway is safe to repeat,
 * because claimLevelRewards never pays a level twice. Not awaited, so it does not hold up startup.
 */
module.exports = (client) => {
    payUnfinishedGuilds(client).catch((error) => console.error('Level bonus could not start:', error));
};
