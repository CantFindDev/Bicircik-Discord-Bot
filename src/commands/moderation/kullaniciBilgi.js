const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const moderationCaseSchema = require('../../schemas/moderationCaseSchema');

const SHOWN_ROLE_COUNT = 15;

const toTimestamp = (date) => `<t:${Math.floor(date.getTime() / 1000)}:F> (<t:${Math.floor(date.getTime() / 1000)}:R>)`;

module.exports = {
    name: 'kullanıcı-bilgi',
    description: 'Kullanıcının hesap ve sunucu bilgilerini gösterir.',
    aliases: [{ name: "userinfo", description: "Shows a member's account and server details.", language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Bilgileri görüntülenecek kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
    ],

    /**
     * Shows account age, join date, roles and warning count, visible only to the moderator.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');

        await interaction.deferReply({ ephemeral: true });

        const [targetMember, warningCount] = await Promise.all([
            interaction.guild.members.fetch(targetUser.id).catch(() => null),
            moderationCaseSchema.countDocuments({ guildID: interaction.guild.id, userID: targetUser.id, type: 'warn' }),
        ]);

        const embed = new EmbedBuilder()
            .setTitle(targetUser.tag)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: 'ID', value: `\`${targetUser.id}\``, inline: true },
                { name: t('userinfo.bot'), value: t(targetUser.bot ? 'userinfo.yes' : 'userinfo.no'), inline: true },
                { name: t('userinfo.warnings'), value: String(warningCount), inline: true },
                { name: t('userinfo.created'), value: toTimestamp(targetUser.createdAt) },
            )
            .setColor('Blue');

        if (targetMember) {
            const roles = targetMember.roles.cache
                .filter((role) => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map((role) => `${role}`);

            embed.addFields(
                { name: t('userinfo.joined'), value: targetMember.joinedAt ? toTimestamp(targetMember.joinedAt) : t('userinfo.unknown') },
                {
                    name: t('userinfo.roles', { count: roles.length }),
                    value: roles.slice(0, SHOWN_ROLE_COUNT).join(' ') + (roles.length > SHOWN_ROLE_COUNT ? ' ...' : '') || t('userinfo.none'),
                },
            );
        } else {
            embed.addFields({ name: t('userinfo.server'), value: t('userinfo.notInServer') });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
