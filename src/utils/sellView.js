const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const economySchema = require('../schemas/economySchema');
const { getAccount } = require('./economy');
const { rarities } = require('./animals');

const SELL_ID_PREFIX = 'sellAnimal';
const MODE_ID_PREFIX = 'sellMode';
const BUTTONS_PER_ROW = 5;

/** How many animals one press sells. `all` sells every animal of the pressed species. */
const sellModes = ['1', '10', 'all'];
const DEFAULT_MODE = sellModes[0];

/** Hunted species by id, with the sell price of their rarity. The only ids a sale accepts. */
const sellableAnimals = new Map();
for (const rarity of [...rarities].reverse()) {
    for (const animal of rarity.animals) sellableAnimals.set(animal.id, { ...animal, rarityId: rarity.id, price: rarity.price });
}

/**
 * Sells up to the mode's amount of one species. The count check, the removal and the payment are one
 * atomic update, so two presses at once can never sell the same animal twice.
 * @returns {Promise<{ count: number, earnings: number } | null>} null when the member has none left.
 */
const sellAnimals = async (guildID, userID, animalId, mode) => {
    const animal = sellableAnimals.get(animalId);
    if (!animal || !sellModes.includes(mode)) return null;

    const account = await getAccount(guildID, userID);
    const owned = account.animals.get(animalId) ?? 0;
    const count = mode === 'all' ? owned : Math.min(Number(mode), owned);
    if (!Number.isSafeInteger(count) || count <= 0) return null;

    const earnings = count * animal.price;
    const field = `animals.${animalId}`;

    const sold = await economySchema.findOneAndUpdate(
        { guildID, userID, [field]: { $gte: count } },
        { $inc: { [field]: -count, balance: earnings } },
    );

    return sold ? { count, earnings } : null;
};

/**
 * Builds the member's sell list: each hunted species they hold is shown with its number, count and price,
 * and a button with the same number. A species keeps its number when another one sells out, so a
 * repeated press never lands on a different animal. A second row of buttons picks how many one press sells.
 * Returns null when the member has nothing to sell. Shop animals are not listed, they cannot be sold.
 * @param {string} mode one of sellModes
 * @param {string} [status] line shown above the list, the result of the last sale
 */
const buildSellMessage = async (t, guildID, userID, mode = DEFAULT_MODE, status = '') => {
    const account = await getAccount(guildID, userID);

    const lines = status ? [status, ''] : [];
    const animalRows = [];
    let lastRarityId = null;
    let number = 0;
    let shownCount = 0;
    let totalValue = 0;

    for (const animal of sellableAnimals.values()) {
        number += 1;

        const count = account.animals.get(animal.id) ?? 0;
        if (count <= 0) continue;

        shownCount += 1;
        totalValue += count * animal.price;

        if (animal.rarityId !== lastRarityId) {
            if (lastRarityId !== null) lines.push('');
            lines.push(`**${t(`rarity.${animal.rarityId}`)}**`);
            lastRarityId = animal.rarityId;
        }
        lines.push(`\`${String(number).padStart(2)}\` ${animal.emoji} ${t(`animal.${animal.id}`)} ×${count} • ${t('sell.each', { coins: t.coins(animal.price) })}`);

        if ((shownCount - 1) % BUTTONS_PER_ROW === 0) animalRows.push(new ActionRowBuilder());
        animalRows[animalRows.length - 1].addComponents(
            new ButtonBuilder()
                .setCustomId(`${SELL_ID_PREFIX}:${t.language}:${userID}:${mode}:${animal.id}`)
                .setLabel(String(number))
                .setEmoji(animal.emoji)
                .setStyle(ButtonStyle.Secondary),
        );
    }

    if (shownCount === 0) return null;

    const modeRow = new ActionRowBuilder().addComponents(sellModes.map((sellMode) => new ButtonBuilder()
        .setCustomId(`${MODE_ID_PREFIX}:${t.language}:${userID}:${sellMode}`)
        .setLabel(sellMode === 'all' ? t('sell.modeAll') : `×${sellMode}`)
        .setStyle(sellMode === mode ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(sellMode === mode)));

    const embed = new EmbedBuilder()
        .setTitle(t('sell.title'))
        .setDescription(lines.join('\n'))
        .setFooter({ text: t('sell.footer', { wallet: t.number(account.balance), value: t.number(totalValue) }) })
        .setColor('Gold');

    return { embeds: [embed], components: [...animalRows, modeRow] };
};

module.exports = { SELL_ID_PREFIX, MODE_ID_PREFIX, DEFAULT_MODE, sellModes, sellableAnimals, sellAnimals, buildSellMessage };
