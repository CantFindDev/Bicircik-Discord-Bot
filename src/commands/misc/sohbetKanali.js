const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const chatBotSchema = require('../../schemas/chatBotSchema');

module.exports = {
    name: 'sohbet-kanalı',
    description: 'Sohbet botunun konuşabileceği kanalı ayarlar, kanal verilmezse her kanalda konuşur',

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'kanal',
            description: 'Sohbet botunun cevap vereceği kanal, boş bırakılırsa kısıt kalkar',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false,
        },
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const channel = interaction.options.getChannel('kanal');

        if (!channel) {
            await chatBotSchema.deleteOne({ guildID: interaction.guild.id });

            return interaction.reply({ content: '✅ Kanal kısıtı kaldırıldı. Sohbet botu her kanalda cevap verecek.', ephemeral: true });
        }

        await chatBotSchema.findOneAndUpdate(
            { guildID: interaction.guild.id },
            { channelID: channel.id },
            { upsert: true }
        );

        return interaction.reply({ content: `✅ Sohbet botu artık sadece ${channel} kanalında cevap verecek.`, ephemeral: true });
    }
};
