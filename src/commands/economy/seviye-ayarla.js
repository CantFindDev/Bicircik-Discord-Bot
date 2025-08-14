const { Client, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const levelSchema = require('../../schemas/levelSchema');

module.exports = {
    name: 'seviye-ayarla',
    description: 'Seviye yükseldiğinde mesajların gönderileceği kanalı ayarlamanızı sağlar',
    mainOnly: true,
    memberPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'kanal',
            description: 'Seviye mesajlarının gönderileceği kanal',
            type: ApplicationCommandOptionType.Channel,
            required: false
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {

        const channel = interaction.options.getChannel('kanal');

        let guildData = await levelSchema.findOne({ guildID: interaction.guild.id });
        if (!guildData) {
            guildData = new levelSchema({ guildID: interaction.guild.id, userLevels: [] });
        }

        guildData.levelChannel = channel ? channel.id : null;
        await guildData.save();

        return interaction.reply({
            content: channel
                ? `✅ Seviye mesaj kanalı başarıyla ${channel} olarak ayarlandı.`
                : '✅ Seviye mesaj kanalı sıfırlandı. Artık seviye atlama mesajları gönderilmeyecek.',
            ephemeral: true
        });
    }
};
