const { Client, Interaction } = require('discord.js');
const { PAGE_ID_PREFIX, buildZooMessage } = require('../../utils/zooView');
const { setLanguage, getTranslator } = require('../../utils/language');

const PAGE_COOLDOWN_MS = 1000;
const SWEEP_INTERVAL_MS = 60_000;
const MAX_TITLE_LENGTH = 256;

const userIdPattern = /^\d{17,20}$/;
const lastPageAt = new Map();

setInterval(() => {
    const cutoff = Date.now() - PAGE_COOLDOWN_MS;
    for (const [userID, time] of lastPageAt) {
        if (time < cutoff) lastPageAt.delete(userID);
    }
}, SWEEP_INTERVAL_MS).unref();

/**
 * Handles the page buttons under a zoo list. Anyone may turn the pages. Each press reads the page
 * from the database again, limited to one press per second per member.
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith(`${PAGE_ID_PREFIX}:`)) return;
    if (!interaction.inGuild()) return;

    const [, language, ownerID, pageText] = interaction.customId.split(':');
    const page = Number(pageText);
    if (!userIdPattern.test(ownerID) || !Number.isInteger(page)) return;

    const now = Date.now();
    if (now - (lastPageAt.get(interaction.user.id) ?? 0) < PAGE_COOLDOWN_MS) {
        await interaction.deferUpdate().catch(() => {});
        return;
    }
    lastPageAt.set(interaction.user.id, now);

    setLanguage(interaction, language);
    const t = getTranslator(interaction);

    try {
        const title = (interaction.message.embeds[0]?.title ?? '').slice(0, MAX_TITLE_LENGTH);
        const zooMessage = await buildZooMessage(t, interaction.guild.id, ownerID, title, page);

        await interaction.update(zooMessage ?? { content: t('zoo.nowEmpty'), embeds: [], components: [] });
    } catch (error) {
        console.error('Zoo page change failed:', error);
    }
};
