const crypto = require('crypto');

const SHOP_SIZE = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Turkey is UTC+3 all year, so the shop day turns over at midnight there. */
const SHOP_TIME_OFFSET_MS = 3 * 60 * 60 * 1000;

const MIN_BASE_PRICE = 3000;
const MAX_BASE_PRICE = 8000;
const PRICE_STEP = 50;
const MAX_STAT = 100;

/** Ids are stored with bought animals, so an id never changes once it is released. Names are in the locale files. */
const species = [
    { id: 'tavuskusu', emoji: '🦚' },
    { id: 'flamingo', emoji: '🦩' },
    { id: 'tembelhayvan', emoji: '🦥' },
    { id: 'papagan', emoji: '🦜' },
    { id: 'leopar', emoji: '🐆' },
    { id: 'zebra', emoji: '🦓' },
    { id: 'zurafa', emoji: '🦒' },
    { id: 'fil', emoji: '🐘' },
    { id: 'gergedan', emoji: '🦏' },
    { id: 'suaygiri', emoji: '🦛' },
    { id: 'timsah', emoji: '🐊' },
    { id: 'kanguru', emoji: '🦘' },
    { id: 'koala', emoji: '🐨' },
    { id: 'panda', emoji: '🐼' },
    { id: 'susamuru', emoji: '🦦' },
    { id: 'fok', emoji: '🦭' },
    { id: 'ahtapot', emoji: '🐙' },
    { id: 'balina', emoji: '🐋' },
    { id: 'mamut', emoji: '🦣' },
    { id: 'dodo', emoji: '🦤' },
];

/** Steps that share no factor with the species count, so walking the list by one never repeats a species in a day. */
const speciesSteps = [1, 3, 7, 9, 11, 13, 17, 19];

/** `weight` is the chance out of 100, `multiplier` scales the price, `stock` is how many the guild can buy that day. */
const tiers = [
    { id: 'nadide', weight: 50, multiplier: 1, stock: 3 },
    { id: 'parlak', weight: 30, multiplier: 2.5, stock: 2 },
    { id: 'altin', weight: 15, multiplier: 6, stock: 1 },
    { id: 'kozmik', weight: 5, multiplier: 20, stock: 1 },
];

const traits = ['uykucu', 'hircin', 'obur', 'merakli', 'utangac', 'gururlu', 'yaramaz', 'sakin', 'kiskanc', 'cesur', 'huysuz', 'sevecen'];

const listingsByShop = new Map();

/** Shop day of a moment, as YYYY-MM-DD in Turkey time. */
const getShopDate = (now = Date.now()) => new Date(now + SHOP_TIME_OFFSET_MS).toISOString().slice(0, 10);

/** The moment the current shop day ends. */
const getNextReset = (now = Date.now()) => new Date((Math.floor((now + SHOP_TIME_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - SHOP_TIME_OFFSET_MS);

/**
 * Random bytes for one part of a shop, fixed for a guild and day. Keyed with the bot token, so the
 * listings stay the same across restarts but cannot be worked out ahead of time from the guild id and date.
 */
const getSeed = (guildID, date, part) => crypto
    .createHmac('sha256', process.env.BOT_TOKEN || 'bicircik-daily-shop')
    .update(`${guildID}:${date}:${part}`)
    .digest();

const pickTier = (roll) => {
    let remaining = roll % 100;
    for (const tier of tiers) {
        remaining -= tier.weight;
        if (remaining < 0) return tier;
    }
    return tiers[0];
};

const buildListings = (guildID, date) => {
    const daySeed = getSeed(guildID, date, 'day');
    const firstSpecies = daySeed.readUInt32BE(0) % species.length;
    const speciesStep = speciesSteps[daySeed.readUInt32BE(4) % speciesSteps.length];

    const listings = [];
    for (let slot = 0; slot < SHOP_SIZE; slot++) {
        const seed = getSeed(guildID, date, slot);
        const animal = species[(firstSpecies + slot * speciesStep) % species.length];
        const tier = pickTier(seed.readUInt32BE(0));

        const power = 1 + seed.readUInt32BE(4) % MAX_STAT;
        const speed = 1 + seed.readUInt32BE(8) % MAX_STAT;
        const luck = 1 + seed.readUInt32BE(12) % MAX_STAT;

        const basePrice = MIN_BASE_PRICE + seed.readUInt32BE(16) % (MAX_BASE_PRICE - MIN_BASE_PRICE + 1);
        const statFactor = 1 + (power + speed + luck) / (3 * MAX_STAT);
        const price = Math.round(basePrice * tier.multiplier * statFactor / PRICE_STEP) * PRICE_STEP;

        listings.push({
            slot,
            species: animal.id,
            emoji: animal.emoji,
            tier: tier.id,
            trait: traits[seed.readUInt32BE(20) % traits.length],
            power,
            speed,
            luck,
            price,
            stock: tier.stock,
        });
    }

    return listings;
};

/**
 * The guild's listings for a shop day. Always rebuilt from the seed on the server, so a price or a
 * stat is never taken from anything a user sends. Cached for the day.
 */
const getListings = (guildID, date) => {
    const key = `${guildID}:${date}`;
    let listings = listingsByShop.get(key);

    if (!listings) {
        for (const cachedKey of listingsByShop.keys()) {
            if (!cachedKey.endsWith(`:${date}`)) listingsByShop.delete(cachedKey);
        }

        listings = buildListings(guildID, date);
        listingsByShop.set(key, listings);
    }

    return listings;
};

/** Emoji of a species id, for animals read back from the database. */
const getSpeciesEmoji = (speciesId) => species.find((animal) => animal.id === speciesId)?.emoji ?? '🐾';

module.exports = { SHOP_SIZE, species, tiers, traits, getShopDate, getNextReset, getListings, getSpeciesEmoji };
