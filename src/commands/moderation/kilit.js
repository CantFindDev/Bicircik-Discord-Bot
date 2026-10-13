const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getTranslator } = require('../../utils/language');
const { reasonOption, getReason, buildAuditReason } = require('../../utils/moderation');
const LogBuilder = require('../../utils/logBuilder');

module.exports = {
    name: 'kilit',
    description: 'Bulunduğun kanalı mesaj yazmaya kapatır veya açar.',
    aliases: [{ name: 'lock', description: 'Locks or unlocks the current channel for messages.', language: 'en' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],

    options: [
        {
            name: 'işlem',
            description: 'Kanal kilitlensin mi, açılsın mı',
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: 'kilitle', value: 'lock' },
                { name: 'aç', value: 'unlock' },
            ],
        },
        reasonOption,
    ],

    /**
     * Denies or restores Send Messages for @everyone on the current text channel.
     * Unlocking clears the override, so the channel goes back to what its category or the server allows.
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const t = getTranslator(interaction);
        const isLocking = interaction.options.getString('işlem') === 'lock';
        const reason = getReason(interaction);
        const channel = interaction.channel;

        if (channel?.type !== ChannelType.GuildText) {
            await interaction.reply({ content: t('lock.textOnly'), ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                { SendMessages: isLocking ? false : null },
                { reason: buildAuditReason(interaction.user, reason) },
            );
        } catch (error) {
            console.error('Failed to change the channel lock:', error);
            await interaction.editReply({ content: t('lock.error') });
            return;
        }

        await channel.send(isLocking ? t('lock.announceLocked', { reason }) : t('lock.announceUnlocked')).catch(() => {});

        await new LogBuilder(interaction.guild)
            .setTitle(isLocking ? '🔒 Kanal Kilitlendi' : '🔓 Kanal Kilidi Açıldı')
            .addField('Kanal', `${channel}`, true)
            .addField('Yetkili', interaction.user.tag, true)
            .addField('Sebep', reason)
            .setColor(isLocking ? 'Red' : 'Green')
            .send();

        await interaction.editReply({ content: t(isLocking ? 'lock.locked' : 'lock.unlocked') });
    }
};
