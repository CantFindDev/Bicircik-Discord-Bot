const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
    name: 'timeout',
    description: 'Kullanıcıyı belirli bir süreliğine susturur.',

    memberPermissions: [PermissionFlagsBits.MuteMembers],
    botPermissions: [PermissionFlagsBits.MuteMembers],

    options: [
            {
                name: 'hedef-kullanıcı',
                description: 'Susturulacak kullanıcı',
                required: true,
                type: ApplicationCommandOptionType.Mentionable,
            },
            {
                name: 'süre',
                description: 'Susturma süresi (30 minutes, 1 Day , 1 Week)',
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

        await interaction.deferReply({ephemeral: true})
        
        const targetUser = await interaction.guild.members.fetch(targetUserID)

         if (!targetUser) {
            await interaction.editReply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
            return;
        }

         if (targetUser.user.bot) {
            await interaction.editReply({ content: 'Bir robotu susturamam', ephemeral: true });
            return;
        }

        const msDuration = ms(duration);
        if (isNaN(msDuration)) {
            await interaction.editReply({content: "Please provide a valid duration.",ephemeral: true })
            return;
        }

        if (msDuration < 5000 || msDuration > 2.419e9) {
            await interaction.editReply({content: "Timeout duration cannot be less than 5 seconds or more than 27 days.",ephemeral: true });
            return;
        }

         const targetUserRolePosition = targetUser.roles.highest.position; //Highest role of the target user
        const requesterRolePosition = interaction.member.roles.highest.position; //Highest role of the requester
        const botRolePosition = interaction.guild.members.me.roles.highest.position; //Highest role of the bot

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
                   await interaction.editReply({ content: `${targetUser}'s timeout has been updated to ${prettyMs(msDuration, { verbose: true })}`, ephemeral: true });
                   return;
               }

               await targetUser.timeout(msDuration, reason);
               await interaction.editReply({ content: `${targetUser} was timed out for ${prettyMs(msDuration, { verbose: true })}.\n Reason: ${reason}`,ephemeral: true });

        } catch (error) {
            console.error('Kullanıcıyı atarken bir hata oluştu:', error);
        }
    }
}