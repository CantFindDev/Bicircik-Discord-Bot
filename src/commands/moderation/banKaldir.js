const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { reasonOption, getReason, buildAuditReason, recordCase } = require('../../utils/moderation');

const userIdPattern = /^\d{17,20}$/;

module.exports = {
    name: 'ban-kaldır',
    description: 'Kullanıcının sunucu yasağını kaldırır.',
    aliases: [{ name: "unban", description: "Lifts a user's ban.", language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

    options: [
        {
            name: 'kullanıcı-id',
            description: 'Yasağı kaldırılacak kullanıcının ID\'si',
            required: true,
            type: ApplicationCommandOptionType.String,
            min_length: 17,
            max_length: 20,
        },
        reasonOption,
    ],

    /**
     * Lifts the ban of a user given by id, then records the case.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const userId = interaction.options.getString('kullanıcı-id').trim();
        const reason = getReason(interaction);

        await interaction.deferReply({ ephemeral: true });

        if (!userIdPattern.test(userId)) {
            await interaction.editReply({ content: t('unban.invalidId') });
            return;
        }

        const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!ban) {
            await interaction.editReply({ content: t('unban.notBanned') });
            return;
        }

        try {
            await interaction.guild.bans.remove(userId, buildAuditReason(interaction.user, reason));
            await recordCase({ guild: interaction.guild, user: ban.user, moderator: interaction.user, type: 'unban', reason });
            await interaction.editReply({ content: t('unban.done', { user: ban.user.tag }) });
        } catch (error) {
            console.error('Failed to lift the ban:', error);
            await interaction.editReply({ content: t('unban.error') });
        }
    }
};
