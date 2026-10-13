const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { reasonOption, getReason, buildAuditReason, getHierarchyError, recordCase } = require('../../utils/moderation');

module.exports = {
    name: 'susturma-kaldır',
    description: 'Kullanıcının susturmasını kaldırır.',
    aliases: [{ name: "unmute", description: "Ends a member's timeout.", language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Susturması kaldırılacak kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        reasonOption,
    ],

    /**
     * Ends the member's timeout early, then records the case.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const reason = getReason(interaction);

        await interaction.deferReply({ ephemeral: true });

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            await interaction.editReply({ content: t('common.userNotFound') });
            return;
        }

        if (!targetMember.isCommunicationDisabled()) {
            await interaction.editReply({ content: t('unmute.notMuted') });
            return;
        }

        const hierarchyError = getHierarchyError(interaction, targetMember);
        if (hierarchyError) {
            await interaction.editReply({ content: hierarchyError });
            return;
        }

        if (!targetMember.moderatable) {
            await interaction.editReply({ content: t('unmute.cannot') });
            return;
        }

        try {
            await targetMember.timeout(null, buildAuditReason(interaction.user, reason));
            await recordCase({ guild: interaction.guild, user: targetUser, moderator: interaction.user, type: 'untimeout', reason });
            await interaction.editReply({ content: t('unmute.done', { user: targetUser.tag }) });
        } catch (error) {
            console.error('Failed to remove the timeout:', error);
            await interaction.editReply({ content: t('unmute.error') });
        }
    }
};
