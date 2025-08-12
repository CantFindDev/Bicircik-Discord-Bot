const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const settingsSchema = require('../../schemas/settingsSchema');
const LogBuilder = require('../../utils/logBuilder');

module.exports = {
    name: 'log',
    description: 'Log kanalını ayarlamak için olan komut',

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'ayarla',
            description: 'Log kanalı ayarla',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'Hedef kanal',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                },
            ],
        },
        {
            name: 'sil',
            description: 'Log kanalı ayarlarını sil',
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel'); 
        const settings = await settingsSchema.findOne({ guildID: interaction.guild.id });

        if (sub === 'ayarla') {
            
            if (!settings) {
                await settingsSchema.create({ guildID: interaction.guild.id, logChannelID: channel.id });
            } else {
                settings.logChannelID = channel.id;
                await settings.save();
            }
            
            await interaction.reply({ content: `Log kanalı <#${settings.logChannelID}> olarak ayarlandı`, ephemeral: true });


            const logBuilder = new LogBuilder(interaction.guild)
                .setAuthor(interaction.user)
                .setTitle("Log ayarı")
                .setDescription(`Log kanalı <#${settings.logChannelID}> olarak ayarlandı`)
                .setColor("Random");
            await logBuilder.send();
        }

        if (sub === 'sil') {
            await settingsSchema.deleteOne({ guildID: interaction.guild.id });
            await interaction.reply({ content: `Log kanalı başarıyla silindi`, ephemeral: true });
        }
    }
}