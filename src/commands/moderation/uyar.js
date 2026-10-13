const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const moderationCaseSchema = require('../../schemas/moderationCaseSchema');
const { reasonOption, getReason, getHierarchyError, notifyTarget, recordCase, getCaseCode } = require('../../utils/moderation');

module.exports = {
    name: 'uyar',
    description: 'Kullanıcıya uyarı verir ve siciline işler.',
    aliases: [{ name: "warn", description: "Warns a member and adds the warning to the member's record.", language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Uyarılacak kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        { ...reasonOption, required: true },
    ],

    /**
     * Adds a warning to the member's record and tells the member by DM.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const reason = getReason(interaction);

        await interaction.deferReply({ ephemeral: true });

        if (targetUser.bot) {
            await interaction.editReply({ content: t('warn.bot') });
            return;
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            await interaction.editReply({ content: t('common.userNotFound') });
            return;
        }

        const hierarchyError = getHierarchyError(interaction, targetMember, false);
        if (hierarchyError) {
            await interaction.editReply({ content: hierarchyError });
            return;
        }

        const moderationCase = await recordCase({ guild: interaction.guild, user: targetUser, moderator: interaction.user, type: 'warn', reason });
        const wasNotified = await notifyTarget(targetUser, interaction.guild, 'warn', reason);
        const warningCount = await moderationCaseSchema.countDocuments({ guildID: interaction.guild.id, userID: targetUser.id, type: 'warn' });

        await interaction.editReply({
            content: t('warn.done', { user: targetUser.tag, code: getCaseCode(moderationCase), count: warningCount })
                + (wasNotified ? '' : `\n${t('warn.dmClosed')}`),
        });
    }
};
