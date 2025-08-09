const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const welcomerSchema = require('../../schemas/welcomerSchema');

module.exports = {
    name: 'karşılayıcı',
    description: 'Giriş ve çıkış mesajlarını ayarla',

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'kurulum',
            description: 'Giriş ve çıkış mesajlarını ayarlama',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'giris',
                    description: 'Giriş kanalı belirle',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'kanal',
                            description: 'Giriş mesajlarının gönderileceği kanal',
                            type: ApplicationCommandOptionType.Channel,
                            required: true,
                            channel_types: [ChannelType.GuildText]
                        }
                    ]
                },
                {
                    name: 'cikis',
                    description: 'Çıkış kanalı belirle',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'kanal',
                            description: 'Çıkış mesajlarının gönderileceği kanal',
                            type: ApplicationCommandOptionType.Channel,
                            required: true,
                            channel_types: [ChannelType.GuildText]
                        }
                    ]
                }
            ]
        }
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {

        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(false);
        const channel = interaction.options.getChannel('kanal');

        if (!channel) {
            return await interaction.reply({ content: 'Geçerli bir kanal seçmelisiniz.', ephemeral: true });
        }

        if (group !== 'kurulum') {
            return await interaction.reply({ content: 'Bilinmeyen komut grubu.', ephemeral: true });
        }

        let data = await welcomerSchema.findOne({ guildID: interaction.guild.id });
        if (!data) {
            data = new welcomerSchema({ guildID: interaction.guild.id });
        }

        switch (subcommand) {
            case 'giris':
                data.welcomeChannel = channel.id;
                await data.save();
                await interaction.reply(`✅ Giriş kanalı başarıyla ${channel} olarak ayarlandı.`);
                break;

            case 'cikis':
                data.goodbyeChannel = channel.id;
                await data.save();
                await interaction.reply(`👋 Çıkış kanalı başarıyla ${channel} olarak ayarlandı.`);
                break;

            default:
                await interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
        }
    }
};
