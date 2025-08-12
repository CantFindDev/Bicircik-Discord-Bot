const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const welcomerSchema = require('../../schemas/welcomerSchema');

module.exports = {
    name: 'karşılayıcı',
    description: 'Giriş ve çıkış mesajlarını ayarla',

    mainOnly: true,

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
                },
                {
                    name: 'sil',
                    description: 'Karşılama sistemini sıfırla',
                    type: ApplicationCommandOptionType.Subcommand,
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

        if (group !== 'kurulum') {
            return await interaction.reply({ content: 'Bilinmeyen komut grubu.', ephemeral: true });
        }

        if (subcommand === 'sil') {
            try {
                const deleted = await welcomerSchema.findOneAndDelete({ guildID: interaction.guild.id });
                if (deleted) {
                    return await interaction.reply({ content: '✅ Karşılama sistemi başarıyla kaldırıldı.', ephemeral: true });
                } else {
                    return await interaction.reply({ content: '⚠️ Karşılama sistemi zaten ayarlı değil.', ephemeral: true });
                }
            } catch (error) {
                console.error(error);
                return await interaction.reply({ content: '❌ Bir hata oluştu, lütfen daha sonra tekrar deneyin.', ephemeral: true });
            }
        }

        const channel = interaction.options.getChannel('kanal');
        if (!channel) {
            return await interaction.reply({ content: 'Geçerli bir kanal seçmelisiniz.', ephemeral: true });
        }

        let data = await welcomerSchema.findOne({ guildID: interaction.guild.id });
        if (!data) {
            data = new welcomerSchema({ guildID: interaction.guild.id });
        }

        switch (subcommand) {
            case 'giris':
                data.welcomeChannel = channel.id;
                await data.save();
                await interaction.reply({ content: `✅ Giriş kanalı başarıyla ${channel} olarak ayarlandı.`, ephemeral: true });
                break;

            case 'cikis':
                data.goodbyeChannel = channel.id;
                await data.save();
                await interaction.reply({ content: `👋 Çıkış kanalı başarıyla ${channel} olarak ayarlandı.`, ephemeral: true });
                break;

            default:
                await interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
        }
    }
};
