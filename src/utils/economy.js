const crypto = require('crypto');
const { ApplicationCommandOptionType } = require('discord.js');
const economySchema = require('../schemas/economySchema');

const CURRENCY_EMOJI = '🪙';
const MIN_BET = 10;
const MAX_BET = 50_000;

/** Bet option shared by every game command, so the limits stay the same everywhere. */
const betOption = {
    name: 'miktar',
    description: `Bahis miktarı (${MIN_BET} - ${MAX_BET})`,
    type: ApplicationCommandOptionType.Integer,
    required: true,
    min_value: MIN_BET,
    max_value: MAX_BET,
};

/** Formats a coin amount with the locale's digit grouping (Turkish by default) and the currency emoji. */
const formatCoins = (amount, locale = 'tr-TR') => `${amount.toLocaleString(locale)} ${CURRENCY_EMOJI}`;

/** Throws unless the amount is a positive whole number, so a bad amount can never mint or drain coins. */
const assertPositiveAmount = (amount) => {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new RangeError(`Invalid coin amount: ${amount}`);
};

/** Returns the member's account, creating an empty one on first use. */
const getAccount = (guildID, userID) => economySchema.findOneAndUpdate(
    { guildID, userID },
    { $setOnInsert: { guildID, userID } },
    { upsert: true, new: true },
);

/** Adds coins to the member's account and returns the updated account. */
const addBalance = (guildID, userID, amount) => {
    assertPositiveAmount(amount);

    return economySchema.findOneAndUpdate(
        { guildID, userID },
        { $inc: { balance: amount } },
        { upsert: true, new: true },
    );
};

/**
 * Adds a signed amount without letting the balance drop below zero, and returns the updated account.
 */
const adjustBalance = async (guildID, userID, amount) => {
    if (amount > 0) return addBalance(guildID, userID, amount);

    const charged = await tryCharge(guildID, userID, -amount);
    if (charged) return charged;

    return economySchema.findOneAndUpdate({ guildID, userID }, { $set: { balance: 0 } }, { upsert: true, new: true });
};

/**
 * Removes coins only when the balance covers them. The check and the removal are one atomic update.
 * @returns the updated account, or null when the balance is too low.
 */
const tryCharge = (guildID, userID, amount) => {
    assertPositiveAmount(amount);

    return economySchema.findOneAndUpdate(
        { guildID, userID, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true },
    );
};

/**
 * Starts the cooldown stored in `field` when it has run out. The check and the write are one atomic update.
 * @param {'lastDaily' | 'lastWork' | 'lastHunt'} field
 * @returns {Promise<{ claimed: boolean, previous: object | null, readyAt: Date | null }>} `previous` is the account
 * before the claim, `readyAt` is set only when the cooldown is still running.
 */
const claimCooldown = async (guildID, userID, field, cooldownMs) => {
    const now = Date.now();
    const account = await getAccount(guildID, userID);

    const previous = await economySchema.findOneAndUpdate(
        { guildID, userID, $or: [{ [field]: null }, { [field]: { $lte: new Date(now - cooldownMs) } }] },
        { $set: { [field]: new Date(now) } },
    );
    if (previous) return { claimed: true, previous, readyAt: null };

    const startedAt = account[field]?.getTime() ?? now;
    return { claimed: false, previous: account, readyAt: new Date(startedAt + cooldownMs) };
};

/** Discord relative timestamp, shown to each reader as "in 5 minutes". */
const relativeTime = (date) => `<t:${Math.ceil(date.getTime() / 1000)}:R>`;

/**
 * Random integer between min and max, both included. Uses the OS random source, because game results
 * are shown to players and Math.random can be predicted from enough of its outputs.
 */
const randomInt = (min, max) => crypto.randomInt(min, max + 1);

module.exports = {
    betOption,
    formatCoins,
    getAccount,
    addBalance,
    adjustBalance,
    tryCharge,
    claimCooldown,
    relativeTime,
    randomInt,
};
