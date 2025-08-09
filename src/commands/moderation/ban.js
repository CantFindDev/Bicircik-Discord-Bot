const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'ban',
    description: "Sunucudan bir kullanıcıyı tamamen atar!",

    memberPermissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: "Atılacak kullanıcı",
            required: true,
            type: ApplicationCommandOptionType.User,
        },
         {
             name: 'sebep',
            description: 'Kullanıcının atılma sebebi',
            type: ApplicationCommandOptionType.String,
        }
    ],
    
    callback: async (client, interaction) => {
        const targetUserID = interaction.options.getUser('hedef-kullanıcı').id;
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

        await interaction.deferReply({ ephemeral: true });

        let targetUser;
        try {
            targetUser = await interaction.guild.members.fetch(targetUserID);
        } catch {
            await interaction.editReply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
            return;
        }

        if (targetUser.id === interaction.guild.ownerId) {
            await interaction.editReply({ content: 'Sunucu sahibini atamazsın!.', ephemeral: true });
            return;
        }

        if (targetUser.id === interaction.user.id) {
            await interaction.editReply({ content: 'Kendini atman pek mantıklı olmayabilir.', ephemeral: true });
            return;
        }

        if (targetUser.id === client.user.id) {
            await interaction.editReply({ content: 'Kendi kendimi atamam.', ephemeral: true });
            return;
        }

        const targetUserRolePosition = targetUser.roles.highest.position;
        const requesterRolePosition = interaction.member.roles.highest.position;
        const botRolePosition = interaction.guild.members.me.roles.highest.position;

        if (targetUserRolePosition >= requesterRolePosition) {
            await interaction.editReply({ content: 'Senden daha üst veya aynı role sahip bir kullanıcıyı atamazsın.', ephemeral: true });
            return;
        }

        if (targetUserRolePosition >= botRolePosition) {
            await interaction.editReply({ content: 'Benden daha üst veya aynı role sahip bir kullanıcıyı atamam.', ephemeral: true });
            return;
        }

        try {
            await targetUser.ban({ reason });
            await interaction.editReply({ content: `${targetUser} kullanıcısı sunucudan atıldı. Sebep: ${reason}`, ephemeral: false });
        } catch (error) {
            console.error('Kullanıcıyı atarken bir hata oluştu:', error);
            await interaction.editReply({ content: 'Kullanıcıyı atarken bir hata oluştu.', ephemeral: true });
        }
    }
};
