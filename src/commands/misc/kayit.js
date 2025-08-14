const { 
  Client,
  ChannelType, 
  PermissionFlagsBits, 
  ApplicationCommandOptionType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');

const registrationModel = require('../../schemas/registrationSchema');

module.exports = {
  name: 'kayıt',
  description: 'Kayıt sistemini ayarla veya sil',

  mainOnly: true,
  
  memberPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageNicknames],

  options: [
    {
      name: 'ayarla',
      description: 'Kayıt kanalı ve rolü ayarla',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'kanal', description: 'Kayıt kanalı seçin', type: ApplicationCommandOptionType.Channel, required: true, channel_types: [0] },
        { name: 'rol', description: 'Kayıt rolü seçin', type: ApplicationCommandOptionType.Role, required: true }
      ],
    },
    {
      name: 'gönder',
      description: 'Kayıt kanalına kayıt mesajını gönderir',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'başlık', description: 'Embed başlığı', required: true, type: ApplicationCommandOptionType.String },
        { name: 'açıklama', description: 'Embed açıklaması', required: true, type: ApplicationCommandOptionType.String },
        { name: 'url', description: 'Başlık URL\'si', required: false, type: ApplicationCommandOptionType.String },
        { name: 'renk', description: 'Embed rengi', required: false, type: ApplicationCommandOptionType.String, choices: [
          { name: "Rastgele", value: 'Random' }, { name: "Varsayılan", value: 'Default' },
          { name: "Aqua", value: 'Aqua' }, { name: "Yeşil", value: 'Green' },
          { name: "Mavi", value: 'Blue' }, { name: "Mor", value: 'Purple' },
          { name: "Canlı Pembe", value: 'LuminousVividPink' }, { name: "Altın", value: 'Gold' },
          { name: "Turuncu", value: 'Orange' }, { name: "Kırmızı", value: 'Red' },
          { name: "Gri", value: 'Grey' }, { name: "Koyu Gri", value: 'DarkGrey' },
          { name: "Daha Koyu Gri", value: 'DarkerGrey' }, { name: "Tam Siyah Değil", value: 'NotQuiteBlack' },
          { name: "Koyu ama Siyah Değil", value: 'DarkButNotBlack' }, { name: "Açık Gri", value: 'LightGrey' },
          { name: "Lacivert", value: 'Navy' }, { name: "Sarı", value: 'Yellow' },
          { name: "Fuşya", value: 'Fuchsia' }, { name: "Beyaz", value: 'White' },
          { name: "Gri- Mor", value: 'Greyple' }, { name: "Siyah", value: 'Black' },
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
      ]
    },
    {
      name: 'sil',
      description: 'Kayıt sistemini sil',
      type: ApplicationCommandOptionType.Subcommand,
    }
  ],

  callback: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    let data = await registrationModel.findOne({ guildID: interaction.guild.id });

    switch (subcommand) {
      case 'ayarla': {
        const kayıtChannel = interaction.options.getChannel('kanal');
        const kayıtRole = interaction.options.getRole('rol');

        try {
          if (!data) {
            data = new registrationModel({ guildID: interaction.guild.id, kayıtChannel: kayıtChannel.id, kayıtRole: kayıtRole.id });
          } else {
            data.kayıtChannel = kayıtChannel.id;
            data.kayıtRole = kayıtRole.id;
          }
          await data.save();
          await interaction.reply({ content: `Kayıt kanalı ${kayıtChannel} ve kayıt rolü ${kayıtRole} olarak ayarlandı!`, ephemeral: true });
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: 'Bir hata oluştu, tekrar deneyin.', ephemeral: true });
        }
        break;
      }

      case 'gönder': {
        await interaction.deferReply({ ephemeral: true });
        if (!data) return interaction.editReply({ content: 'Kayıt ayarları yapılmamış. Önce /kayıt ayarla kullanın.', ephemeral: true });

        const targetChannel = interaction.guild.channels.cache.get(data.kayıtChannel);

        const rawDescription = interaction.options.get('açıklama').value;
        const description = rawDescription.replace(/\\n/g, '\n');

        const embed = new EmbedBuilder()
          .setTitle(interaction.options.getString('başlık'))
          .setDescription(description);

        let color = interaction.options.getString('renk') || 'Random';
        if (color === 'Random') color = Math.floor(Math.random() * 0xffffff);
        else if (color === 'Default') color = undefined;
        embed.setColor(color);

        if (interaction.options.getString('url')) embed.setURL(interaction.options.getString('url'));
        if (interaction.options.getString('küçük-resim')) embed.setThumbnail(interaction.options.getString('küçük-resim'));
        if (interaction.options.getString('resim')) embed.setImage(interaction.options.getString('resim'));
        if (interaction.options.getString('author_name')) embed.setAuthor({
          name: interaction.options.getString('author_name'),
          iconURL: interaction.options.getString('author_icon') || undefined,
          url: interaction.options.getString('author_url') || undefined
        });
        if (interaction.options.getString('footer_text')) embed.setFooter({
          text: interaction.options.getString('footer_text'),
          iconURL: interaction.options.getString('footer_icon') || undefined
        });
        if (interaction.options.getBoolean('zaman-damgasi')) embed.setTimestamp();

        const button = new ButtonBuilder()
          .setCustomId('registerButton')
          .setLabel('Kayıt Formunu Aç')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await targetChannel.send({ embeds: [embed], components: [row] });
        await interaction.editReply({ content: '✅ Kayıt mesajı başarıyla gönderildi!' });
        break;
      }

      case 'sil': {
        try {
          const result = await registrationModel.findOneAndDelete({ guildID: interaction.guild.id });
          if (result) await interaction.reply({ content: 'Kayıt sistemi silindi.', ephemeral: true });
          else await interaction.reply({ content: 'Kayıt sistemi zaten ayarlı değil.', ephemeral: true });
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: 'Bir hata oluştu.', ephemeral: true });
        }
        break;
      }

      default:
        await interaction.reply({ content: 'Geçersiz alt komut.', ephemeral: true });
    }
  }
};
