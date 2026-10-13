const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const ms = require('ms');
const {
    reasonOption,
    getReason,
    buildAuditReason,
    getHierarchyError,
    notifyTarget,
    recordCase,
} = require('../../utils/moderation');

const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 27 * 24 * 60 * 60 * 1000;

module.exports = {
    name: 'sustur',
    description: 'Kullanıcıyı belirli bir süreliğine susturur.',
    aliases: [{ name: 'mute', description: 'Times a member out for a given duration.', language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Susturulacak kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        {
            name: 'süre',
            description: 'Susturma süresi (örnek: 30m, 1h, 1d, 1w)',
            required: true,
            type: ApplicationCommandOptionType.String,
            max_length: 20,
        },
        reasonOption,
    ],

    /**
     * Times a member out for 5 seconds to 27 days, then records the case.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUserID = interaction.options.getUser('hedef-kullanıcı').id;
        const duration = interaction.options.getString('süre');
        const reason = getReason(interaction);

        await interaction.deferReply({ ephemeral: true });

        let targetUser;
        try {
            targetUser = await interaction.guild.members.fetch(targetUserID);
        } catch {
            await interaction.editReply({ content: t('common.userNotFound') });
            return;
        }

        if (targetUser.user.bot) {
            await interaction.editReply({ content: t('mute.bot') });
            return;
        }

        const msDuration = ms(duration);
        if (typeof msDuration !== 'number' || isNaN(msDuration)) {
            await interaction.editReply({ content: t('mute.invalidDuration') });
            return;
        }

        if (msDuration < MIN_TIMEOUT_MS || msDuration > MAX_TIMEOUT_MS) {
            await interaction.editReply({ content: t('mute.range') });
            return;
        }

        const hierarchyError = getHierarchyError(interaction, targetUser);
        if (hierarchyError) {
            await interaction.editReply({ content: hierarchyError });
            return;
        }

        if (!targetUser.moderatable) {
            await interaction.editReply({ content: t('mute.cannot') });
            return;
        }

        try {
            const { default: prettyMs } = await import('pretty-ms');
            const wasTimedOut = targetUser.isCommunicationDisabled();

            await targetUser.timeout(msDuration, buildAuditReason(interaction.user, reason));
            await recordCase({ guild: interaction.guild, user: targetUser.user, moderator: interaction.user, type: 'timeout', reason, durationMs: msDuration });
            await notifyTarget(targetUser.user, interaction.guild, 'timeout', reason);

            const readableDuration = prettyMs(msDuration, { verbose: true });
            await interaction.editReply({
                content: wasTimedOut
                    ? t('mute.updated', { user: targetUser.user.tag, duration: readableDuration })
                    : t('mute.done', { user: targetUser.user.tag, duration: readableDuration, reason }),
            });
        } catch (error) {
            console.error('Failed to time out the user:', error);
            await interaction.editReply({ content: t('mute.error') });
        }
    }
}
