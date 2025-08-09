const { Client,Interaction, ApplicationCommandOptionType,PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'kick',
    description: "Sunucudan bir kullanıcıyı atar.",

    memberPermissions: [PermissionFlagsBits.KickMembers],
    botPermissions: [PermissionFlagsBits.KickMembers],

    options: [
        {
            name: 'hedef-kullanıcı',
            description: "Atılacak kullanıcı",
            required: true,
            type: ApplicationCommandOptionType.Mentionable,
        },
         {
             name: 'sebep',
            description: 'Kullanıcının atılma sebebi',
            type: ApplicationCommandOptionType.String,
        }
    ],    

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const targetUserID = interaction.options.get('hedef-kullanıcı').value;
        const reason = interaction.options.get('sebep')?.value || 'Sebep belirtilmedi.';

        await interaction.deferReply({ ephemeral: true });

        const targetUser = await interaction.guild.members.fetch(targetUserID);

        if (!targetUser) {
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

        const targetUserRolePosition = targetUser.roles.highest.position; //Highest role of the target user
        const requesterRolePosition = interaction.member.roles.highest.position; //Highest role of the requester
        const botRolePosition = interaction.guild.members.me.roles.highest.position; //Highest role of the bot

        if (targetUserRolePosition >= requesterRolePosition) {
            await interaction.editReply({ content: 'Senden daha üst veya aynı role sahip bir kullanıcıyı atamazsın.', ephemeral: true });
            return;
        }

        if (targetUserRolePosition >= botRolePosition) {
            await interaction.editReply({ content: 'Benden daha üst veya aynı role sahip bir kullanıcıyı atamam.', ephemeral: true });
            return;
        }

        try {
            await targetUser.kick(reason);
            await interaction.editReply({ content: `${targetUser} kullanıcısı sunucudan atıldı. Sebep: ${reason}`, ephemeral: false });
        } catch (error) {
            console.error('Kullanıcıyı atarken bir hata oluştu:', error);
        }

      
    }
}