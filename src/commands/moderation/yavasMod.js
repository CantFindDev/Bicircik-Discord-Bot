const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { buildAuditReason } = require('../../utils/moderation');

const MAX_SLOWMODE_SECONDS = 21600;

module.exports = {
    name: 'yavaş-mod',
    description: 'Bulunduğun kanalın yavaş modunu ayarlar.',
    aliases: [{ name: 'slowmode', description: 'Sets the slowmode of the current channel.', language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],

    options: [
        {
            name: 'saniye',
            description: 'Mesajlar arası bekleme süresi, kapatmak için 0',
            required: true,
            type: ApplicationCommandOptionType.Integer,
            min_value: 0,
            max_value: MAX_SLOWMODE_SECONDS,
        },
    ],

    /**
     * Sets the slowmode of the current text channel, 0 turns it off.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const seconds = interaction.options.getInteger('saniye');

        if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_SLOWMODE_SECONDS) {
            await interaction.reply({ content: t('slowmode.range', { max: MAX_SLOWMODE_SECONDS }), ephemeral: true });
            return;
        }

        if (typeof interaction.channel?.setRateLimitPerUser !== 'function') {
            await interaction.reply({ content: t('slowmode.unsupported'), ephemeral: true });
            return;
        }

        try {
            await interaction.channel.setRateLimitPerUser(seconds, buildAuditReason(interaction.user, 'Yavaş mod'));
            await interaction.reply({
                content: seconds === 0 ? t('slowmode.off') : t('slowmode.set', { seconds }),
                ephemeral: true,
            });
        } catch (error) {
            console.error('Failed to set slowmode:', error);
            await interaction.reply({ content: t('slowmode.error'), ephemeral: true });
        }
    }
};
