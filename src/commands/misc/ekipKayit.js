const { 
  ChannelType, PermissionFlagsBits, ApplicationCommandOptionType, 
  EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder 
} = require('discord.js');
const Team = require('../../schemas/teamSchema');
const LogBuilder = require("../../utils/logBuilder");

module.exports = {
  name: 'ekipsistemi',
  description: 'Kayıt sistemini ayarla veya sil',

  mainOnly: true,
  
  memberPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageNicknames],

  options: [
    {
      name: 'olustur',
      description: 'Ekip oluşturma mesajı',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
  
        { name: 'başlık', description: 'Embed başlığı', required: true, type: ApplicationCommandOptionType.String },
        { name: 'açıklama', description: 'Embed açıklaması', required: true, type: ApplicationCommandOptionType.String },
        { name: 'url', description: 'Başlık URL\'si', required: false, type: ApplicationCommandOptionType.String },
        {
          name: 'renk', description: 'Embed rengi', required: false, type: ApplicationCommandOptionType.String, choices: [
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
          ]
        },
        { name: 'küçük-resim', description: 'Embed küçük resim URL\'si', required: false, type: ApplicationCommandOptionType.String },
        { name: 'resim', description: 'Embed büyük resim URL\'si', required: false, type: ApplicationCommandOptionType.String },
        { name: 'author_name', description: 'Yazar adı', required: false, type: ApplicationCommandOptionType.String },
        { name: 'author_icon', description: 'Yazar ikonu URL\'si', required: false, type: ApplicationCommandOptionType.String },
        { name: 'author_url', description: 'Yazar URL\'si', required: false, type: ApplicationCommandOptionType.String },
        { name: 'footer_text', description: 'Footer metni', required: false, type: ApplicationCommandOptionType.String },
        { name: 'footer_icon', description: 'Footer ikonu URL\'si', required: false, type: ApplicationCommandOptionType.String },
        { name: 'zaman-damgasi', description: 'Timestamp ekle', required: false, type: ApplicationCommandOptionType.Boolean },
      ],
    },
    {
      name: 'sil',
      description: 'Bir ekibi ve kanallarını tamamen siler',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'ekiprolu', description: 'Silinecek ekibin rolü', required: true, type: ApplicationCommandOptionType.Role },
      ],
    }
  ],

  callback: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });


    if (subcommand === 'olustur') {
      const targetChannel = interaction.channel;
      const rawDescription = interaction.options.getString('açıklama');
      const description = rawDescription.replace(/\\n/g, '\n');

      const embed = new EmbedBuilder()
        .setTitle(interaction.options.getString('başlık'))
        .setDescription(description);

      let color = interaction.options.getString('renk') || 'Random';
      if (color === 'Random') color = Math.floor(Math.random() * 0xffffff);
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
        .setCustomId('teamRegisterButton')
        .setLabel('Ekip Kayıt Formunu Aç')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await targetChannel.send({ embeds: [embed], components: [row] });
      return await interaction.editReply({ content: '✅ Kayıt mesajı başarıyla gönderildi!' });
    }

    if (subcommand === 'sil') {
      const role = interaction.options.getRole('ekiprolu');

      const teamData = await Team.findOne({ guildID: interaction.guild.id, teamRoleID: role.id });

      if (!teamData) {
        return await interaction.editReply({ content: '❌ Bu rol bir ekibe ait görünmüyor veya veritabanında kayıtlı değil.' });
      }

      try {
        const category = interaction.guild.channels.cache.get(teamData.teamCategoryID);
        if (category) {
          const channels = interaction.guild.channels.cache.filter(c => c.parentId === category.id);
          for (const [id, channel] of channels) {
            await channel.delete().catch(() => null);
          }
          await category.delete().catch(() => null);
        }
        await role.delete().catch(() => null);
        await Team.deleteOne({ teamRoleID: role.id });

        await new LogBuilder(interaction.guild)
          .setTitle("🗑️ Ekip Silindi")
          .setDescription(`**${teamData.teamName}** ekibi moderatör tarafından tamamen temizlendi.`)
          .addField("Silen Moderatör", `<@${interaction.user.id}>`, true)
          .setColor("Red")
          .send();

        return await interaction.editReply({ content: `✅ **${teamData.teamName}** ekibi, rolü ve tüm kanalları başarıyla silindi.` });

      } catch (error) {
        console.error(error);
        return await interaction.editReply({ content: '❌ Silme işlemi sırasında bir hata oluştu.' });
      }
    }
  }
};