const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, RESTJSONErrorCodes } = require('discord.js');
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

/**
 * Fetches the member, or returns null when the user is not in the guild.
 * Any other failure is thrown, so a failed lookup can never be mistaken for "not a member" and skip the role checks.
 */
const fetchMemberOrNull = async (guild, userId) => {
    try {
        return await guild.members.fetch(userId);
    } catch (error) {
        if (error.code === RESTJSONErrorCodes.UnknownMember) return null;
        throw error;
    }
};

module.exports = {
    name: 'ban',
    description: "Sunucudan bir kullanıcıyı tamamen atar!",
    language: 'auto',

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

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
     * Bans a user, then records the case. A member must be outranked by the command user and the bot.
     * A user who is not in the guild (picked by pasting the ID) can be banned too.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const reason = getReason(interaction);

        await interaction.deferReply({ ephemeral: true });

        const targetMember = await fetchMemberOrNull(interaction.guild, targetUser.id);

        if (targetMember) {
            const hierarchyError = getHierarchyError(interaction, targetMember);
            if (hierarchyError) {
                await interaction.editReply({ content: hierarchyError });
                return;
            }

            if (!targetMember.bannable) {
                await interaction.editReply({ content: t('ban.cannot') });
                return;
            }
        } else if (await interaction.guild.bans.fetch(targetUser.id).catch(() => null)) {
            await interaction.editReply({ content: t('ban.already') });
            return;
        }

        if (!claimMemberRemoval(interaction)) {
            await interaction.editReply({ content: t('mod.rateLimited') });
            return;
        }

        try {
            if (targetMember) await notifyTarget(targetUser, interaction.guild, 'ban', reason);
            await interaction.guild.bans.create(targetUser.id, { reason: buildAuditReason(interaction.user, reason) });
            await recordCase({ guild: interaction.guild, user: targetUser, moderator: interaction.user, type: 'ban', reason });
            await interaction.editReply({ content: t('ban.done', { user: targetUser.tag, reason }) });
        } catch (error) {
            console.error('Failed to ban the user:', error);
            await interaction.editReply({ content: t('ban.error') });
        }
    }
};
