const { Client, Interaction, EmbedBuilder } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const economySchema = require('../../schemas/economySchema');

const SHOWN_ACCOUNT_COUNT = 10;
const medals = ['🥇', '🥈', '🥉'];

module.exports = {
    name: 'zenginler',
    description: 'Sunucunun en zengin 10 üyesini gösterir.',
    aliases: [{ name: 'rich', description: 'Shows the 10 richest members of the server.', language: 'en' }],

    mainOnly: true,
    skipUsageLog: true,
    cooldownSeconds: 10,

    /**
     * Lists the ten largest balances in the guild.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const accounts = await economySchema
            .find({ guildID: interaction.guild.id, balance: { $gt: 0 } })
            .sort({ balance: -1 })
            .limit(SHOWN_ACCOUNT_COUNT)
            .lean();

        if (!accounts.length) {
            await interaction.reply({ content: t('rich.empty'), ephemeral: true });
            return;
        }

        const lines = accounts.map((account, index) => `${medals[index] ?? `**${index + 1}.**`} <@${account.userID}> • ${t.coins(account.balance)}`);

        const embed = new EmbedBuilder()
            .setTitle(t('rich.title'))
            .setDescription(lines.join('\n'))
            .setColor('Gold');

        await interaction.reply({ embeds: [embed] });
    }
};
