const { Client, Interaction } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { buildShopMessage } = require('../../utils/shopView');

module.exports = {
    name: 'mağaza',
    description: 'Her gün değişen egzotik hayvan mağazasını gösterir.',
    aliases: [{ name: 'shop', description: 'Shows the exotic animal shop, which changes every day.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 10,

    /**
     * Shows today's five exotic animals with buy buttons. Buying is handled in events/interactionCreate/handleShop.js.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);

        await interaction.reply(await buildShopMessage(t, interaction.guild.id));
    }
};
