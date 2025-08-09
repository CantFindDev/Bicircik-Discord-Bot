const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'sustur',
    description: 'Kullanıcıyı belirli bir süreliğine susturur.',

    memberPermissions: [PermissionFlagsBits.MuteMembers],
    botPermissions: [PermissionFlagsBits.MuteMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: 'Susturulacak kullanıcı',
            required: true,
            type: ApplicationCommandOptionType.User, // User yapıldı
        },
        {
            name: 'süre',
            description: 'Susturma süresi (örnek: 30m, 1h, 1d, 1w)',
            required: true,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'sebep',
            description: 'Susturma sebebi',
            required: false,
            type: ApplicationCommandOptionType.String,
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const targetUserID = interaction.options.get('hedef-kullanıcı').value;
        const duration = interaction.options.get('süre').value;
        const reason = interaction.options.get('sebep')?.value || "Sebep belirtilmemiş";

        await interaction.deferReply({ ephemeral: true });

        let targetUser;
        try {
            targetUser = await interaction.guild.members.fetch(targetUserID);
        } catch {
            await interaction.editReply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
            return;
        }

        if (targetUser.user.bot) {
            await interaction.editReply({ content: 'Botları susturamam.', ephemeral: true });
            return;
        }

        const msDuration = ms(duration);
        if (isNaN(msDuration)) {
            await interaction.editReply({ content: "Lütfen geçerli bir süre girin. Örnek: 30m, 1h, 1d, 1w", ephemeral: true });
            return;
        }

        if (msDuration < 5000 || msDuration > 27 * 24 * 60 * 60 * 1000) { // 27 gün milisaniye
            await interaction.editReply({ content: "Süre 5 saniyeden az veya 27 günden fazla olamaz.", ephemeral: true });
            return;
        }

        const targetUserRolePosition = targetUser.roles.highest.position;
        const requesterRolePosition = interaction.member.roles.highest.position;
        const botRolePosition = interaction.guild.members.me.roles.highest.position;

        if (targetUserRolePosition >= requesterRolePosition) {
            await interaction.editReply({ content: 'Senden daha üst veya aynı role sahip bir kullanıcıyı susturamazsın.', ephemeral: true });
            return;
        }

        if (targetUserRolePosition >= botRolePosition) {
            await interaction.editReply({ content: 'Benden daha üst veya aynı role sahip bir kullanıcıyı susturamam.', ephemeral: true });
            return;
        }

        try {
            const { default: prettyMs } = await import('pretty-ms');

            if (targetUser.isCommunicationDisabled()) {
                await targetUser.timeout(msDuration, reason);
                await interaction.editReply({ content: `${targetUser.user.tag} kullanıcısının susturma süresi ${prettyMs(msDuration, { verbose: true })} olarak güncellendi.`, ephemeral: true });
                return;
            }

            await targetUser.timeout(msDuration, reason);
            await interaction.editReply({ content: `${targetUser.user.tag} ${prettyMs(msDuration, { verbose: true })} boyunca susturuldu.\nSebep: ${reason}`, ephemeral: true });

        } catch (error) {
            console.error('Kullanıcıyı sustururken hata oluştu:', error);
            await interaction.editReply({ content: 'Susturma işlemi sırasında bir hata oluştu.', ephemeral: true });
        }
    }
}
