const { 
  Client, 
  Interaction, 
  ApplicationCommandOptionType, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType 
} = require('discord.js');

module.exports = {
  name: 'sil',
  description: 'Mesajları veya kanalı temizler',

  memberPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],

  options: [
    {
      name: 'mesaj',
      description: 'Mesajları silmek için kullanılır',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'miktar',
          description: 'Silinecek mesaj sayısı (1-100 arası veya tümünü silmek için "hepsi")',
          required: true,
          type: ApplicationCommandOptionType.String,
        }
      ]
    },
    {
      name: 'kanal',
      description: 'Belirtilen kanalı siler',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'hedef-kanal',
          description: 'Silinecek kanal',
          required: true,
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText]
        }
      ]
    }
  ],

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();

    switch(subcommand) {
      case 'mesaj': {
        const kanal = interaction.channel;
        const silinecekMesaj = interaction.options.get('miktar').value;
        const silinecekMesajSayisi = parseInt(silinecekMesaj);

        await interaction.deferReply({ ephemeral: true });

        if (silinecekMesaj.toLowerCase() === "hepsi") {
          const kanalAdi = kanal.name;
          const kanalTuru = kanal.type;
          const kanalParent = kanal.parent;

          try {
            await kanal.delete();

            const yeniKanal = await interaction.guild.channels.create({
              name: kanalAdi,
              type: kanalTuru,
              parent: kanalParent,
              reason: `${interaction.user.tag} tarafından /sil mesaj hepsi komutu kullanıldı`
            });

            const embed = new EmbedBuilder()
              .setTitle("Başarıyla Temizlendi")
              .setDescription("Kanaldaki tüm mesajlar başarıyla temizlendi.")
              .setColor('Random');

            const msg = await yeniKanal.send({ embeds: [embed] });
            setTimeout(() => { msg?.delete().catch(() => {}); }, 5000);

            await interaction.editReply("Kanaldaki tüm mesajlar başarıyla silindi ve kanal yenilendi.");
          } catch (error) {
            console.error(error);
            await interaction.editReply('Kanaldaki mesajlar silinirken bir hata oluştu.');
          }

          break;
        }

        if (isNaN(silinecekMesajSayisi) || silinecekMesajSayisi <= 0 || silinecekMesajSayisi > 100) {
          await interaction.editReply('Lütfen 1 ile 100 arasında bir sayı giriniz veya tüm mesajları silmek için "hepsi" yazınız!');
          break;
        }

        try {
          const silinen = await kanal.bulkDelete(silinecekMesajSayisi, true);
          await interaction.editReply(`${silinen.size} mesaj başarıyla silindi.`);
        } catch (error) {
          console.error(error);
          await interaction.editReply('Mesajları silerken bir hata oluştu.');
        }

        break;
      }

      case 'kanal': {
        const channel = interaction.options.getChannel('hedef-kanal');
        if (!channel) {
          await interaction.reply({ content: 'Belirtilen kanal bulunamadı veya önbellekte değil.', ephemeral: true });
          break;
        }

        try {
          await channel.delete();
          await interaction.reply({ content: `"${channel.name}" kanalı başarıyla silindi.`, ephemeral: true });
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: 'Kanal silinirken bir hata oluştu.', ephemeral: true });
        }

        break;
      }

      default:
        await interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
        break;
    }
  }
};
