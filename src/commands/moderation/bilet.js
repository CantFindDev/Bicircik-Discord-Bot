const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const ticketSchema = require('../../schemas/ticketSchema');
const settingsSchema = require('../../schemas/settingsSchema');

module.exports = {
    name: 'bilet-sistemi',
    description: 'bilet sistemi',
    aliases: [{ name: 'ticket-system', description: 'Ticket system' }],

    mainOnly: true,

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'gönder',
            description: 'Destek talebi mesajını oluşturmanı sağlar',
            type: ApplicationCommandOptionType.Subcommand,
            
            options: [
                 {
                    name: 'title',
                    description: 'embed title',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                },
                 {
                    name: 'message',
                     description: 'embed içine eklenecek özel mesaj',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                },
                {
                    name: 'dropdown-text',
                    description: 'açılır menü içeriği için isim',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                },
            
                {
                    name: 'channel',
                    description: 'mesajın gönderileceği kanal',
                    required: false,
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

                const ticketDropdownName = interaction.options.getString('dropdown-text') || 'Destek Talebi!';
                const ticketTitle = interaction.options.getString('title') || 'Destek Talebi Oluştur!';
                const ticketMessage = interaction.options.getString('message') || 'Sunucu ekibiyle konuşmak için bir bilet oluşturun! Aşağıdan seçip neden bilet oluşturduğunuzu yazabilirsiniz.';

                const select = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('ticketCreateSelect')
                            .setPlaceholder(ticketDropdownName)
                            .setMinValues(0)
                            .addOptions(
                                {
                                    label: 'Destek Talebi Oluşturun',
                                    description: 'Destek talebi oluşturmak için tıklayın',
                                    value: 'createTicket'
                                }
                            )
                    );
    
                const embed = new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle(ticketTitle)
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
