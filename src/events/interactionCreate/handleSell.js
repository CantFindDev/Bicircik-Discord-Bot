const { Client, Interaction } = require('discord.js');
const { SELL_ID_PREFIX, MODE_ID_PREFIX, sellModes, sellableAnimals, sellAnimals, buildSellMessage } = require('../../utils/sellView');
const { setLanguage, getTranslator } = require('../../utils/language');

const PRESS_COOLDOWN_MS = 500;
const SWEEP_INTERVAL_MS = 60_000;

const lastPressAt = new Map();

setInterval(() => {
    const cutoff = Date.now() - PRESS_COOLDOWN_MS;
    for (const [key, time] of lastPressAt) {
        if (time < cutoff) lastPressAt.delete(key);
    }
}, SWEEP_INTERVAL_MS).unref();

/**
 * Handles the buttons of the sell list: a numbered button sells that species, a mode button changes
 * how many one press sells. Only the owner of the list may press. The animal id and the mode are
 * checked against the known lists before they are used, and the list is rebuilt from the database after every press.
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    if (!interaction.isButton() || !interaction.inGuild()) return;

    const [prefix, language, ownerID, mode, animalId] = interaction.customId.split(':');
    if (prefix !== SELL_ID_PREFIX && prefix !== MODE_ID_PREFIX) return;

    setLanguage(interaction, language);
    const t = getTranslator(interaction);

    try {
        if (interaction.user.id !== ownerID) {
            await interaction.reply({ content: t('sell.notYours'), ephemeral: true });
            return;
        }

        if (!sellModes.includes(mode) || (prefix === SELL_ID_PREFIX && !sellableAnimals.has(animalId))) return;

        const guildID = interaction.guild.id;
        const pressKey = `${guildID}:${ownerID}`;
        const now = Date.now();

        if (now - (lastPressAt.get(pressKey) ?? 0) < PRESS_COOLDOWN_MS) {
            await interaction.deferUpdate();
            return;
        }
        lastPressAt.set(pressKey, now);

        let status = '';
        if (prefix === SELL_ID_PREFIX) {
            const animal = sellableAnimals.get(animalId);
            const sale = await sellAnimals(guildID, ownerID, animalId, mode);

            status = sale
                ? t('sell.sold', { count: sale.count, animal: `${animal.emoji} ${t(`animal.${animal.id}`)}`, coins: t.coins(sale.earnings) })
                : t('sell.noneLeft');
        }

        const sellMessage = await buildSellMessage(t, guildID, ownerID, mode, status);
        await interaction.update(sellMessage ?? { content: [status, t('sell.nothing')].filter(Boolean).join('\n'), embeds: [], components: [] });
    } catch (error) {
        console.error('Selling an animal failed:', error);
    }
};
