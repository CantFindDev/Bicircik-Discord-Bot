const { Client, PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');
const signUpModel = require('../../schemas/signUpSchema');

module.exports = {
  name: 'kayıt-oluştur',
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
        {
          name: 'kanal',
          description: 'Kayıt kanalı seçin',
          type: ApplicationCommandOptionType.Channel,
          required: true,
          channel_types: [0],
        },
        {
          name: 'rol',
          description: 'Kayıt rolü seçin',
          type: ApplicationCommandOptionType.Role,
          required: true,
        }
      ],
    },
    {
      name: 'sil',
      description: 'Kayıt sistemini sil',
      type: ApplicationCommandOptionType.Subcommand,
    }
  ],

  callback: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'ayarla': {
        const kayıtChannel = interaction.options.getChannel('kanal');
        const kayıtRole = interaction.options.getRole('rol');

        try {
          const guildId = interaction.guild.id;
          let data = await signUpModel.findOne({ guildID: guildId });

          if (!data) {
            data = new signUpModel({
              guildID: guildId,
              kayıtChannel: kayıtChannel.id,
              kayıtRole: kayıtRole.id,
            });
          } else {
            data.kayıtChannel = kayıtChannel.id;
            data.kayıtRole = kayıtRole.id;
          }

          await data.save();

          await interaction.reply({ content: `Kayıt kanalı ${kayıtChannel} ve kayıt rolü ${kayıtRole} olarak ayarlandı!`, ephemeral: true });
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: 'Bir hata oluştu, lütfen tekrar deneyin.', ephemeral: true });
        }
        break;
      }

      case 'sil': {
        try {
          const guildId = interaction.guild.id;
          const result = await signUpModel.findOneAndDelete({ guildID: guildId });

          if (result) {
            await interaction.reply({ content: 'Kayıt sistemi başarıyla silindi.', ephemeral: true });
          } else {
            await interaction.reply({ content: 'Kayıt sistemi zaten ayarlı değil.', ephemeral: true });
          }
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: 'Bir hata oluştu, lütfen tekrar deneyin.', ephemeral: true });
        }
        break;
      }

      default:
        await interaction.reply({ content: 'Geçersiz alt komut.', ephemeral: true });
    }
  }
}
