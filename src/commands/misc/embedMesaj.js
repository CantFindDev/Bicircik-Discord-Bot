const { Client, ChannelType, Interaction, ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'embed-mesaj',
    description: 'Embed mesaj gönderme komutu',

    memberPermissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.Administrator],

    options: [
        {
            name: 'başlık',
            description: 'Embed başlığı',
            required: true,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'açıklama',
            description: 'Embed açıklaması',
            required: true,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'altbilgi',
            description: 'Embed altbilgisi',
            required: false,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'altbilgi-icon',
            description: 'Altbilgi ikonu URL\'si',
            required: false,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'hedef-kanal',
            description: 'Embed mesajın gönderileceği kanal',
            required: false,
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
        },
        {
            name: 'url',
            description: 'Başlık için URL',
            required: false,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'küçük-resim',
            description: 'Embed küçük resim URL\'si',
            required: false,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'resim',
            description: 'Embed büyük resim URL\'si',
            required: false,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: 'renk',
            description: 'Embed rengi',
            required: false,
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "Rastgele", value: 'Random' },
                { name: "Varsayılan", value: 'Default' },
                { name: "Aqua", value: 'Aqua' },
                { name: "Yeşil", value: 'Green' },
                { name: "Mavi", value: 'Blue' },
                { name: "Mor", value: 'Purple' },
                { name: "Canlı Pembe", value: 'LuminousVividPink' },
                { name: "Altın", value: 'Gold' },
                { name: "Turuncu", value: 'Orange' },
                { name: "Kırmızı", value: 'Red' },
                { name: "Gri", value: 'Grey' },
                { name: "Koyu Gri", value: 'DarkGrey' },
                { name: "Daha Koyu Gri", value: 'DarkerGrey' },
                { name: "Tam Siyah Değil", value: 'NotQuiteBlack' },
                { name: "Koyu ama Siyah Değil", value: 'DarkButNotBlack' },
                { name: "Açık Gri", value: 'LightGrey' },
                { name: "Lacivert", value: 'Navy' },
                { name: "Sarı", value: 'Yellow' },
                { name: "Fuşya", value: 'Fuchsia' },
                { name: "Beyaz", value: 'White' },
                { name: "Gri- Mor", value: 'Greyple' },
                { name: "Siyah", value: 'Black' },
                { name: "Blurple", value: 'Blurple' },                   
            ]
        },
    ],

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = client.channels.cache.get(interaction.options.get('hedef-kanal')?.value) || interaction.channel;
        const title = interaction.options.get('başlık').value;
        const description = interaction.options.get('açıklama').value;

        const footer = interaction.options.get('altbilgi')?.value || interaction.user.username;
        const footerIcon = interaction.options.get('altbilgi-icon')?.value || interaction.user.displayAvatarURL();

        const image = interaction.options.get('resim')?.value || "";
        const thumbnail = interaction.options.get('küçük-resim')?.value || "";

        const url = interaction.options.get('url')?.value || "";
        const color = interaction.options.get('renk')?.value || 'Random';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setFooter({ text: footer, iconURL: footerIcon })
            .setTimestamp();

        if (url.length !== 0) embed.setURL(url);
        if (image.length !== 0) embed.setImage(image);
        if (thumbnail.length !== 0) embed.setThumbnail(thumbnail);

        await targetChannel.send({ embeds: [embed] });
        await interaction.editReply("✅ Embed mesajı başarıyla gönderildi!");
    }
};
