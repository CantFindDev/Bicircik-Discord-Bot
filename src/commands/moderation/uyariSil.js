const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const moderationCaseSchema = require('../../schemas/moderationCaseSchema');
const { getCaseCode } = require('../../utils/moderation');
const LogBuilder = require('../../utils/logBuilder');

const caseCodePattern = /^[0-9a-f]{6}$/;

module.exports = {
    name: 'uyarı-sil',
    description: 'Kullanıcının sicilinden bir uyarıyı siler.',
    aliases: [{ name: "unwarn", description: "Deletes a warning from a member's record.", language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Uyarısı silinecek kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User,
        },
        {
            name: 'vaka',
            description: '/sicil komutunda görünen 6 haneli vaka kodu',
            required: true,
            type: ApplicationCommandOptionType.String,
            min_length: 6,
            max_length: 6,
        },
    ],

    /**
     * Deletes one warning of the member, found by its case code.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const targetUser = interaction.options.getUser('hedef-kullanıcı');
        const caseCode = interaction.options.getString('vaka').toLowerCase();

        await interaction.deferReply({ ephemeral: true });

        if (!caseCodePattern.test(caseCode)) {
            await interaction.editReply({ content: t('unwarn.badCode') });
            return;
        }

        if (targetUser.id === interaction.user.id && interaction.user.id !== interaction.guild.ownerId) {
            await interaction.editReply({ content: t('unwarn.self') });
            return;
        }

        const warnings = await moderationCaseSchema.find({ guildID: interaction.guild.id, userID: targetUser.id, type: 'warn' });
        const warning = warnings.find((moderationCase) => getCaseCode(moderationCase) === caseCode);

        if (!warning) {
            await interaction.editReply({ content: t('unwarn.notFound') });
            return;
        }

        await warning.deleteOne();

        await new LogBuilder(interaction.guild)
            .setTitle('🧹 Uyarı Silindi')
            .addField('Kullanıcı', `${targetUser.tag} (\`${targetUser.id}\`)`, true)
            .addField('Yetkili', interaction.user.tag, true)
            .addField('Silinen Uyarı', warning.reason)
            .setColor('Green')
            .send();

        await interaction.editReply({ content: t('unwarn.done', { user: targetUser.tag, code: caseCode }) });
    }
};
