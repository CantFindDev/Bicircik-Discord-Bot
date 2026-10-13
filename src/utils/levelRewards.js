const calculateLevelXp = require('./calculateLevelXp');
const economySchema = require('../schemas/economySchema');
const { getAccount, randomInt } = require('./economy');

/** Levels that pay a reward, up to 100. Sorted ascending. */
const MILESTONES = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const LAST_MILESTONE = MILESTONES[MILESTONES.length - 1];

const MIN_REWARD_RATIO = 0.25;
const MAX_REWARD_RATIO = 0.35;

const POST_MILESTONE_STEP = 5;
const POST_MILESTONE_MIN = 5000;
const POST_MILESTONE_MAX = 10000;

/** Total XP needed to climb from level `from` to level `to`. */
const getXpBetween = (from, to) => {
    let xp = 0;
    for (let level = from; level < to; level++) xp += calculateLevelXp(level);
    return xp;
};

/**
 * Reward range for reaching `level`, or null when the level pays nothing.
 * A milestone pays 25% to 35% of the XP spent since the milestone before it, so coins per message
 * stay the same however far apart the milestones are. Past the last milestone every fifth level
 * pays a small fixed range.
 * @returns {{ min: number, max: number } | null}
 */
const getRewardRange = (level) => {
    if (level > LAST_MILESTONE) {
        const isRewarded = (level - LAST_MILESTONE) % POST_MILESTONE_STEP === 0;
        return isRewarded ? { min: POST_MILESTONE_MIN, max: POST_MILESTONE_MAX } : null;
    }

    const index = MILESTONES.indexOf(level);
    if (index === -1) return null;

    const xpSpent = getXpBetween(MILESTONES[index - 1] ?? 0, level);
    return { min: Math.floor(xpSpent * MIN_REWARD_RATIO), max: Math.floor(xpSpent * MAX_REWARD_RATIO) };
};

/** Adds up one amount per rewarded level above `fromLevel` up to and including `toLevel`. */
const sumRewards = (fromLevel, toLevel, pickAmount) => {
    let total = 0;
    for (let level = fromLevel + 1; level <= toLevel; level++) {
        const range = getRewardRange(level);
        if (range) total += pickAmount(range);
    }
    return total;
};

/** Random rewards for the levels gained, used when a member levels up. */
const rollRewards = (fromLevel, toLevel) => sumRewards(fromLevel, toLevel, (range) => randomInt(range.min, range.max));

/** Middle of each reward range for the levels gained, used to pay levels earned before rewards existed. */
const averageRewards = (fromLevel, toLevel) => sumRewards(fromLevel, toLevel, (range) => Math.floor((range.min + range.max) / 2));

/**
 * Pays the member every level reward they have not been paid yet, up to `level`, and returns the amount.
 * The account stores the highest level already paid in `rewardedLevel`. The payment and the move of that
 * mark are one atomic update that only succeeds from the mark that was read, so a level is never paid
 * twice, whatever calls this: a level up, the catch-up at startup, or a second bot process.
 * @param {(fromLevel: number, toLevel: number) => number} getAmount rollRewards or averageRewards
 */
const claimLevelRewards = async (guildID, userID, level, getAmount) => {
    const account = await getAccount(guildID, userID);
    const rewardedLevel = account.rewardedLevel ?? 0;
    if (level <= rewardedLevel) return 0;

    const amount = getAmount(rewardedLevel, level);

    const claimed = await economySchema.findOneAndUpdate(
        { guildID, userID, rewardedLevel: rewardedLevel === 0 ? { $in: [0, null] } : rewardedLevel },
        { $set: { rewardedLevel: level }, $inc: { balance: amount } },
    );

    return claimed ? amount : 0;
};

module.exports = { getRewardRange, rollRewards, averageRewards, claimLevelRewards };
