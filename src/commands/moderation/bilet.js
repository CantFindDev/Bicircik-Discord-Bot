const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const ticketSchema = require('../../schemas/ticketSchema');
const settingsSchema = require('../../schemas/settingsSchema');

module.exports = {
    name: 'bilet-sistemi',
    description: 'bilet sistemi',

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'gönder',
            description: 'açılır menü içeriği için isim',
            type: ApplicationCommandOptionType.Subcommand,
            
            options: [
                {
                    name: 'name',
                    description: 'açılır menü içeriği için isim',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                },
                {
                    name: 'message',
                    description: 'embed içine eklenecek özel mesaj',
                    type: ApplicationCommandOptionType.String,
                },
                {
                    name: 'channel',
                    description: 'mesajın gönderileceği kanal',
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                },
            ]
        },
        {
            name: 'oluştur',
            description: 'Bilet kategorisini ayarla',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'category',
                    description: 'Biletlerin gönderileceği kategori',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildCategory],
                },
                {
                    name: 'transcriptchannel',
                    description: 'Bilet dökümlerinin gönderileceği kanal',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                },
            ]
        },
        {
            name: 'sil',
            description: 'Bilet sistemini kaldır',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        
        const sub = interaction.options.getSubcommand();
        const data = await ticketSchema.findOne({ guildID: interaction.guild.id })

        switch (sub) {
            case 'gönder':
                if (!data) return await interaction.reply({ content: 'Bilet mesajı göndermeden önce /ticket setup komutunu kullanmalısınız.', ephemeral: true });
    
                const channelOption = interaction.options.getChannel('channel');
                const ticketMessageChannel = channelOption ?? interaction.channel;

                if (!ticketMessageChannel || !ticketMessageChannel.isTextBased()) {
                    return await interaction.reply({ content: 'Geçersiz kanal seçildi veya oraya mesaj gönderemiyorum.', ephemeral: true });
                }

                const ticketName = interaction.options.getString('name');
                const ticketMessage = interaction.options.getString('message') || 'Sunucu ekibiyle konuşmak için bir bilet oluşturun! Aşağıdan seçip neden bilet oluşturduğunuzu yazabilirsiniz.';

                const select = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticketCreateSelect')
                            .setPlaceholder(ticketName)
                            .setMinValues(0)
                            .addOptions(
                                {
                                    label: 'Biletinizi oluşturun',
                                    description: 'Bilet oluşturma işlemine başlamak için tıklayın',
                                    value: 'createTicket'
                                }
                            )
                    );
    
                const embed = new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('Bilet oluştur!')
                    .setDescription(ticketMessage)
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    
                await interaction.reply({ content: `Bilet mesajınızı ${ticketMessageChannel} kanalına gönderdim.`, ephemeral: true });
                await ticketMessageChannel.send({ embeds: [embed], components: [select] });
                break;
            case 'oluştur':
                if (data) return await interaction.reply({ content: `Zaten <#${data.category}> kategorisi ayarlı.`, ephemeral: true });
                const category = interaction.options.getChannel('category');
                const transcriptChannel = interaction.options.getChannel('transcriptchannel');
                await ticketSchema.create({
                    guildID: interaction.guild.id,
                    category: category.id,
                    transcriptsChannel: transcriptChannel.id
                });

                await interaction.reply({ content: `Kategori **${category}** olarak ayarlandı! Bilet oluşturma mesajı göndermek için /ticket send kullanın.`, ephemeral: true });
                break;
            case 'sil':
                if (!data) return await interaction.reply({ content: `Görünüşe göre zaten bir bilet sistemi ayarlı değil!`, ephemeral: true });
                await ticketSchema.deleteOne({ guildID: interaction.guild.id });
                await interaction.reply({ content: `Bilet kategoriniz silindi.`, ephemeral: true });
                break;
        }
    }
}
