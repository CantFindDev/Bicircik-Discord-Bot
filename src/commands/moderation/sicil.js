const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const moderationCaseSchema = require('../../schemas/moderationCaseSchema');
const { getCaseCode } = require('../../utils/moderation');

const SHOWN_CASE_COUNT = 10;
const SHOWN_REASON_LENGTH = 150;

module.exports = {
    name: 'sicil',
    description: 'Kullanıcının moderasyon geçmişini gösterir.',
    aliases: [{ name: "history", description: "Shows a member's moderation history.", language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Sicili görüntülenecek kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
    ],

    /**
     * Shows the member's latest cases and the total number of warnings, visible only to the moderator.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const owner = { guildID: interaction.guild.id, userID: targetUser.id };

        await interaction.deferReply({ ephemeral: true });

        const [cases, totalCount, warningCount] = await Promise.all([
            moderationCaseSchema.find(owner).sort({ createdAt: -1 }).limit(SHOWN_CASE_COUNT),
            moderationCaseSchema.countDocuments(owner),
            moderationCaseSchema.countDocuments({ ...owner, type: 'warn' }),
        ]);

        if (!cases.length) {
            await interaction.editReply({ content: t('history.clean', { user: targetUser.tag }) });
            return;
        }

        const lines = cases.map((moderationCase) => {
            const createdAt = Math.floor(moderationCase.createdAt.getTime() / 1000);
            const reason = moderationCase.reason.slice(0, SHOWN_REASON_LENGTH);
            return `\`${getCaseCode(moderationCase)}\` **${t(`case.${moderationCase.type}`)}** • <t:${createdAt}:d> • <@${moderationCase.moderatorID}>\n${reason}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(t('history.title', { user: targetUser.tag }))
            .setThumbnail(targetUser.displayAvatarURL())
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: t('history.footer', { total: totalCount, warnings: warningCount, shown: cases.length }) })
            .setColor('Orange');

        await interaction.editReply({ embeds: [embed] });
    }
};
