const { Client, Interaction } = require('discord.js');
const shopStockSchema = require('../../schemas/shopStockSchema');
const exoticAnimalSchema = require('../../schemas/exoticAnimalSchema');
const { SHOP_SIZE, getShopDate, getListings } = require('../../utils/dailyShop');
const { BUY_ID_PREFIX, describeAnimal, buildShopMessage } = require('../../utils/shopView');
const { tryCharge, addBalance } = require('../../utils/economy');
const { setLanguage, getTranslator } = require('../../utils/language');

const BUY_COOLDOWN_MS = 3000;
const SWEEP_INTERVAL_MS = 60_000;
const DUPLICATE_KEY_ERROR = 11000;

const lastBuyAt = new Map();

setInterval(() => {
    const cutoff = Date.now() - BUY_COOLDOWN_MS;
    for (const [key, time] of lastBuyAt) {
        if (time < cutoff) lastBuyAt.delete(key);
    }
}, SWEEP_INTERVAL_MS).unref();

/** Starts the member's buy cooldown and returns false when it is still running. */
const claimBuyCooldown = (key) => {
    const now = Date.now();
    if (now - (lastBuyAt.get(key) ?? 0) < BUY_COOLDOWN_MS) return false;

    lastBuyAt.set(key, now);
    return true;
};

/** Takes one unit of the listing's stock. The check and the count are one atomic update. */
const claimStock = async (stockKey, listing) => {
    await shopStockSchema.updateOne(stockKey, { $setOnInsert: { sold: 0 } }, { upsert: true }).catch((error) => {
        if (error.code !== DUPLICATE_KEY_ERROR) throw error;
    });

    return shopStockSchema.findOneAndUpdate({ ...stockKey, sold: { $lt: listing.stock } }, { $inc: { sold: 1 } });
};

/**
 * Buys one listing for a member. Stock is taken first, then the price is charged, then the animal is stored.
 * Each step that fails undoes the ones before it, so a failed purchase costs neither coins nor stock.
 * @returns {Promise<'bought' | 'soldOut' | 'alreadyBought' | 'notEnough'>}
 */
const buyListing = async (guildID, userID, date, listing) => {
    const stockKey = { guildID, date, slot: listing.slot };

    if (!await claimStock(stockKey, listing)) return 'soldOut';

    let isCharged = false;
    try {
        if (await exoticAnimalSchema.exists({ guildID, userID, shopDate: date, slot: listing.slot })) {
            await shopStockSchema.updateOne(stockKey, { $inc: { sold: -1 } });
            return 'alreadyBought';
        }

        if (!await tryCharge(guildID, userID, listing.price)) {
            await shopStockSchema.updateOne(stockKey, { $inc: { sold: -1 } });
            return 'notEnough';
        }
        isCharged = true;

        await exoticAnimalSchema.create({
            guildID,
            userID,
            shopDate: date,
            slot: listing.slot,
            species: listing.species,
            tier: listing.tier,
            trait: listing.trait,
            power: listing.power,
            speed: listing.speed,
            luck: listing.luck,
            price: listing.price,
        });

        return 'bought';
    } catch (error) {
        if (isCharged) await addBalance(guildID, userID, listing.price);
        await shopStockSchema.updateOne(stockKey, { $inc: { sold: -1 } });

        if (error.code === DUPLICATE_KEY_ERROR) return 'alreadyBought';
        throw error;
    }
};

/**
 * Handles the buy buttons of the daily shop. Only the shop day and the slot are read from the button,
 * the listing and its price are rebuilt on the server. A button from an earlier day is refused.
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith(`${BUY_ID_PREFIX}:`)) return;
    if (!interaction.inGuild()) return;

    const [, language, date, slotText] = interaction.customId.split(':');
    setLanguage(interaction, language);
    const t = getTranslator(interaction);

    try {
        const slot = Number(slotText);
        if (date !== getShopDate() || !Number.isInteger(slot) || slot < 0 || slot >= SHOP_SIZE) {
            await interaction.reply({ content: t('shop.expired'), ephemeral: true });
            return;
        }

        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        if (!claimBuyCooldown(`${guildID}:${userID}`)) {
            await interaction.reply({ content: t('shop.slow'), ephemeral: true });
            return;
        }

        await interaction.deferUpdate();

        const listing = getListings(guildID, date)[slot];
        const result = await buyListing(guildID, userID, date, listing);

        if (result !== 'bought') {
            await interaction.followUp({ content: t(`shop.${result}`, { price: t.coins(listing.price) }), ephemeral: true });
            if (result === 'soldOut') await interaction.editReply(await buildShopMessage(t, guildID)).catch(() => {});
            return;
        }

        await interaction.editReply(await buildShopMessage(t, guildID)).catch(() => {});
        await interaction.followUp({
            content: t('shop.bought', { user: interaction.user, animal: describeAnimal(t, listing), price: t.coins(listing.price) }),
        });
    } catch (error) {
        console.error('Shop purchase failed:', error);

        const failure = { content: t('shop.error'), ephemeral: true };
        await (interaction.deferred || interaction.replied ? interaction.followUp(failure) : interaction.reply(failure)).catch(() => {});
    }
};
