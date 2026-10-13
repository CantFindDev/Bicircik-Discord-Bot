const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const shopStockSchema = require('../schemas/shopStockSchema');
const { getShopDate, getNextReset, getListings, getSpeciesEmoji } = require('./dailyShop');

const BUY_ID_PREFIX = 'shopBuy';

/** "🐼 Cosmic Panda" for a listing or a bought animal. */
const describeAnimal = (t, animal) => `${getSpeciesEmoji(animal.species)} ${t(`shop.tier.${animal.tier}`)} ${t(`shop.species.${animal.species}`)}`;

const formatStats = (animal) => `💪 ${animal.power} ⚡ ${animal.speed} 🍀 ${animal.luck}`;

/**
 * Builds today's shop message for a guild: one embed field and one buy button per listing.
 * A button id carries the reply language, the shop day and the slot. The buy handler takes nothing
 * else from it and rebuilds the listing itself.
 */
const buildShopMessage = async (t, guildID, now = Date.now()) => {
    const date = getShopDate(now);
    const listings = getListings(guildID, date);

    const stocks = await shopStockSchema.find({ guildID, date }).lean();
    const soldBySlot = new Map(stocks.map((stock) => [stock.slot, stock.sold]));

    const embed = new EmbedBuilder()
        .setTitle(t('shop.title'))
        .setDescription(t('shop.description', { reset: `<t:${Math.floor(getNextReset(now).getTime() / 1000)}:R>` }))
        .setColor('Purple');

    const buttons = new ActionRowBuilder();

    for (const listing of listings) {
        const left = Math.max(listing.stock - (soldBySlot.get(listing.slot) ?? 0), 0);

        embed.addFields({
            name: `${listing.slot + 1}. ${describeAnimal(t, listing)}`,
            value: t('shop.listing', {
                trait: t(`shop.trait.${listing.trait}`),
                stats: formatStats(listing),
                price: t.coins(listing.price),
                stock: left > 0 ? t('shop.stock', { left, stock: listing.stock }) : t('shop.noStock'),
            }),
        });

        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`${BUY_ID_PREFIX}:${t.language}:${date}:${listing.slot}`)
                .setLabel(String(listing.slot + 1))
                .setEmoji(listing.emoji)
                .setStyle(ButtonStyle.Success)
                .setDisabled(left === 0),
        );
    }

    return { embeds: [embed], components: [buttons] };
};

module.exports = { BUY_ID_PREFIX, describeAnimal, formatStats, buildShopMessage };
