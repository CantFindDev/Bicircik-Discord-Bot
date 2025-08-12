const { 
  ChannelType, 
  ApplicationCommandOptionType, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  EmbedBuilder 
} = require('discord.js');
const rolAlSchema = require('../../schemas/roleSchema');

function createRoleMessage(roles, guild, options) {
  const embed = new EmbedBuilder()
    .setTitle(options.title || 'Rol Al')
    .setDescription(options.description || 'Aşağıdaki menüden rollerinizi seçebilirsiniz.')
    .setColor(options.color || 'Blue');

  if (options.url) embed.setURL(options.url);

  // Footer ayarı:
  if (options.footerText) {
    // Sadece footerText varsa footer'ı sadece text olarak ayarla
    embed.setFooter({ text: options.footerText });
  } else if (!options.footerText && !options.footerIcon) {
    // Footer yok, ekleme yapma
  }
  // footerText yok, footerIcon varsa footer eklenmez, footer tamamen yok

  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.authorName) {
    embed.setAuthor({ 
      name: options.authorName, 
      iconURL: options.authorIcon || undefined, 
      url: options.authorURL || undefined 
    });
  }
  if (options.timestamp) embed.setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('rolAlSelect')
    .setPlaceholder('Rolleri seçin...')
    .setMinValues(0)            
    .setMaxValues(roles.length)
    .addOptions(
      roles.map(r => ({
        label: r.label || 'Rol',
        value: r.roleId,
        description: r.description || undefined,
        emoji: r.emoji || undefined,
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return { embed, row };
}

module.exports = {
  name: 'rol-al',
  description: 'Rol alma sistemi',

  mainOnly: true,

  memberPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],

  options: [
    {
      name: 'oluştur',
      description: 'Rol alma sistemi ayarla',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'kanal',
          description: 'Mesajın gönderileceği kanal',
          type: ApplicationCommandOptionType.Channel,
          required: true,
          channel_types: [ChannelType.GuildText],
        },
        {
          name: 'roller',
          description: 'Rolleri emoji:roleId:description şeklinde virgülle ayırarak girin.',
          type: ApplicationCommandOptionType.String,
          required: true,
        }
      ]
    },
    {
      name: 'gönder',
      description: 'Rol alma mesajını gönder',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'kanal', description: 'Mesajın gönderileceği kanal', type: ApplicationCommandOptionType.Channel, required: true, channel_types: [ChannelType.GuildText] },
        { name: 'title', description: 'Embed başlığı', type: ApplicationCommandOptionType.String, required: true },
        { name: 'description', description: 'Embed açıklaması', type: ApplicationCommandOptionType.String, required: true },
        { name: 'color', description: 'Embed rengi', type: ApplicationCommandOptionType.String, required: false },
        { name: 'url', description: 'Embed URL', type: ApplicationCommandOptionType.String, required: false },
        { name: 'footer_text', description: 'Footer metni', type: ApplicationCommandOptionType.String, required: false },
        { name: 'footer_icon', description: 'Footer ikonu URL', type: ApplicationCommandOptionType.String, required: false },
        { name: 'thumbnail', description: 'Küçük resim URL', type: ApplicationCommandOptionType.String, required: false },
        { name: 'image', description: 'Büyük resim URL', type: ApplicationCommandOptionType.String, required: false },
        { name: 'author_name', description: 'Yazar adı', type: ApplicationCommandOptionType.String, required: false },
        { name: 'author_icon', description: 'Yazar ikonu URL', type: ApplicationCommandOptionType.String, required: false },
        { name: 'author_url', description: 'Yazar URL', type: ApplicationCommandOptionType.String, required: false },
        { name: 'timestamp', description: 'Zaman damgası ekle', type: ApplicationCommandOptionType.Boolean, required: false },
      ]
    },
    {
      name: 'sil',
      description: 'Rol alma sistemini kaldır',
      type: ApplicationCommandOptionType.Subcommand,
    }
  ],

  callback: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'oluştur': {
        const kanal = interaction.options.getChannel('kanal');
        const rollerStr = interaction.options.getString('roller');
        const guildId = interaction.guild.id;

        const roles = rollerStr.split(',').map(r => {
          const [emoji, roleId, description] = r.split(':').map(x => x.trim());
          return { emoji, roleId, description: description || '', label: '' };
        });

        for (const r of roles) {
          if (!interaction.guild.roles.cache.has(r.roleId)) {
            return interaction.reply({ content: `Geçersiz rol ID: ${r.roleId}`, ephemeral: true });
          }
          
          const role = interaction.guild.roles.cache.get(r.roleId);
          r.label = role.name.length > 25 ? role.name.slice(0, 25) : role.name;
        }

        let data = await rolAlSchema.findOne({ guildID: guildId });
        if (!data) {
          data = new rolAlSchema({ guildID: guildId, channelID: kanal.id, roles });
        } else {
          data.channelID = kanal.id;
          data.roles = roles;
        }
        await data.save();

        return interaction.reply({ content: `Rol alma sistemi başarıyla ayarlandı. Mesajı göndermek için /rol-al gönder kullanın.`, ephemeral: true });
      }
      case 'gönder': {
        const kanal = interaction.options.getChannel('kanal');
        const guildId = interaction.guild.id;

        if (!kanal || kanal.type !== ChannelType.GuildText) {
          return interaction.reply({ content: 'Geçerli bir metin kanalı belirtmelisiniz.', ephemeral: true });
        }

        const data = await rolAlSchema.findOne({ guildID: guildId });
        if (!data) return interaction.reply({ content: 'Rol alma sistemi ayarlı değil. Önce /rol-al oluştur komutunu kullanın.', ephemeral: true });

        // Embed opsiyonlarını oku
        const options = {
          title: interaction.options.getString('title').replace(/\\n/g, '\n'),
          description: interaction.options.getString('description').replace(/\\n/g, '\n'),
          color: interaction.options.getString('color') || 'Blue',
          url: interaction.options.getString('url'),
          footerText: interaction.options.getString('footer_text'),
          footerIcon: interaction.options.getString('footer_icon'),
          thumbnail: interaction.options.getString('thumbnail'),
          image: interaction.options.getString('image'),
          authorName: interaction.options.getString('author_name'),
          authorIcon: interaction.options.getString('author_icon'),
          authorURL: interaction.options.getString('author_url'),
          timestamp: interaction.options.getBoolean('timestamp') || false,
        };

        const { embed, row } = createRoleMessage(data.roles, interaction.guild, options);

        const mesaj = await kanal.send({ embeds: [embed], components: [row] });

        data.messageID = mesaj.id;
        data.channelID = kanal.id;
        await data.save();

        return interaction.reply({ content: `${kanal} kanalına rol alma menüsü gönderildi!`, ephemeral: true });
      }
      case 'sil': {
        const guildId = interaction.guild.id;
        const data = await rolAlSchema.findOne({ guildID: guildId });
        if (!data) return interaction.reply({ content: 'Rol alma sistemi zaten ayarlı değil.', ephemeral: true });

        await rolAlSchema.deleteOne({ guildID: guildId });
        return interaction.reply({ content: 'Rol alma sistemi başarıyla kaldırıldı.', ephemeral: true });
      }
      default:
        return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
    }
  }
};
