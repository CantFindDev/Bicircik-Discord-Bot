const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const {
    reasonOption,
    getReason,
    buildAuditReason,
    claimMemberRemoval,
    getHierarchyError,
    notifyTarget,
    recordCase,
} = require('../../utils/moderation');

module.exports = {
    name: 'kick',
    description: "Sunucudan bir kullanıcıyı atar.",
    language: 'auto',

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.KickMembers],
    botPermissions: [PermissionFlagsBits.KickMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: "Atılacak kullanıcı",
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        reasonOption,
    ],

    /**
     * Kicks a member the command user and the bot both outrank, then records the case.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUserID = interaction.options.getUser('hedef-kullanıcı').id;
        const reason = getReason(interaction);

        await interaction.deferReply({ ephemeral: true });

        let targetUser;
        try {
            targetUser = await interaction.guild.members.fetch(targetUserID);
        } catch {
            await interaction.editReply({ content: t('common.userNotFound') });
            return;
        }

        const hierarchyError = getHierarchyError(interaction, targetUser);
        if (hierarchyError) {
            await interaction.editReply({ content: hierarchyError });
            return;
        }

        if (!targetUser.kickable) {
            await interaction.editReply({ content: t('kick.cannot') });
            return;
        }

        if (!claimMemberRemoval(interaction)) {
            await interaction.editReply({ content: t('mod.rateLimited') });
            return;
        }

        try {
            await notifyTarget(targetUser.user, interaction.guild, 'kick', reason);
            await targetUser.kick(buildAuditReason(interaction.user, reason));
            await recordCase({ guild: interaction.guild, user: targetUser.user, moderator: interaction.user, type: 'kick', reason });
            await interaction.editReply({ content: t('kick.done', { user: targetUser.user.tag, reason }) });
        } catch (error) {
            console.error('Failed to kick the user:', error);
            await interaction.editReply({ content: t('kick.error') });
        }
    }
}
