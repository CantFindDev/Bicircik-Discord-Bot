const { 
  Client, 
  ChannelType, 
  Interaction, 
  ApplicationCommandOptionType, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require('discord.js');

module.exports = {
  name: 'embed-mesaj',
  description: 'Embed mesaj gönderme komutu',

  memberPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.Administrator],

  options: [
    { name: 'başlık', description: 'Embed başlığı', required: true, type: ApplicationCommandOptionType.String },
    { name: 'açıklama', description: 'Embed açıklaması', required: true, type: ApplicationCommandOptionType.String },
    { name: 'url', description: 'Başlık URL\'si', required: false, type: ApplicationCommandOptionType.String },

    { name: 'renk', description: 'Embed rengi', required: false, type: ApplicationCommandOptionType.String, choices: [
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
    ]},

    { name: 'küçük-resim', description: 'Embed küçük resim URL\'si', required: false, type: ApplicationCommandOptionType.String },
    { name: 'resim', description: 'Embed büyük resim URL\'si', required: false, type: ApplicationCommandOptionType.String },

    { name: 'author_name', description: 'Yazar adı', required: false, type: ApplicationCommandOptionType.String },
    { name: 'author_icon', description: 'Yazar ikonu URL\'si', required: false, type: ApplicationCommandOptionType.String },
    { name: 'author_url', description: 'Yazar URL\'si', required: false, type: ApplicationCommandOptionType.String },

    { name: 'footer_text', description: 'Footer metni', required: false, type: ApplicationCommandOptionType.String },
    { name: 'footer_icon', description: 'Footer ikonu URL\'si', required: false, type: ApplicationCommandOptionType.String },

    { name: 'zaman-damgasi', description: 'Timestamp ekle', required: false, type: ApplicationCommandOptionType.Boolean },

    { name: 'hedef-kanal', description: 'Embed mesajın gönderileceği kanal', required: false, type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildText] },
  ],

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = client.channels.cache.get(interaction.options.get('hedef-kanal')?.value) || interaction.channel;
    const title = interaction.options.get('başlık').value;

    const rawDescription = interaction.options.get('açıklama').value;
    const description = rawDescription.replace(/\\n/g, '\n');

    let color = interaction.options.get('renk')?.value || 'Random';
    
    if (color === 'Random') {
      color = Math.floor(Math.random() * 0xffffff);
    } else if (color === 'Default') {
      color = undefined;
    }

    const thumbnail = interaction.options.get('küçük-resim')?.value;
    const image = interaction.options.get('resim')?.value;

    const authorName = interaction.options.get('author_name')?.value;
    const authorIcon = interaction.options.get('author_icon')?.value;
    const authorURL = interaction.options.get('author_url')?.value;

    const footerText = interaction.options.get('footer_text')?.value;
    const footerIcon = interaction.options.get('footer_icon')?.value;

    const timestamp = interaction.options.get('zaman-damgasi')?.value || false;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description);

    if (color) embed.setColor(color);
    if (interaction.options.get('url')?.value) embed.setURL(interaction.options.get('url')?.value);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (authorName) {
      embed.setAuthor({ 
        name: authorName, 
        iconURL: authorIcon || undefined, 
        url: authorURL || undefined 
      });
    }

    if (footerText) {
      embed.setFooter({ text: footerText, iconURL: footerIcon || undefined });
    }

    if (timestamp) embed.setTimestamp();

    await targetChannel.send({ embeds: [embed] });
    await interaction.editReply("✅ Embed mesajı başarıyla gönderildi!");
  }
};
